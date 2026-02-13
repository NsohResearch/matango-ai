import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { 
  Upload, 
  FileText, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  User,
  Palette,
  Sliders,
  Wand2,
  Eye,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Check,
  Loader2,
  Brain,
  Star,
  Camera,
  Layers,
  Zap,
  Copy,
  RotateCcw,
  Settings,
  Image as ImageIcon,
  Grid3X3,
  Move,
  Paintbrush,
  Maximize2,
  Minimize2,
  RefreshCw,
  Target,
  Crosshair,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type CreationMethod = "image_upload" | "text_prompt" | "template" | null;
type CreationStep = "choose_method" | "upload_images" | "describe_character" | "select_template" | "customize" | "preview" | "generating";

interface CharacterAttributes {
  name: string;
  gender: "male" | "female" | "non_binary" | "other" | "";
  ageRange: "young_adult" | "adult" | "middle_aged" | "senior" | "";
  ethnicity: string;
  bodyType: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  skinTone: string;
  facialFeatures: string;
  distinctiveFeatures: string;
}

interface StyleSettings {
  stylePreset: string;
  consistencyWeight: number;
  keepOutfit: boolean;
  styleBias: number;
}

// ============================================================
// OpenArt-Grade: Advanced Generation Controls
// ============================================================

interface AdvancedGenSettings {
  negativePrompt: string;
  guidanceScale: number;
  steps: number;
  seed: number | null;
  scheduler: string;
  batchSize: number;
  controlNetEnabled: boolean;
  controlNetType: string;
  controlNetWeight: number;
  inpaintingEnabled: boolean;
  upscaleEnabled: boolean;
  upscaleFactor: number;
  loraModel: string;
  loraWeight: number;
}

const CAMERA_PRESETS = [
  { id: "headshot", name: "Headshot", desc: "Close-up face portrait", angle: "front", distance: "close" },
  { id: "half_body", name: "Half Body", desc: "Waist-up portrait", angle: "front", distance: "medium" },
  { id: "full_body", name: "Full Body", desc: "Full figure shot", angle: "front", distance: "far" },
  { id: "profile_left", name: "Profile Left", desc: "Side view facing left", angle: "left", distance: "medium" },
  { id: "profile_right", name: "Profile Right", desc: "Side view facing right", angle: "right", distance: "medium" },
  { id: "three_quarter", name: "3/4 View", desc: "Classic 3/4 angle", angle: "3/4", distance: "medium" },
  { id: "overhead", name: "Overhead", desc: "Bird's eye view", angle: "top", distance: "medium" },
  { id: "low_angle", name: "Low Angle", desc: "Looking up heroic", angle: "low", distance: "medium" },
];

const POSE_PRESETS = [
  { id: "standing_casual", name: "Standing Casual", icon: "\ud83e\uddcd" },
  { id: "sitting", name: "Sitting", icon: "\ud83e\uddd1\u200d\ud83d\udcbb" },
  { id: "walking", name: "Walking", icon: "\ud83d\udeb6" },
  { id: "arms_crossed", name: "Arms Crossed", icon: "\ud83d\ude4e" },
  { id: "hand_on_hip", name: "Hand on Hip", icon: "\ud83d\udcaa" },
  { id: "pointing", name: "Pointing", icon: "\ud83d\udc46" },
  { id: "waving", name: "Waving", icon: "\ud83d\udc4b" },
  { id: "thinking", name: "Thinking", icon: "\ud83e\udd14" },
  { id: "laughing", name: "Laughing", icon: "\ud83d\ude02" },
  { id: "professional", name: "Professional", icon: "\ud83d\udc54" },
];

const LIGHTING_PRESETS = [
  { id: "natural", name: "Natural", desc: "Soft daylight" },
  { id: "studio", name: "Studio", desc: "Professional 3-point" },
  { id: "golden_hour", name: "Golden Hour", desc: "Warm sunset glow" },
  { id: "dramatic", name: "Dramatic", desc: "High contrast chiaroscuro" },
  { id: "neon", name: "Neon", desc: "Cyberpunk neon lights" },
  { id: "soft_box", name: "Soft Box", desc: "Even, flattering light" },
  { id: "rim_light", name: "Rim Light", desc: "Backlit silhouette edge" },
  { id: "overcast", name: "Overcast", desc: "Diffused cloudy day" },
];

const CONTROLNET_TYPES = [
  { id: "pose", name: "Pose (OpenPose)", desc: "Control body pose" },
  { id: "depth", name: "Depth Map", desc: "Control spatial depth" },
  { id: "canny", name: "Canny Edge", desc: "Edge detection guide" },
  { id: "normal", name: "Normal Map", desc: "Surface normal control" },
  { id: "segmentation", name: "Segmentation", desc: "Semantic regions" },
];

const SCHEDULERS = [
  { id: "euler_a", name: "Euler Ancestral" },
  { id: "euler", name: "Euler" },
  { id: "dpm_2m", name: "DPM++ 2M" },
  { id: "dpm_2m_karras", name: "DPM++ 2M Karras" },
  { id: "ddim", name: "DDIM" },
  { id: "uni_pc", name: "UniPC" },
];

const PROMPT_TEMPLATES = [
  { id: "portrait", name: "Portrait", template: "professional portrait photo of {name}, {hair} hair, {eyes} eyes, {style} style, high quality, detailed, sharp focus" },
  { id: "fashion", name: "Fashion Editorial", template: "{name} in a high-fashion editorial shoot, designer outfit, dramatic lighting, magazine cover quality, {style}" },
  { id: "lifestyle", name: "Lifestyle", template: "{name} in a candid lifestyle photo, natural setting, warm lighting, authentic expression, {style}" },
  { id: "fitness", name: "Fitness", template: "{name} in athletic wear, fitness pose, gym or outdoor setting, energetic, healthy glow, {style}" },
  { id: "business", name: "Business", template: "{name} in professional business attire, corporate headshot, confident expression, clean background, {style}" },
  { id: "social_media", name: "Social Media", template: "{name} taking a selfie, trendy outfit, aesthetic background, instagram-worthy, vibrant colors, {style}" },
];

const NEGATIVE_PROMPT_LIBRARY = [
  { id: "quality", name: "Quality Issues", prompt: "low quality, blurry, pixelated, noisy, artifacts, jpeg artifacts, compression" },
  { id: "anatomy", name: "Anatomy Fixes", prompt: "extra fingers, extra limbs, deformed hands, deformed face, cross-eyed, asymmetric eyes" },
  { id: "style", name: "Style Cleanup", prompt: "cartoon, anime, illustration, painting, drawing, sketch, watermark, text, logo" },
  { id: "nsfw", name: "Content Safety", prompt: "nsfw, nude, explicit, inappropriate, offensive, violent, gore" },
];

interface Template {
  id: number;
  name: string;
  description: string;
  category: string;
  thumbnailUrl: string;
  isPremium: boolean;
}

const STYLE_PRESETS = [
  { id: "photorealistic", name: "Photorealistic", icon: "📷", description: "Ultra-realistic, photo-like quality" },
  { id: "anime", name: "Anime", icon: "🎌", description: "Japanese animation style" },
  { id: "cartoon", name: "Cartoon", icon: "🎨", description: "Fun, stylized cartoon look" },
  { id: "3d_render", name: "3D Render", icon: "🎮", description: "Modern 3D rendered style" },
  { id: "illustration", name: "Illustration", icon: "✏️", description: "Hand-drawn illustration feel" },
  { id: "oil_painting", name: "Oil Painting", icon: "🖼️", description: "Classic oil painting aesthetic" },
  { id: "fashion", name: "Fashion", icon: "👗", description: "High-fashion editorial style" },
  { id: "cinematic", name: "Cinematic", icon: "🎬", description: "Movie poster quality" },
];

const SAMPLE_TEMPLATES: Template[] = [
  { id: 1, name: "Professional Influencer", description: "Clean, professional look for business content", category: "business", thumbnailUrl: "/api/placeholder/200/200", isPremium: false },
  { id: 2, name: "Fitness Coach", description: "Athletic, energetic persona", category: "fitness", thumbnailUrl: "/api/placeholder/200/200", isPremium: false },
  { id: 3, name: "Fashion Model", description: "High-fashion, editorial style", category: "fashion", thumbnailUrl: "/api/placeholder/200/200", isPremium: true },
  { id: 4, name: "Tech Reviewer", description: "Modern, tech-savvy appearance", category: "tech", thumbnailUrl: "/api/placeholder/200/200", isPremium: false },
  { id: 5, name: "Lifestyle Blogger", description: "Warm, approachable personality", category: "lifestyle", thumbnailUrl: "/api/placeholder/200/200", isPremium: false },
  { id: 6, name: "Gaming Streamer", description: "Vibrant, energetic gamer look", category: "gaming", thumbnailUrl: "/api/placeholder/200/200", isPremium: true },
];

export default function CreateInfluencerPro() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  
  // State
  const [creationMethod, setCreationMethod] = useState<CreationMethod>(null);
  const [currentStep, setCurrentStep] = useState<CreationStep>("choose_method");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [textPrompt, setTextPrompt] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  // Character attributes
  const [attributes, setAttributes] = useState<CharacterAttributes>({
    name: "",
    gender: "",
    ageRange: "",
    ethnicity: "",
    bodyType: "",
    hairStyle: "",
    hairColor: "",
    eyeColor: "",
    skinTone: "",
    facialFeatures: "",
    distinctiveFeatures: "",
  });
  
  // Style settings
  const [styleSettings, setStyleSettings] = useState<StyleSettings>({
    stylePreset: "photorealistic",
    consistencyWeight: 80,
    keepOutfit: false,
    styleBias: 50,
  });
  
  // Brand Brain binding
  const [selectedBrandBrain, setSelectedBrandBrain] = useState<number | null>(null);

  // ============================================================
  // OpenArt-Grade State
  // ============================================================
  const [advancedGen, setAdvancedGen] = useState<AdvancedGenSettings>({
    negativePrompt: "",
    guidanceScale: 7.5,
    steps: 30,
    seed: null,
    scheduler: "euler_a",
    batchSize: 1,
    controlNetEnabled: false,
    controlNetType: "pose",
    controlNetWeight: 0.8,
    inpaintingEnabled: false,
    upscaleEnabled: false,
    upscaleFactor: 2,
    loraModel: "none",
    loraWeight: 0.7,
  });
  const [selectedCamera, setSelectedCamera] = useState("headshot");
  const [selectedPose, setSelectedPose] = useState("standing_casual");
  const [selectedLighting, setSelectedLighting] = useState("natural");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [selectedNegatives, setSelectedNegatives] = useState<string[]>(["quality", "anatomy"]);
  const [showPromptBuilder, setShowPromptBuilder] = useState(false);
  
  // Expanded sections
  const [expandedSections, setExpandedSections] = useState({
    appearance: true,
    style: true,
    advanced: false,
    brandBrain: false,
    camera: false,
    pose: false,
    lighting: false,
    controlNet: false,
    generation: false,
  });

  // Fetch user's existing influencers
  const { data: existingInfluencers } = trpc.influencer.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // Limit to max 5 reference images
      const remainingSlots = 5 - uploadedImages.length;
      if (remainingSlots <= 0) {
        toast.error("Maximum 5 reference images allowed for best training results");
        return;
      }
      
      const filesToProcess = Array.from(files).slice(0, remainingSlots);
      const newImages: string[] = [];
      
      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            newImages.push(event.target.result as string);
            if (newImages.length === filesToProcess.length) {
              setUploadedImages(prev => [...prev, ...newImages].slice(0, 5));
              if (files.length > remainingSlots) {
                toast.info(`Only ${remainingSlots} image(s) added. Maximum 5 reference images allowed.`);
              }
            }
          }
        };
        reader.readAsDataURL(file);
      });
    }
  }, [uploadedImages.length]);

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Handle method selection
  const selectMethod = (method: CreationMethod) => {
    setCreationMethod(method);
    if (method === "image_upload") {
      setCurrentStep("upload_images");
    } else if (method === "text_prompt") {
      setCurrentStep("describe_character");
    } else if (method === "template") {
      setCurrentStep("select_template");
    }
  };

  // Navigation
  const goBack = () => {
    if (currentStep === "upload_images" || currentStep === "describe_character" || currentStep === "select_template") {
      setCurrentStep("choose_method");
      setCreationMethod(null);
    } else if (currentStep === "customize") {
      if (creationMethod === "image_upload") setCurrentStep("upload_images");
      else if (creationMethod === "text_prompt") setCurrentStep("describe_character");
      else if (creationMethod === "template") setCurrentStep("select_template");
    } else if (currentStep === "preview") {
      setCurrentStep("customize");
    }
  };

  const goNext = () => {
    if (currentStep === "upload_images" && uploadedImages.length > 0) {
      setCurrentStep("customize");
    } else if (currentStep === "describe_character" && textPrompt.trim()) {
      setCurrentStep("customize");
    } else if (currentStep === "select_template" && selectedTemplate) {
      setCurrentStep("customize");
    } else if (currentStep === "customize") {
      setCurrentStep("preview");
    }
  };

  // Start generation
  const startGeneration = async () => {
    setIsGenerating(true);
    setCurrentStep("generating");
    
    // Simulate generation progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setGenerationProgress(i);
    }
    
    toast.success("AI Influencer created successfully!");
    
    // Navigate to the influencer studio
    setTimeout(() => {
      navigate("/influencer-studio");
    }, 1000);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <h1 className="text-3xl font-bold mb-4">Sign In Required</h1>
          <p className="text-muted-foreground mb-8">Please sign in to create an AI influencer</p>
          <a href={getLoginUrl()}>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Sign In
            </Button>
          </a>
        </div>
      </div>
    );
  }

  // Render method selection
  const renderMethodSelection = () => (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Create Your AI Influencer</h1>
        <p className="text-muted-foreground text-lg">Start building characters to use in your future content creation!</p>
      </div>

      {/* Two main paths */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {/* Start with Image */}
        <button
          onClick={() => selectMethod("image_upload")}
          className="group relative bg-card border border-border rounded-2xl p-8 hover:border-primary/50 hover:bg-accent/50 transition-all duration-300 text-left"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity" />
          <div className="relative">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl flex items-center justify-center">
              <Upload className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-center mb-2">Start with Image</h3>
            <p className="text-muted-foreground text-center text-sm">Upload reference photos to create a consistent character</p>
            <div className="mt-6 flex justify-center">
              <span className="inline-flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
                Upload Images <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </button>

        {/* Start with Description */}
        <button
          onClick={() => selectMethod("text_prompt")}
          className="group relative bg-card border border-border rounded-2xl p-8 hover:border-secondary/50 hover:bg-accent/50 transition-all duration-300 text-left"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity" />
          <div className="relative">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-secondary/20 to-blue-500/20 rounded-2xl flex items-center justify-center">
              <FileText className="w-12 h-12 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold text-center mb-2">Start with Description</h3>
            <p className="text-muted-foreground text-center text-sm">Describe your character and let AI bring them to life</p>
            <div className="mt-6 flex justify-center">
              <span className="inline-flex items-center gap-2 text-secondary font-medium group-hover:gap-3 transition-all">
                Describe Character <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* My Characters Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">My Characters</h2>
        {existingInfluencers && existingInfluencers.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {existingInfluencers.map((influencer: any) => (
              <Link key={influencer.id} href={`/influencer/${influencer.id}`}>
                <Card className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                    {influencer.avatarUrl ? (
                      <img src={influencer.avatarUrl} alt={influencer.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h4 className="font-medium text-sm truncate">{influencer.name}</h4>
                    <p className="text-muted-foreground text-xs">Created by you</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No characters created yet. Start by choosing a method above!</p>
          </Card>
        )}
      </div>

      {/* Character Library */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Character Library</h2>
        <p className="text-muted-foreground mb-6">Use these templates to get started quickly!</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {SAMPLE_TEMPLATES.map(template => (
            <button
              key={template.id}
              onClick={() => {
                setSelectedTemplate(template);
                selectMethod("template");
              }}
              className="group relative bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all text-left"
            >
              <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              {template.isPremium && (
                <div className="absolute top-2 right-2 bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <Star className="w-3 h-3" /> PRO
                </div>
              )}
              <div className="p-3">
                <h4 className="text-sm font-medium truncate">{template.name}</h4>
                <p className="text-muted-foreground text-xs">By Matango</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Render image upload step
  const renderImageUpload = () => (
    <div className="max-w-4xl mx-auto">
      <Button variant="ghost" onClick={goBack} className="mb-8">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Upload Reference Images</h2>
        <p className="text-muted-foreground">Upload 2-5 images of the same person for best training results</p>
      </div>

      {/* Upload area */}
      <Card className="border-2 border-dashed p-8 mb-8 hover:border-primary/50 transition-colors">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
          id="image-upload"
        />
        <label htmlFor="image-upload" className="cursor-pointer block text-center">
          <Upload className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="font-medium mb-2">Click to upload or drag and drop</p>
          <p className="text-muted-foreground text-sm">PNG, JPG, WEBP up to 10MB each</p>
        </label>
      </Card>

      {/* Uploaded images grid */}
      {uploadedImages.length > 0 && (
        <div className="mb-8">
          <h3 className="font-medium mb-4">Uploaded Images ({uploadedImages.length}/5)</h3>
          <div className="grid grid-cols-5 gap-4">
            {uploadedImages.map((img, index) => (
              <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                <img src={img} alt={`Reference ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {uploadedImages.length < 5 && (
              <label htmlFor="image-upload" className="aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </label>
            )}
          </div>
        </div>
      )}

      {/* Tips */}
      <Card className="bg-secondary/10 border-secondary/30 p-6 mb-8">
        <h4 className="text-secondary font-medium mb-3">Tips for best results:</h4>
        <ul className="text-muted-foreground text-sm space-y-2">
          <li className="flex items-start gap-2"><Check className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" /> Use high-quality, well-lit photos</li>
          <li className="flex items-start gap-2"><Check className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" /> Include different angles and expressions</li>
          <li className="flex items-start gap-2"><Check className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" /> Avoid heavily filtered or edited images</li>
          <li className="flex items-start gap-2"><Check className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" /> Ensure the face is clearly visible</li>
        </ul>
      </Card>

      {/* Continue button */}
      <div className="flex justify-end">
        <Button
          onClick={goNext}
          disabled={uploadedImages.length === 0}
          className="bg-primary"
        >
          Continue to Customize <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render text prompt step
  const renderTextPrompt = () => (
    <div className="max-w-4xl mx-auto">
      <Button variant="ghost" onClick={goBack} className="mb-8">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Describe Your Character</h2>
        <p className="text-muted-foreground">Write a detailed description of your AI influencer</p>
      </div>

      {/* Text prompt area */}
      <div className="mb-8">
        <Textarea
          value={textPrompt}
          onChange={(e) => setTextPrompt(e.target.value)}
          placeholder="Describe your character in detail. For example: A young woman in her mid-20s with long wavy auburn hair, bright green eyes, and a warm smile. She has a modern, professional style and often wears business casual attire. Her personality is friendly, confident, and approachable..."
          className="min-h-[200px]"
        />
        <div className="flex justify-between mt-2">
          <span className="text-muted-foreground text-sm">{textPrompt.length} characters</span>
          <span className="text-muted-foreground text-sm">Recommended: 100-500 characters</span>
        </div>
      </div>

      {/* Quick attributes */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-2">
          <Label>Gender</Label>
          <select
            value={attributes.gender}
            onChange={(e) => setAttributes(prev => ({ ...prev, gender: e.target.value as CharacterAttributes["gender"] }))}
            className="w-full bg-background border border-input rounded-md px-4 py-2 focus:border-primary focus:outline-none"
          >
            <option value="">Select gender</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="non_binary">Non-binary</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Age Range</Label>
          <select
            value={attributes.ageRange}
            onChange={(e) => setAttributes(prev => ({ ...prev, ageRange: e.target.value as CharacterAttributes["ageRange"] }))}
            className="w-full bg-background border border-input rounded-md px-4 py-2 focus:border-primary focus:outline-none"
          >
            <option value="">Select age range</option>
            <option value="young_adult">Young Adult (20-29)</option>
            <option value="adult">Adult (30-45)</option>
            <option value="middle_aged">Middle Aged (46-60)</option>
            <option value="senior">Senior (60+)</option>
          </select>
        </div>
      </div>

      {/* Example prompts */}
      <Card className="p-6 mb-8">
        <h4 className="font-medium mb-4">Example Prompts:</h4>
        <div className="space-y-3">
          {[
            "A confident tech entrepreneur in his early 30s with short dark hair and a well-groomed beard. He has a modern, minimalist style and often wears smart casual outfits.",
            "A vibrant fitness influencer in her mid-20s with long blonde hair in a ponytail. She has an athletic build and a bright, energetic personality.",
            "A sophisticated fashion blogger with elegant features, dark skin, and natural curly hair. She exudes confidence and has an eye for high-end fashion.",
          ].map((example, index) => (
            <button
              key={index}
              onClick={() => setTextPrompt(example)}
              className="block w-full text-left text-muted-foreground text-sm p-3 rounded-lg hover:bg-accent hover:text-foreground transition-colors"
            >
              "{example.slice(0, 100)}..."
            </button>
          ))}
        </div>
      </Card>

      {/* Continue button */}
      <div className="flex justify-end">
        <Button
          onClick={goNext}
          disabled={!textPrompt.trim()}
          className="bg-primary"
        >
          Continue to Customize <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render template selection
  const renderTemplateSelection = () => (
    <div className="max-w-6xl mx-auto">
      <Button variant="ghost" onClick={goBack} className="mb-8">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Choose a Template</h2>
        <p className="text-muted-foreground">Select a pre-made character template to customize</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
        {SAMPLE_TEMPLATES.map(template => (
          <button
            key={template.id}
            onClick={() => setSelectedTemplate(template)}
            className={`relative bg-card border rounded-xl overflow-hidden transition-all text-left ${
              selectedTemplate?.id === template.id 
                ? "border-primary ring-2 ring-primary/50" 
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-muted-foreground" />
            </div>
            {template.isPremium && (
              <div className="absolute top-2 right-2 bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <Star className="w-3 h-3" /> PRO
              </div>
            )}
            {selectedTemplate?.id === template.id && (
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground p-1 rounded-full">
                <Check className="w-4 h-4" />
              </div>
            )}
            <div className="p-4">
              <h4 className="font-medium">{template.name}</h4>
              <p className="text-muted-foreground text-sm mt-1">{template.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Continue button */}
      <div className="flex justify-end">
        <Button
          onClick={goNext}
          disabled={!selectedTemplate}
          className="bg-primary"
        >
          Continue to Customize <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render customization step
  const renderCustomization = () => (
    <div className="max-w-6xl mx-auto">
      <Button variant="ghost" onClick={goBack} className="mb-8">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Settings */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold">Customize Your Character</h2>

          {/* Character Name */}
          <Card className="p-6">
            <Label className="text-base font-medium mb-3 block">Character Name</Label>
            <Input
              value={attributes.name}
              onChange={(e) => setAttributes(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter a name for your AI influencer"
            />
          </Card>

          {/* Appearance Section */}
          <Card className="overflow-hidden">
            <button
              onClick={() => toggleSection("appearance")}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-primary" />
                <span className="font-medium">Appearance</span>
              </div>
              {expandedSections.appearance ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </button>
            {expandedSections.appearance && (
              <div className="px-6 pb-6 grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hair Style</Label>
                  <Input
                    value={attributes.hairStyle}
                    onChange={(e) => setAttributes(prev => ({ ...prev, hairStyle: e.target.value }))}
                    placeholder="e.g., Long wavy, Short pixie"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hair Color</Label>
                  <Input
                    value={attributes.hairColor}
                    onChange={(e) => setAttributes(prev => ({ ...prev, hairColor: e.target.value }))}
                    placeholder="e.g., Auburn, Blonde"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Eye Color</Label>
                  <Input
                    value={attributes.eyeColor}
                    onChange={(e) => setAttributes(prev => ({ ...prev, eyeColor: e.target.value }))}
                    placeholder="e.g., Green, Brown"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Skin Tone</Label>
                  <Input
                    value={attributes.skinTone}
                    onChange={(e) => setAttributes(prev => ({ ...prev, skinTone: e.target.value }))}
                    placeholder="e.g., Fair, Olive, Dark"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Distinctive Features</Label>
                  <Input
                    value={attributes.distinctiveFeatures}
                    onChange={(e) => setAttributes(prev => ({ ...prev, distinctiveFeatures: e.target.value }))}
                    placeholder="e.g., Freckles, dimples, beauty mark"
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Style Section */}
          <Card className="overflow-hidden">
            <button
              onClick={() => toggleSection("style")}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-secondary" />
                <span className="font-medium">Style Preset</span>
              </div>
              {expandedSections.style ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </button>
            {expandedSections.style && (
              <div className="px-6 pb-6">
                <div className="grid grid-cols-4 gap-3">
                  {STYLE_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => setStyleSettings(prev => ({ ...prev, stylePreset: preset.id }))}
                      className={`p-4 rounded-xl border transition-all ${
                        styleSettings.stylePreset === preset.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <div className="text-2xl mb-2">{preset.icon}</div>
                      <div className="text-sm font-medium">{preset.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Advanced Settings */}
          <Card className="overflow-hidden">
            <button
              onClick={() => toggleSection("advanced")}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <div className="flex items-center gap-3">
                <Sliders className="w-5 h-5 text-purple-500" />
                <span className="font-medium">Consistency Controls</span>
              </div>
              {expandedSections.advanced ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </button>
            {expandedSections.advanced && (
              <div className="px-6 pb-6 space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <Label>Character Consistency</Label>
                    <span className="text-primary text-sm">{styleSettings.consistencyWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={styleSettings.consistencyWeight}
                    onChange={(e) => setStyleSettings(prev => ({ ...prev, consistencyWeight: parseInt(e.target.value) }))}
                    className="w-full accent-primary"
                  />
                  <p className="text-muted-foreground text-xs mt-1">Higher values maintain more consistent facial features across generations</p>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <Label>Style Bias</Label>
                    <span className="text-secondary text-sm">{styleSettings.styleBias}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={styleSettings.styleBias}
                    onChange={(e) => setStyleSettings(prev => ({ ...prev, styleBias: parseInt(e.target.value) }))}
                    className="w-full accent-secondary"
                  />
                  <p className="text-muted-foreground text-xs mt-1">Balance between reference images and style preset</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Keep Outfit Consistent</Label>
                    <p className="text-muted-foreground text-xs">Maintain the same clothing across generations</p>
                  </div>
                  <button
                    onClick={() => setStyleSettings(prev => ({ ...prev, keepOutfit: !prev.keepOutfit }))}
                    className={`w-12 h-6 rounded-full transition-colors ${styleSettings.keepOutfit ? "bg-primary" : "bg-muted"}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow ${styleSettings.keepOutfit ? "translate-x-6" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* ============================================================ */}
          {/* OpenArt-Grade: Camera Preset */}
          {/* ============================================================ */}
          <Card className="overflow-hidden">
            <button
              onClick={() => toggleSection("camera")}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <div className="flex items-center gap-3">
                <Camera className="w-5 h-5 text-blue-500" />
                <span className="font-medium">Camera & Framing</span>
                <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-400/30">OpenArt</Badge>
              </div>
              {expandedSections.camera ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </button>
            {expandedSections.camera && (
              <div className="px-6 pb-6">
                <div className="grid grid-cols-4 gap-2">
                  {CAMERA_PRESETS.map(cam => (
                    <button
                      key={cam.id}
                      onClick={() => setSelectedCamera(cam.id)}
                      className={`p-3 rounded-xl border transition-all text-left ${selectedCamera === cam.id ? "border-blue-500 bg-blue-500/10" : "border-border hover:border-muted-foreground"}`}
                    >
                      <div className="text-sm font-medium">{cam.name}</div>
                      <div className="text-[10px] text-muted-foreground">{cam.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* OpenArt-Grade: Pose Preset */}
          <Card className="overflow-hidden">
            <button
              onClick={() => toggleSection("pose")}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <div className="flex items-center gap-3">
                <Move className="w-5 h-5 text-orange-500" />
                <span className="font-medium">Pose Control</span>
                <Badge variant="outline" className="text-[10px] text-orange-400 border-orange-400/30">OpenArt</Badge>
              </div>
              {expandedSections.pose ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </button>
            {expandedSections.pose && (
              <div className="px-6 pb-6">
                <div className="grid grid-cols-5 gap-2">
                  {POSE_PRESETS.map(pose => (
                    <button
                      key={pose.id}
                      onClick={() => setSelectedPose(pose.id)}
                      className={`p-3 rounded-xl border transition-all text-center ${selectedPose === pose.id ? "border-orange-500 bg-orange-500/10" : "border-border hover:border-muted-foreground"}`}
                    >
                      <div className="text-2xl mb-1">{pose.icon}</div>
                      <div className="text-[10px] font-medium">{pose.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* OpenArt-Grade: Lighting Preset */}
          <Card className="overflow-hidden">
            <button
              onClick={() => toggleSection("lighting")}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span className="font-medium">Lighting</span>
                <Badge variant="outline" className="text-[10px] text-yellow-400 border-yellow-400/30">OpenArt</Badge>
              </div>
              {expandedSections.lighting ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </button>
            {expandedSections.lighting && (
              <div className="px-6 pb-6">
                <div className="grid grid-cols-4 gap-2">
                  {LIGHTING_PRESETS.map(light => (
                    <button
                      key={light.id}
                      onClick={() => setSelectedLighting(light.id)}
                      className={`p-3 rounded-xl border transition-all text-left ${selectedLighting === light.id ? "border-yellow-500 bg-yellow-500/10" : "border-border hover:border-muted-foreground"}`}
                    >
                      <div className="text-sm font-medium">{light.name}</div>
                      <div className="text-[10px] text-muted-foreground">{light.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* OpenArt-Grade: ControlNet */}
          <Card className="overflow-hidden">
            <button
              onClick={() => toggleSection("controlNet")}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <div className="flex items-center gap-3">
                <Crosshair className="w-5 h-5 text-cyan-500" />
                <span className="font-medium">ControlNet</span>
                <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-400/30">Pro</Badge>
              </div>
              {expandedSections.controlNet ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </button>
            {expandedSections.controlNet && (
              <div className="px-6 pb-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable ControlNet</Label>
                    <p className="text-muted-foreground text-xs">Guide generation with structural controls</p>
                  </div>
                  <Switch
                    checked={advancedGen.controlNetEnabled}
                    onCheckedChange={(v) => setAdvancedGen(prev => ({ ...prev, controlNetEnabled: v }))}
                  />
                </div>
                {advancedGen.controlNetEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label>Control Type</Label>
                      <Select value={advancedGen.controlNetType} onValueChange={(v) => setAdvancedGen(prev => ({ ...prev, controlNetType: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONTROLNET_TYPES.map(cn => (
                            <SelectItem key={cn.id} value={cn.id}>
                              <span className="flex flex-col">
                                <span>{cn.name}</span>
                                <span className="text-[10px] text-muted-foreground">{cn.desc}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Control Weight</Label>
                        <span className="text-sm text-cyan-400">{advancedGen.controlNetWeight.toFixed(1)}</span>
                      </div>
                      <Slider
                        value={[advancedGen.controlNetWeight]}
                        onValueChange={([v]) => setAdvancedGen(prev => ({ ...prev, controlNetWeight: v }))}
                        min={0}
                        max={1}
                        step={0.05}
                      />
                    </div>
                    <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                      <p className="text-xs text-cyan-400">Upload a reference image for ControlNet guidance. The AI will follow the structural information from your reference.</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        <Upload className="w-3 h-3 mr-1" /> Upload Reference
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>

          {/* OpenArt-Grade: Generation Parameters */}
          <Card className="overflow-hidden">
            <button
              onClick={() => toggleSection("generation")}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-pink-500" />
                <span className="font-medium">Generation Parameters</span>
                <Badge variant="outline" className="text-[10px] text-pink-400 border-pink-400/30">Expert</Badge>
              </div>
              {expandedSections.generation ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </button>
            {expandedSections.generation && (
              <div className="px-6 pb-6 space-y-5">
                {/* Negative Prompt */}
                <div className="space-y-2">
                  <Label>Negative Prompt</Label>
                  <Textarea
                    value={advancedGen.negativePrompt}
                    onChange={(e) => setAdvancedGen(prev => ({ ...prev, negativePrompt: e.target.value }))}
                    placeholder="What to avoid in the generation..."
                    className="min-h-[60px]"
                  />
                  <div className="flex flex-wrap gap-1">
                    {NEGATIVE_PROMPT_LIBRARY.map(neg => (
                      <button
                        key={neg.id}
                        onClick={() => {
                          const newNeg = selectedNegatives.includes(neg.id)
                            ? selectedNegatives.filter(n => n !== neg.id)
                            : [...selectedNegatives, neg.id];
                          setSelectedNegatives(newNeg);
                          const combined = NEGATIVE_PROMPT_LIBRARY
                            .filter(n => newNeg.includes(n.id))
                            .map(n => n.prompt)
                            .join(", ");
                          setAdvancedGen(prev => ({ ...prev, negativePrompt: combined }));
                        }}
                        className={`text-[10px] px-2 py-1 rounded-full border transition-all ${
                          selectedNegatives.includes(neg.id)
                            ? "border-pink-500 bg-pink-500/20 text-pink-400"
                            : "border-border text-muted-foreground hover:border-muted-foreground"
                        }`}
                      >
                        {neg.name}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Guidance Scale */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Guidance Scale (CFG)</Label>
                    <span className="text-sm text-pink-400">{advancedGen.guidanceScale}</span>
                  </div>
                  <Slider
                    value={[advancedGen.guidanceScale]}
                    onValueChange={([v]) => setAdvancedGen(prev => ({ ...prev, guidanceScale: v }))}
                    min={1}
                    max={20}
                    step={0.5}
                  />
                  <p className="text-[10px] text-muted-foreground">Higher values follow the prompt more closely</p>
                </div>

                {/* Steps */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Sampling Steps</Label>
                    <span className="text-sm text-pink-400">{advancedGen.steps}</span>
                  </div>
                  <Slider
                    value={[advancedGen.steps]}
                    onValueChange={([v]) => setAdvancedGen(prev => ({ ...prev, steps: v }))}
                    min={10}
                    max={50}
                    step={1}
                  />
                </div>

                {/* Scheduler */}
                <div className="space-y-2">
                  <Label>Scheduler</Label>
                  <Select value={advancedGen.scheduler} onValueChange={(v) => setAdvancedGen(prev => ({ ...prev, scheduler: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SCHEDULERS.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Seed */}
                <div className="space-y-2">
                  <Label>Seed</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={advancedGen.seed || ""}
                      onChange={(e) => setAdvancedGen(prev => ({ ...prev, seed: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="Random"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setAdvancedGen(prev => ({ ...prev, seed: Math.floor(Math.random() * 999999999) }))}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Batch Size */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Batch Size</Label>
                    <span className="text-sm text-pink-400">{advancedGen.batchSize} images</span>
                  </div>
                  <Slider
                    value={[advancedGen.batchSize]}
                    onValueChange={([v]) => setAdvancedGen(prev => ({ ...prev, batchSize: v }))}
                    min={1}
                    max={8}
                    step={1}
                  />
                </div>

                <Separator />

                {/* Upscale */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>AI Upscale</Label>
                    <p className="text-muted-foreground text-xs">Enhance resolution after generation</p>
                  </div>
                  <Switch
                    checked={advancedGen.upscaleEnabled}
                    onCheckedChange={(v) => setAdvancedGen(prev => ({ ...prev, upscaleEnabled: v }))}
                  />
                </div>
                {advancedGen.upscaleEnabled && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Upscale Factor</Label>
                      <span className="text-sm text-pink-400">{advancedGen.upscaleFactor}x</span>
                    </div>
                    <Slider
                      value={[advancedGen.upscaleFactor]}
                      onValueChange={([v]) => setAdvancedGen(prev => ({ ...prev, upscaleFactor: v }))}
                      min={1.5}
                      max={4}
                      step={0.5}
                    />
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Prompt Templates */}
          <Card className="overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-5 h-5 text-emerald-500" />
                <span className="font-medium">Prompt Templates</span>
                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30">Quick Start</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PROMPT_TEMPLATES.map(tmpl => (
                  <button
                    key={tmpl.id}
                    onClick={() => {
                      const filled = tmpl.template
                        .replace("{name}", attributes.name || "character")
                        .replace("{hair}", attributes.hairColor || "dark")
                        .replace("{eyes}", attributes.eyeColor || "brown")
                        .replace("{style}", STYLE_PRESETS.find(s => s.id === styleSettings.stylePreset)?.name || "photorealistic");
                      setTextPrompt(filled);
                      setPromptTemplate(tmpl.id);
                      toast.success(`Applied "${tmpl.name}" template`);
                    }}
                    className={`p-3 rounded-xl border transition-all text-left ${
                      promptTemplate === tmpl.id
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <div className="text-sm font-medium">{tmpl.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{tmpl.template.slice(0, 60)}...</div>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Brand Brain Binding */}
          <Card className="overflow-hidden">
            <button
              onClick={() => toggleSection("brandBrain")}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-green-500" />
                <span className="font-medium">Brand Brain Connection</span>
                <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded">Optional</span>
              </div>
              {expandedSections.brandBrain ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </button>
            {expandedSections.brandBrain && (
              <div className="px-6 pb-6">
                <p className="text-muted-foreground text-sm mb-4">Connect this influencer to a Brand Brain to ensure all content aligns with your brand voice and guidelines.</p>
                <Link href="/brand-brain" className="inline-flex items-center gap-2 text-primary hover:underline text-sm">
                  <Plus className="w-4 h-4" /> Create or Select Brand Brain
                </Link>
              </div>
            )}
          </Card>
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <Card className="p-6">
              <h3 className="font-medium mb-4">Preview</h3>
              <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 rounded-xl flex items-center justify-center mb-4">
                {uploadedImages.length > 0 ? (
                  <img src={uploadedImages[0]} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="text-center">
                    <User className="w-16 h-16 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">Preview will appear here</p>
                  </div>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span>{attributes.name || "Unnamed"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Style:</span>
                  <span>{STYLE_PRESETS.find(p => p.id === styleSettings.stylePreset)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Consistency:</span>
                  <span>{styleSettings.consistencyWeight}%</span>
                </div>
              </div>
            </Card>

            <Button
              onClick={goNext}
              className="w-full mt-4 bg-primary"
            >
              <Eye className="w-5 h-5 mr-2" /> Preview & Generate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render preview step
  const renderPreview = () => (
    <div className="max-w-4xl mx-auto">
      <Button variant="ghost" onClick={goBack} className="mb-8">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Customize
      </Button>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Ready to Create</h2>
        <p className="text-muted-foreground">Review your settings and start generating your AI influencer</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Summary */}
        <Card className="p-6">
          <h3 className="font-medium mb-4">Character Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Name</span>
              <span>{attributes.name || "Unnamed Character"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Creation Method</span>
              <span className="capitalize">{creationMethod?.replace("_", " ")}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Style</span>
              <span>{STYLE_PRESETS.find(p => p.id === styleSettings.stylePreset)?.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Consistency</span>
              <span>{styleSettings.consistencyWeight}%</span>
            </div>
            {uploadedImages.length > 0 && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Reference Images</span>
                <span>{uploadedImages.length} images</span>
              </div>
            )}
          </div>
        </Card>

        {/* Preview */}
        <Card className="p-6">
          <h3 className="font-medium mb-4">Preview</h3>
          <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 rounded-xl flex items-center justify-center">
            {uploadedImages.length > 0 ? (
              <img src={uploadedImages[0]} alt="Preview" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <div className="text-center">
                <Wand2 className="w-16 h-16 text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Your AI influencer will be generated based on your description</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Credits info */}
      <Card className="bg-primary/10 border-primary/30 p-6 mb-8">
        <div className="flex items-center gap-4">
          <Sparkles className="w-8 h-8 text-primary" />
          <div>
            <h4 className="font-medium">Training Credits</h4>
            <p className="text-muted-foreground text-sm">This will use approximately 50 credits from your account</p>
          </div>
        </div>
      </Card>

      {/* Generate button */}
      <div className="flex justify-center">
        <Button
          onClick={startGeneration}
          size="lg"
          className="bg-gradient-to-r from-primary to-secondary text-lg px-8"
        >
          <Wand2 className="w-6 h-6 mr-3" /> Create AI Influencer
        </Button>
      </div>
    </div>
  );

  // Render generating step
  const renderGenerating = () => (
    <div className="max-w-2xl mx-auto text-center py-20">
      <div className="relative w-32 h-32 mx-auto mb-8">
        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
        <div className="relative w-full h-full bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
          <Loader2 className="w-16 h-16 text-white animate-spin" />
        </div>
      </div>
      
      <h2 className="text-3xl font-bold mb-4">Creating Your AI Influencer</h2>
      <p className="text-muted-foreground mb-8">This usually takes 2-5 minutes. You can close this page and we'll notify you when it's ready.</p>
      
      {/* Progress bar */}
      <div className="max-w-md mx-auto mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progress</span>
          <span className="text-primary">{generationProgress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
            style={{ width: `${generationProgress}%` }}
          />
        </div>
      </div>

      {/* Status messages */}
      <div className="space-y-2 text-sm text-muted-foreground">
        {generationProgress >= 10 && <p>✓ Analyzing reference images...</p>}
        {generationProgress >= 30 && <p>✓ Extracting facial features...</p>}
        {generationProgress >= 50 && <p>✓ Training character model...</p>}
        {generationProgress >= 70 && <p>✓ Applying style preset...</p>}
        {generationProgress >= 90 && <p>✓ Finalizing your AI influencer...</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        {currentStep === "choose_method" && renderMethodSelection()}
        {currentStep === "upload_images" && renderImageUpload()}
        {currentStep === "describe_character" && renderTextPrompt()}
        {currentStep === "select_template" && renderTemplateSelection()}
        {currentStep === "customize" && renderCustomization()}
        {currentStep === "preview" && renderPreview()}
        {currentStep === "generating" && renderGenerating()}
      </div>
    </div>
  );
}
