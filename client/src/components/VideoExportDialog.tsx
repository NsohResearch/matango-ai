import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Download,
  Film,
  Loader2,
  Check,
  X,
  Clock,
  AlertCircle,
  Settings2,
  Sparkles,
  FileVideo,
  HardDrive,
  Zap,
} from "lucide-react";

// Export presets
const EXPORT_PRESETS = [
  {
    id: "social_vertical",
    name: "Social Media (Vertical)",
    description: "9:16 for TikTok, Reels, Shorts",
    resolution: "1080x1920",
    format: "mp4",
    quality: "high",
    fps: 30,
  },
  {
    id: "social_square",
    name: "Social Media (Square)",
    description: "1:1 for Instagram Feed",
    resolution: "1080x1080",
    format: "mp4",
    quality: "high",
    fps: 30,
  },
  {
    id: "youtube",
    name: "YouTube",
    description: "16:9 Full HD",
    resolution: "1920x1080",
    format: "mp4",
    quality: "high",
    fps: 30,
  },
  {
    id: "youtube_4k",
    name: "YouTube 4K",
    description: "16:9 Ultra HD",
    resolution: "3840x2160",
    format: "mp4",
    quality: "high",
    fps: 30,
  },
  {
    id: "custom",
    name: "Custom",
    description: "Configure your own settings",
    resolution: "custom",
    format: "mp4",
    quality: "high",
    fps: 30,
  },
];

const RESOLUTIONS = [
  { value: "640x360", label: "360p (640x360)" },
  { value: "854x480", label: "480p (854x480)" },
  { value: "1280x720", label: "720p HD (1280x720)" },
  { value: "1920x1080", label: "1080p Full HD (1920x1080)" },
  { value: "2560x1440", label: "1440p 2K (2560x1440)" },
  { value: "3840x2160", label: "2160p 4K (3840x2160)" },
];

const FORMATS = [
  { value: "mp4", label: "MP4 (H.264)", description: "Best compatibility" },
  { value: "webm", label: "WebM (VP9)", description: "Smaller file size" },
  { value: "mov", label: "MOV (ProRes)", description: "High quality editing" },
];

const QUALITY_OPTIONS = [
  { value: "low", label: "Low", description: "Smaller file, faster export" },
  { value: "medium", label: "Medium", description: "Balanced quality and size" },
  { value: "high", label: "High", description: "Best quality, larger file" },
];

// Use inferred type from tRPC
type ExportJob = {
  id: number;
  projectId: number;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
  outputUrl: string | null;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
  format: string;
  resolution: string;
  quality: string;
  frameRate: number;
};

interface VideoExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectName: string;
  totalDuration: number; // in milliseconds
}

