import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { 
  Upload, 
  Image as ImageIcon, 
  Wand2, 
  Sparkles,
  User,
  Download,
  Loader2,
  X,
  Plus,
  Camera,
  Zap,
  CheckCircle2,
  AlertCircle,
  Grid3X3,
  Trash2,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { getLoginUrl } from "@/const";

interface LocalUpload {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "uploaded" | "error";
}

export default function InfluencerStudio() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Active tab
  const [activeTab, setActiveTab] = useState("create");
  
  // Create influencer state
  const [characterName, setCharacterName] = useState("");
  const [characterDescription, setCharacterDescription] = useState("");
  const [localUploads, setLocalUploads] = useState<LocalUpload[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  // Selected influencer for training/gallery
  const [selectedInfluencerId, setSelectedInfluencerId] = useState<number | null>(null);
  
  // Generation state
  const [generationPrompt, setGenerationPrompt] = useState("");
  
  // Delete confirmation dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // Remix dialog
  const [remixDialogOpen, setRemixDialogOpen] = useState(false);
  const [remixUrl, setRemixUrl] = useState("");
  const [remixPrompt, setRemixPrompt] = useState("");

  // ---- tRPC Queries ----
  const influencerListQuery = trpc.influencer.list.useQuery(undefined, {
    enabled: !!user,
  });

  const trainingStatusQuery = trpc.influencerStudioV2.getTrainingStatus.useQuery(
    { influencerId: selectedInfluencerId! },
    { enabled: !!selectedInfluencerId, refetchInterval: 3000 }
  );

  const imagesQuery = trpc.influencerStudioV2.listImages.useQuery(
    { influencerId: selectedInfluencerId!, role: "all" },
    { enabled: !!selectedInfluencerId }
  );

  const galleryQuery = trpc.influencerStudioV2.gallery.useQuery(
    { influencerId: selectedInfluencerId!, kind: "all" },
    { enabled: !!selectedInfluencerId }
  );

  // ---- tRPC Mutations ----
  const createInfluencerMut = trpc.influencer.create.useMutation({
    onSuccess: () => {
      influencerListQuery.refetch();
      toast.success("Influencer created!");
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadImageMut = trpc.influencerStudioV2.uploadImage.useMutation({
    onSuccess: () => {
      imagesQuery.refetch();
      galleryQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const startTrainingMut = trpc.influencerStudioV2.startTraining.useMutation({
    onSuccess: () => {
      trainingStatusQuery.refetch();
      toast.success("Training started! This may take a few minutes.");
    },
    onError: (err) => toast.error(err.message),
  });

  const generateImageMut = trpc.influencerStudioV2.generateImage.useMutation({
    onSuccess: () => {
      galleryQuery.refetch();
      toast.success("Image generated and saved to gallery!");
    },
    onError: (err) => toast.error(err.message),
  });

  const removeImageMut = trpc.influencerStudioV2.removeImage.useMutation({
    onSuccess: () => {
      imagesQuery.refetch();
      galleryQuery.refetch();
      toast.success("Image removed");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteInfluencerMut = trpc.influencerStudioV2.deleteInfluencer.useMutation({
    onSuccess: () => {
      influencerListQuery.refetch();
      setSelectedInfluencerId(null);
      setDeleteConfirmOpen(false);
      setDeleteTargetId(null);
      toast.success("Influencer deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteGenerationMut = trpc.influencerStudioV2.deleteGeneration.useMutation({
    onSuccess: () => {
      galleryQuery.refetch();
      toast.success("Generated image deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  // ---- Auto-select first influencer ----
  useEffect(() => {
    if (influencerListQuery.data && influencerListQuery.data.length > 0 && !selectedInfluencerId) {
      setSelectedInfluencerId(influencerListQuery.data[0].id);
    }
  }, [influencerListQuery.data, selectedInfluencerId]);

  // ---- File handling ----
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 3 - localUploads.length;
    if (remainingSlots <= 0) {
      toast.error("Maximum 3 reference images allowed");
      return;
    }

    const filesToAdd = Array.from(files).slice(0, remainingSlots);
    const newImages: LocalUpload[] = filesToAdd.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      status: "pending" as const,
    }));

    setLocalUploads(prev => [...prev, ...newImages]);
    if (e.target) e.target.value = "";
  }, [localUploads.length]);

  const removeLocalUpload = (id: string) => {
    setLocalUploads(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  // ---- Create Influencer + Upload Images + Start Training ----
  const handleCreateAndTrain = async () => {
    if (!characterName.trim()) {
      toast.error("Please enter a name for your influencer");
      return;
    }
    if (localUploads.length === 0) {
      toast.error("Please upload at least 1 reference image (2-3 recommended)");
      return;
    }

    setIsCreating(true);
    try {
      // 1. Create the influencer
      const inf = await createInfluencerMut.mutateAsync({
        name: characterName.trim(),
        bio: characterDescription.trim() || undefined,
      });

      const influencerId = inf.id;
      setSelectedInfluencerId(influencerId);

      // 2. Upload each image to S3 via the V2 router
      for (let i = 0; i < localUploads.length; i++) {
        const upload = localUploads[i];
        setLocalUploads(prev =>
          prev.map(u => u.id === upload.id ? { ...u, status: "uploading" } : u)
        );

        // Convert file to base64
        const arrayBuffer = await upload.file.arrayBuffer();
        const base64Data = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );

        await uploadImageMut.mutateAsync({
          influencerId,
          base64Data,
          contentType: upload.file.type || "image/png",
          originalName: upload.file.name,
          role: "training",
        });

        setLocalUploads(prev =>
          prev.map(u => u.id === upload.id ? { ...u, status: "uploaded" } : u)
        );
      }

      // 3. Start training
      await startTrainingMut.mutateAsync({ influencerId, provider: "local" });

      toast.success(`Influencer "${characterName}" created and training started!`);
      setActiveTab("train");
      setCharacterName("");
      setCharacterDescription("");
      setLocalUploads([]);
    } catch (error) {
      // Errors handled by individual mutations
    } finally {
      setIsCreating(false);
    }
  };

  // ---- Generate image ----
  const handleGenerateImage = async () => {
    if (!selectedInfluencerId) {
      toast.error("Please select an influencer first");
      return;
    }
    if (!generationPrompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    await generateImageMut.mutateAsync({
      influencerId: selectedInfluencerId,
      prompt: generationPrompt.trim(),
      style: "realistic",
    });

    setGenerationPrompt("");
  };

  // ---- Download image ----
  const downloadImage = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${name}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Image downloaded!");
    } catch {
      toast.error("Failed to download image");
    }
  };

  // ---- Derived state ----
  const influencers = influencerListQuery.data ?? [];
  const selectedInfluencer = influencers.find(i => i.id === selectedInfluencerId);
  const trainingJobs = trainingStatusQuery.data ?? [];
  const latestTraining = trainingJobs[0];
  const isTraining = latestTraining?.status === "processing";
  const isReady = latestTraining?.status === "completed";
  const linkedImages = imagesQuery.data ?? [];
  const gallery = galleryQuery.data;

  const presetPrompts = [
    "Professional headshot with neutral background",
    "Casual lifestyle photo in a coffee shop",
    "Fitness pose in a modern gym",
    "Fashion photoshoot with dramatic lighting",
    "Beach vacation candid shot",
    "Business meeting presentation",
    "Social media selfie style",
    "Outdoor adventure hiking scene",
  ];

  // ---- Auth guards ----
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <Camera className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Influencer Studio</h1>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Upload reference images, train your AI influencer, and generate unique content. Sign in to start.
          </p>
          <Button asChild size="lg" className="bg-primary text-primary-foreground">
            <a href={getLoginUrl()}>Sign In to Continue</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Camera className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Influencer Studio</h1>
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
              Step 2
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Upload 1-3 reference images, train your AI model, and generate unique influencer content.
          </p>
        </div>

        {/* Influencer Selector */}
        {influencers.length > 0 && (
          <div className="mb-6 flex items-center gap-4 flex-wrap">
            <span className="text-sm text-muted-foreground">Your Influencers:</span>
            {influencers.map((inf) => (
              <div key={inf.id} className="flex items-center gap-1">
                <Button
                  variant={selectedInfluencerId === inf.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedInfluencerId(inf.id)}
                  className="gap-2"
                >
                  <User className="w-4 h-4" />
                  {inf.name}
                  {inf.stats && (
                    <Badge variant="outline" className="text-xs border-green-500 text-green-500">Ready</Badge>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTargetId(inf.id);
                    setDeleteConfirmOpen(true);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Delete Influencer Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="bg-card border-white/10">
            <DialogHeader>
              <DialogTitle>Delete Influencer</DialogTitle>
              <DialogDescription>
                This will permanently delete this influencer and all associated training data, images, and generations. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteInfluencerMut.isPending}
                onClick={() => {
                  if (deleteTargetId) {
                    deleteInfluencerMut.mutate({ influencerId: deleteTargetId });
                  }
                }}
              >
                {deleteInfluencerMut.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
                ) : (
                  <><Trash2 className="w-4 h-4 mr-2" />Delete Permanently</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="create" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              1. Create & Upload
            </TabsTrigger>
            <TabsTrigger value="train" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Zap className="w-4 h-4 mr-2" />
              2. Train
            </TabsTrigger>
            <TabsTrigger value="generate" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Wand2 className="w-4 h-4 mr-2" />
              3. Generate
            </TabsTrigger>
            <TabsTrigger value="gallery" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Grid3X3 className="w-4 h-4 mr-2" />
              4. Gallery
            </TabsTrigger>
          </TabsList>

          {/* ============ TAB 1: CREATE & UPLOAD ============ */}
          <TabsContent value="create" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left: Influencer Details */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Create Influencer
                  </CardTitle>
                  <CardDescription>
                    Name your AI influencer and upload 1-3 reference images for training.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Influencer Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Ka'ah, Neon V, Skylar, Tema, Luna Star"
                      value={characterName}
                      onChange={(e) => setCharacterName(e.target.value)}
                      className="bg-white/5 border-white/10 mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="desc">Description (optional)</Label>
                    <Textarea
                      id="desc"
                      placeholder="Describe the influencer's personality, style, niche..."
                      value={characterDescription}
                      onChange={(e) => setCharacterDescription(e.target.value)}
                      className="bg-white/5 border-white/10 mt-1"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Right: Upload Area */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary" />
                    Reference Images
                  </CardTitle>
                  <CardDescription>
                    Upload 1-3 high-quality images. More images improve training quality.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                    <p className="font-medium mb-1">Click to upload or drag and drop</p>
                    <p className="text-sm text-muted-foreground">PNG, JPG up to 10MB each (max 3 images)</p>
                  </div>

                  {localUploads.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {localUploads.length}/3 images selected
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {localUploads.map((img) => (
                          <div key={img.id} className="relative group rounded-lg overflow-hidden border border-white/10">
                            <img src={img.preview} alt="Reference" className="w-full aspect-square object-cover" />
                            {img.status === "uploading" && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                              </div>
                            )}
                            {img.status === "uploaded" && (
                              <div className="absolute top-1 right-1">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                              </div>
                            )}
                            {img.status === "pending" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); removeLocalUpload(img.id); }}
                                className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4 text-white" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleCreateAndTrain}
                    disabled={isCreating || !characterName.trim() || localUploads.length === 0}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    size="lg"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating & Uploading...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create Influencer & Start Training
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ============ TAB 2: TRAINING STATUS ============ */}
          <TabsContent value="train" className="space-y-6">
            {!selectedInfluencerId ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Create an influencer first to see training status.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Training Status */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      Training Status
                    </CardTitle>
                    <CardDescription>
                      {selectedInfluencer?.name ?? "Selected influencer"} — Model training progress
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {trainingJobs.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">No training jobs yet.</p>
                        <Button
                          onClick={() => startTrainingMut.mutate({ influencerId: selectedInfluencerId!, provider: "local" })}
                          disabled={startTrainingMut.isPending}
                        >
                          {startTrainingMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                          Start Training
                        </Button>
                      </div>
                    ) : (
                      trainingJobs.map((job) => (
                        <div key={job.id} className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{job.name || `Job #${job.id}`}</span>
                            <Badge
                              variant={
                                job.status === "completed" ? "default" :
                                job.status === "processing" ? "secondary" :
                                job.status === "failed" ? "destructive" : "outline"
                              }
                            >
                              {job.status === "completed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                              {job.status === "processing" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                              {job.status === "failed" && <AlertCircle className="w-3 h-3 mr-1" />}
                              {job.status}
                            </Badge>
                          </div>
                          {job.status === "processing" && (
                            <Progress value={job.progress ?? 0} className="h-2" />
                          )}
                          {job.status === "completed" && (
                            <p className="text-sm text-green-400">Training complete. You can now generate images.</p>
                          )}
                          {job.status === "failed" && job.errorMessage && (
                            <p className="text-sm text-red-400">{job.errorMessage}</p>
                          )}
                        </div>
                      ))
                    )}

                    {isReady && (
                      <Button
                        onClick={() => setActiveTab("generate")}
                        className="w-full mt-4"
                        variant="outline"
                      >
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Proceed to Generate Images
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Training Images */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-primary" />
                      Training Images
                    </CardTitle>
                    <CardDescription>
                      Reference images used for training this influencer
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {linkedImages.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No training images uploaded yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {linkedImages.map((img) => (
                          <div key={img.linkId} className="relative group rounded-lg overflow-hidden border border-white/10">
                            <img
                              src={img.url ?? ""}
                              alt="Training reference"
                              className="w-full aspect-square object-cover"
                            />
                            <div className="absolute top-1 left-1">
                              <Badge variant="secondary" className="text-[10px]">{img.role}</Badge>
                            </div>
                            <button
                              onClick={() => removeImageMut.mutate({ influencerId: selectedInfluencerId!, linkId: img.linkId })}
                              className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ============ TAB 3: GENERATE ============ */}
          <TabsContent value="generate" className="space-y-6">
            {!selectedInfluencerId ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Create and train an influencer first.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Left: Prompt Input */}
                <Card className="lg:col-span-1 bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wand2 className="w-5 h-5 text-primary" />
                      Generate Image
                    </CardTitle>
                    <CardDescription>
                      Describe the scene or pose for {selectedInfluencer?.name ?? "your influencer"}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Prompt</Label>
                      <Textarea
                        placeholder="Professional headshot with neutral background..."
                        value={generationPrompt}
                        onChange={(e) => setGenerationPrompt(e.target.value)}
                        className="bg-white/5 border-white/10 mt-1"
                        rows={4}
                      />
                    </div>

                    <Button
                      onClick={handleGenerateImage}
                      disabled={generateImageMut.isPending || !generationPrompt.trim()}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {generateImageMut.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Image
                        </>
                      )}
                    </Button>

                    {/* Preset Prompts */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Quick Prompts</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {presetPrompts.map((prompt) => (
                          <button
                            key={prompt}
                            onClick={() => setGenerationPrompt(prompt)}
                            className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 hover:border-primary/50 transition-colors text-muted-foreground hover:text-foreground"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Right: Recent Generations */}
                <Card className="lg:col-span-2 bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-primary" />
                      Recent Generations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {gallery?.generations && gallery.generations.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {gallery.generations.map((gen) => (
                          <div key={gen.id} className="relative group rounded-lg overflow-hidden border border-white/10">
                            {gen.imageUrls && (gen.imageUrls as string[]).length > 0 && (
                              <img
                                src={(gen.imageUrls as string[])[0]}
                                alt={gen.prompt ?? "Generated"}
                                className="w-full aspect-square object-cover"
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="absolute bottom-2 left-2 right-2">
                                <p className="text-xs text-white/80 line-clamp-2">{gen.prompt}</p>
                                <div className="flex gap-1 mt-2">
                                  {gen.imageUrls && (gen.imageUrls as string[]).length > 0 && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs text-white hover:text-primary"
                                      onClick={() => downloadImage((gen.imageUrls as string[])[0], `gen-${gen.id}`)}
                                    >
                                      <Download className="w-3 h-3 mr-1" />
                                      Save
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-red-400 hover:text-red-300"
                                    disabled={deleteGenerationMut.isPending}
                                    onClick={() => deleteGenerationMut.mutate({ generationId: gen.id })}
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Wand2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No images generated yet. Use the prompt panel to create your first image.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ============ TAB 4: GALLERY ============ */}
          <TabsContent value="gallery" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Grid3X3 className="w-5 h-5 text-primary" />
                      Image Gallery
                    </CardTitle>
                    <CardDescription>
                      All images for {selectedInfluencer?.name ?? "your influencer"} — persisted in your workspace.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { galleryQuery.refetch(); imagesQuery.refetch(); }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!selectedInfluencerId ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Select or create an influencer to view their gallery.</p>
                  </div>
                ) : (
                  <>
                    {/* Linked media (training + reference images) */}
                    {gallery?.linkedMedia && gallery.linkedMedia.length > 0 ? (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Reference & Training Images</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                          {gallery.linkedMedia.map((media) => (
                            <div key={media.id} className="relative group rounded-lg overflow-hidden border border-white/10">
                              <img
                                src={media.url ?? ""}
                                alt={media.originalName ?? "Media"}
                                className="w-full aspect-square object-cover"
                              />
                              <div className="absolute top-1 left-1">
                                <Badge variant="secondary" className="text-[10px]">{media.purpose}</Badge>
                              </div>
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                {media.url && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-white"
                                    onClick={() => downloadImage(media.url!, `media-${media.id}`)}
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Generated images */}
                    {gallery?.generations && gallery.generations.length > 0 ? (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Generated Images</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {gallery.generations.map((gen) => (
                            <div key={gen.id} className="relative group rounded-lg overflow-hidden border border-white/10">
                              {gen.imageUrls && (gen.imageUrls as string[]).length > 0 && (
                                <img
                                  src={(gen.imageUrls as string[])[0]}
                                  alt={gen.prompt ?? "Generated"}
                                  className="w-full aspect-square object-cover"
                                />
                              )}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                {gen.imageUrls && (gen.imageUrls as string[]).length > 0 && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-white"
                                    onClick={() => downloadImage((gen.imageUrls as string[])[0], `gen-${gen.id}`)}
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-red-400 hover:text-red-300"
                                  disabled={deleteGenerationMut.isPending}
                                  onClick={() => deleteGenerationMut.mutate({ generationId: gen.id })}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {(!gallery?.linkedMedia || gallery.linkedMedia.length === 0) &&
                     (!gallery?.generations || gallery.generations.length === 0) && (
                      <div className="text-center py-12">
                        <Grid3X3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Gallery is empty. Upload reference images or generate new ones.</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Next Step CTA */}
            {selectedInfluencerId && isReady && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="py-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Ready for Video?</h3>
                    <p className="text-sm text-muted-foreground">
                      Your influencer is trained. Head to Video Scripts or Video Studio next.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" asChild>
                      <Link href="/video-scripts">
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Video Scripts
                      </Link>
                    </Button>
                    <Button asChild className="bg-primary text-primary-foreground">
                      <Link href="/video-studio">
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Video Studio
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
