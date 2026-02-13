import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import {
  BookOpen, Plus, Loader2, Sparkles, Wand2, Film, Image as ImageIcon,
  Play, Trash2, Edit, ChevronRight, Layout, Layers, Clock, Eye
} from "lucide-react";

interface StoryScene {
  id: string;
  order: number;
  sceneType: "image" | "video" | "transition";
  prompt: string;
  duration: number;
  imageUrl?: string;
  voiceoverText?: string;
  status: "draft" | "generating" | "ready";
}

export default function StoryStudio() {
  const { user, loading: authLoading } = useAuth();
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [storyFormat, setStoryFormat] = useState("instagram_reel");
  const [scenes, setScenes] = useState<StoryScene[]>([]);
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  // Generate story outline with AI
  const generateOutline = async () => {
    if (!aiPrompt.trim()) { toast.error("Describe your story concept"); return; }
    setIsGenerating(true);
    // Simulate AI-generated story outline
    const mockScenes: StoryScene[] = [
      { id: "s1", order: 1, sceneType: "image", prompt: "Opening shot: " + aiPrompt, duration: 3, status: "draft" },
      { id: "s2", order: 2, sceneType: "image", prompt: "Build-up scene with dramatic lighting", duration: 3, status: "draft" },
      { id: "s3", order: 3, sceneType: "image", prompt: "Climax moment with vibrant colors", duration: 4, status: "draft" },
      { id: "s4", order: 4, sceneType: "image", prompt: "Closing shot with call-to-action overlay", duration: 3, status: "draft" },
    ];
    setTimeout(() => {
      setScenes(mockScenes);
      setIsGenerating(false);
      toast.success("Story outline generated! Customize each scene.");
    }, 1500);
  };

  const addScene = () => {
    const newScene: StoryScene = {
      id: `s${Date.now()}`,
      order: scenes.length + 1,
      sceneType: "image",
      prompt: "",
      duration: 3,
      status: "draft",
    };
    setScenes([...scenes, newScene]);
    setSelectedScene(newScene.id);
  };

  const updateScene = (id: string, updates: Partial<StoryScene>) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeScene = (id: string) => {
    setScenes(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })));
    if (selectedScene === id) setSelectedScene(null);
  };

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 py-24 text-center">
          <BookOpen className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Story Studio</h1>
          <p className="text-muted-foreground mb-8">Create multi-scene visual stories for social media.</p>
          <Button asChild className="bg-primary text-primary-foreground"><a href={getLoginUrl()}>Sign In</a></Button>
        </div>
        <AppFooter />
      </div>
    );
  }

  const currentScene = scenes.find(s => s.id === selectedScene);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10"><BookOpen className="w-6 h-6 text-primary" /></div>
            <h1 className="text-3xl font-bold">Story Studio</h1>
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">Beta</Badge>
          </div>
          <p className="text-muted-foreground">Create multi-scene visual stories, reels, and carousels with AI.</p>
        </div>

        {scenes.length === 0 ? (
          /* Empty State: Create New Story */
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Create a New Story
                </CardTitle>
                <CardDescription>Describe your story concept and AI will generate a scene-by-scene outline.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Story Format</Label>
                  <Select value={storyFormat} onValueChange={setStoryFormat}>
                    <SelectTrigger className="bg-white/5 border-white/10 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram_reel">Instagram Reel (9:16)</SelectItem>
                      <SelectItem value="tiktok">TikTok (9:16)</SelectItem>
                      <SelectItem value="youtube_short">YouTube Short (9:16)</SelectItem>
                      <SelectItem value="carousel">Instagram Carousel (1:1)</SelectItem>
                      <SelectItem value="story">Instagram Story (9:16)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Story Concept</Label>
                  <Textarea
                    placeholder="A day-in-the-life story of a fashion influencer exploring Tokyo street style, from morning coffee to sunset rooftop..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="bg-white/5 border-white/10 mt-1"
                    rows={4}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={generateOutline}
                    disabled={isGenerating || !aiPrompt.trim()}
                    className="flex-1 bg-primary text-primary-foreground"
                  >
                    {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Wand2 className="w-4 h-4 mr-2" />Generate Story Outline</>}
                  </Button>
                  <Button variant="outline" onClick={addScene}>
                    <Plus className="w-4 h-4 mr-2" />Manual
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Story Editor */
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Left: Scene Timeline */}
            <div className="lg:col-span-1">
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Layout className="w-4 h-4 text-primary" />
                      Scenes ({scenes.length})
                    </CardTitle>
                    <Button size="sm" variant="ghost" onClick={addScene}><Plus className="w-4 h-4" /></Button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Total: {totalDuration}s</span>
                    <Badge variant="outline" className="text-[10px]">{storyFormat}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[500px]">
                    <div className="space-y-2">
                      {scenes.map((scene) => (
                        <button
                          key={scene.id}
                          onClick={() => setSelectedScene(scene.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedScene === scene.id
                              ? "bg-primary/10 border-primary"
                              : "bg-white/5 border-white/10 hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-primary">#{scene.order}</span>
                            {scene.sceneType === "image" ? <ImageIcon className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                            <span className="text-xs text-muted-foreground">{scene.duration}s</span>
                            <Badge variant={scene.status === "ready" ? "default" : "outline"} className="text-[10px] ml-auto">
                              {scene.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{scene.prompt || "No prompt"}</p>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Center: Scene Editor */}
            <div className="lg:col-span-2">
              {currentScene ? (
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Edit className="w-5 h-5 text-primary" />
                        Scene #{currentScene.order}
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="text-red-400" onClick={() => removeScene(currentScene.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Scene Type</Label>
                        <Select value={currentScene.sceneType} onValueChange={(v) => updateScene(currentScene.id, { sceneType: v as "image" | "video" })}>
                          <SelectTrigger className="bg-white/5 border-white/10 mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="image">Image</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="transition">Transition</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Duration (seconds)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={currentScene.duration}
                          onChange={(e) => updateScene(currentScene.id, { duration: parseInt(e.target.value) || 3 })}
                          className="bg-white/5 border-white/10 mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Visual Prompt</Label>
                      <Textarea
                        value={currentScene.prompt}
                        onChange={(e) => updateScene(currentScene.id, { prompt: e.target.value })}
                        className="bg-white/5 border-white/10 mt-1"
                        rows={4}
                        placeholder="Describe the visual for this scene..."
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Voiceover Text (optional)</Label>
                      <Textarea
                        value={currentScene.voiceoverText || ""}
                        onChange={(e) => updateScene(currentScene.id, { voiceoverText: e.target.value })}
                        className="bg-white/5 border-white/10 mt-1"
                        rows={2}
                        placeholder="What should the voiceover say during this scene?"
                      />
                    </div>

                    {/* Preview area */}
                    <div className="aspect-[9/16] max-h-[300px] rounded-xl bg-black/30 border border-white/10 flex items-center justify-center">
                      {currentScene.imageUrl ? (
                        <img src={currentScene.imageUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <div className="text-center">
                          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">Generate or upload visual</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button className="flex-1 bg-primary text-primary-foreground" onClick={() => toast.info("Scene generation coming soon")}>
                        <Sparkles className="w-4 h-4 mr-2" />Generate Visual
                      </Button>
                      <Button variant="outline" onClick={() => toast.info("Upload coming soon")}>
                        <Plus className="w-4 h-4 mr-2" />Upload
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="py-20 text-center">
                    <Layers className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Select a Scene</h3>
                    <p className="text-muted-foreground">Click a scene from the timeline to edit it.</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Story Preview & Actions */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    Story Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-[9/16] rounded-xl bg-black/30 border border-white/10 flex items-center justify-center mb-4">
                    <div className="text-center">
                      <Play className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Preview your story</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button className="w-full" variant="outline" onClick={() => toast.info("Preview coming soon")}>
                      <Play className="w-4 h-4 mr-2" />Preview Story
                    </Button>
                    <Button className="w-full bg-primary text-primary-foreground" onClick={() => toast.info("Export coming soon")}>
                      <Film className="w-4 h-4 mr-2" />Export Story
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Story Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Format</Label>
                    <Select value={storyFormat} onValueChange={setStoryFormat}>
                      <SelectTrigger className="bg-white/5 border-white/10 mt-1 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instagram_reel">Instagram Reel</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="youtube_short">YouTube Short</SelectItem>
                        <SelectItem value="carousel">Carousel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between"><span>Scenes:</span><span>{scenes.length}</span></div>
                    <div className="flex justify-between"><span>Duration:</span><span>{totalDuration}s</span></div>
                    <div className="flex justify-between"><span>Ready:</span><span>{scenes.filter(s => s.status === "ready").length}/{scenes.length}</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
      <AppFooter />
    </div>
  );
}
