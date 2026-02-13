import { 
  BaseAIProvider, 
  GenerationInput, 
  GenerationOutput, 
  ProviderCapabilities, 
  UsageInfo,
  ProviderFactory 
} from "./BaseProvider";

/**
 * Runway Provider
 * 
 * Professional-grade AI video generation with Gen-3 Alpha.
 * Requires user's own API key (BYOK).
 */
export class RunwayProvider extends BaseAIProvider {
  constructor(apiKey: string) {
    super(apiKey, "https://api.runwayml.com/v1");
  }
  
  get slug(): string {
    return "runway";
  }
  
  get name(): string {
    return "Runway";
  }
  
  get capabilities(): ProviderCapabilities {
    return {
      textToVideo: true,
      imageToVideo: true,
      textToImage: false,
      imageToImage: false,
      lipSync: true,
      voiceCloning: false,
      characterConsistency: true,
      maxDurationSeconds: 16,
      supportedAspectRatios: ["16:9", "9:16", "1:1"],
      supportedResolutions: ["720p", "1080p"],
    };
  }
  
  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.makeRequest<{ id: string }>("/account");
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
      const response = await this.makeRequest<{
        id: string;
        status: string;
        output?: string[];
      }>("/generations", {
        method: "POST",
        body: JSON.stringify({
          model: "gen3a_turbo",
          prompt: input.prompt,
          duration: Math.min(input.duration || 5, 10), // Gen-3 supports up to 10s
          ratio: input.aspectRatio || "16:9",
          seed: input.seed,
        }),
      });
      
      return {
        id: response.id,
        status: response.status === "SUCCEEDED" ? "completed" : 
                response.status === "FAILED" ? "failed" : "processing",
        progress: response.status === "SUCCEEDED" ? 100 : 50,
        outputUrl: response.output?.[0],
      };
    } catch (error) {
      return {
        id: `runway-${Date.now()}`,
        status: "failed",
        progress: 0,
        error: error instanceof Error ? error.message : "Generation failed",
      };
    }
  }
  
  async imageToVideo(input: GenerationInput): Promise<GenerationOutput> {
    try {
      const response = await this.makeRequest<{
        id: string;
        status: string;
        output?: string[];
      }>("/generations", {
        method: "POST",
        body: JSON.stringify({
          model: "gen3a_turbo",
          prompt: input.prompt,
          image: input.referenceImageUrl,
          duration: Math.min(input.duration || 5, 10),
          ratio: input.aspectRatio || "16:9",
          seed: input.seed,
        }),
      });
      
      return {
        id: response.id,
        status: response.status === "SUCCEEDED" ? "completed" : 
                response.status === "FAILED" ? "failed" : "processing",
        progress: response.status === "SUCCEEDED" ? 100 : 50,
        outputUrl: response.output?.[0],
      };
    } catch (error) {
      return {
        id: `runway-${Date.now()}`,
        status: "failed",
        progress: 0,
        error: error instanceof Error ? error.message : "Generation failed",
      };
    }
  }
  
  async textToImage(input: GenerationInput): Promise<GenerationOutput> {
    // Runway doesn't support text-to-image directly
    return {
      id: `runway-${Date.now()}`,
      status: "failed",
      progress: 0,
      error: "Runway does not support text-to-image generation. Please use a different provider.",
    };
  }
  
  async getJobStatus(jobId: string): Promise<GenerationOutput> {
    try {
      const response = await this.makeRequest<{
        id: string;
        status: string;
        output?: string[];
        failure?: string;
        progress?: number;
      }>(`/generations/${jobId}`);
      
      return {
        id: response.id,
        status: response.status === "SUCCEEDED" ? "completed" : 
                response.status === "FAILED" ? "failed" : "processing",
        progress: response.progress || (response.status === "SUCCEEDED" ? 100 : 50),
        outputUrl: response.output?.[0],
        error: response.failure,
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
      await this.makeRequest(`/generations/${jobId}`, {
        method: "DELETE",
      });
      return true;
    } catch {
      return false;
    }
  }
  
  estimateCost(input: GenerationInput): UsageInfo {
    // Runway pricing: approximately $0.05 per second of video
    const durationSeconds = Math.min(input.duration || 5, 10);
    const costPerSecond = 5; // cents
    
    return {
      creditsUsed: durationSeconds * 10, // 10 credits per second
      estimatedCostCents: durationSeconds * costPerSecond,
      durationSeconds,
    };
  }
  
  protected getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "X-Runway-Version": "2024-11-06",
    };
  }
}

// Register the provider
ProviderFactory.register("runway", RunwayProvider);
