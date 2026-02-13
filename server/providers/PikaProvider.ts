/**
 * Pika Labs Provider Adapter
 * 
 * Integrates with Pika Labs API for video generation.
 * Supports text-to-video and image-to-video generation.
 * 
 * API Documentation: https://docs.pika.art/api
 */

import { 
  BaseAIProvider, 
  GenerationInput, 
  GenerationOutput, 
  ProviderCapabilities, 
  UsageInfo 
} from "./BaseProvider";

export class PikaProvider extends BaseAIProvider {
  constructor(apiKey: string) {
    super(apiKey, "https://api.pika.art/v1");
  }

  get slug(): string {
    return "pika";
  }

  get name(): string {
    return "Pika Labs";
  }

  get capabilities(): ProviderCapabilities {
    return {
      textToVideo: true,
      imageToVideo: true,
      textToImage: false,
      imageToImage: false,
      lipSync: false,
      voiceCloning: false,
      characterConsistency: true,
      maxDurationSeconds: 4, // Pika generates 3-4 second clips
      supportedAspectRatios: ["16:9", "9:16", "1:1", "4:5", "5:4"],
      supportedResolutions: ["720p", "1080p"],
    };
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      "Authorization": `Bearer ${this.apiKey}`,
    };
  }

  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.makeRequest<{ credits: number }>("/user/credits");
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : "Validation failed" 
      };
    }
  }

  async textToVideo(input: GenerationInput): Promise<GenerationOutput> {
    const body = {
      prompt: input.prompt,
      negative_prompt: input.negativePrompt,
      aspect_ratio: this.mapAspectRatio(input.aspectRatio),
      guidance_scale: 12,
      seed: input.seed,
      style: input.style,
    };

    try {
      const data = await this.makeRequest<{ id: string; status: string }>("/generate", {
        method: "POST",
        body: JSON.stringify(body),
      });

      return {
        id: data.id,
        status: "processing",
        progress: 0,
      };
    } catch (error) {
      return {
        id: "",
        status: "failed",
        progress: 0,
        error: error instanceof Error ? error.message : "Generation failed",
      };
    }
  }

  async imageToVideo(input: GenerationInput): Promise<GenerationOutput> {
    if (!input.referenceImageUrl) {
      return {
        id: "",
        status: "failed",
        progress: 0,
        error: "Reference image URL is required for image-to-video",
      };
    }

    const body = {
      prompt: input.prompt,
      negative_prompt: input.negativePrompt,
      image: input.referenceImageUrl,
      image_strength: input.referenceStrength || 0.5,
      aspect_ratio: this.mapAspectRatio(input.aspectRatio),
      guidance_scale: 12,
      seed: input.seed,
      style: input.style,
    };

    try {
      const data = await this.makeRequest<{ id: string; status: string }>("/generate", {
        method: "POST",
        body: JSON.stringify(body),
      });

      return {
        id: data.id,
        status: "processing",
        progress: 0,
      };
    } catch (error) {
      return {
        id: "",
        status: "failed",
        progress: 0,
        error: error instanceof Error ? error.message : "Generation failed",
      };
    }
  }

  async textToImage(_input: GenerationInput): Promise<GenerationOutput> {
    return {
      id: "",
      status: "failed",
      progress: 0,
      error: "Pika Labs does not support image generation",
    };
  }

  async getJobStatus(jobId: string): Promise<GenerationOutput> {
    try {
      const data = await this.makeRequest<{
        id: string;
        status: string;
        progress?: number;
        video_url?: string;
        thumbnail_url?: string;
        duration?: number;
        error?: string;
        output?: {
          video?: string;
          thumbnail?: string;
        };
      }>(`/generations/${jobId}`);

      const status = this.mapStatus(data.status);
      
      return {
        id: jobId,
        status,
        progress: data.progress || (status === "completed" ? 100 : 0),
        outputUrl: data.video_url || data.output?.video,
        thumbnailUrl: data.thumbnail_url || data.output?.thumbnail,
        durationSeconds: data.duration,
        error: data.error,
        metadata: {
          originalStatus: data.status,
        },
      };
    } catch (error) {
      return {
        id: jobId,
        status: "failed",
        progress: 0,
        error: error instanceof Error ? error.message : "Status check failed",
      };
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/generations/${jobId}/cancel`, {
        method: "POST",
      });
      return true;
    } catch {
      return false;
    }
  }

  estimateCost(input: GenerationInput): UsageInfo {
    // Pika uses a credit-based system
    // Base cost is ~10 credits per generation
    const baseCredits = 10;
    const costPerCredit = 0.01; // $0.01 per credit

    return {
      creditsUsed: baseCredits,
      estimatedCostCents: Math.round(baseCredits * costPerCredit * 100),
      durationSeconds: input.duration || 4,
    };
  }

  private mapAspectRatio(ratio?: string): string {
    const mapping: Record<string, string> = {
      "16:9": "16:9",
      "9:16": "9:16",
      "1:1": "1:1",
      "4:5": "4:5",
      "5:4": "5:4",
      "landscape": "16:9",
      "portrait": "9:16",
      "square": "1:1",
    };
    return mapping[ratio || "16:9"] || "16:9";
  }

  private mapStatus(status: string): "pending" | "processing" | "completed" | "failed" {
    switch (status.toLowerCase()) {
      case "completed":
      case "succeeded":
      case "success":
        return "completed";
      case "failed":
      case "error":
      case "cancelled":
        return "failed";
      case "pending":
      case "queued":
        return "pending";
      case "processing":
      case "running":
      default:
        return "processing";
    }
  }

  /**
   * Get available style presets for Pika
   */
  getStylePresets(): Array<{ id: string; name: string; description: string }> {
    return [
      { id: "cinematic", name: "Cinematic", description: "Film-like quality with dramatic lighting" },
      { id: "anime", name: "Anime", description: "Japanese animation style" },
      { id: "3d-cartoon", name: "3D Cartoon", description: "Pixar-style 3D animation" },
      { id: "watercolor", name: "Watercolor", description: "Soft, painterly watercolor effect" },
      { id: "clay", name: "Claymation", description: "Stop-motion clay animation style" },
      { id: "pixel", name: "Pixel Art", description: "Retro pixel art animation" },
      { id: "realistic", name: "Realistic", description: "Photorealistic video generation" },
    ];
  }

  /**
   * Get camera motion presets
   */
  getCameraPresets(): Array<{ id: string; name: string; description: string }> {
    return [
      { id: "static", name: "Static", description: "No camera movement" },
      { id: "zoom-in", name: "Zoom In", description: "Gradual zoom towards subject" },
      { id: "zoom-out", name: "Zoom Out", description: "Gradual zoom away from subject" },
      { id: "pan-left", name: "Pan Left", description: "Camera pans to the left" },
      { id: "pan-right", name: "Pan Right", description: "Camera pans to the right" },
      { id: "tilt-up", name: "Tilt Up", description: "Camera tilts upward" },
      { id: "tilt-down", name: "Tilt Down", description: "Camera tilts downward" },
      { id: "orbit", name: "Orbit", description: "Camera orbits around subject" },
    ];
  }
}

export default PikaProvider;

// Register the provider
import { ProviderFactory } from "./BaseProvider";
ProviderFactory.register("pika", PikaProvider);
