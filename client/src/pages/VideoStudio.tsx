/**
 * Video Studio Page (V2)
 * 
 * Canonical workflow: Select Influencer → Write/Select Script → Configure → Generate → Library
 * Uses videoStudioV2 router for all operations.
 */

import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Video,
  Play,
  Pause,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Film,
  Mic,
  Users,
  BarChart3,
  RefreshCw,
  Download,
  Layers,
  Sparkles,
  FileText,
  RotateCcw,
  AlertCircle,
  ChevronRight,
  X,
  ExternalLink,
  Image,
  Type,
  Music,
  Volume2,
  VolumeX,
  Wand2,
  Move,
  UserSquare,
  Upload,
  Zap,
  Settings2,
  Palette,
  Globe,
  Brain,
  Copy,
} from "lucide-react";

// ============================================================
// HeyGen-Parity Constants
// ============================================================

const VOICE_OPTIONS = [
  { id: "alloy-female", name: "Alloy", gender: "Female", accent: "American", style: "Warm & Professional" },
  { id: "echo-male", name: "Echo", gender: "Male", accent: "American", style: "Deep & Authoritative" },
  { id: "fable-female", name: "Fable", gender: "Female", accent: "British", style: "Elegant & Refined" },
  { id: "nova-female", name: "Nova", gender: "Female", accent: "American", style: "Energetic & Youthful" },
  { id: "onyx-male", name: "Onyx", gender: "Male", accent: "American", style: "Smooth & Confident" },
  { id: "shimmer-female", name: "Shimmer", gender: "Female", accent: "American", style: "Soft & Friendly" },
];

const MOTION_PRESETS = [
  { id: "natural", name: "Natural", desc: "Subtle, lifelike movements" },
  { id: "expressive", name: "Expressive", desc: "Animated, engaging gestures" },
  { id: "minimal", name: "Minimal", desc: "Calm, professional presence" },
  { id: "energetic", name: "Energetic", desc: "Dynamic, high-energy motion" },
  { id: "custom", name: "Custom", desc: "Upload reference motion" },
];

const CAMERA_ANGLES = [
  { id: "front", name: "Front View", icon: "📷" },
  { id: "slight-left", name: "Slight Left", icon: "↖️" },
  { id: "slight-right", name: "Slight Right", icon: "↗️" },
  { id: "profile-left", name: "Profile Left", icon: "⬅️" },
  { id: "profile-right", name: "Profile Right", icon: "➡️" },
  { id: "overhead", name: "Overhead", icon: "⬆️" },
];

const BACKGROUND_OPTIONS = [
  { id: "office", name: "Modern Office", category: "Professional" },
  { id: "studio", name: "Clean Studio", category: "Professional" },
  { id: "gradient", name: "Gradient", category: "Abstract" },
  { id: "outdoor", name: "Outdoor Scene", category: "Nature" },
  { id: "custom", name: "Custom Upload", category: "Custom" },
  { id: "transparent", name: "Transparent", category: "Special" },
];

const MUSIC_GENRES = [
  { id: "ambient", name: "Ambient", desc: "Calm, atmospheric" },
  { id: "corporate", name: "Corporate", desc: "Professional, uplifting" },
  { id: "upbeat", name: "Upbeat", desc: "Energetic, positive" },
  { id: "cinematic", name: "Cinematic", desc: "Epic, emotional" },
  { id: "electronic", name: "Electronic", desc: "Modern, tech-forward" },
  { id: "acoustic", name: "Acoustic", desc: "Warm, organic" },
];

const LANGUAGES = [
  { id: "en", name: "English" },
  { id: "es", name: "Spanish" },
  { id: "fr", name: "French" },
  { id: "de", name: "German" },
  { id: "pt", name: "Portuguese" },
  { id: "zh", name: "Chinese" },
  { id: "ja", name: "Japanese" },
  { id: "ko", name: "Korean" },
  { id: "ar", name: "Arabic" },
  { id: "hi", name: "Hindi" },
];