export default function VideoExportDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  totalDuration,
}: VideoExportDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState("social_vertical");
  const [resolution, setResolution] = useState<"720p" | "1080p" | "4k">("1080p");
  const [format, setFormat] = useState<"mp4" | "webm" | "mov" | "gif">("mp4");
  const [quality, setQuality] = useState<"draft" | "standard" | "high" | "ultra">("high");
  const [fps, setFps] = useState(30);
  const [includeWatermark, setIncludeWatermark] = useState(false);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  
  // tRPC queries and mutations
  const { data: exportJobs, refetch: refetchJobs } = trpc.creator.exports.list.useQuery(
    { projectId, limit: 5 },
    { enabled: open }
  );
  
  const createExportMutation = trpc.creator.exports.create.useMutation({
    onSuccess: (data) => {
      toast.success("Export started!");
      setActiveJobId(data.id);
      refetchJobs();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const cancelExportMutation = trpc.creator.exports.cancel.useMutation({
    onSuccess: () => {
      toast.info("Export cancelled");
      setActiveJobId(null);
      refetchJobs();
    },
    onError: (error) => toast.error(error.message),
  });
  
  // Poll for job status when there's an active job
  useEffect(() => {
    if (!activeJobId) return;
    
    const interval = setInterval(() => {
      refetchJobs();
    }, 2000);
    
    return () => clearInterval(interval);
  }, [activeJobId, refetchJobs]);
  
  // Update active job status
  useEffect(() => {
    if (!exportJobs || !activeJobId) return;
    
    const activeJob = exportJobs.find((job) => job.id === activeJobId);
    if (activeJob && (activeJob.status === "completed" || activeJob.status === "failed" || activeJob.status === "cancelled")) {
      setActiveJobId(null);
      if (activeJob.status === "completed") {
        toast.success("Export completed! Your video is ready to download.");
      } else if (activeJob.status === "failed") {
        toast.error(`Export failed: ${activeJob.errorMessage || "Unknown error"}`);
      }
    }
  }, [exportJobs, activeJobId]);
  
  // Handle preset change
  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = EXPORT_PRESETS.find(p => p.id === presetId);
    if (preset && preset.id !== "custom") {
      // Map preset resolution to API format
      const resolutionMap: Record<string, "720p" | "1080p" | "4k"> = {
        "1280x720": "720p",
        "1920x1080": "1080p",
        "1080x1920": "1080p",
        "1080x1080": "1080p",
        "3840x2160": "4k",
      };
      setResolution(resolutionMap[preset.resolution] || "1080p");
      setFormat(preset.format as "mp4" | "webm" | "mov" | "gif");
      setQuality(preset.quality as "draft" | "standard" | "high" | "ultra");
      setFps(preset.fps);
    }
  };
  
  // Start export
  const handleStartExport = () => {
    createExportMutation.mutate({
      projectId,
      resolution,
      format,
      quality,
      frameRate: fps,
    });
  };
  
  // Format duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Estimate file size (rough calculation)
  const estimateFileSize = () => {
    const [width, height] = resolution.split('x').map(Number);
    const pixels = width * height;
    const durationSec = totalDuration / 1000;
    
    // Rough bitrate estimates based on quality
    const bitrateMap: Record<string, number> = {
      low: 2000000,    // 2 Mbps
      medium: 5000000, // 5 Mbps
      high: 10000000,  // 10 Mbps
    };
    
    const bitrate = bitrateMap[quality] || 5000000;
    const scaleFactor = pixels / (1920 * 1080); // Scale based on resolution
    const estimatedBits = bitrate * scaleFactor * durationSec;
    const estimatedBytes = estimatedBits / 8;
    
    if (estimatedBytes > 1000000000) {
      return `~${(estimatedBytes / 1000000000).toFixed(1)} GB`;
    } else if (estimatedBytes > 1000000) {
      return `~${(estimatedBytes / 1000000).toFixed(0)} MB`;
    } else {
      return `~${(estimatedBytes / 1000).toFixed(0)} KB`;
    }
  };
  
  // Get active job
  const activeJob = exportJobs?.find((job) => job.id === activeJobId);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileVideo className="w-5 h-5" />
            Export Video
          </DialogTitle>
          <DialogDescription>
            Export "{projectName}" ({formatDuration(totalDuration)})
          </DialogDescription>
        </DialogHeader>
        
        {/* Active Export Progress */}
        {activeJob && (activeJob.status === "queued" || activeJob.status === "processing") && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="font-medium">
                    {activeJob.status === "queued" ? "Waiting in queue..." : "Rendering video..."}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => cancelExportMutation.mutate({ id: activeJob.id })}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
              <Progress value={activeJob.progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                {activeJob.progress}% complete
              </p>
            </CardContent>
          </Card>
        )}
        
        {/* Export Settings */}
        {!activeJob && (
          <div className="space-y-6">
            {/* Presets */}
            <div>
              <Label className="text-base font-medium">Export Preset</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Choose a preset or customize your export settings
              </p>
              <div className="grid grid-cols-2 gap-2">
                {EXPORT_PRESETS.map((preset) => (
                  <Card
                    key={preset.id}
                    className={`cursor-pointer transition-colors ${
                      selectedPreset === preset.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => handlePresetChange(preset.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{preset.name}</h4>
                          <p className="text-xs text-muted-foreground">{preset.description}</p>
                        </div>
                        {selectedPreset === preset.id && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            <Separator />
            
            {/* Custom Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                <Label className="text-base font-medium">Settings</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Resolution</Label>
                  <Select value={resolution} onValueChange={(v) => setResolution(v as "720p" | "1080p" | "4k")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="720p">720p HD</SelectItem>
                      <SelectItem value="1080p">1080p Full HD</SelectItem>
                      <SelectItem value="4k">4K Ultra HD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Format</Label>
                  <Select value={format} onValueChange={(v) => setFormat(v as "mp4" | "webm" | "mov" | "gif")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp4">MP4 (H.264) - Best compatibility</SelectItem>
                      <SelectItem value="webm">WebM (VP9) - Smaller file size</SelectItem>
                      <SelectItem value="mov">MOV (ProRes) - High quality editing</SelectItem>
                      <SelectItem value="gif">GIF - Animated image</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Quality</Label>
                  <Select value={quality} onValueChange={(v) => setQuality(v as "draft" | "standard" | "high" | "ultra")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUALITY_OPTIONS.map((q) => (
                        <SelectItem key={q.value} value={q.value}>
                          <div>
                            <span>{q.label}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({q.description})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Frame Rate</Label>
                  <Select value={fps.toString()} onValueChange={(v) => setFps(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 fps (Cinematic)</SelectItem>
                      <SelectItem value="30">30 fps (Standard)</SelectItem>
                      <SelectItem value="60">60 fps (Smooth)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <div>
                    <Label>Include Watermark</Label>
                    <p className="text-xs text-muted-foreground">Add Matango.ai branding</p>
                  </div>
                </div>
                <Switch
                  checked={includeWatermark}
                  onCheckedChange={setIncludeWatermark}
                />
              </div>
            </div>
            
            <Separator />
            
            {/* Export Summary */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  Export Summary
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{formatDuration(totalDuration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolution:</span>
                    <span>{resolution}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Format:</span>
                    <span className="uppercase">{format}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Size:</span>
                    <span>{estimateFileSize()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Recent Exports */}
        {exportJobs && exportJobs.length > 0 && (
          <div>
            <Label className="text-base font-medium mb-3 block">Recent Exports</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {exportJobs.map((job: ExportJob) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    {job.status === "completed" && <Check className="w-4 h-4 text-green-500" />}
                    {job.status === "failed" && <AlertCircle className="w-4 h-4 text-destructive" />}
                    {job.status === "cancelled" && <X className="w-4 h-4 text-muted-foreground" />}
                    {(job.status === "queued" || job.status === "processing") && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {job.resolution || "Unknown"} • {job.format?.toUpperCase() || "MP4"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(job.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        job.status === "completed" ? "default" :
                        job.status === "failed" ? "destructive" :
                        "secondary"
                      }
                    >
                      {job.status}
                    </Badge>
                    {job.status === "completed" && job.outputUrl && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={job.outputUrl} download target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleStartExport}
            disabled={createExportMutation.isPending || !!activeJob}
          >
            {createExportMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Start Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
