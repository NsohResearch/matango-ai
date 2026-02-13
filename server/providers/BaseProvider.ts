/**
 * Base AI Provider Interface
 * 
 * All AI providers must implement this interface to ensure consistent
 * behavior across different services (Manus, Sora, Runway, etc.)
 */

export interface GenerationInput {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  duration?: number; // seconds
  seed?: number;
  referenceImageUrl?: string;
  referenceStrength?: number;
  style?: string;
  modelId?: string;
}

export interface GenerationOutput {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number; // 0-100
  outputUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderCapabilities {
  textToVideo: boolean;
  imageToVideo: boolean;
  textToImage: boolean;
  imageToImage: boolean;
  lipSync: boolean;
  voiceCloning: boolean;
  characterConsistency: boolean;
  maxDurationSeconds: number;
  supportedAspectRatios: string[];
  supportedResolutions: string[];
}

export interface UsageInfo {
  creditsUsed: number;
  estimatedCostCents: number;
  inputTokens?: number;
  outputTokens?: number;
  durationSeconds?: number;
}

export abstract class BaseAIProvider {
  protected apiKey: string;
  protected baseUrl: string;
  
  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || "";
  }
  
  /**
   * Provider slug for identification
   */
  abstract get slug(): string;
  
  /**
   * Provider display name
   */
  abstract get name(): string;
  
  /**
   * Provider capabilities
   */
  abstract get capabilities(): ProviderCapabilities;
  
  /**
   * Validate the API key
   */
  abstract validateCredentials(): Promise<{ valid: boolean; error?: string }>;
  
  /**
   * Generate video from text prompt
   */
  abstract textToVideo(input: GenerationInput): Promise<GenerationOutput>;
  
  /**
   * Generate video from image
   */
  abstract imageToVideo(input: GenerationInput): Promise<GenerationOutput>;
  
  /**
   * Generate image from text prompt
   */
  abstract textToImage(input: GenerationInput): Promise<GenerationOutput>;
  
  /**
   * Check the status of a generation job
   */
  abstract getJobStatus(jobId: string): Promise<GenerationOutput>;
  
  /**
   * Cancel a generation job
   */
  abstract cancelJob(jobId: string): Promise<boolean>;
  
  /**
   * Estimate cost for a generation
   */
  abstract estimateCost(input: GenerationInput): UsageInfo;
  
  /**
   * Helper to make authenticated requests
   */
  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...this.getAuthHeaders(),
      ...options.headers,
    };
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      throw new Error(error.message || error.error?.message || `Request failed: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Get authentication headers for the provider
   */
  protected abstract getAuthHeaders(): Record<string, string>;
}

/**
 * Provider Factory - Creates provider instances based on slug
 */
export class ProviderFactory {
  private static providers: Map<string, new (apiKey: string) => BaseAIProvider> = new Map();
  
  static register(slug: string, providerClass: new (apiKey: string) => BaseAIProvider) {
    this.providers.set(slug, providerClass);
  }
  
  static create(slug: string, apiKey: string): BaseAIProvider {
    const ProviderClass = this.providers.get(slug);
    if (!ProviderClass) {
      throw new Error(`Unknown provider: ${slug}`);
    }
    return new ProviderClass(apiKey);
  }
  
  static getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
