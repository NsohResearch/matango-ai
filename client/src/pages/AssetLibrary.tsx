import { useState, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import {
  Image as ImageIcon, Upload, Wand2, Sparkles, Download, Loader2,
  Search, Filter, Grid3X3, LayoutGrid, Heart, Trash2, FolderOpen,
  Star, RotateCcw, Pencil, History, ChevronLeft, ChevronRight,
  Copy, Tag, Archive, MoreHorizontal, Maximize2, X, Send,
  Palette, Layers, Zap, Eye
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// Style preset chips
const STYLE_PRESETS = [
  { id: "photorealistic", label: "Photorealistic", icon: "📸" },
  { id: "cinematic", label: "Cinematic", icon: "🎬" },
  { id: "editorial", label: "Editorial", icon: "📰" },
  { id: "anime", label: "Anime", icon: "🎨" },
  { id: "3d_render", label: "3D Render", icon: "🧊" },
  { id: "watercolor", label: "Watercolor", icon: "🖌️" },
  { id: "neon", label: "Neon Glow", icon: "✨" },
  { id: "vintage", label: "Vintage", icon: "📷" },
];

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 Square" },
  { value: "16:9", label: "16:9 Wide" },
  { value: "9:16", label: "9:16 Portrait" },
  { value: "4:3", label: "4:3 Standard" },
  { value: "3:4", label: "3:4 Tall" },
];

export default function AssetLibrary() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("create");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create Image state
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [imageCount, setImageCount] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Library state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 24;

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAssetId, setEditAssetId] = useState<number | null>(null);
  const [editInstruction, setEditInstruction] = useState("");

  // Preview dialog
  const [previewAsset, setPreviewAsset] = useState<any>(null);

  // Version history dialog
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [versionAssetId, setVersionAssetId] = useState<number | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  // ---- tRPC Queries ----
  const listInput = useMemo(() => ({
    type: filterType !== "all" ? filterType as "image" | "video" | "audio" | "document" : undefined,
    source: filterSource !== "all" ? filterSource as "generated" | "uploaded" | "edited" | "imported" : undefined,
    isFavorite: showFavoritesOnly ? true : undefined,
    search: searchQuery || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  }), [filterType, filterSource, showFavoritesOnly, searchQuery, page]);

  const assetsQuery = trpc.assetLibrary.list.useQuery(listInput, { enabled: !!user });
  const statsQuery = trpc.assetLibrary.stats.useQuery(undefined, { enabled: !!user });
  const promptHistoryQuery = trpc.assetLibrary.getPromptHistory.useQuery({ limit: 10 }, { enabled: !!user });
  const presetsQuery = trpc.assetLibrary.listPresets.useQuery({}, { enabled: !!user });

  const versionsQuery = trpc.assetLibrary.getVersions.useQuery(
    { assetId: versionAssetId! },
    { enabled: !!versionAssetId }
  );

  const utils = trpc.useUtils();

  // ---- Mutations ----
  const generateMut = trpc.assetLibrary.generate.useMutation({
    onSuccess: (data) => {
      toast.success(`Generated ${data.count} image(s)!`);
      utils.assetLibrary.list.invalidate();
      utils.assetLibrary.stats.invalidate();
      utils.assetLibrary.getPromptHistory.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadMut = trpc.assetLibrary.upload.useMutation({
    onSuccess: () => {
      toast.success("Image uploaded!");
      utils.assetLibrary.list.invalidate();
      utils.assetLibrary.stats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMut = trpc.assetLibrary.update.useMutation({
    onSuccess: () => {
      utils.assetLibrary.list.invalidate();
      utils.assetLibrary.stats.invalidate();
    },
  });

  const deleteMut = trpc.assetLibrary.delete.useMutation({
    onSuccess: () => {
      toast.success("Asset deleted");
      utils.assetLibrary.list.invalidate();
      utils.assetLibrary.stats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkDeleteMut = trpc.assetLibrary.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`Deleted ${data.deleted} assets`);
      setSelectedIds(new Set());
      setBulkMode(false);
      utils.assetLibrary.list.invalidate();
      utils.assetLibrary.stats.invalidate();
    },
  });

  const editImageMut = trpc.assetLibrary.editImage.useMutation({
    onSuccess: (data) => {
      toast.success(`Edit applied (v${data.versionNumber})`);
      setEditDialogOpen(false);
      setEditInstruction("");
      utils.assetLibrary.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const enhancePromptMut = trpc.assetLibrary.enhancePrompt.useMutation({
    onSuccess: (data) => {
      setPrompt(data.enhanced);
      toast.success("Prompt enhanced!");
    },
  });

  const revertMut = trpc.assetLibrary.revertToVersion.useMutation({
    onSuccess: () => {
      toast.success("Reverted to selected version");
      setVersionDialogOpen(false);
      utils.assetLibrary.list.invalidate();
    },
  });

  // ---- Handlers ----
  const handleGenerate = () => {
    if (!prompt.trim()) { toast.error("Enter a prompt"); return; }
    generateMut.mutate({
      prompt: prompt.trim(),
      negativePrompt: negativePrompt || undefined,
      stylePreset: selectedStyle || undefined,
      aspectRatio,
      count: imageCount,
    });
  };

  const handleUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) { toast.error(`${file.name} is not an image`); continue; }
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} exceeds 10MB limit`); continue; }
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = btoa(new Uint8Array(arrayBuffer).reduce((d, b) => d + String.fromCharCode(b), ""));
      uploadMut.mutate({ base64Data, contentType: file.type, originalName: file.name });
    }
  };

  const toggleFavorite = (id: number, current: boolean) => {
    updateMut.mutate({ id, isFavorite: !current });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const downloadImage = async (url: string, name: string) => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${name}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { toast.error("Download failed"); }
  };

  // ---- Auth guard ----
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
        <div className="container mx-auto px-4 py-24 text-center">
          <ImageIcon className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Asset Library</h1>
          <p className="text-muted-foreground mb-8">Sign in to create, edit, and manage your AI-generated assets.</p>
          <Button asChild className="bg-primary text-primary-foreground">
            <a href={getLoginUrl()}>Sign In to Continue</a>
          </Button>
        </div>
        <AppFooter />
      </div>
    );
  }

  const assets = assetsQuery.data?.items ?? [];
  const totalAssets = assetsQuery.data?.total ?? 0;
  const stats = statsQuery.data;
  const totalPages = Math.ceil(totalAssets / PAGE_SIZE);
  const history = promptHistoryQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header + Stats */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Layers className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">Asset Library</h1>
            </div>
            <p className="text-muted-foreground">Create, edit, and manage all your AI-generated images and media.</p>
          </div>
          {stats && (
            <div className="flex gap-4">
              {[
                { label: "Total", value: stats.total, icon: Layers },
                { label: "Images", value: stats.images, icon: ImageIcon },
                { label: "Videos", value: stats.videos, icon: Eye },
                { label: "Favorites", value: stats.favorites, icon: Heart },
              ].map((s) => (
                <div key={s.label} className="text-center px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                  <s.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                  <div className="text-lg font-bold">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="create" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Wand2 className="w-4 h-4 mr-2" />
              Create
            </TabsTrigger>
            <TabsTrigger value="library" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Grid3X3 className="w-4 h-4 mr-2" />
              Library
            </TabsTrigger>
            <TabsTrigger value="edit" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </TabsTrigger>
          </TabsList>

          {/* ============ CREATE TAB ============ */}
          <TabsContent value="create" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left: Prompt Panel */}
              <div className="lg:col-span-1 space-y-4">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Wand2 className="w-5 h-5 text-primary" />
                      Image Prompt
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Describe your image</Label>
                      <Textarea
                        placeholder="A professional headshot of a young woman in a modern office, soft lighting..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="bg-white/5 border-white/10 mt-1 min-h-[100px]"
                        rows={4}
                      />
                      <div className="flex justify-between mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-primary"
                          onClick={() => enhancePromptMut.mutate({ prompt, style: selectedStyle })}
                          disabled={!prompt.trim() || enhancePromptMut.isPending}
                        >
                          {enhancePromptMut.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                          Enhance with AI
                        </Button>
                        <span className="text-xs text-muted-foreground">{prompt.length}/2000</span>
                      </div>
                    </div>

                    {/* Style Presets */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Style</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {STYLE_PRESETS.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setSelectedStyle(selectedStyle === s.id ? "" : s.id)}
                            className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                              selectedStyle === s.id
                                ? "bg-primary/20 border-primary text-primary"
                                : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/30"
                            }`}
                          >
                            {s.icon} {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Aspect Ratio */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Aspect Ratio</Label>
                      <div className="flex gap-2 mt-1">
                        {ASPECT_RATIOS.map((ar) => (
                          <button
                            key={ar.value}
                            onClick={() => setAspectRatio(ar.value)}
                            className={`px-3 py-1.5 rounded text-xs border transition-all ${
                              aspectRatio === ar.value
                                ? "bg-primary/20 border-primary text-primary"
                                : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/30"
                            }`}
                          >
                            {ar.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Image Count */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Number of Images</Label>
                      <div className="flex gap-2 mt-1">
                        {[1, 2, 3, 4].map((n) => (
                          <button
                            key={n}
                            onClick={() => setImageCount(n)}
                            className={`w-10 h-10 rounded text-sm font-medium border transition-all ${
                              imageCount === n
                                ? "bg-primary/20 border-primary text-primary"
                                : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/30"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    {showAdvanced && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Negative Prompt</Label>
                        <Textarea
                          placeholder="Things to avoid: blurry, low quality, distorted..."
                          value={negativePrompt}
                          onChange={(e) => setNegativePrompt(e.target.value)}
                          className="bg-white/5 border-white/10 mt-1"
                          rows={2}
                        />
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                    >
                      {showAdvanced ? "Hide" : "Show"} Advanced Options
                    </Button>

                    <Button
                      onClick={handleGenerate}
                      disabled={generateMut.isPending || !prompt.trim()}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12"
                    >
                      {generateMut.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-2" />Generate {imageCount > 1 ? `${imageCount} Images` : "Image"}</>
                      )}
                    </Button>

                    {/* Upload */}
                    <div className="border-t border-white/10 pt-4">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadMut.isPending}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadMut.isPending ? "Uploading..." : "Upload Image"}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => e.target.files && handleUpload(e.target.files)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Prompt History */}
                {history.length > 0 && (
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <History className="w-4 h-4 text-primary" />
                        Recent Prompts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-[200px]">
                        <div className="space-y-2">
                          {history.map((h) => (
                            <button
                              key={h.id}
                              onClick={() => { setPrompt(h.prompt); if (h.stylePreset) setSelectedStyle(h.stylePreset); }}
                              className="w-full text-left p-2 rounded text-xs bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
                            >
                              <p className="line-clamp-2 text-foreground">{h.prompt}</p>
                              <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                                {h.stylePreset && <Badge variant="outline" className="text-[10px]">{h.stylePreset}</Badge>}
                                <span>{h.resultCount} result(s)</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right: Recent Generations */}
              <div className="lg:col-span-2">
                <Card className="bg-white/5 border-white/10 h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Recent Creations</CardTitle>
                    <CardDescription>Your latest generated and uploaded images</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {assetsQuery.isLoading ? (
                      <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : assets.length === 0 ? (
                      <div className="text-center py-20">
                        <Wand2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No assets yet</h3>
                        <p className="text-muted-foreground">Generate your first image using the prompt panel.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {assets.slice(0, 12).map((asset) => (
                          <div key={asset.id} className="relative group rounded-xl overflow-hidden border border-white/10 bg-white/5">
                            <img
                              src={asset.thumbUrl || asset.url}
                              alt={asset.prompt || "Asset"}
                              className="w-full aspect-square object-cover cursor-pointer"
                              onClick={() => setPreviewAsset(asset)}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                <p className="text-xs text-white/80 line-clamp-2 mb-2">{asset.prompt || "Uploaded"}</p>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white" onClick={() => toggleFavorite(asset.id, asset.isFavorite)}>
                                    <Heart className={`w-3.5 h-3.5 ${asset.isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white" onClick={() => downloadImage(asset.url, `asset-${asset.id}`)}>
                                    <Download className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white" onClick={() => { setEditAssetId(asset.id); setEditDialogOpen(true); }}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white" onClick={() => { setVersionAssetId(asset.id); setVersionDialogOpen(true); }}>
                                    <History className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <div className="absolute top-2 right-2">
                              <Badge variant="secondary" className="text-[10px]">{asset.source}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ============ LIBRARY TAB ============ */}
          <TabsContent value="library" className="space-y-6">
            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search prompts, tags..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                  className="pl-10 bg-white/5 border-white/10"
                />
              </div>
              <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(0); }}>
                <SelectTrigger className="w-[130px] bg-white/5 border-white/10">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSource} onValueChange={(v) => { setFilterSource(v); setPage(0); }}>
                <SelectTrigger className="w-[140px] bg-white/5 border-white/10">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="uploaded">Uploaded</SelectItem>
                  <SelectItem value="edited">Edited</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); setPage(0); }}
              >
                <Heart className={`w-4 h-4 mr-1 ${showFavoritesOnly ? "fill-current" : ""}`} />
                Favorites
              </Button>
              <Button
                variant={bulkMode ? "default" : "outline"}
                size="sm"
                onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
              >
                {bulkMode ? "Cancel" : "Select"}
              </Button>
              {bulkMode && selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => bulkDeleteMut.mutate({ ids: Array.from(selectedIds) })}
                  disabled={bulkDeleteMut.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete {selectedIds.size}
                </Button>
              )}
              <div className="flex gap-1 ml-auto">
                <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("grid")}>
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("list")}>
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Asset Grid */}
            {assetsQuery.isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : assets.length === 0 ? (
              <div className="text-center py-20">
                <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No assets found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or create new images.</p>
              </div>
            ) : (
              <>
                <div className={viewMode === "grid"
                  ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
                  : "space-y-2"
                }>
                  {assets.map((asset) => (
                    viewMode === "grid" ? (
                      <div
                        key={asset.id}
                        className={`relative group rounded-xl overflow-hidden border bg-white/5 cursor-pointer transition-all ${
                          bulkMode && selectedIds.has(asset.id) ? "border-primary ring-2 ring-primary/50" : "border-white/10"
                        }`}
                        onClick={() => bulkMode ? toggleSelect(asset.id) : setPreviewAsset(asset)}
                      >
                        <img src={asset.thumbUrl || asset.url} alt="" className="w-full aspect-square object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-2 flex gap-1">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white" onClick={(e) => { e.stopPropagation(); toggleFavorite(asset.id, asset.isFavorite); }}>
                              <Heart className={`w-3 h-3 ${asset.isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white" onClick={(e) => { e.stopPropagation(); downloadImage(asset.url, `asset-${asset.id}`); }}>
                              <Download className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white" onClick={(e) => { e.stopPropagation(); setEditAssetId(asset.id); setEditDialogOpen(true); setActiveTab("edit"); }}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {bulkMode && (
                          <div className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selectedIds.has(asset.id) ? "bg-primary border-primary" : "border-white/50 bg-black/30"
                          }`}>
                            {selectedIds.has(asset.id) && <span className="text-white text-xs">✓</span>}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        key={asset.id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 cursor-pointer"
                        onClick={() => bulkMode ? toggleSelect(asset.id) : setPreviewAsset(asset)}
                      >
                        <img src={asset.thumbUrl || asset.url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{asset.prompt || "Uploaded asset"}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">{asset.type}</Badge>
                            <Badge variant="outline" className="text-[10px]">{asset.source}</Badge>
                            <span className="text-[10px] text-muted-foreground">{new Date(asset.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); toggleFavorite(asset.id, asset.isFavorite); }}>
                            <Heart className={`w-4 h-4 ${asset.isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); deleteMut.mutate({ id: asset.id }); }}>
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      </div>
                    )
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-4">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ============ EDIT TAB ============ */}
          <TabsContent value="edit" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left: Select image to edit */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Pencil className="w-5 h-5 text-primary" />
                    Chat-to-Edit
                  </CardTitle>
                  <CardDescription>Select an image and describe your edits in natural language.</CardDescription>
                </CardHeader>
                <CardContent>
                  {editAssetId ? (
                    <div className="space-y-4">
                      {(() => {
                        const editAsset = assets.find(a => a.id === editAssetId);
                        return editAsset ? (
                          <div className="relative rounded-xl overflow-hidden border border-white/10">
                            <img src={editAsset.url} alt="" className="w-full max-h-[400px] object-contain bg-black/20" />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2 bg-black/50 text-white"
                              onClick={() => setEditAssetId(null)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">Asset not found in current view. Switch to Library tab to select.</p>
                        );
                      })()}

                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Describe your edit: 'Make the background a sunset beach', 'Add sunglasses', 'Change hair color to blonde'..."
                          value={editInstruction}
                          onChange={(e) => setEditInstruction(e.target.value)}
                          className="bg-white/5 border-white/10 flex-1"
                          rows={3}
                        />
                      </div>
                      <Button
                        onClick={() => editImageMut.mutate({ assetId: editAssetId, instruction: editInstruction })}
                        disabled={editImageMut.isPending || !editInstruction.trim()}
                        className="w-full bg-primary text-primary-foreground"
                      >
                        {editImageMut.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Applying Edit...</>
                        ) : (
                          <><Send className="w-4 h-4 mr-2" />Apply Edit</>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Pencil className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">Select an image from the Library tab to start editing.</p>
                      <Button variant="outline" onClick={() => setActiveTab("library")}>
                        Browse Library
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Right: Version History */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    Version History
                  </CardTitle>
                  <CardDescription>Track all edits and revert to any previous version.</CardDescription>
                </CardHeader>
                <CardContent>
                  {editAssetId && versionsQuery.data && versionsQuery.data.length > 0 ? (
                    <ScrollArea className="max-h-[500px]">
                      <div className="space-y-3">
                        {(versionsQuery.data ?? []).map((v) => (
                          <div key={v.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                            <img src={v.url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">v{v.versionNumber}</Badge>
                                <span className="text-[10px] text-muted-foreground">{v.operation}</span>
                              </div>
                              {v.prompt && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.prompt}</p>}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs"
                              onClick={() => revertMut.mutate({ assetId: editAssetId, versionId: v.id })}
                              disabled={revertMut.isPending}
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Revert
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-12">
                      <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {editAssetId ? "No edit history yet. Apply an edit to start tracking versions." : "Select an image to view its version history."}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewAsset} onOpenChange={() => setPreviewAsset(null)}>
        <DialogContent className="max-w-4xl bg-card border-white/10">
          {previewAsset && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  Asset Preview
                </DialogTitle>
              </DialogHeader>
              <div className="relative rounded-xl overflow-hidden bg-black/20">
                <img src={previewAsset.url} alt="" className="w-full max-h-[60vh] object-contain" />
              </div>
              {previewAsset.prompt && (
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-sm text-muted-foreground">{previewAsset.prompt}</p>
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{previewAsset.type}</Badge>
                <Badge variant="outline">{previewAsset.source}</Badge>
                {previewAsset.stylePreset && <Badge variant="outline">{previewAsset.stylePreset}</Badge>}
                {previewAsset.aspectRatio && <Badge variant="outline">{previewAsset.aspectRatio}</Badge>}
                <span className="text-xs text-muted-foreground ml-auto">{new Date(previewAsset.createdAt).toLocaleString()}</span>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setEditAssetId(previewAsset.id); setActiveTab("edit"); setPreviewAsset(null); }}>
                  <Pencil className="w-4 h-4 mr-2" />Edit
                </Button>
                <Button variant="outline" onClick={() => toggleFavorite(previewAsset.id, previewAsset.isFavorite)}>
                  <Heart className={`w-4 h-4 mr-2 ${previewAsset.isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                  {previewAsset.isFavorite ? "Unfavorite" : "Favorite"}
                </Button>
                <Button onClick={() => downloadImage(previewAsset.url, `asset-${previewAsset.id}`)}>
                  <Download className="w-4 h-4 mr-2" />Download
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AppFooter />
    </div>
  );
}
