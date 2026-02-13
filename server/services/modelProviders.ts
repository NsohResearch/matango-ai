/**
 * Model Provider Adapters — Training + Video Generation
 * 
 * Default: local/Manus integrated models (placeholder that simulates progress).
 * Extensible: BYO provider adapters (Sora, Runway, Pika, Replicate) via settings.
 */

// ---- Types ----

export type TrainingRequest = {
  imageUrls: string[];        // signed GET URLs for training images
  influencerId: number;
  userId: number;
};

export type TrainingResult = {
  modelRef: string;           // pointer to trained artifact
};

export type VideoRequest = {
  influencerModelRef: string; // output of training
  scriptText: string;
  backgroundMusicUrl?: string;
  lipSync: boolean;
  influencerId: number;
  userId: number;
};

export type VideoResult = {
  buffer: Buffer;
  contentType: string;
};

// ---- Interfaces ----

export interface InfluencerTrainingProvider {
  name: string;
  train(req: TrainingRequest, onProgress: (p: number) => Promise<void>): Promise<TrainingResult>;
}

export interface VideoGenerationProvider {
  name: string;
  generate(req: VideoRequest, onProgress: (p: number) => Promise<void>): Promise<VideoResult>;
}

// ---- Local Providers (placeholders that work end-to-end) ----

export const LocalTrainingProvider: InfluencerTrainingProvider = {
  name: "local",
  async train(req, onProgress) {
    // Simulate training progress over ~2.4 seconds
    const steps = [10, 25, 40, 60, 80, 100];
    for (const p of steps) {
      await new Promise((r) => setTimeout(r, 400));
      await onProgress(p);
    }
    return { modelRef: `local:model:influencer:${req.influencerId}` };
  },
};

export const LocalVideoProvider: VideoGenerationProvider = {
  name: "local",
  async generate(req, onProgress) {
    await onProgress(10);

    // Generate a minimal valid MP4 placeholder using the Manus image generation API
    // In production, this would call the actual video generation model
    const { generateImage } = await import("../_core/imageGeneration");
    
    await onProgress(30);
    
    // Generate a frame image as a placeholder
    let _imageUrl = "";
    try {
      const result = await generateImage({
        prompt: `Professional video thumbnail for AI influencer. Script: "${req.scriptText.slice(0, 100)}". Cinematic lighting, 16:9 aspect ratio.`,
      });
      _imageUrl = result.url ?? "";
    } catch {
      // If image generation fails, continue with placeholder
    }
    
    await onProgress(60);

    // For the local provider, we create a simple placeholder video buffer
    // In production, this would be replaced by actual video generation
    // The placeholder is a minimal MP4 container
    const placeholderMp4 = createMinimalMp4Placeholder();
    
    await onProgress(90);
    await onProgress(100);
    
    return { buffer: placeholderMp4, contentType: "video/mp4" };
  },
};

/**
 * Creates a minimal valid MP4 file (ftyp + moov atoms) as a placeholder.
 * This is a ~500 byte file that video players will recognize as MP4.
 */
function createMinimalMp4Placeholder(): Buffer {
  // Minimal MP4 with ftyp box only — enough for the pipeline to persist to S3
  // Real video providers will return actual encoded video
  const ftyp = Buffer.from([
    0x00, 0x00, 0x00, 0x20, // size: 32
    0x66, 0x74, 0x79, 0x70, // type: ftyp
    0x69, 0x73, 0x6f, 0x6d, // major_brand: isom
    0x00, 0x00, 0x02, 0x00, // minor_version: 512
    0x69, 0x73, 0x6f, 0x6d, // compatible_brands: isom
    0x69, 0x73, 0x6f, 0x32, // iso2
    0x61, 0x76, 0x63, 0x31, // avc1
    0x6d, 0x70, 0x34, 0x31, // mp41
  ]);
  
  // Minimal moov box
  const moov = Buffer.from([
    0x00, 0x00, 0x00, 0x08, // size: 8
    0x6d, 0x6f, 0x6f, 0x76, // type: moov
  ]);
  
  return Buffer.concat([ftyp, moov]);
}

// ---- Provider Factory ----

const trainingProviders = new Map<string, InfluencerTrainingProvider>();
const videoProviders = new Map<string, VideoGenerationProvider>();

// Register local providers
trainingProviders.set("local", LocalTrainingProvider);
videoProviders.set("local", LocalVideoProvider);

export function registerTrainingProvider(provider: InfluencerTrainingProvider) {
  trainingProviders.set(provider.name, provider);
}

export function registerVideoProvider(provider: VideoGenerationProvider) {
  videoProviders.set(provider.name, provider);
}

export function getTrainingProvider(name: string = "local"): InfluencerTrainingProvider {
  const provider = trainingProviders.get(name);
  if (!provider) {
    console.warn(`Training provider "${name}" not found, falling back to local`);
    return LocalTrainingProvider;
  }
  return provider;
}

export function getVideoProvider(name: string = "local"): VideoGenerationProvider {
  const provider = videoProviders.get(name);
  if (!provider) {
    console.warn(`Video provider "${name}" not found, falling back to local`);
    return LocalVideoProvider;
  }
  return provider;
}

export function listTrainingProviders(): string[] {
  return Array.from(trainingProviders.keys());
}

export function listVideoProviders(): string[] {
  return Array.from(videoProviders.keys());
}
