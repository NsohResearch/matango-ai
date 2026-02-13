import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Sparkles, 
  Play, 
  Image as ImageIcon, 
  Loader2,
  RefreshCw,
  Calendar,
  Pencil,
  Download,
  Instagram,
  Twitter,
  Youtube
} from "lucide-react";
import { Link, useParams } from "wouter";

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-4 h-4" />,
  tiktok: <Play className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
};

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const campaignId = parseInt(id || "0");
  const { isAuthenticated } = useAuth();
  
  const [storyDescription, setStoryDescription] = useState("");
  const [sceneCount, setSceneCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingScene, setEditingScene] = useState<any>(null);

  const { data: campaign, isLoading, refetch } = trpc.campaigns.get.useQuery(
    { id: campaignId },
    { enabled: isAuthenticated && !!campaignId }
  );

  const generateScenesMutation = trpc.campaigns.generateScenes.useMutation({
    onSuccess: () => {
      toast.success("Scenes generated! Review and generate images.");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateSceneMutation = trpc.campaigns.updateScene.useMutation({
    onSuccess: () => {
      toast.success("Scene updated!");
      setEditingScene(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const generateImageMutation = trpc.campaigns.generateSceneImage.useMutation({
    onSuccess: () => {
      toast.success("Image generated!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleGenerateScenes = () => {
    if (!storyDescription.trim()) {
      toast.error("Please describe your story first");
      return;
    }
    generateScenesMutation.mutate({
      campaignId,
      storyDescription,
      sceneCount,
    });
  };

  const handleGenerateAllImages = async () => {
    if (!campaign?.scenes) return;
    
    setIsGenerating(true);
    const pendingScenes = campaign.scenes.filter(s => s.status === "pending" || s.status === "completed" && !s.imageUrl);
    
    for (const scene of pendingScenes) {
      try {
        await generateImageMutation.mutateAsync({ sceneId: scene.id });
      } catch (error) {
        console.error(`Failed to generate scene ${scene.sceneOrder}:`, error);
      }
    }
    
    setIsGenerating(false);
    toast.success("All images generated!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Campaign Not Found</h1>
          <Link href="/campaigns">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Campaigns
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const hasScenes = campaign.scenes && campaign.scenes.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/campaigns">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{campaign.name}</h1>
              <p className="text-muted-foreground mt-1">
                {campaign.description || "Visual story campaign"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge className={
              campaign.status === "completed" ? "bg-green-500/20 text-green-400" :
              campaign.status === "generating" ? "bg-blue-500/20 text-blue-400" :
              campaign.status === "preview" ? "bg-yellow-500/20 text-yellow-400" :
              "bg-gray-500/20 text-gray-400"
            }>
              {campaign.status}
            </Badge>
            
            {hasScenes && (
              <Button
                onClick={handleGenerateAllImages}
                disabled={isGenerating || generateImageMutation.isPending}
                className="bg-primary text-primary-foreground"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ImageIcon className="w-4 h-4 mr-2" />
                )}
                Generate All Images
              </Button>
            )}
          </div>
        </div>
        
        {/* Story Input (if no scenes yet) */}
        {!hasScenes && (
          <Card className="bg-card border-white/10 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Create Your Story
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Story Description</Label>
                <Textarea
                  value={storyDescription}
                  onChange={(e) => setStoryDescription(e.target.value)}
                  placeholder="Describe your visual story... e.g., 'A day in the life of a fashion influencer in Paris, starting with morning coffee at a café, exploring vintage shops, a photoshoot at the Eiffel Tower, and ending with a glamorous dinner.'"
                  rows={4}
                  className="bg-background border-white/10"
                />
                <p className="text-xs text-muted-foreground">
                  Be descriptive! The AI will generate scene prompts based on your story.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Number of Scenes: {sceneCount}</Label>
                <Slider
                  value={[sceneCount]}
                  onValueChange={([v]) => setSceneCount(v)}
                  min={3}
                  max={10}
                  step={1}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground">
                  More scenes = more detailed story, but takes longer to generate
                </p>
              </div>
              
              <Button
                onClick={handleGenerateScenes}
                disabled={generateScenesMutation.isPending || !storyDescription.trim()}
                className="w-full bg-primary text-primary-foreground h-12"
              >
                {generateScenesMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Story Scenes...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate {sceneCount} Scene Prompts
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* Storyboard */}
        {hasScenes && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Storyboard</h2>
              <p className="text-sm text-muted-foreground">
                {campaign.completedScenes || 0} / {campaign.totalScenes || 0} images generated
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {campaign.scenes.map((scene: any) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  onEdit={() => setEditingScene(scene)}
                  onGenerateImage={() => generateImageMutation.mutate({ sceneId: scene.id })}
                  isGenerating={generateImageMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Edit Scene Dialog */}
        <Dialog open={!!editingScene} onOpenChange={(open) => !open && setEditingScene(null)}>
          <DialogContent className="max-w-2xl bg-card border-white/10">
            <DialogHeader>
              <DialogTitle>Edit Scene {editingScene?.sceneOrder}</DialogTitle>
              <DialogDescription>
                Modify the prompt and caption for this scene
              </DialogDescription>
            </DialogHeader>
            
            {editingScene && (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Image Prompt</Label>
                  <Textarea
                    value={editingScene.prompt}
                    onChange={(e) => setEditingScene({ ...editingScene, prompt: e.target.value })}
                    rows={4}
                    className="bg-background border-white/10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Caption</Label>
                  <Textarea
                    value={editingScene.caption || ""}
                    onChange={(e) => setEditingScene({ ...editingScene, caption: e.target.value })}
                    rows={3}
                    className="bg-background border-white/10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select
                    value={editingScene.platform || "instagram"}
                    onValueChange={(v) => setEditingScene({ ...editingScene, platform: v })}
                  >
                    <SelectTrigger className="bg-background border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="twitter">Twitter</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setEditingScene(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => updateSceneMutation.mutate({
                      sceneId: editingScene.id,
                      prompt: editingScene.prompt,
                      caption: editingScene.caption,
                      platform: editingScene.platform,
                    })}
                    disabled={updateSceneMutation.isPending}
                    className="bg-primary text-primary-foreground"
                  >
                    {updateSceneMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function SceneCard({ 
  scene, 
  onEdit, 
  onGenerateImage, 
  isGenerating 
}: { 
  scene: any;
  onEdit: () => void;
  onGenerateImage: () => void;
  isGenerating: boolean;
}) {
  const statusColors: Record<string, string> = {
    pending: "bg-gray-500/20 text-gray-400",
    generating: "bg-blue-500/20 text-blue-400",
    completed: "bg-green-500/20 text-green-400",
    published: "bg-primary/20 text-primary",
  };

  return (
    <Card className="bg-card border-white/10 overflow-hidden group">
      {/* Image Preview */}
      <div className="aspect-square bg-black/50 relative">
        {scene.imageUrl ? (
          <img 
            src={scene.imageUrl} 
            alt={`Scene ${scene.sceneOrder}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {scene.status === "generating" ? (
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            ) : (
              <ImageIcon className="w-12 h-12 text-muted-foreground" />
            )}
          </div>
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary" onClick={onEdit}>
            <Pencil className="w-4 h-4" />
          </Button>
          {!scene.imageUrl && (
            <Button 
              size="sm" 
              onClick={onGenerateImage}
              disabled={isGenerating || scene.status === "generating"}
              className="bg-primary text-primary-foreground"
            >
              {scene.status === "generating" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
            </Button>
          )}
          {scene.imageUrl && (
            <Button size="sm" variant="secondary" asChild>
              <a href={scene.imageUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4" />
              </a>
            </Button>
          )}
        </div>
        
        {/* Scene Number */}
        <div className="absolute top-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
          Scene {scene.sceneOrder}
        </div>
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <Badge className={statusColors[scene.status] || statusColors.pending}>
            {scene.status}
          </Badge>
        </div>
        
        {/* Platform */}
        {scene.platform && (
          <div className="absolute bottom-2 left-2 bg-black/80 text-white p-1.5 rounded">
            {platformIcons[scene.platform]}
          </div>
        )}
      </div>
      
      {/* Content */}
      <CardContent className="p-4 space-y-2">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {scene.prompt}
        </p>
        {scene.caption && (
          <p className="text-xs text-primary line-clamp-2">
            {scene.caption}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