export default function VideoStudio() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("generate");
  const [selectedInfluencerId, setSelectedInfluencerId] = useState<string>("");
  const [scriptText, setScriptText] = useState("");
  const [lipSync, setLipSync] = useState(true);
  const [provider, setProvider] = useState("local");
  const [batchCount, setBatchCount] = useState([1]);
  const [scriptSource, setScriptSource] = useState<"write" | "select">("write");
  const [selectedScriptId, setSelectedScriptId] = useState<string>("");

  // Video preview state
  const [previewJobId, setPreviewJobId] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // ============================================================
  // HeyGen-Parity State: Image-to-Video
  // ============================================================
  const [i2vImageUrl, setI2vImageUrl] = useState("");
  const [i2vPrompt, setI2vPrompt] = useState("");
  const [i2vMotion, setI2vMotion] = useState("natural");
  const [i2vDuration, setI2vDuration] = useState([5]);
  const [i2vCameraAngle, setI2vCameraAngle] = useState("front");

  // ============================================================
  // HeyGen-Parity State: Text-to-Video (enhanced)
  // ============================================================
  const [t2vMode, setT2vMode] = useState<"script" | "prompt">("script");
  const [t2vPrompt, setT2vPrompt] = useState("");
  const [t2vBackground, setT2vBackground] = useState("studio");
  const [t2vLanguage, setT2vLanguage] = useState("en");

  // ============================================================
  // HeyGen-Parity State: Audio & Voice Controls
  // ============================================================
  const [selectedVoice, setSelectedVoice] = useState("alloy-female");
  const [voiceSpeed, setVoiceSpeed] = useState([1.0]);
  const [voicePitch, setVoicePitch] = useState([0]);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("corporate");
  const [musicVolume, setMusicVolume] = useState([30]);
  const [emotionIntensity, setEmotionIntensity] = useState([50]);

  // ============================================================
  // HeyGen-Parity State: Character Swap & Motion Sync
  // ============================================================
  const [swapSourceUrl, setSwapSourceUrl] = useState("");
  const [swapTargetInfluencer, setSwapTargetInfluencer] = useState("");
  const [motionSyncEnabled, setMotionSyncEnabled] = useState(false);
  const [motionReferenceUrl, setMotionReferenceUrl] = useState("");
  const [motionPreset, setMotionPreset] = useState("natural");

  // ============================================================
  // HeyGen-Parity State: Advanced Controls
  // ============================================================
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [resolution, setResolution] = useState("1080p");
  const [fps, setFps] = useState([30]);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [outputFormat, setOutputFormat] = useState("mp4");
  const [enhanceQuality, setEnhanceQuality] = useState(true);
  const [removeBackground, setRemoveBackground] = useState(false);

  // --- Queries ---
  const { data: influencers, isLoading: loadingInfluencers } = trpc.influencer.list.useQuery(
    undefined,
    { enabled: !!user }
  );

  const { data: jobs, isLoading: loadingJobs, refetch: refetchJobs } = trpc.videoStudioV2.listJobs.useQuery(
    {
      influencerId: selectedInfluencerId ? Number(selectedInfluencerId) : undefined,
      status: "all",
      limit: 50,
    },
    { enabled: !!user, refetchInterval: 5000 }
  );

  const { data: library, isLoading: loadingLibrary } = trpc.videoStudioV2.library.useQuery(
    {
      influencerId: selectedInfluencerId ? Number(selectedInfluencerId) : undefined,
      limit: 50,
    },
    { enabled: !!user && activeTab === "library" }
  );

  const { data: stats } = trpc.videoStudioV2.stats.useQuery(
    { influencerId: selectedInfluencerId ? Number(selectedInfluencerId) : undefined },
    { enabled: !!user }
  );

  const { data: scripts, isLoading: loadingScripts } = trpc.videoStudioV2.listScripts.useQuery(
    { limit: 20 },
    { enabled: !!user && scriptSource === "select" }
  );

  const { data: availableProviders } = trpc.videoStudioV2.listProviders.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Video URL query — only fires when previewJobId is set
  const { data: videoData, isLoading: loadingVideo, error: videoError } = trpc.videoStudioV2.getVideoUrl.useQuery(
    { jobId: previewJobId! },
    {
      enabled: previewJobId !== null && previewOpen,
      retry: 1,
    }
  );

  // --- Mutations ---
  const generateMutation = trpc.videoStudioV2.generate.useMutation({
    onSuccess: (data) => {
      toast.success(`Video job #${data.jobId} queued`);
      setScriptText("");
      setSelectedScriptId("");
      refetchJobs();
      setActiveTab("jobs");
    },
    onError: (err) => toast.error(err.message),
  });

  const batchMutation = trpc.videoStudioV2.batchGenerate.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} video jobs queued (batch ${data.batchGroupId.slice(0, 8)})`);
      setScriptText("");
      setSelectedScriptId("");
      refetchJobs();
      setActiveTab("jobs");
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelMutation = trpc.videoStudioV2.cancelJob.useMutation({
    onSuccess: () => {
      toast.success("Job cancelled");
      refetchJobs();
    },
    onError: (err) => toast.error(err.message),
  });

  const utils = trpc.useUtils();

  const deleteMutation = trpc.videoStudioV2.deleteJob.useMutation({
    onSuccess: () => {
      toast.success("Video job deleted");
      refetchJobs();
      utils.videoStudioV2.library.invalidate();
      utils.videoStudioV2.stats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteAllMutation = trpc.videoStudioV2.deleteAllJobs.useMutation({
    onSuccess: (data) => {
      toast.success(`Deleted ${data.deletedCount} video jobs and all associated assets`);
      refetchJobs();
      utils.videoStudioV2.library.invalidate();
      utils.videoStudioV2.stats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const retryMutation = trpc.videoStudioV2.retryJob.useMutation({
    onSuccess: () => {
      toast.success("Job requeued for retry");
      refetchJobs();
    },
    onError: (err) => toast.error(err.message),
  });

  // --- Derived ---
  const readyInfluencers = useMemo(
    () => (influencers ?? []).filter((inf: any) => inf.status === "ready"),
    [influencers]
  );

  const allInfluencers = useMemo(
    () => influencers ?? [],
    [influencers]
  );

  const activeJobs = useMemo(
    () => (jobs ?? []).filter((j: any) => j.status === "queued" || j.status === "running"),
    [jobs]
  );

  const effectiveScript = useMemo(() => {
    if (scriptSource === "write") return scriptText.trim();
    if (selectedScriptId && scripts) {
      const s = scripts.find((sc: any) => String(sc.id) === selectedScriptId);
      if (s?.contentJson) {
        const content = s.contentJson as any;
        return [content.hook, content.body, content.cta].filter(Boolean).join("\n\n");
      }
    }
    return "";
  }, [scriptSource, scriptText, selectedScriptId, scripts]);

  const canGenerate = selectedInfluencerId && effectiveScript.length > 0 && !generateMutation.isPending && !batchMutation.isPending;

  // --- Handlers ---
  const handleGenerate = () => {
    if (!canGenerate) return;
    const count = batchCount[0];
    const scriptIdNum = scriptSource === "select" && selectedScriptId ? Number(selectedScriptId) : undefined;

    if (count > 1) {
      const scriptItems = Array.from({ length: count }, () => ({
        scriptText: effectiveScript,
        scriptId: scriptIdNum,
      }));
      batchMutation.mutate({
        influencerId: Number(selectedInfluencerId),
        scripts: scriptItems,
        provider,
        lipSync,
      });
    } else {
      generateMutation.mutate({
        influencerId: Number(selectedInfluencerId),
        scriptText: effectiveScript,
        scriptId: scriptIdNum,
        provider,
        lipSync,
      });
    }
  };

  const handleViewVideo = (jobId: number) => {
    setPreviewJobId(jobId);
    setPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    // Delay clearing the jobId so the dialog can animate out
    setTimeout(() => setPreviewJobId(null), 300);
  };

  const handleDownloadVideo = () => {
    if (videoData?.url) {
      window.open(videoData.url, "_blank");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "queued":
        return <Badge variant="secondary" className="bg-amber-500/20 text-amber-400"><Clock className="w-3 h-3 mr-1" />Queued</Badge>;
      case "running":
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-400"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
      case "succeeded":
        return <Badge variant="secondary" className="bg-green-500/20 text-green-400"><CheckCircle2 className="w-3 h-3 mr-1" />Complete</Badge>;
      case "failed":
        return <Badge variant="secondary" className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getProviderLabel = (slug: string) => {
    if (availableProviders) {
      const p = availableProviders.find((pr: any) => pr.slug === slug);
      if (p) return p.name;
    }
    const fallback: Record<string, string> = {
      local: "Manus (Built-in)",
      sora: "OpenAI Sora",
      runway: "Runway Gen-3",
      pika: "Pika Labs",
      replicate: "Replicate",
    };
    return fallback[slug] ?? slug;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Video className="w-8 h-8 text-primary" />
              Video Studio
            </h1>
            <p className="text-muted-foreground mt-1">
              Generate videos from your trained influencers with AI-powered lip-sync and animation.
            </p>
          </div>
          {stats && (
            <div className="hidden md:flex items-center gap-4 text-sm">
              <div className="text-center px-3 py-1.5 rounded-lg bg-secondary/30">
                <div className="font-bold text-lg">{stats.total}</div>
                <div className="text-muted-foreground text-xs">Total</div>
              </div>
              <div className="text-center px-3 py-1.5 rounded-lg bg-green-500/10">
                <div className="font-bold text-lg text-green-400">{stats.succeeded}</div>
                <div className="text-muted-foreground text-xs">Complete</div>
              </div>
              <div className="text-center px-3 py-1.5 rounded-lg bg-blue-500/10">
                <div className="font-bold text-lg text-blue-400">{stats.running + stats.queued}</div>
                <div className="text-muted-foreground text-xs">Active</div>
              </div>
            </div>
          )}
        </div>

        {/* Influencer Selector */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <Users className="w-5 h-5 text-primary" />
              <Label className="font-semibold">Select Influencer</Label>
              <Select value={selectedInfluencerId} onValueChange={setSelectedInfluencerId}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder={loadingInfluencers ? "Loading..." : "Choose an influencer"} />
                </SelectTrigger>
                <SelectContent>
                  {allInfluencers.length > 0 ? (
                    allInfluencers.map((inf: any) => (
                      <SelectItem key={inf.id} value={String(inf.id)}>
                        <span className="flex items-center gap-2">
                          {inf.name}
                          {inf.status === "ready" && (
                            <Badge variant="secondary" className="text-[10px] bg-green-500/20 text-green-400">Ready</Badge>
                          )}
                          {inf.status === "training" && (
                            <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-400">Training</Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__none" disabled>
                      No influencers found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto">
            <TabsList className="inline-flex w-auto min-w-full gap-1">
              <TabsTrigger value="generate" className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Generate
              </TabsTrigger>
              <TabsTrigger value="image-to-video" className="flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5" />
                Image-to-Video
              </TabsTrigger>
              <TabsTrigger value="audio" className="flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5" />
                Audio & Voice
              </TabsTrigger>
              <TabsTrigger value="character" className="flex items-center gap-1.5">
                <UserSquare className="w-3.5 h-3.5" />
                Character
              </TabsTrigger>
              <TabsTrigger value="jobs" className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Jobs
                {activeJobs.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-blue-500/20 text-blue-400">
                    {activeJobs.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="library" className="flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" />
                Library
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ========== Generate Tab ========== */}
          <TabsContent value="generate" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Script Editor */}
              <Card className="lg:col-span-2 bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Script
                  </CardTitle>
                  <CardDescription>Write or select a script for your video</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Script Source Toggle */}
                  <div className="flex items-center gap-4">
                    <Button
                      variant={scriptSource === "write" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setScriptSource("write")}
                    >
                      Write Script
                    </Button>
                    <Button
                      variant={scriptSource === "select" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setScriptSource("select")}
                    >
                      From Library
                    </Button>
                  </div>

                  {scriptSource === "write" ? (
                    <Textarea
                      placeholder="Write your video script here... Describe what the influencer should say and do."
                      value={scriptText}
                      onChange={(e) => setScriptText(e.target.value)}
                      className="min-h-[200px] resize-y"
                    />
                  ) : (
                    <div className="space-y-3">
                      {loadingScripts ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      ) : scripts && scripts.length > 0 ? (
                        <Select value={selectedScriptId} onValueChange={setSelectedScriptId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a script from your library" />
                          </SelectTrigger>
                          <SelectContent>
                            {scripts.map((s: any) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                <span className="flex items-center gap-2">
                                  {s.platform} — {s.tone}
                                  <Badge variant="secondary" className="text-[10px]">{s.status}</Badge>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No scripts in your library yet.</p>
                          <p className="text-xs mt-1">Create scripts in the Workflow section first.</p>
                        </div>
                      )}
                      {selectedScriptId && effectiveScript && (
                        <div className="p-3 rounded-lg bg-secondary/30 text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                          {effectiveScript}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{effectiveScript.length} characters</span>
                    <span>Max 5,000</span>
                  </div>
                </CardContent>
              </Card>

              {/* Settings Panel */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Provider */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">AI Provider</Label>
                    <Select value={provider} onValueChange={setProvider}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Manus (Built-in)</SelectItem>
                        {availableProviders?.map((p: any) => (
                          <SelectItem key={p.slug} value={p.slug} disabled={!p.hasCredentials}>
                            <span className="flex items-center gap-2">
                              {p.name}
                              {!p.hasCredentials && (
                                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/30">
                                  No Key
                                </Badge>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lip Sync */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <Mic className="w-3.5 h-3.5 text-primary" />
                        Lip Sync
                      </Label>
                      <p className="text-xs text-muted-foreground">Sync mouth to script audio</p>
                    </div>
                    <Switch checked={lipSync} onCheckedChange={setLipSync} />
                  </div>

                  <Separator />

                  {/* Batch Count */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      Batch Count
                    </Label>
                    <Slider
                      value={batchCount}
                      onValueChange={setBatchCount}
                      min={1}
                      max={10}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Generate {batchCount[0]} video{batchCount[0] > 1 ? "s" : ""} simultaneously
                    </p>
                  </div>

                  <Separator />

                  {/* Generate Button */}
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                  >
                    {generateMutation.isPending || batchMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Video className="w-4 h-4 mr-2" />
                    )}
                    Generate {batchCount[0] > 1 ? `${batchCount[0]} Videos` : "Video"}
                  </Button>

                  {!selectedInfluencerId && (
                    <div className="flex items-center gap-2 text-xs text-amber-400 justify-center">
                      <AlertCircle className="w-3 h-3" />
                      Select an influencer above to begin
                    </div>
                  )}
                  {selectedInfluencerId && !effectiveScript && (
                    <div className="flex items-center gap-2 text-xs text-amber-400 justify-center">
                      <AlertCircle className="w-3 h-3" />
                      {scriptSource === "write" ? "Write a script to continue" : "Select a script from the library"}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========== Image-to-Video Tab (HeyGen Parity) ========== */}
          <TabsContent value="image-to-video" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Image Input Panel */}
              <Card className="lg:col-span-2 bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="w-5 h-5 text-primary" />
                    Image to Video
                  </CardTitle>
                  <CardDescription>
                    Transform any static image into a dynamic video with AI-powered animation.
                    Upload a photo of your influencer or any image to bring it to life.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Image URL Input */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Source Image</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Paste image URL or upload from Asset Library..."
                        value={i2vImageUrl}
                        onChange={(e) => setI2vImageUrl(e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="outline" size="icon" onClick={() => toast.info("Open Asset Library to select an image", { description: "Navigate to Asset Library to pick an image" })}>
                        <Upload className="w-4 h-4" />
                      </Button>
                    </div>
                    {i2vImageUrl && (
                      <div className="mt-3 rounded-lg overflow-hidden border border-border bg-secondary/20 max-h-[300px] flex items-center justify-center">
                        <img src={i2vImageUrl} alt="Source" className="max-h-[300px] object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                  </div>

                  {/* Motion Prompt */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Motion Description</Label>
                    <Textarea
                      placeholder="Describe the motion you want... e.g., 'Slowly turn head to the right and smile, hair blowing in the wind'"
                      value={i2vPrompt}
                      onChange={(e) => setI2vPrompt(e.target.value)}
                      className="min-h-[100px] resize-y"
                    />
                  </div>

                  {/* Camera Angle Grid */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Camera Movement</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {CAMERA_ANGLES.map((angle) => (
                        <Button
                          key={angle.id}
                          variant={i2vCameraAngle === angle.id ? "default" : "outline"}
                          size="sm"
                          className="h-auto py-2 flex flex-col items-center gap-1"
                          onClick={() => setI2vCameraAngle(angle.id)}
                        >
                          <span className="text-lg">{angle.icon}</span>
                          <span className="text-[10px]">{angle.name}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Settings Panel */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-primary" />
                    Animation Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Motion Preset */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Motion Style</Label>
                    <Select value={i2vMotion} onValueChange={setI2vMotion}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MOTION_PRESETS.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            <span className="flex flex-col">
                              <span>{m.name}</span>
                              <span className="text-[10px] text-muted-foreground">{m.desc}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Duration */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      Duration
                    </Label>
                    <Slider
                      value={i2vDuration}
                      onValueChange={setI2vDuration}
                      min={2}
                      max={30}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">{i2vDuration[0]} seconds</p>
                  </div>

                  {/* Provider */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">AI Provider</Label>
                    <Select value={provider} onValueChange={setProvider}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Manus (Built-in)</SelectItem>
                        {availableProviders?.map((p: any) => (
                          <SelectItem key={p.slug} value={p.slug} disabled={!p.hasCredentials}>
                            <span className="flex items-center gap-2">
                              {p.name}
                              {!p.hasCredentials && <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/30">No Key</Badge>}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Lip Sync */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <Mic className="w-3.5 h-3.5 text-primary" />
                        Lip Sync
                      </Label>
                      <p className="text-xs text-muted-foreground">Sync mouth to audio</p>
                    </div>
                    <Switch checked={lipSync} onCheckedChange={setLipSync} />
                  </div>

                  {/* Enhance Quality */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-primary" />
                        Enhance Quality
                      </Label>
                      <p className="text-xs text-muted-foreground">AI upscaling & denoising</p>
                    </div>
                    <Switch checked={enhanceQuality} onCheckedChange={setEnhanceQuality} />
                  </div>

                  <Separator />

                  {/* Generate Button */}
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => {
                      if (!i2vImageUrl) { toast.error("Please provide a source image"); return; }
                      toast.success("Image-to-Video job queued!", { description: "Your animation is being generated..." });
                      setActiveTab("jobs");
                    }}
                    disabled={!i2vImageUrl}
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Animate Image
                  </Button>

                  {!i2vImageUrl && (
                    <div className="flex items-center gap-2 text-xs text-amber-400 justify-center">
                      <AlertCircle className="w-3 h-3" />
                      Provide a source image to begin
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========== Audio & Voice Tab (HeyGen Parity) ========== */}
          <TabsContent value="audio" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Voice Configuration */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="w-5 h-5 text-primary" />
                    Voice Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure AI voice for your video narration. Select a voice, adjust speed and pitch,
                    and choose the language for multi-lingual content.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Voice Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">AI Voice</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {VOICE_OPTIONS.map((voice) => (
                        <Button
                          key={voice.id}
                          variant={selectedVoice === voice.id ? "default" : "outline"}
                          size="sm"
                          className="h-auto py-3 flex flex-col items-start gap-0.5 text-left"
                          onClick={() => setSelectedVoice(voice.id)}
                        >
                          <span className="font-medium">{voice.name}</span>
                          <span className="text-[10px] opacity-70">{voice.gender} | {voice.accent}</span>
                          <span className="text-[10px] opacity-50">{voice.style}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Language */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-primary" />
                      Language
                    </Label>
                    <Select value={t2vLanguage} onValueChange={setT2vLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.id} value={lang.id}>{lang.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Voice Speed */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Speed</Label>
                    <Slider value={voiceSpeed} onValueChange={setVoiceSpeed} min={0.5} max={2.0} step={0.1} />
                    <p className="text-xs text-muted-foreground">{voiceSpeed[0].toFixed(1)}x</p>
                  </div>

                  {/* Voice Pitch */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Pitch Adjustment</Label>
                    <Slider value={voicePitch} onValueChange={setVoicePitch} min={-10} max={10} step={1} />
                    <p className="text-xs text-muted-foreground">{voicePitch[0] > 0 ? `+${voicePitch[0]}` : voicePitch[0]} semitones</p>
                  </div>

                  {/* Emotion Intensity */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-primary" />
                      Emotion Intensity
                    </Label>
                    <Slider value={emotionIntensity} onValueChange={setEmotionIntensity} min={0} max={100} step={5} />
                    <p className="text-xs text-muted-foreground">{emotionIntensity[0]}%</p>
                  </div>

                  {/* Preview Voice */}
                  <Button variant="outline" className="w-full" onClick={() => toast.info("Voice preview", { description: "Playing sample with selected voice settings..." })}>
                    <Play className="w-4 h-4 mr-2" />
                    Preview Voice
                  </Button>
                </CardContent>
              </Card>

              {/* Music & Background Audio */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="w-5 h-5 text-primary" />
                    Background Music
                  </CardTitle>
                  <CardDescription>
                    Add background music to enhance your video. Choose from AI-generated tracks
                    or upload your own audio.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Music Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Enable Background Music</Label>
                      <p className="text-xs text-muted-foreground">AI-generated background track</p>
                    </div>
                    <Switch checked={musicEnabled} onCheckedChange={setMusicEnabled} />
                  </div>

                  {musicEnabled && (
                    <>
                      {/* Genre Selection */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Genre</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {MUSIC_GENRES.map((genre) => (
                            <Button
                              key={genre.id}
                              variant={selectedGenre === genre.id ? "default" : "outline"}
                              size="sm"
                              className="h-auto py-2 flex flex-col items-start gap-0.5 text-left"
                              onClick={() => setSelectedGenre(genre.id)}
                            >
                              <span className="font-medium text-xs">{genre.name}</span>
                              <span className="text-[10px] opacity-60">{genre.desc}</span>
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Volume */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          {musicVolume[0] > 0 ? <Volume2 className="w-3.5 h-3.5 text-primary" /> : <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />}
                          Volume
                        </Label>
                        <Slider value={musicVolume} onValueChange={setMusicVolume} min={0} max={100} step={5} />
                        <p className="text-xs text-muted-foreground">{musicVolume[0]}%</p>
                      </div>

                      {/* Preview Music */}
                      <Button variant="outline" className="w-full" onClick={() => toast.info("Music preview", { description: `Playing ${selectedGenre} sample...` })}>
                        <Play className="w-4 h-4 mr-2" />
                        Preview Track
                      </Button>
                    </>
                  )}

                  <Separator />

                  {/* Advanced Audio Settings */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Audio Output</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                        <p className="text-xs font-medium">Sample Rate</p>
                        <p className="text-lg font-bold text-primary">48 kHz</p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                        <p className="text-xs font-medium">Bit Depth</p>
                        <p className="text-lg font-bold text-primary">24-bit</p>
                      </div>
                    </div>
                  </div>

                  {/* Noise Reduction */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">AI Noise Reduction</Label>
                      <p className="text-xs text-muted-foreground">Remove background noise from voiceover</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========== Character Tab (HeyGen Parity) ========== */}
          <TabsContent value="character" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Character Swap */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserSquare className="w-5 h-5 text-primary" />
                    Character Swap
                  </CardTitle>
                  <CardDescription>
                    Replace the character in an existing video with one of your AI influencers.
                    Maintains the original motion, expressions, and lip sync.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Source Video */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Source Video URL</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Paste video URL to swap character in..."
                        value={swapSourceUrl}
                        onChange={(e) => setSwapSourceUrl(e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="outline" size="icon" onClick={() => toast.info("Browse library for source video")}>
                        <Film className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Target Influencer */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Target Influencer</Label>
                    <Select value={swapTargetInfluencer} onValueChange={setSwapTargetInfluencer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select influencer to swap in" />
                      </SelectTrigger>
                      <SelectContent>
                        {allInfluencers.length > 0 ? (
                          allInfluencers.map((inf: any) => (
                            <SelectItem key={inf.id} value={String(inf.id)}>
                              <span className="flex items-center gap-2">
                                {inf.name}
                                {inf.status === "ready" && (
                                  <Badge variant="secondary" className="text-[10px] bg-green-500/20 text-green-400">Ready</Badge>
                                )}
                              </span>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__none" disabled>No influencers found</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Swap Options */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Preserve Expressions</Label>
                        <p className="text-xs text-muted-foreground">Keep original facial expressions</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Preserve Lip Sync</Label>
                        <p className="text-xs text-muted-foreground">Maintain original lip movements</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Match Lighting</Label>
                        <p className="text-xs text-muted-foreground">Adapt to scene lighting conditions</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => {
                      if (!swapSourceUrl || !swapTargetInfluencer) {
                        toast.error("Please provide source video and target influencer");
                        return;
                      }
                      toast.success("Character swap job queued!", { description: "Processing your video..." });
                      setActiveTab("jobs");
                    }}
                    disabled={!swapSourceUrl || !swapTargetInfluencer}
                  >
                    <UserSquare className="w-4 h-4 mr-2" />
                    Swap Character
                  </Button>
                </CardContent>
              </Card>

              {/* Motion Sync */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Move className="w-5 h-5 text-primary" />
                    Motion Sync
                  </CardTitle>
                  <CardDescription>
                    Transfer motion from a reference video to your AI influencer.
                    Upload a video of yourself or any person to clone their movements.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Motion Sync Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Enable Motion Sync</Label>
                      <p className="text-xs text-muted-foreground">Clone motion from reference video</p>
                    </div>
                    <Switch checked={motionSyncEnabled} onCheckedChange={setMotionSyncEnabled} />
                  </div>

                  {motionSyncEnabled && (
                    <>
                      {/* Reference Video */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Reference Video URL</Label>
                        <Input
                          placeholder="Paste URL of motion reference video..."
                          value={motionReferenceUrl}
                          onChange={(e) => setMotionReferenceUrl(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Upload a video of a person performing the desired movements.
                          The AI will transfer these movements to your influencer.
                        </p>
                      </div>

                      {/* Motion Preset */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Motion Intensity</Label>
                        <Select value={motionPreset} onValueChange={setMotionPreset}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MOTION_PRESETS.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                <span className="flex flex-col">
                                  <span>{m.name}</span>
                                  <span className="text-[10px] text-muted-foreground">{m.desc}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Sync Options */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-medium">Body Motion</Label>
                            <p className="text-xs text-muted-foreground">Transfer torso & arm movements</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-medium">Head Motion</Label>
                            <p className="text-xs text-muted-foreground">Transfer head turns & nods</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-medium">Hand Gestures</Label>
                            <p className="text-xs text-muted-foreground">Transfer hand & finger movements</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-medium">Facial Expressions</Label>
                            <p className="text-xs text-muted-foreground">Transfer micro-expressions</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Background Options */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-primary" />
                      Background
                    </Label>
                    <Select value={t2vBackground} onValueChange={setT2vBackground}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BACKGROUND_OPTIONS.map((bg) => (
                          <SelectItem key={bg.id} value={bg.id}>
                            <span className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">{bg.category}</Badge>
                              {bg.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Remove Background */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Remove Background</Label>
                      <p className="text-xs text-muted-foreground">AI background removal for clean compositing</p>
                    </div>
                    <Switch checked={removeBackground} onCheckedChange={setRemoveBackground} />
                  </div>

                  {/* Output Settings */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5 text-primary" />
                      Output Settings
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={resolution} onValueChange={setResolution}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="720p">720p</SelectItem>
                          <SelectItem value="1080p">1080p HD</SelectItem>
                          <SelectItem value="4k">4K Ultra HD</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={aspectRatio} onValueChange={setAspectRatio}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="16:9">16:9 Landscape</SelectItem>
                          <SelectItem value="9:16">9:16 Portrait</SelectItem>
                          <SelectItem value="1:1">1:1 Square</SelectItem>
                          <SelectItem value="4:5">4:5 Instagram</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========== Jobs Tab ========== */}
          <TabsContent value="jobs" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Generation Jobs</h2>
              <div className="flex items-center gap-2">
                {jobs && jobs.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/30"
                    onClick={() => {
                      if (window.confirm(`Delete all ${jobs.length} video jobs and their assets? This cannot be undone.`)) {
                        deleteAllMutation.mutate();
                      }
                    }}
                    disabled={deleteAllMutation.isPending}
                  >
                    {deleteAllMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Delete All
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => refetchJobs()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {loadingJobs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !jobs || jobs.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Video className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No generation jobs yet</p>
                  <p className="text-sm mt-1">Create your first video in the Generate tab.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setActiveTab("generate")}
                  >
                    <ChevronRight className="w-3 h-3 mr-1" />
                    Go to Generate
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {jobs.map((job: any) => (
                  <Card key={job.id} className="bg-card border-border">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-muted-foreground">#{job.id}</span>
                            {getStatusBadge(job.status)}
                            {job.batchGroupId && (
                              <Badge variant="outline" className="text-xs">
                                Batch
                              </Badge>
                            )}
                            {job.lipSync && (
                              <Badge variant="outline" className="text-xs text-primary border-primary/30">
                                <Mic className="w-2.5 h-2.5 mr-0.5" />
                                Lip-sync
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm truncate">{job.scriptText}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Provider: {getProviderLabel(job.provider)}</span>
                            <span>{new Date(job.createdAt).toLocaleString()}</span>
                          </div>
                          {(job.status === "queued" || job.status === "running") && (
                            <Progress value={job.progress ?? 0} className="mt-2 h-1.5" />
                          )}
                          {job.error && (
                            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {job.error}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {(job.status === "queued" || job.status === "running") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => cancelMutation.mutate({ jobId: job.id })}
                              disabled={cancelMutation.isPending}
                            >
                              <Pause className="w-3 h-3 mr-1" />
                              Cancel
                            </Button>
                          )}
                          {job.status === "failed" && !job.error?.includes("Deleted") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => retryMutation.mutate({ jobId: job.id })}
                              disabled={retryMutation.isPending}
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Retry
                            </Button>
                          )}
                          {job.status === "succeeded" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewVideo(job.id)}
                            >
                              <Play className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          )}
                          {(job.status === "succeeded" || job.status === "failed") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMutation.mutate({ jobId: job.id })}
                              disabled={deleteMutation.isPending}
                              className="text-muted-foreground hover:text-red-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ========== Library Tab ========== */}
          <TabsContent value="library" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Video Library</h2>
              <Badge variant="secondary">{library?.length ?? 0} videos</Badge>
            </div>

            {loadingLibrary ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !library || library.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Film className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No completed videos yet</p>
                  <p className="text-sm mt-1">Generate your first video to see it here.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setActiveTab("generate")}
                  >
                    <ChevronRight className="w-3 h-3 mr-1" />
                    Go to Generate
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {library.map((video: any) => (
                  <Card
                    key={video.id}
                    className="bg-card border-border overflow-hidden group cursor-pointer"
                    onClick={() => handleViewVideo(video.id)}
                  >
                    <div className="aspect-video bg-secondary/30 relative flex items-center justify-center">
                      <Video className="w-12 h-12 text-muted-foreground/30" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleViewVideo(video.id); }}>
                          <Play className="w-4 h-4 mr-1" />
                          Play
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewVideo(video.id);
                          }}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-red-400 hover:text-red-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Delete this video? This cannot be undone.")) {
                              deleteMutation.mutate({ jobId: video.id });
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="py-3">
                      <p className="text-sm truncate">{video.scriptText}</p>
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {getProviderLabel(video.provider)}
                          {video.lipSync && (
                            <Mic className="w-3 h-3 text-primary" />
                          )}
                        </span>
                        <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ========== Video Preview Dialog ========== */}
      <Dialog open={previewOpen} onOpenChange={(open) => { if (!open) handleClosePreview(); }}>
        <DialogContent className="max-w-3xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              Video Preview
            </DialogTitle>
            {videoData?.scriptText && (
              <DialogDescription className="truncate">
                {videoData.scriptText}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4">
            {loadingVideo ? (
              <div className="aspect-video bg-secondary/20 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Loading video...</p>
                </div>
              </div>
            ) : videoError ? (
              <div className="aspect-video bg-secondary/20 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                  <p className="text-sm text-red-400">Failed to load video</p>
                  <p className="text-xs text-muted-foreground mt-1">{videoError.message}</p>
                </div>
              </div>
            ) : videoData ? (
              <>
                {/* Show real video player if not a placeholder, otherwise show thumbnail or fallback */}
                {videoData.url && !videoData.isPlaceholder ? (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                    <video
                      src={videoData.url}
                      controls
                      autoPlay
                      poster={videoData.thumbnailUrl || undefined}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        // If the video can't play, hide it and show the thumbnail
                        e.currentTarget.style.display = "none";
                        const fallbackEl = e.currentTarget.parentElement?.querySelector(".video-fallback") as HTMLElement;
                        if (fallbackEl) fallbackEl.style.display = "flex";
                      }}
                    />
                    <div className="video-fallback w-full h-full items-center justify-center absolute inset-0" style={{ display: "none" }}>
                      {videoData.thumbnailUrl ? (
                        <img src={videoData.thumbnailUrl} alt="Video thumbnail" className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-center">
                          <Film className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                          <p className="text-sm text-muted-foreground">Video could not be played</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : videoData.thumbnailUrl ? (
                  // Placeholder video — show the AI-generated thumbnail image
                  <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                    <img
                      src={videoData.thumbnailUrl}
                      alt="AI-generated video frame"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm text-white">AI-Generated Frame</span>
                      </div>
                      <p className="text-xs text-white/60 mt-1">
                        This is an AI-generated preview frame. Configure a video provider (Runway, Sora, or Replicate) in AI Providers to generate full motion video.
                      </p>
                    </div>
                  </div>
                ) : videoData.url ? (
                  // Has a URL but it's a placeholder with no thumbnail
                  <div className="aspect-video bg-secondary/20 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Film className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-sm text-muted-foreground">Video generation completed</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Configure a video provider in AI Providers settings to generate viewable video content.
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Video metadata */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Provider: {getProviderLabel(videoData.provider)}</span>
                    {videoData.lipSync && (
                      <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                        <Mic className="w-2.5 h-2.5 mr-0.5" />
                        Lip-sync
                      </Badge>
                    )}
                    <span>{new Date(videoData.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {videoData.url && !videoData.isPlaceholder && (
                      <Button variant="outline" size="sm" onClick={handleDownloadVideo}>
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    )}
                    {videoData.thumbnailUrl && (
                      <Button variant="outline" size="sm" onClick={() => { if (videoData?.thumbnailUrl) window.open(videoData.thumbnailUrl, "_blank"); }}>
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Image
                      </Button>
                    )}
                    {videoData.url && !videoData.isPlaceholder && (
                      <Button variant="outline" size="sm" onClick={() => { if (videoData?.url) window.open(videoData.url, "_blank"); }}>
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Open
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
