import { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  Wand2,
  Download,
  Heart,
  Share2,
  Copy,
  Trash2,
  RefreshCw,
  Settings,
  History,
  Grid3X3,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  Sliders,
  Palette,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
  Filter,
  Search,
  MoreVertical,
  ArrowLeft,
  Camera,
  Move,
  Zap,
  Crosshair,
  Paintbrush,
  Layers,
  Target,
  FileText,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GeneratedImage {
  id: number;
  url: string;
  prompt: string;
  timestamp: Date;
  isFavorite: boolean;
  aspectRatio: string;
  resolution: string;
}

interface GenerationSettings {
  prompt: string;
  negativePrompt: string;
  aspectRatio: string;
  resolution: string;
  stylePreset: string;
  consistencyWeight: number;
  keepOutfit: boolean;
  guidanceScale: number;
  steps: number;
  seed: number | null;
}

const ASPECT_RATIOS = [
  { id: "1:1", name: "Square", icon: "⬜" },
  { id: "4:3", name: "Landscape", icon: "🖼️" },
  { id: "3:4", name: "Portrait", icon: "📱" },
  { id: "16:9", name: "Widescreen", icon: "🎬" },
  { id: "9:16", name: "Story", icon: "📲" },
];

const RESOLUTIONS = [
  { id: "512", name: "512px", description: "Fast preview" },
  { id: "768", name: "768px", description: "Standard" },
  { id: "1024", name: "1024px", description: "High quality" },
  { id: "1536", name: "1536px", description: "Ultra HD" },
];

const STYLE_PRESETS = [
  { id: "photorealistic", name: "Photorealistic", icon: "📷" },
  { id: "anime", name: "Anime", icon: "🎌" },
  { id: "cartoon", name: "Cartoon", icon: "🎨" },
  { id: "3d_render", name: "3D Render", icon: "🎮" },
  { id: "illustration", name: "Illustration", icon: "✏️" },
  { id: "fashion", name: "Fashion", icon: "👗" },
  { id: "cinematic", name: "Cinematic", icon: "🎬" },
];

const CAMERA_PRESETS_GW = [
  { id: "headshot", name: "Headshot", icon: "👤" },
  { id: "half_body", name: "Half Body", icon: "🧑" },
  { id: "full_body", name: "Full Body", icon: "🧍" },
  { id: "three_quarter", name: "3/4 View", icon: "↗️" },
  { id: "profile", name: "Profile", icon: "👈" },
  { id: "low_angle", name: "Low Angle", icon: "⬆️" },
];

const LIGHTING_PRESETS_GW = [
  { id: "natural", name: "Natural" },
  { id: "studio", name: "Studio" },
  { id: "golden_hour", name: "Golden Hour" },
  { id: "dramatic", name: "Dramatic" },
  { id: "neon", name: "Neon" },
  { id: "soft_box", name: "Soft Box" },
];

const SCHEDULERS_GW = [
  { id: "euler_a", name: "Euler Ancestral" },
  { id: "dpm_2m_karras", name: "DPM++ 2M Karras" },
  { id: "ddim", name: "DDIM" },
  { id: "uni_pc", name: "UniPC" },
];

const PROMPT_TEMPLATES_GW = [
  { id: "portrait", name: "Portrait", template: "professional portrait photo, {style} style, high quality, detailed" },
  { id: "fashion", name: "Fashion", template: "high-fashion editorial shoot, designer outfit, dramatic lighting, {style}" },
  { id: "lifestyle", name: "Lifestyle", template: "candid lifestyle photo, natural setting, warm lighting, {style}" },
  { id: "social", name: "Social Media", template: "instagram-worthy photo, trendy, aesthetic background, {style}" },
];

// Sample generated images for demo
const SAMPLE_GENERATIONS: GeneratedImage[] = [
  { id: 1, url: "/api/placeholder/512/512", prompt: "Professional headshot, warm lighting", timestamp: new Date(), isFavorite: true, aspectRatio: "1:1", resolution: "1024" },
  { id: 2, url: "/api/placeholder/512/512", prompt: "Casual outdoor portrait", timestamp: new Date(Date.now() - 3600000), isFavorite: false, aspectRatio: "1:1", resolution: "1024" },
  { id: 3, url: "/api/placeholder/512/512", prompt: "Business attire, office setting", timestamp: new Date(Date.now() - 7200000), isFavorite: true, aspectRatio: "4:3", resolution: "1024" },
  { id: 4, url: "/api/placeholder/512/512", prompt: "Fitness pose, gym background", timestamp: new Date(Date.now() - 86400000), isFavorite: false, aspectRatio: "3:4", resolution: "768" },
];

export default function GenerationWorkspace() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [generations, setGenerations] = useState<GeneratedImage[]>(SAMPLE_GENERATIONS);
  const [activeTab, setActiveTab] = useState("generate");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "favorites">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomLevel, setZoomLevel] = useState(100);

  // Generation settings
  const [settings, setSettings] = useState<GenerationSettings>({
    prompt: "",
    negativePrompt: "",
    aspectRatio: "1:1",
    resolution: "1024",
    stylePreset: "photorealistic",
    consistencyWeight: 80,
    keepOutfit: false,
    guidanceScale: 7.5,
    steps: 30,
    seed: null,
  });

  // OpenArt-Grade state
  const [selectedCamera, setSelectedCamera] = useState("headshot");
  const [selectedLighting, setSelectedLighting] = useState("natural");
  const [scheduler, setScheduler] = useState("euler_a");
  const [batchSize, setBatchSize] = useState(1);
  const [upscaleEnabled, setUpscaleEnabled] = useState(false);
  const [controlNetEnabled, setControlNetEnabled] = useState(false);
  const [controlNetWeight, setControlNetWeight] = useState(0.8);
  const [showOpenArt, setShowOpenArt] = useState(false);

  // Handle generation
  const handleGenerate = async () => {
    if (!settings.prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    // Simulate generation progress
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 150));
      setGenerationProgress(i);
    }

    // Add new generation to history
    const newGeneration: GeneratedImage = {
      id: Date.now(),
      url: "/api/placeholder/512/512",
      prompt: settings.prompt,
      timestamp: new Date(),
      isFavorite: false,
      aspectRatio: settings.aspectRatio,
      resolution: settings.resolution,
    };

    setGenerations(prev => [newGeneration, ...prev]);
    setSelectedImage(newGeneration);
    setIsGenerating(false);
    toast.success("Image generated successfully!");
  };

  // Toggle favorite
  const toggleFavorite = (id: number) => {
    setGenerations(prev =>
      prev.map(gen =>
        gen.id === id ? { ...gen, isFavorite: !gen.isFavorite } : gen
      )
    );
    if (selectedImage?.id === id) {
      setSelectedImage(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
  };

  // Delete generation
  const deleteGeneration = (id: number) => {
    setGenerations(prev => prev.filter(gen => gen.id !== id));
    if (selectedImage?.id === id) {
      setSelectedImage(null);
    }
    toast.success("Image deleted");
  };

  // Filter generations
  const filteredGenerations = generations.filter(gen => {
    if (historyFilter === "favorites" && !gen.isFavorite) return false;
    if (searchQuery && !gen.prompt.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

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
          <p className="text-muted-foreground mb-8">Please sign in to use the Generation Workspace</p>
          <a href={getLoginUrl()}>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Sign In
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-16 h-screen flex">
        {/* Left Sidebar - Controls */}
        <div className="w-80 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <Link href="/influencer-studio">
              <Button variant="ghost" size="sm" className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Studio
              </Button>
            </Link>
            <h2 className="text-lg font-semibold">Generation Workspace</h2>
            <p className="text-muted-foreground text-sm">Create images for your AI influencer</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-2 mx-4 mt-4">
              <TabsTrigger value="generate">
                <Wand2 className="w-4 h-4 mr-2" /> Generate
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="w-4 h-4 mr-2" /> History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Prompt */}
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea
                  value={settings.prompt}
                  onChange={(e) => setSettings(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Describe the image you want to generate..."
                  className="min-h-[100px]"
                />
              </div>

              {/* Negative Prompt */}
              <div className="space-y-2">
                <Label>Negative Prompt</Label>
                <Input
                  value={settings.negativePrompt}
                  onChange={(e) => setSettings(prev => ({ ...prev, negativePrompt: e.target.value }))}
                  placeholder="What to avoid..."
                />
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-2">
                <Label>Aspect Ratio</Label>
                <div className="grid grid-cols-5 gap-2">
                  {ASPECT_RATIOS.map(ratio => (
                    <button
                      key={ratio.id}
                      onClick={() => setSettings(prev => ({ ...prev, aspectRatio: ratio.id }))}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        settings.aspectRatio === ratio.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <div className="text-lg">{ratio.icon}</div>
                      <div className="text-xs text-muted-foreground">{ratio.id}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Preset */}
              <div className="space-y-2">
                <Label>Style</Label>
                <div className="grid grid-cols-4 gap-2">
                  {STYLE_PRESETS.slice(0, 4).map(style => (
                    <button
                      key={style.id}
                      onClick={() => setSettings(prev => ({ ...prev, stylePreset: style.id }))}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        settings.stylePreset === style.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <div className="text-lg">{style.icon}</div>
                      <div className="text-xs truncate">{style.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Settings Toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings className="w-4 h-4" />
                Advanced Settings
                <ChevronRight className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`} />
              </button>

              {showAdvanced && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  {/* Resolution */}
                  <div className="space-y-2">
                    <Label>Resolution</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {RESOLUTIONS.map(res => (
                        <button
                          key={res.id}
                          onClick={() => setSettings(prev => ({ ...prev, resolution: res.id }))}
                          className={`p-2 rounded-lg border text-left transition-all ${
                            settings.resolution === res.id
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-muted-foreground"
                          }`}
                        >
                          <div className="text-sm font-medium">{res.name}</div>
                          <div className="text-xs text-muted-foreground">{res.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Consistency Weight */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Character Consistency</Label>
                      <span className="text-sm text-primary">{settings.consistencyWeight}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.consistencyWeight}
                      onChange={(e) => setSettings(prev => ({ ...prev, consistencyWeight: parseInt(e.target.value) }))}
                      className="w-full accent-primary"
                    />
                  </div>

                  {/* Guidance Scale */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Guidance Scale</Label>
                      <span className="text-sm text-secondary">{settings.guidanceScale}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="0.5"
                      value={settings.guidanceScale}
                      onChange={(e) => setSettings(prev => ({ ...prev, guidanceScale: parseFloat(e.target.value) }))}
                      className="w-full accent-secondary"
                    />
                  </div>

                  {/* Steps */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Steps</Label>
                      <span className="text-sm text-muted-foreground">{settings.steps}</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      value={settings.steps}
                      onChange={(e) => setSettings(prev => ({ ...prev, steps: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  {/* Seed */}
                  <div className="space-y-2">
                    <Label>Seed (optional)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={settings.seed || ""}
                        onChange={(e) => setSettings(prev => ({ ...prev, seed: e.target.value ? parseInt(e.target.value) : null }))}
                        placeholder="Random"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSettings(prev => ({ ...prev, seed: Math.floor(Math.random() * 999999999) }))}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Keep Outfit */}
                  <div className="flex items-center justify-between">
                    <Label>Keep Outfit Consistent</Label>
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, keepOutfit: !prev.keepOutfit }))}
                      className={`w-10 h-5 rounded-full transition-colors ${settings.keepOutfit ? "bg-primary" : "bg-muted"}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow ${settings.keepOutfit ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* OpenArt-Grade Controls */}
              {/* ============================================================ */}
              <button
                onClick={() => setShowOpenArt(!showOpenArt)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Layers className="w-4 h-4" />
                OpenArt Controls
                <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-400/30">Pro</Badge>
                <ChevronRight className={`w-4 h-4 transition-transform ${showOpenArt ? "rotate-90" : ""}`} />
              </button>

              {showOpenArt && (
                <div className="space-y-4 p-3 bg-muted/50 rounded-lg border border-border">
                  {/* Camera Preset */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <Camera className="w-3 h-3" /> Camera
                    </Label>
                    <div className="grid grid-cols-3 gap-1">
                      {CAMERA_PRESETS_GW.map(cam => (
                        <button
                          key={cam.id}
                          onClick={() => setSelectedCamera(cam.id)}
                          className={`p-1.5 rounded-lg border text-center transition-all text-[10px] ${
                            selectedCamera === cam.id
                              ? "border-blue-500 bg-blue-500/10 text-blue-400"
                              : "border-border hover:border-muted-foreground"
                          }`}
                        >
                          <span className="text-sm">{cam.icon}</span>
                          <div>{cam.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lighting */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Lighting
                    </Label>
                    <div className="grid grid-cols-3 gap-1">
                      {LIGHTING_PRESETS_GW.map(light => (
                        <button
                          key={light.id}
                          onClick={() => setSelectedLighting(light.id)}
                          className={`p-1.5 rounded-lg border text-center transition-all text-[10px] ${
                            selectedLighting === light.id
                              ? "border-yellow-500 bg-yellow-500/10 text-yellow-400"
                              : "border-border hover:border-muted-foreground"
                          }`}
                        >
                          {light.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Scheduler */}
                  <div className="space-y-2">
                    <Label className="text-xs">Scheduler</Label>
                    <Select value={scheduler} onValueChange={setScheduler}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHEDULERS_GW.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Batch Size */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs">Batch Size</Label>
                      <span className="text-[10px] text-primary">{batchSize} images</span>
                    </div>
                    <Slider
                      value={[batchSize]}
                      onValueChange={([v]) => setBatchSize(v)}
                      min={1}
                      max={8}
                      step={1}
                    />
                  </div>

                  {/* ControlNet */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs flex items-center gap-1">
                      <Crosshair className="w-3 h-3" /> ControlNet
                    </Label>
                    <Switch
                      checked={controlNetEnabled}
                      onCheckedChange={setControlNetEnabled}
                    />
                  </div>
                  {controlNetEnabled && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs">Weight</Label>
                        <span className="text-[10px] text-cyan-400">{controlNetWeight.toFixed(1)}</span>
                      </div>
                      <Slider
                        value={[controlNetWeight]}
                        onValueChange={([v]) => setControlNetWeight(v)}
                        min={0}
                        max={1}
                        step={0.05}
                      />
                    </div>
                  )}

                  {/* Upscale */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs flex items-center gap-1">
                      <Maximize2 className="w-3 h-3" /> AI Upscale
                    </Label>
                    <Switch
                      checked={upscaleEnabled}
                      onCheckedChange={setUpscaleEnabled}
                    />
                  </div>

                  {/* Prompt Templates */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Quick Templates
                    </Label>
                    <div className="grid grid-cols-2 gap-1">
                      {PROMPT_TEMPLATES_GW.map(tmpl => (
                        <button
                          key={tmpl.id}
                          onClick={() => {
                            const filled = tmpl.template.replace("{style}", settings.stylePreset);
                            setSettings(prev => ({ ...prev, prompt: prev.prompt ? prev.prompt + ", " + filled : filled }));
                            toast.success(`Applied "${tmpl.name}" template`);
                          }}
                          className="p-1.5 rounded-lg border border-border hover:border-emerald-500 hover:bg-emerald-500/10 text-[10px] text-left transition-all"
                        >
                          {tmpl.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !settings.prompt.trim()}
                className="w-full bg-gradient-to-r from-primary to-secondary"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating... {generationProgress}%
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    Generate Image
                  </>
                )}
              </Button>

              {/* Credits Info */}
              <div className="text-center text-sm text-muted-foreground">
                <Sparkles className="w-4 h-4 inline mr-1" />
                1 credit per generation • 47 credits remaining
              </div>
            </TabsContent>

            <TabsContent value="history" className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Search and Filter */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search prompts..."
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={historyFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHistoryFilter("all")}
                  >
                    All
                  </Button>
                  <Button
                    variant={historyFilter === "favorites" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHistoryFilter("favorites")}
                  >
                    <Star className="w-4 h-4 mr-1" /> Favorites
                  </Button>
                </div>
              </div>

              {/* History Grid */}
              <div className="grid grid-cols-2 gap-2">
                {filteredGenerations.map(gen => (
                  <button
                    key={gen.id}
                    onClick={() => setSelectedImage(gen)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage?.id === gen.id
                        ? "border-primary ring-2 ring-primary/50"
                        : "border-transparent hover:border-muted-foreground"
                    }`}
                  >
                    <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                    {gen.isFavorite && (
                      <div className="absolute top-1 right-1 bg-amber-500 text-white p-0.5 rounded">
                        <Star className="w-3 h-3 fill-current" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {filteredGenerations.length === 0 && (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No generations found</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col bg-muted/30">
          {/* Canvas Toolbar */}
          <div className="h-12 border-b border-border bg-card flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setZoomLevel(Math.max(25, zoomLevel - 25))}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground w-12 text-center">{zoomLevel}%</span>
              <Button variant="ghost" size="icon" onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setZoomLevel(100)}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            {selectedImage && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => toggleFavorite(selectedImage.id)}>
                  <Heart className={`w-4 h-4 ${selectedImage.isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                </Button>
                <Button variant="ghost" size="icon">
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteGeneration(selectedImage.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
            {isGenerating ? (
              <div className="text-center">
                <div className="relative w-64 h-64 mx-auto mb-6">
                  <div className="absolute inset-0 bg-primary/20 rounded-2xl animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-16 h-16 text-primary animate-spin" />
                  </div>
                </div>
                <h3 className="text-lg font-medium mb-2">Generating your image...</h3>
                <div className="w-64 mx-auto">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                      style={{ width: `${generationProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{generationProgress}% complete</p>
                </div>
              </div>
            ) : selectedImage ? (
              <div
                className="relative bg-card rounded-2xl shadow-2xl overflow-hidden transition-transform"
                style={{ transform: `scale(${zoomLevel / 100})` }}
              >
                <div className="w-[512px] h-[512px] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                  <ImageIcon className="w-24 h-24 text-muted-foreground" />
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-64 h-64 mx-auto mb-6 bg-card rounded-2xl border-2 border-dashed border-border flex items-center justify-center">
                  <div className="text-center">
                    <Wand2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Enter a prompt and click Generate</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Image Info Bar */}
          {selectedImage && !isGenerating && (
            <div className="h-16 border-t border-border bg-card flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm font-medium truncate max-w-md">{selectedImage.prompt}</p>
                  <p className="text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {selectedImage.timestamp.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{selectedImage.aspectRatio}</span>
                <span>{selectedImage.resolution}px</span>
                <Button size="sm" variant="outline">
                  Use as Reference
                </Button>
                <Button size="sm" className="bg-primary">
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Quick Actions */}
        <div className="w-16 border-l border-border bg-card flex flex-col items-center py-4 gap-2">
          <Button variant="ghost" size="icon" className="w-10 h-10" title="Grid View">
            <Grid3X3 className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="w-10 h-10" title="Variations">
            <RefreshCw className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="w-10 h-10" title="Upscale">
            <Maximize2 className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="w-10 h-10" title="Edit">
            <Palette className="w-5 h-5" />
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="w-10 h-10" title="Settings">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
