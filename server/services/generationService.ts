/**
 * Generation Service
 * 
 * This service handles AI generation requests by routing them to the appropriate
 * provider based on user preferences and availability.
 */

import { getDb } from "../db";
import { userAiCredentials, aiProviders, aiUsageLogs } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateImage as manusGenerateImage } from "../_core/imageGeneration";
import { storagePut } from "../storage";

// Simple encryption for API keys (in production, use proper encryption)
const ENCRYPTION_KEY = process.env.JWT_SECRET || "default-key";

function decryptApiKey(encrypted: string): string {
  // Simple XOR decryption (matches encryption in aiProviders router)
  const key = ENCRYPTION_KEY;
  let decrypted = "";
  for (let i = 0; i < encrypted.length; i++) {
    decrypted += String.fromCharCode(
      encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return decrypted;
}

export interface GenerationRequest {
  userId: number;
  type: "image" | "video";
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  duration?: number;
  referenceImageUrl?: string;
  preferredProvider?: string;
  sessionId?: number;
}

export interface GenerationResult {
  success: boolean;
  providerId?: number;
  providerName?: string;
  outputUrl?: string;
  thumbnailUrl?: string;
  jobId?: string;
  status: "completed" | "processing" | "failed";
  error?: string;
  creditsUsed?: number;
  estimatedCostCents?: number;
}

/**
 * Get the best available provider for a generation request
 */
async function selectProvider(
  userId: number,
  type: "image" | "video",
  preferredProvider?: string
): Promise<{
  provider: typeof aiProviders.$inferSelect;
  apiKey: string | null;
  credentialId: number | null;
} | null> {
  const db = await getDb();
  if (!db) return null;

  // Get all active providers with the required capability
  const capability = type === "image" ? "textToImage" : "textToVideo";
  
  const providers = await db
    .select()
    .from(aiProviders)
    .where(eq(aiProviders.isActive, true));

  // Filter by capability
  const capableProviders = providers.filter(p => {
    const caps = p.capabilities as Record<string, boolean> || {};
    return caps[capability] === true;
  });

  if (capableProviders.length === 0) return null;

  // Get user's credentials
  const credentials = await db
    .select({
      id: userAiCredentials.id,
      providerId: userAiCredentials.providerId,
      encryptedApiKey: userAiCredentials.encryptedApiKey,
      isValid: userAiCredentials.isValid,
      isPrimary: userAiCredentials.isPrimary,
    })
    .from(userAiCredentials)
    .where(and(
      eq(userAiCredentials.userId, userId),
      eq(userAiCredentials.isActive, true),
      eq(userAiCredentials.isValid, true)
    ))
    .orderBy(desc(userAiCredentials.isPrimary));

  const credentialMap = new Map(credentials.map(c => [c.providerId, c]));

  // If preferred provider specified, try to use it
  if (preferredProvider) {
    const preferred = capableProviders.find(p => p.slug === preferredProvider);
    if (preferred) {
      if (preferred.isBuiltIn) {
        return { provider: preferred, apiKey: null, credentialId: null };
      }
      const cred = credentialMap.get(preferred.id);
      if (cred) {
        return {
          provider: preferred,
          apiKey: decryptApiKey(cred.encryptedApiKey),
          credentialId: cred.id,
        };
      }
    }
  }

  // Try to find a provider with valid credentials (prefer primary)
  for (const cred of credentials) {
    const provider = capableProviders.find(p => p.id === cred.providerId);
    if (provider) {
      return {
        provider,
        apiKey: decryptApiKey(cred.encryptedApiKey),
        credentialId: cred.id,
      };
    }
  }

  // Fall back to built-in provider
  const builtIn = capableProviders.find(p => p.isBuiltIn);
  if (builtIn) {
    return { provider: builtIn, apiKey: null, credentialId: null };
  }

  return null;
}

/**
 * Log usage for a generation request
 */
async function logUsage(
  userId: number,
  providerId: number,
  credentialId: number | null,
  operation: string,
  status: "success" | "failed",
  creditsUsed: number,
  estimatedCostCents: number,
  jobKind: string,
  errorMessage?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(aiUsageLogs).values({
    userId,
    providerId,
    credentialId: credentialId || 0,
    operation,
    status: status === "success" ? "success" : "failed",
    creditsUsed,
    estimatedCostCents,
    jobKind: jobKind as "image" | "video" | "audio" | "text",
    errorMessage,
  });

  // Update credential usage stats if applicable
  if (credentialId) {
    await db.execute(
      `UPDATE user_ai_credentials 
       SET total_requests = total_requests + 1, 
           total_credits_used = total_credits_used + ${creditsUsed},
           last_used_at = NOW()
       WHERE id = ${credentialId}`
    );
  }
}

/**
 * Generate an image using the best available provider
 */
export async function generateImage(request: GenerationRequest): Promise<GenerationResult> {
  const selection = await selectProvider(request.userId, "image", request.preferredProvider);
  
  if (!selection) {
    return {
      success: false,
      status: "failed",
      error: "No suitable provider available for image generation",
    };
  }

  const { provider, apiKey, credentialId } = selection;
  let result: GenerationResult;

  try {
    switch (provider.slug) {
      case "manus":
        // Use built-in Manus provider
        result = await generateWithManus(request);
        break;

      case "openai-sora":
        // Use OpenAI DALL-E for images (Sora is video)
        result = await generateWithOpenAI(request, apiKey!);
        break;

      case "replicate":
        result = await generateWithReplicate(request, apiKey!);
        break;

      case "stability":
        result = await generateWithStability(request, apiKey!);
        break;

      default:
        // Fall back to Manus
        result = await generateWithManus(request);
    }

    result.providerId = provider.id;
    result.providerName = provider.name;

    // Log successful usage
    await logUsage(
      request.userId,
      provider.id,
      credentialId,
      "textToImage",
      result.success ? "success" : "failed",
      result.creditsUsed || 1,
      result.estimatedCostCents || 0,
      "image",
      result.error
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Log failed usage
    await logUsage(
      request.userId,
      provider.id,
      credentialId,
      "textToImage",
      "failed",
      0,
      0,
      "image",
      errorMessage
    );

    return {
      success: false,
      status: "failed",
      providerId: provider.id,
      providerName: provider.name,
      error: errorMessage,
    };
  }
}

/**
 * Generate a video using the best available provider
 */
export async function generateVideo(request: GenerationRequest): Promise<GenerationResult> {
  const selection = await selectProvider(request.userId, "video", request.preferredProvider);
  
  if (!selection) {
    return {
      success: false,
      status: "failed",
      error: "No suitable provider available for video generation",
    };
  }

  const { provider, apiKey, credentialId } = selection;
  let result: GenerationResult;

  try {
    switch (provider.slug) {
      case "manus":
        // Use built-in Manus video generation
        result = await generateVideoWithManus(request);
        break;

      case "openai-sora":
        result = await generateVideoWithSora(request, apiKey!);
        break;

      case "runway":
        result = await generateVideoWithRunway(request, apiKey!);
        break;

      case "replicate":
        result = await generateVideoWithReplicate(request, apiKey!);
        break;

      default:
        result = await generateVideoWithManus(request);
    }

    result.providerId = provider.id;
    result.providerName = provider.name;

    // Log usage
    await logUsage(
      request.userId,
      provider.id,
      credentialId,
      request.referenceImageUrl ? "imageToVideo" : "textToVideo",
      result.success ? "success" : "failed",
      result.creditsUsed || 10,
      result.estimatedCostCents || 0,
      "video",
      result.error
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    await logUsage(
      request.userId,
      provider.id,
      credentialId,
      request.referenceImageUrl ? "imageToVideo" : "textToVideo",
      "failed",
      0,
      0,
      "video",
      errorMessage
    );

    return {
      success: false,
      status: "failed",
      providerId: provider.id,
      providerName: provider.name,
      error: errorMessage,
    };
  }
}

// Provider-specific implementations

async function generateWithManus(request: GenerationRequest): Promise<GenerationResult> {
  const result = await manusGenerateImage({
    prompt: request.prompt,
  });

  if (!result.url) {
    return {
      success: false,
      status: "failed",
      error: "No image URL returned",
    };
  }

  return {
    success: true,
    status: "completed",
    outputUrl: result.url,
    thumbnailUrl: result.url,
    creditsUsed: 1,
    estimatedCostCents: 0, // Built-in is free
  };
}

async function generateWithOpenAI(request: GenerationRequest, apiKey: string): Promise<GenerationResult> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: request.prompt,
      n: 1,
      size: request.aspectRatio === "16:9" ? "1792x1024" : 
            request.aspectRatio === "9:16" ? "1024x1792" : "1024x1024",
      quality: "standard",
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const imageUrl = data.data?.[0]?.url;

  if (!imageUrl) {
    throw new Error("No image URL in response");
  }

  return {
    success: true,
    status: "completed",
    outputUrl: imageUrl,
    thumbnailUrl: imageUrl,
    creditsUsed: 1,
    estimatedCostCents: 4, // DALL-E 3 ~$0.04 per image
  };
}

async function generateWithReplicate(request: GenerationRequest, apiKey: string): Promise<GenerationResult> {
  // Use SDXL model
  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      input: {
        prompt: request.prompt,
        negative_prompt: request.negativePrompt,
        width: request.aspectRatio === "16:9" ? 1344 : 
               request.aspectRatio === "9:16" ? 768 : 1024,
        height: request.aspectRatio === "16:9" ? 768 : 
                request.aspectRatio === "9:16" ? 1344 : 1024,
        num_outputs: 1,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  const prediction = await response.json();
  
  // Poll for completion
  let result = prediction;
  while (result.status !== "succeeded" && result.status !== "failed") {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { "Authorization": `Token ${apiKey}` },
    });
    result = await pollResponse.json();
  }

  if (result.status === "failed") {
    throw new Error(result.error || "Generation failed");
  }

  const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;

  return {
    success: true,
    status: "completed",
    outputUrl,
    thumbnailUrl: outputUrl,
    jobId: prediction.id,
    creditsUsed: 1,
    estimatedCostCents: 1, // ~$0.01 per image
  };
}

async function generateWithStability(request: GenerationRequest, apiKey: string): Promise<GenerationResult> {
  const response = await fetch("https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text_prompts: [
        { text: request.prompt, weight: 1 },
        ...(request.negativePrompt ? [{ text: request.negativePrompt, weight: -1 }] : []),
      ],
      cfg_scale: 7,
      height: request.aspectRatio === "16:9" ? 576 : 
              request.aspectRatio === "9:16" ? 1024 : 1024,
      width: request.aspectRatio === "16:9" ? 1024 : 
             request.aspectRatio === "9:16" ? 576 : 1024,
      samples: 1,
      steps: 30,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const base64Image = data.artifacts?.[0]?.base64;

  if (!base64Image) {
    throw new Error("No image in response");
  }

  // Upload to S3
  const buffer = Buffer.from(base64Image, "base64");
  const fileKey = `stability-images/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
  const { url } = await storagePut(fileKey, buffer, "image/png");

  return {
    success: true,
    status: "completed",
    outputUrl: url,
    thumbnailUrl: url,
    creditsUsed: 1,
    estimatedCostCents: 2, // ~$0.02 per image
  };
}

async function generateVideoWithManus(request: GenerationRequest): Promise<GenerationResult> {
  // Manus built-in does not support native video generation.
  // Generate a high-quality cinematic preview frame using image generation instead.
  // When users configure a real video provider (Runway, Sora, Replicate), actual video will be produced.
  try {
    const result = await manusGenerateImage({
      prompt: `Cinematic 16:9 video frame, professional studio quality: ${request.prompt}. Photorealistic, dramatic lighting, shallow depth of field, film grain.`,
      ...(request.referenceImageUrl ? {
        originalImages: [{ url: request.referenceImageUrl, mimeType: "image/jpeg" }]
      } : {}),
    });

    if (!result.url) {
      return {
        success: false,
        status: "failed",
        error: "Failed to generate preview frame",
      };
    }

    return {
      success: true,
      status: "completed",
      outputUrl: result.url,
      thumbnailUrl: result.url,
      creditsUsed: 1,
      estimatedCostCents: 0,
    };
  } catch (err) {
    return {
      success: false,
      status: "failed",
      error: err instanceof Error ? err.message : "Preview frame generation failed",
    };
  }
}

async function generateVideoWithSora(request: GenerationRequest, apiKey: string): Promise<GenerationResult> {
  // OpenAI Sora API (when available)
  const response = await fetch("https://api.openai.com/v1/videos/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sora-1.0-turbo",
      prompt: request.prompt,
      duration: request.duration || 5,
      size: request.aspectRatio === "16:9" ? "1920x1080" : 
            request.aspectRatio === "9:16" ? "1080x1920" : "1080x1080",
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();

  return {
    success: true,
    status: data.status === "completed" ? "completed" : "processing",
    jobId: data.id,
    outputUrl: data.video_url,
    thumbnailUrl: data.thumbnail_url,
    creditsUsed: 10,
    estimatedCostCents: Math.round((request.duration || 5) * 10), // ~$0.10 per second
  };
}

async function generateVideoWithRunway(request: GenerationRequest, apiKey: string): Promise<GenerationResult> {
  const body: Record<string, unknown> = {
    model: "gen3a_turbo",
    prompt: request.prompt,
    duration: Math.min(request.duration || 5, 10),
    ratio: request.aspectRatio || "16:9",
  };

  if (request.referenceImageUrl) {
    body.image = request.referenceImageUrl;
  }

  const response = await fetch("https://api.runwayml.com/v1/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "X-Runway-Version": "2024-11-06",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();

  return {
    success: true,
    status: data.status === "SUCCEEDED" ? "completed" : "processing",
    jobId: data.id,
    outputUrl: data.output?.[0],
    creditsUsed: 10,
    estimatedCostCents: Math.round((request.duration || 5) * 5), // ~$0.05 per second
  };
}

async function generateVideoWithReplicate(request: GenerationRequest, apiKey: string): Promise<GenerationResult> {
  const input: Record<string, unknown> = {
    prompt: request.prompt,
    video_length: "14_frames",
    sizing_strategy: "maintain_aspect_ratio",
  };

  if (request.referenceImageUrl) {
    input.input_image = request.referenceImageUrl;
  }

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
      input,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  const prediction = await response.json();

  return {
    success: true,
    status: "processing",
    jobId: prediction.id,
    creditsUsed: 1,
    estimatedCostCents: 10, // ~$0.10 per video
  };
}

/**
 * Check the status of a video generation job
 */
export async function checkVideoJobStatus(
  userId: number,
  jobId: string,
  providerSlug: string,
  apiKey?: string
): Promise<GenerationResult> {
  switch (providerSlug) {
    case "runway":
      if (!apiKey) throw new Error("API key required");
      return await checkRunwayJobStatus(jobId, apiKey);

    case "replicate":
      if (!apiKey) throw new Error("API key required");
      return await checkReplicateJobStatus(jobId, apiKey);

    case "openai-sora":
      if (!apiKey) throw new Error("API key required");
      return await checkSoraJobStatus(jobId, apiKey);

    default:
      return {
        success: false,
        status: "failed",
        error: "Unknown provider",
      };
  }
}

async function checkRunwayJobStatus(jobId: string, apiKey: string): Promise<GenerationResult> {
  const response = await fetch(`https://api.runwayml.com/v1/generations/${jobId}`, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "X-Runway-Version": "2024-11-06",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();

  return {
    success: data.status === "SUCCEEDED",
    status: data.status === "SUCCEEDED" ? "completed" : 
            data.status === "FAILED" ? "failed" : "processing",
    jobId: data.id,
    outputUrl: data.output?.[0],
    error: data.failure,
  };
}

async function checkReplicateJobStatus(jobId: string, apiKey: string): Promise<GenerationResult> {
  const response = await fetch(`https://api.replicate.com/v1/predictions/${jobId}`, {
    headers: { "Authorization": `Token ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;

  return {
    success: data.status === "succeeded",
    status: data.status === "succeeded" ? "completed" : 
            data.status === "failed" ? "failed" : "processing",
    jobId: data.id,
    outputUrl,
    error: data.error,
  };
}

async function checkSoraJobStatus(jobId: string, apiKey: string): Promise<GenerationResult> {
  const response = await fetch(`https://api.openai.com/v1/videos/generations/${jobId}`, {
    headers: { "Authorization": `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();

  return {
    success: data.status === "completed",
    status: data.status === "completed" ? "completed" : 
            data.status === "failed" ? "failed" : "processing",
    jobId: data.id,
    outputUrl: data.video_url,
    thumbnailUrl: data.thumbnail_url,
    error: data.error,
  };
}
