import { useState, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { 
  Image as ImageIcon, 
  Video, 
  Upload, 
  Sparkles, 
  Play,
  Pause,
  RefreshCw,
  Download,
  Trash2,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

export default function VideoStudioPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("images");
  const [sessionId, setSessionId] = useState<number | null>(null);
  
  // Image generation state
  const [imagePrompt, setImagePrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [referenceStrength, setReferenceStrength] = useState(0.5);
  
  // Video generation state
  const [selectedScriptId, setSelectedScriptId] = useState<number | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [selectedReferenceIds, setSelectedReferenceIds] = useState<number[]>([]);

  // tRPC queries and mutations
  const { data: sessions } = trpc.workflow.listSessions.useQuery();
  const { data: assets, refetch: refetchAssets } = trpc.gallery.listAssets.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );
  const { data: jobs, refetch: refetchJobs } = trpc.jobs.listBySession.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );
  const { data: scripts } = trpc.scripts.listBySession.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );
  const { data: profiles } = trpc.policy.listProfiles.useQuery();

  const createSession = trpc.workflow.createSession.useMutation({
    onSuccess: (data) => {
      setSessionId(data.id);
      toast.success("Studio session created");
    },
  });

  const createImageJob = trpc.jobs.createImageJob.useMutation({
    onSuccess: () => {
      toast.success("Image generation job queued");
      refetchJobs();
    },
    onError: (error) => {
      toast.error(`Failed to queue image job: ${error.message}`);
    },
  });

  const createVideoJob = trpc.jobs.createVideoJob.useMutation({
    onSuccess: () => {
      toast.success("Video generation job queued");
      refetchJobs();
    },
    onError: (error) => {
      toast.error(`Failed to queue video job: ${error.message}`);
    },
  });

  const cancelJob = trpc.jobs.cancel.useMutation({
    onSuccess: () => {
      toast.success("Job cancelled");
      refetchJobs();
    },
  });

  const retryJob = trpc.jobs.retry.useMutation({
    onSuccess: () => {
      toast.success("Job requeued");
      refetchJobs();
    },
  });

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error("Please enter a prompt for image generation");
      return;
    }

    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const result = await createSession.mutateAsync({
        title: `Studio Session - ${new Date().toLocaleDateString()}`,
      });
      currentSessionId = result.id;
      setSessionId(currentSessionId);
    }

    createImageJob.mutate({
      sessionId: currentSessionId,
      prompt: imagePrompt,
      negativePrompt: negativePrompt || undefined,
      aspectRatio,
      referenceStrength: selectedReferenceIds.length > 0 ? referenceStrength : undefined,
      referenceAssetIds: selectedReferenceIds.length > 0 ? selectedReferenceIds : undefined,
    });
  };

  const handleGenerateVideo = async () => {
    if (!selectedScriptId) {
      toast.error("Please select a script for video generation");
      return;
    }

    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const result = await createSession.mutateAsync({
        title: `Studio Session - ${new Date().toLocaleDateString()}`,
      });
      currentSessionId = result.id;
      setSessionId(currentSessionId);
    }

    createVideoJob.mutate({
      sessionId: currentSessionId,
      scriptId: selectedScriptId,
      influencerProfileId: selectedProfileId || undefined,
      referenceAssetIds: selectedReferenceIds.length > 0 ? selectedReferenceIds : undefined,
    });
  };

  const getJobStatusIcon = (status: string) => {
    switch (status) {
      case "succeeded":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
      case "dead_letter":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "running":
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case "queued":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "canceled":
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const referenceImages = assets?.filter(a => a.assetType === "reference_image") || [];
  const generatedImages = assets?.filter(a => a.assetType === "generated_image") || [];
  const generatedVideos = assets?.filter(a => a.assetType === "generated_video") || [];

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Video Studio</h1>
            <p className="text-muted-foreground mt-1">
              Generate images and videos for your content
            </p>
          </div>
          {sessionId && (
            <Badge variant="outline" className="text-sm">
              Session #{sessionId}
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="images" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Images
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Videos
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Jobs
            </TabsTrigger>
          </TabsList>

          {/* Images Tab */}
          <TabsContent value="images" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Image Generation Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Generate Image
                  </CardTitle>
                  <CardDescription>
                    Create AI-generated images for your videos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="imagePrompt">Prompt</Label>
                    <Textarea
                      id="imagePrompt"
                      placeholder="Describe the image you want to generate..."
                      className="min-h-[100px] resize-none"
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="negativePrompt">Negative Prompt (optional)</Label>
                    <Input
                      id="negativePrompt"
                      placeholder="What to avoid in the image..."
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aspectRatio">Aspect Ratio</Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger id="aspectRatio">
                        <SelectValue placeholder="Select aspect ratio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9:16">9:16 (Portrait/TikTok)</SelectItem>
                        <SelectItem value="16:9">16:9 (Landscape/YouTube)</SelectItem>
                        <SelectItem value="1:1">1:1 (Square/Instagram)</SelectItem>
                        <SelectItem value="4:5">4:5 (Instagram Portrait)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {referenceImages.length > 0 && (
                    <div className="space-y-2">
                      <Label>Reference Strength</Label>
                      <Slider
                        value={[referenceStrength]}
                        onValueChange={([v]) => setReferenceStrength(v)}
                        min={0}
                        max={1}
                        step={0.1}
                        className="py-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        {Math.round(referenceStrength * 100)}% influence from reference images
                      </p>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleGenerateImage}
                    disabled={createImageJob.isPending || !imagePrompt.trim()}
                  >
                    {createImageJob.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Queuing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Image
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Generated Images Gallery */}
              <Card>
                <CardHeader>
                  <CardTitle>Generated Images</CardTitle>
                  <CardDescription>
                    Your AI-generated images
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {generatedImages.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {generatedImages.map((asset) => (
                        <div
                          key={asset.id}
                          className="relative group aspect-[9/16] rounded-lg overflow-hidden border"
                        >
                          <img
                            src={asset.url || ""}
                            alt="Generated"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button size="sm" variant="secondary">
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
                      <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
                      <p>No generated images yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Video Generation Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" />
                    Generate Video
                  </CardTitle>
                  <CardDescription>
                    Create AI-generated videos from your scripts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Script</Label>
                    <Select
                      value={selectedScriptId?.toString() || ""}
                      onValueChange={(v) => setSelectedScriptId(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a script" />
                      </SelectTrigger>
                      <SelectContent>
                        {scripts?.map((script) => (
                          <SelectItem key={script.id} value={script.id.toString()}>
                            {script.platform} - {script.fullScript?.substring(0, 30)}...
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!scripts?.length && (
                      <p className="text-xs text-muted-foreground">
                        No scripts available. Generate one first.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Influencer Profile (optional)</Label>
                    <Select
                      value={selectedProfileId?.toString() || ""}
                      onValueChange={(v) => setSelectedProfileId(v ? parseInt(v) : null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a profile" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {profiles?.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id.toString()}>
                            {profile.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleGenerateVideo}
                    disabled={createVideoJob.isPending || !selectedScriptId}
                  >
                    {createVideoJob.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Queuing...
                      </>
                    ) : (
                      <>
                        <Video className="w-4 h-4 mr-2" />
                        Generate Video
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Generated Videos Gallery */}
              <Card>
                <CardHeader>
                  <CardTitle>Generated Videos</CardTitle>
                  <CardDescription>
                    Your AI-generated videos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {generatedVideos.length > 0 ? (
                    <div className="space-y-4">
                      {generatedVideos.map((asset) => (
                        <div
                          key={asset.id}
                          className="relative rounded-lg overflow-hidden border"
                        >
                          <video
                            src={asset.url || ""}
                            className="w-full aspect-video"
                            controls
                          />
                          <div className="p-2 flex items-center justify-between bg-muted/50">
                            <span className="text-sm text-muted-foreground">
                              {asset.durationSeconds}s
                            </span>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline">
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <ChevronRight className="w-4 h-4" />
                                Deploy
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
                      <Video className="w-12 h-12 mb-4 opacity-50" />
                      <p>No generated videos yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Generation Jobs</CardTitle>
                <CardDescription>
                  Track the status of your generation jobs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {jobs && jobs.length > 0 ? (
                  <div className="space-y-4">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        className="p-4 border rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getJobStatusIcon(job.status)}
                            <Badge variant="outline">{job.jobKind}</Badge>
                            <span className="text-sm font-medium">Job #{job.id}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {["queued", "running"].includes(job.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelJob.mutate({ jobId: job.id })}
                              >
                                Cancel
                              </Button>
                            )}
                            {["failed", "dead_letter", "canceled"].includes(job.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => retryJob.mutate({ jobId: job.id })}
                              >
                                Retry
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {job.status === "running" && (
                          <Progress value={job.progress} className="h-2 mb-2" />
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Attempts: {job.attemptCount}/{job.maxAttempts}</span>
                          <span>Created: {new Date(job.createdAt).toLocaleString()}</span>
                        </div>
                        
                        {job.errorMessage && (
                          <p className="mt-2 text-sm text-red-500">{job.errorMessage}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
                    <Clock className="w-8 h-8 mb-2 opacity-50" />
                    <p>No jobs yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
