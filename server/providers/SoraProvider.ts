import { 
  BaseAIProvider, 
  GenerationInput, 
  GenerationOutput, 
  ProviderCapabilities, 
  UsageInfo,
  ProviderFactory 
} from "./BaseProvider";

/**
 * OpenAI Sora Provider
 * 
 * State-of-the-art text-to-video generation from OpenAI.
 * Requires user's own API key (BYOK).
 */
export class SoraProvider extends BaseAIProvider {
  constructor(apiKey: string) {
    super(apiKey, "https://api.openai.com/v1");
  }
  
  get slug(): string {
    return "openai-sora";
  }
  
  get name(): string {
    return "OpenAI Sora";
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
      maxDurationSeconds: 60,
      supportedAspectRatios: ["1:1", "9:16", "16:9", "4:3"],
      supportedResolutions: ["480p", "720p", "1080p"],
    };
  }
  
  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.makeRequest<{ data: unknown[] }>("/models");
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : "Validation failed" 
      };
    }
  }
  
  async textToVideo(input: GenerationInput): Promise<GenerationOutput> {
    try {
      // Note: Sora API is not publicly available yet
      // This is a placeholder implementation based on expected API structure
      const response = await this.makeRequest<{
        id: string;
        status: string;
        output_url?: string;
      }>("/video/generations", {
        method: "POST",
        body: JSON.stringify({
          prompt: input.prompt,
          duration: input.duration || 5,
          aspect_ratio: input.aspectRatio || "16:9",
          style: input.style,
        }),
      });
      
      return {
        id: response.id,
        status: response.status === "succeeded" ? "completed" : "processing",
        progress: response.status === "succeeded" ? 100 : 50,
        outputUrl: response.output_url,
      };
    } catch (error) {
      // If Sora API is not available, return a meaningful error
      return {
        id: `sora-${Date.now()}`,
        status: "failed",
        progress: 0,
        error: "Sora API is not yet publicly available. Please check OpenAI's documentation for access.",
      };
    }
  }
  
  async imageToVideo(input: GenerationInput): Promise<GenerationOutput> {
    try {
      const response = await this.makeRequest<{
        id: string;
        status: string;
        output_url?: string;
      }>("/video/generations", {
        method: "POST",
        body: JSON.stringify({
          prompt: input.prompt,
          image_url: input.referenceImageUrl,
          duration: input.duration || 5,
          aspect_ratio: input.aspectRatio || "16:9",
        }),
      });
      
      return {
        id: response.id,
        status: response.status === "succeeded" ? "completed" : "processing",
        progress: response.status === "succeeded" ? 100 : 50,
        outputUrl: response.output_url,
      };
    } catch (error) {
      return {
        id: `sora-${Date.now()}`,
        status: "failed",
        progress: 0,
        error: "Sora API is not yet publicly available.",
      };
    }
  }
  
  async textToImage(input: GenerationInput): Promise<GenerationOutput> {
    // Sora is video-focused, use DALL-E for images
    try {
      const response = await this.makeRequest<{
        data: Array<{ url: string }>;
      }>("/images/generations", {
        method: "POST",
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: input.prompt,
          size: this.mapAspectRatioToSize(input.aspectRatio),
          quality: "hd",
          n: 1,
        }),
      });
      
      return {
        id: `dalle-${Date.now()}`,
        status: "completed",
        progress: 100,
        outputUrl: response.data[0]?.url,
        thumbnailUrl: response.data[0]?.url,
      };
    } catch (error) {
      return {
        id: `dalle-${Date.now()}`,
        status: "failed",
        progress: 0,
        error: error instanceof Error ? error.message : "Image generation failed",
      };
    }
  }
  
  async getJobStatus(jobId: string): Promise<GenerationOutput> {
    try {
      const response = await this.makeRequest<{
        id: string;
        status: string;
        output_url?: string;
        error?: { message: string };
      }>(`/video/generations/${jobId}`);
      
      return {
        id: response.id,
        status: response.status === "succeeded" ? "completed" : 
                response.status === "failed" ? "failed" : "processing",
        progress: response.status === "succeeded" ? 100 : 50,
        outputUrl: response.output_url,
        error: response.error?.message,
      };
    } catch (error) {
      return {
        id: jobId,
        status: "failed",
        progress: 0,
        error: error instanceof Error ? error.message : "Failed to get job status",
      };
    }
  }
  
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/video/generations/${jobId}/cancel`, {
        method: "POST",
      });
      return true;
    } catch {
      return false;
    }
  }
  
  estimateCost(input: GenerationInput): UsageInfo {
    // Sora pricing: approximately $0.15 per second of video
    const durationSeconds = input.duration || 5;
    const costPerSecond = 15; // cents
    
    return {
      creditsUsed: durationSeconds,
      estimatedCostCents: durationSeconds * costPerSecond,
      durationSeconds,
    };
  }
  
  protected getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
    };
  }
  
  private mapAspectRatioToSize(aspectRatio?: string): string {
    switch (aspectRatio) {
      case "1:1": return "1024x1024";
      case "16:9": return "1792x1024";
      case "9:16": return "1024x1792";
      default: return "1024x1024";
    }
  }
}

// Register the provider
ProviderFactory.register("openai-sora", SoraProvider);
