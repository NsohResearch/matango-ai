import { 
  BaseAIProvider, 
  GenerationInput, 
  GenerationOutput, 
  ProviderCapabilities, 
  UsageInfo,
  ProviderFactory 
} from "./BaseProvider";

/**
 * Replicate Provider
 * 
 * Access to thousands of open-source AI models.
 * Run Stable Video Diffusion, AnimateDiff, and more.
 * Requires user's own API key (BYOK).
 */
export class ReplicateProvider extends BaseAIProvider {
  constructor(apiKey: string) {
    super(apiKey, "https://api.replicate.com/v1");
  }
  
  get slug(): string {
    return "replicate";
  }
  
  get name(): string {
    return "Replicate";
  }
  
  get capabilities(): ProviderCapabilities {
    return {
      textToVideo: true,
      imageToVideo: true,
      textToImage: true,
      imageToImage: true,
      lipSync: false,
      voiceCloning: false,
      characterConsistency: false,
      maxDurationSeconds: 4,
      supportedAspectRatios: ["1:1", "16:9", "9:16"],
      supportedResolutions: ["512", "768", "1024"],
    };
  }
  
  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.makeRequest<{ username: string }>("/account");
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
      // Use Stable Video Diffusion for text-to-video
      const response = await this.makeRequest<{
        id: string;
        status: string;
        output?: string | string[];
        error?: string;
      }>("/predictions", {
        method: "POST",
        body: JSON.stringify({
          version: "3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438", // SVD
          input: {
            prompt: input.prompt,
            video_length: input.duration ? `${input.duration}_frames` : "14_frames",
            sizing_strategy: "maintain_aspect_ratio",
            seed: input.seed,
          },
        }),
      });
      
      const outputUrl = Array.isArray(response.output) ? response.output[0] : response.output;
      
      return {
        id: response.id,
        status: response.status === "succeeded" ? "completed" : 
                response.status === "failed" ? "failed" : "processing",
        progress: response.status === "succeeded" ? 100 : 50,
        outputUrl,
        error: response.error,
      };
    } catch (error) {
      return {
        id: `replicate-${Date.now()}`,
        status: "failed",
        progress: 0,
        error: error instanceof Error ? error.message : "Generation failed",
      };
    }
  }
  
  async imageToVideo(input: GenerationInput): Promise<GenerationOutput> {
    try {
      // Use Stable Video Diffusion img2vid
      const response = await this.makeRequest<{
        id: string;
        status: string;
        output?: string | string[];
        error?: string;
      }>("/predictions", {
        method: "POST",
        body: JSON.stringify({
          version: "3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438", // SVD
          input: {
            input_image: input.referenceImageUrl,
            video_length: input.duration ? `${input.duration}_frames` : "14_frames",
            sizing_strategy: "maintain_aspect_ratio",
            motion_bucket_id: 127,
            seed: input.seed,
          },
        }),
      });
      
      const outputUrl = Array.isArray(response.output) ? response.output[0] : response.output;
      
      return {
        id: response.id,
        status: response.status === "succeeded" ? "completed" : 
                response.status === "failed" ? "failed" : "processing",
        progress: response.status === "succeeded" ? 100 : 50,
        outputUrl,
        error: response.error,
      };
    } catch (error) {
      return {
        id: `replicate-${Date.now()}`,
        status: "failed",
        progress: 0,
        error: error instanceof Error ? error.message : "Generation failed",
      };
    }
  }
  
  async textToImage(input: GenerationInput): Promise<GenerationOutput> {
    try {
      // Use SDXL for text-to-image
      const response = await this.makeRequest<{
        id: string;
        status: string;
        output?: string[];
        error?: string;
      }>("/predictions", {
        method: "POST",
        body: JSON.stringify({
          version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b", // SDXL
          input: {
            prompt: input.prompt,
            negative_prompt: input.negativePrompt,
            width: this.getWidthFromAspectRatio(input.aspectRatio),
            height: this.getHeightFromAspectRatio(input.aspectRatio),
            num_outputs: 1,
            seed: input.seed,
          },
        }),
      });
      
      return {
        id: response.id,
        status: response.status === "succeeded" ? "completed" : 
                response.status === "failed" ? "failed" : "processing",
        progress: response.status === "succeeded" ? 100 : 50,
        outputUrl: response.output?.[0],
        thumbnailUrl: response.output?.[0],
        error: response.error,
      };
    } catch (error) {
      return {
        id: `replicate-${Date.now()}`,
        status: "failed",
        progress: 0,
        error: error instanceof Error ? error.message : "Generation failed",
      };
    }
  }
  
  async getJobStatus(jobId: string): Promise<GenerationOutput> {
    try {
      const response = await this.makeRequest<{
        id: string;
        status: string;
        output?: string | string[];
        error?: string;
        logs?: string;
      }>(`/predictions/${jobId}`);
      
      const outputUrl = Array.isArray(response.output) ? response.output[0] : response.output;
      
      // Parse progress from logs if available
      let progress = 50;
      if (response.status === "succeeded") progress = 100;
      else if (response.status === "failed") progress = 0;
      else if (response.logs) {
        const match = response.logs.match(/(\d+)%/);
        if (match) progress = parseInt(match[1], 10);
      }
      
      return {
        id: response.id,
        status: response.status === "succeeded" ? "completed" : 
                response.status === "failed" ? "failed" : "processing",
        progress,
        outputUrl,
        error: response.error,
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
      await this.makeRequest(`/predictions/${jobId}/cancel`, {
        method: "POST",
      });
      return true;
    } catch {
      return false;
    }
  }
  
  estimateCost(input: GenerationInput): UsageInfo {
    // Replicate pricing varies by model, approximately $0.0023 per second of GPU time
    // SVD takes about 30-60 seconds to generate
    const estimatedGpuSeconds = 45;
    const costPerSecond = 0.23; // cents
    
    return {
      creditsUsed: 1,
      estimatedCostCents: Math.round(estimatedGpuSeconds * costPerSecond),
      durationSeconds: input.duration || 4,
    };
  }
  
  protected getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Token ${this.apiKey}`,
    };
  }
  
  private getWidthFromAspectRatio(aspectRatio?: string): number {
    switch (aspectRatio) {
      case "1:1": return 1024;
      case "16:9": return 1344;
      case "9:16": return 768;
      default: return 1024;
    }
  }
  
  private getHeightFromAspectRatio(aspectRatio?: string): number {
    switch (aspectRatio) {
      case "1:1": return 1024;
      case "16:9": return 768;
      case "9:16": return 1344;
      default: return 1024;
    }
  }
}

// Register the provider
ProviderFactory.register("replicate", ReplicateProvider);
