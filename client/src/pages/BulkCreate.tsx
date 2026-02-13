import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import {
  Layers, Plus, Loader2, Sparkles, Wand2, Trash2,
  Play, Pause, CheckCircle2, AlertCircle, Clock,
  Download, RotateCcw, Copy, Zap
} from "lucide-react";

interface BulkItem {
  id: string;
  prompt: string;
  stylePreset: string;
  aspectRatio: string;
  status: "pending" | "generating" | "done" | "error";
  resultUrl?: string;
  error?: string;
}

export default function BulkCreate() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<BulkItem[]>([]);
  const [basePrompt, setBasePrompt] = useState("");
  const [baseStyle, setBaseStyle] = useState("photorealistic");
  const [baseAspectRatio, setBaseAspectRatio] = useState("1:1");
  const [variationCount, setVariationCount] = useState(5);
  const [isRunning, setIsRunning] = useState(false);

  const utils = trpc.useUtils();

  const generateMut = trpc.assetLibrary.generate.useMutation({
    onSuccess: () => {
      utils.assetLibrary.list.invalidate();
      utils.assetLibrary.stats.invalidate();
    },
  });

  // Generate variations from base prompt
  const generateVariations = () => {
    if (!basePrompt.trim()) { toast.error("Enter a base prompt"); return; }
    const variations: BulkItem[] = [];
    const suffixes = [
      "with soft natural lighting",
      "in a studio setting with dramatic shadows",
      "outdoors with golden hour lighting",
      "with a minimalist background",
      "in a cinematic wide angle",
      "close-up portrait with bokeh",
      "editorial style with high contrast",
      "lifestyle shot in urban setting",
      "with warm color grading",
      "professional headshot style",
    ];
    for (let i = 0; i < variationCount; i++) {
      variations.push({
        id: `bulk-${Date.now()}-${i}`,
        prompt: `${basePrompt.trim()}, ${suffixes[i % suffixes.length]}`,
        stylePreset: baseStyle,
        aspectRatio: baseAspectRatio,
        status: "pending",
      });
    }
    setItems(variations);
    toast.success(`${variationCount} variations created. Click "Run All" to generate.`);
  };

  // Run bulk generation
  const runBulk = async () => {
    setIsRunning(true);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status === "done") continue;
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: "generating" } : it));
      try {
        const result = await generateMut.mutateAsync({
          prompt: item.prompt,
          stylePreset: item.stylePreset || undefined,
          aspectRatio: item.aspectRatio,
          count: 1,
        });
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: "done" } : it));
      } catch (err: any) {
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: "error", error: err.message } : it));
      }
    }
    setIsRunning(false);
    toast.success("Bulk generation complete!");
  };

  const addItem = () => {
    setItems(prev => [...prev, {
      id: `bulk-${Date.now()}`,
      prompt: "",
      stylePreset: baseStyle,
      aspectRatio: baseAspectRatio,
      status: "pending",
    }]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const updateItem = (id: string, updates: Partial<BulkItem>) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it));
  };

  const completedCount = items.filter(i => i.status === "done").length;
  const errorCount = items.filter(i => i.status === "error").length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 py-24 text-center">
          <Layers className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Bulk Create</h1>
          <p className="text-muted-foreground mb-8">Generate multiple images at once with AI-powered variations.</p>
          <Button asChild className="bg-primary text-primary-foreground"><a href={getLoginUrl()}>Sign In</a></Button>
        </div>
        <AppFooter />
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
            <div className="p-2 rounded-lg bg-primary/10"><Layers className="w-6 h-6 text-primary" /></div>
            <h1 className="text-3xl font-bold">Bulk Create</h1>
            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">Pro</Badge>
          </div>
          <p className="text-muted-foreground">Generate multiple image variations from a single prompt. Perfect for A/B testing and content calendars.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Configuration */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-primary" />
                  Base Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Base Prompt</Label>
                  <Textarea
                    placeholder="Professional portrait of a young influencer..."
                    value={basePrompt}
                    onChange={(e) => setBasePrompt(e.target.value)}
                    className="bg-white/5 border-white/10 mt-1"
                    rows={4}
                  />
                </div>
                <div>
                  <Label className="text-xs">Style</Label>
                  <Select value={baseStyle} onValueChange={setBaseStyle}>
                    <SelectTrigger className="bg-white/5 border-white/10 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="photorealistic">Photorealistic</SelectItem>
                      <SelectItem value="cinematic">Cinematic</SelectItem>
                      <SelectItem value="editorial">Editorial</SelectItem>
                      <SelectItem value="anime">Anime</SelectItem>
                      <SelectItem value="3d_render">3D Render</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Aspect Ratio</Label>
                  <Select value={baseAspectRatio} onValueChange={setBaseAspectRatio}>
                    <SelectTrigger className="bg-white/5 border-white/10 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1:1">1:1 Square</SelectItem>
                      <SelectItem value="16:9">16:9 Wide</SelectItem>
                      <SelectItem value="9:16">9:16 Portrait</SelectItem>
                      <SelectItem value="4:3">4:3 Standard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Number of Variations</Label>
                  <div className="flex gap-2 mt-1">
                    {[3, 5, 8, 10].map((n) => (
                      <button
                        key={n}
                        onClick={() => setVariationCount(n)}
                        className={`flex-1 py-2 rounded text-sm font-medium border transition-all ${
                          variationCount === n
                            ? "bg-primary/20 border-primary text-primary"
                            : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/30"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={generateVariations}
                  disabled={!basePrompt.trim()}
                  className="w-full bg-primary text-primary-foreground"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate {variationCount} Variations
                </Button>
              </CardContent>
            </Card>

            {/* Progress */}
            {items.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress</span>
                    <span className="text-primary">{completedCount}/{items.length}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" />{completedCount} done</span>
                    {errorCount > 0 && <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-red-500" />{errorCount} errors</span>}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{items.filter(i => i.status === "pending").length} pending</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={runBulk}
                      disabled={isRunning || items.length === 0}
                      className="flex-1 bg-primary text-primary-foreground"
                    >
                      {isRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running...</> : <><Zap className="w-4 h-4 mr-2" />Run All</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Items List */}
          <div className="lg:col-span-2">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Queue ({items.length} items)</CardTitle>
                  <Button size="sm" variant="outline" onClick={addItem}><Plus className="w-4 h-4 mr-1" />Add</Button>
                </div>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-center py-16">
                    <Layers className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No items in queue</h3>
                    <p className="text-muted-foreground">Configure your base prompt and generate variations to get started.</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[600px]">
                    <div className="space-y-3">
                      {items.map((item, idx) => (
                        <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Textarea
                              value={item.prompt}
                              onChange={(e) => updateItem(item.id, { prompt: e.target.value })}
                              className="bg-white/5 border-white/10 text-sm min-h-[60px]"
                              rows={2}
                              disabled={item.status === "generating" || item.status === "done"}
                            />
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-[10px]">{item.stylePreset}</Badge>
                              <Badge variant="outline" className="text-[10px]">{item.aspectRatio}</Badge>
                              <Badge
                                variant={item.status === "done" ? "default" : item.status === "error" ? "destructive" : "outline"}
                                className="text-[10px]"
                              >
                                {item.status === "generating" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                                {item.status === "done" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                {item.status === "error" && <AlertCircle className="w-3 h-3 mr-1" />}
                                {item.status}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400"
                            onClick={() => removeItem(item.id)}
                            disabled={item.status === "generating"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
