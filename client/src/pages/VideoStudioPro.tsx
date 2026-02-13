import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Video, 
  Mic, 
  Play, 
  Pause,
  Volume2,
  VolumeX,
  Download,
  RefreshCw,
  Loader2,
  Sparkles,
  Wand2,
  Upload,
  Film,
  Music,
  MessageSquare,
  Clock,
  Zap,
  Settings2,
  Layers,
  Plus,
  Trash2,
  Copy,
  GripVertical,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  LayoutTemplate,
  History,
  Image,
  Type,
  Move,
  UserSquare,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  Maximize2,
  SkipBack,
  SkipForward,
  Square,
  FileVideo,
  Share2,
  Brain,
  Palette,
  Globe,
  Calendar,
  FolderOpen,
  Save,
  FolderPlus,
  ArrowLeft,
  Edit3,
  X,
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link, useLocation, useRoute } from "wouter";

// Aspect ratio options
const ASPECT_RATIOS = [
  { id: "16:9", name: "Landscape (16:9)", width: 1920, height: 1080 },
  { id: "9:16", name: "Portrait (9:16)", width: 1080, height: 1920 },
  { id: "1:1", name: "Square (1:1)", width: 1080, height: 1080 },
  { id: "4:5", name: "Instagram (4:5)", width: 1080, height: 1350 },
];

// Voice options
const VOICE_OPTIONS = [
  { id: "alloy-female", name: "Alloy", gender: "Female", accent: "American", style: "Warm & Professional" },
  { id: "echo-male", name: "Echo", gender: "Male", accent: "American", style: "Deep & Authoritative" },
  { id: "fable-female", name: "Fable", gender: "Female", accent: "British", style: "Elegant & Refined" },
  { id: "nova-female", name: "Nova", gender: "Female", accent: "American", style: "Energetic & Youthful" },
  { id: "onyx-male", name: "Onyx", gender: "Male", accent: "American", style: "Smooth & Confident" },
  { id: "shimmer-female", name: "Shimmer", gender: "Female", accent: "American", style: "Soft & Friendly" },
];

// Music genres
const MUSIC_GENRES = [
  { id: "ambient", name: "Ambient", description: "Calm, atmospheric background" },
  { id: "corporate", name: "Corporate", description: "Professional, uplifting" },
  { id: "upbeat", name: "Upbeat", description: "Energetic, positive vibes" },
  { id: "cinematic", name: "Cinematic", description: "Epic, emotional" },
  { id: "electronic", name: "Electronic", description: "Modern, tech-forward" },
  { id: "acoustic", name: "Acoustic", description: "Warm, organic feel" },
];

// Plan limits
const PLAN_LIMITS = {
  free: { monthlyMinutes: 1, maxResolution: "720p", hasWatermark: true, maxScenes: 3 },
  basic: { monthlyMinutes: 10, maxResolution: "1080p", hasWatermark: false, maxScenes: 10 },
  agency: { monthlyMinutes: 50, maxResolution: "4k", hasWatermark: false, maxScenes: 25 },
  agency_plus: { monthlyMinutes: 200, maxResolution: "4k", hasWatermark: false, maxScenes: -1 },
};

// Template categories
const TEMPLATE_CATEGORIES = [
  { id: "product_demo", name: "Product Demo" },
  { id: "social_ad", name: "Social Ad" },
  { id: "explainer", name: "Explainer" },
  { id: "testimonial", name: "Testimonial" },
  { id: "tutorial", name: "Tutorial" },
  { id: "announcement", name: "Announcement" },
  { id: "promo", name: "Promo" },
  { id: "story", name: "Story" },
];

// Scene type for local state
interface LocalScene {
  id: number;
  title: string;
  order: number;
  duration: number;
  backgroundType: string;
  backgroundValue: string | null;
  script: string | null;
  voiceId: number | null;
  avatarId: number | null;
  avatarPosition: { x: number; y: number; scale: number } | null;
  transitionType: string;
  transitionDuration: number;
  elements: LocalElement[];
}

interface LocalElement {
  id: number;
  elementType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  content: string | null;
  style: Record<string, unknown> | null;
  startTime: number;
  endTime: number | null;
}

export default function VideoStudioPro() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/video-studio/:projectId");
  const projectIdParam = params?.projectId;
  
  // View mode: "projects" (list) or "editor" (single project)
  const [viewMode, setViewMode] = useState<"projects" | "editor">("projects");
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  
  // Project list state
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectAspectRatio, setNewProjectAspectRatio] = useState<"16:9" | "9:16" | "1:1" | "4:5">("16:9");
  const [newProjectResolution, setNewProjectResolution] = useState<"720p" | "1080p" | "4k">("1080p");
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  
  // Editor state
  const [activeTab, setActiveTab] = useState<"scenes" | "audio" | "preview" | "export">("scenes");
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Local editor state (synced with DB)
  const [projectTitle, setProjectTitle] = useState("");
  const [scenes, setScenes] = useState<LocalScene[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Audio state
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState("alloy-female");
  const [voiceSpeed, setVoiceSpeed] = useState([1.0]);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState("corporate");
  const [musicVolume, setMusicVolume] = useState([30]);
  
  // Export state
  const [exportResolution, setExportResolution] = useState<"720p" | "1080p" | "4k">("1080p");
  const [exportFormat, setExportFormat] = useState<"mp4" | "webm" | "mov" | "gif">("mp4");
  const [exportQuality, setExportQuality] = useState<"draft" | "standard" | "high" | "ultra">("standard");
  
  // tRPC queries
  const { data: projects, isLoading: projectsLoading, refetch: refetchProjects } = trpc.creator.projects.list.useQuery(
    selectedFolderId ? { folderId: selectedFolderId } : undefined,
    { enabled: !!user }
  );
  
  const { data: folders, refetch: refetchFolders } = trpc.creator.folders.list.useQuery(
    undefined,
    { enabled: !!user }
  );
  
  const { data: currentProject, isLoading: projectLoading, refetch: refetchProject } = trpc.creator.projects.get.useQuery(
    { id: currentProjectId! },
    { enabled: !!currentProjectId && !!user }
  );
  
  const { data: templates } = trpc.creator.templates.list.useQuery(
    undefined,
    { enabled: !!user }
  );
  
  const { data: exportJobs, refetch: refetchExports } = trpc.creator.exports.list.useQuery(
    currentProjectId ? { projectId: currentProjectId } : undefined,
    { enabled: !!currentProjectId && !!user }
  );
  
  const { data: usageStats } = trpc.creator.usage.getStats.useQuery(
    undefined,
    { enabled: !!user }
  );
  
  // tRPC mutations
  const createProjectMutation = trpc.creator.projects.create.useMutation({
    onSuccess: (data) => {
      toast.success("Project created!");
      setShowNewProjectDialog(false);
      setNewProjectTitle("");
      refetchProjects();
      openProject(data.id);
    },
    onError: (error) => toast.error(error.message),
  });
  
  const updateProjectMutation = trpc.creator.projects.update.useMutation({
    onSuccess: () => {
      setHasUnsavedChanges(false);
      toast.success("Project saved!");
    },
    onError: (error) => toast.error(error.message),
  });
  
  const deleteProjectMutation = trpc.creator.projects.delete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted");
      refetchProjects();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const duplicateProjectMutation = trpc.creator.projects.duplicate.useMutation({
    onSuccess: () => {
      toast.success("Project duplicated!");
      refetchProjects();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const createFolderMutation = trpc.creator.folders.create.useMutation({
    onSuccess: () => {
      toast.success("Folder created!");
      setShowNewFolderDialog(false);
      setNewFolderName("");
      refetchFolders();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const deleteFolderMutation = trpc.creator.folders.delete.useMutation({
    onSuccess: () => {
      toast.success("Folder deleted");
      setSelectedFolderId(null);
      refetchFolders();
      refetchProjects();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const createSceneMutation = trpc.creator.scenes.create.useMutation({
    onSuccess: () => refetchProject(),
    onError: (error) => toast.error(error.message),
  });
  
  const updateSceneMutation = trpc.creator.scenes.update.useMutation({
    onError: (error) => toast.error(error.message),
  });
  
  const deleteSceneMutation = trpc.creator.scenes.delete.useMutation({
    onSuccess: () => refetchProject(),
    onError: (error) => toast.error(error.message),
  });
  
  const reorderScenesMutation = trpc.creator.scenes.reorder.useMutation({
    onError: (error) => toast.error(error.message),
  });
  
  const createExportMutation = trpc.creator.exports.create.useMutation({
    onSuccess: () => {
      toast.success("Export job started!");
      refetchExports();
    },
    onError: (error) => toast.error(error.message),
  });
  
  // Plan limits
  const userPlan = (user?.plan as keyof typeof PLAN_LIMITS) || "free";
  const limits = PLAN_LIMITS[userPlan] || PLAN_LIMITS.free;
  
  // Load project from URL param
  useEffect(() => {
    if (projectIdParam && !isNaN(Number(projectIdParam))) {
      const id = Number(projectIdParam);
      setCurrentProjectId(id);
      setViewMode("editor");
    }
  }, [projectIdParam]);
  
  // Sync project data to local state when loaded
  useEffect(() => {
    if (currentProject) {
      setProjectTitle(currentProject.title);
      setScenes(currentProject.scenes.map((s: {
        id: number;
        title: string | null;
        order: number;
        duration: number;
        backgroundType: string;
        backgroundValue: string | null;
        script: string | null;
        voiceId: number | null;
        avatarId: number | null;
        avatarPosition: unknown;
        transitionType: string;
        transitionDuration: number;
      }) => ({
        id: s.id,
        title: s.title || `Scene ${s.order + 1}`,
        order: s.order,
        duration: s.duration,
        backgroundType: s.backgroundType,
        backgroundValue: s.backgroundValue,
        script: s.script,
        voiceId: s.voiceId,
        avatarId: s.avatarId,
        avatarPosition: s.avatarPosition as { x: number; y: number; scale: number } | null,
        transitionType: s.transitionType,
        transitionDuration: s.transitionDuration,
        elements: [],
      })));
      setHasUnsavedChanges(false);
    }
  }, [currentProject]);
  
  // Calculate total duration
  const totalDuration = useMemo(() => 
    scenes.reduce((sum, s) => sum + s.duration, 0), 
    [scenes]
  );
  
  // Open project in editor
  const openProject = (projectId: number) => {
    setCurrentProjectId(projectId);
    setViewMode("editor");
    setLocation(`/video-studio/${projectId}`);
  };
  
  // Close editor and go back to projects
  const closeEditor = () => {
    if (hasUnsavedChanges) {
      if (!confirm("You have unsaved changes. Are you sure you want to close?")) {
        return;
      }
    }
    setViewMode("projects");
    setCurrentProjectId(null);
    setLocation("/video-studio");
  };
  
  // Create new project
  const handleCreateProject = () => {
    if (!newProjectTitle.trim()) {
      toast.error("Please enter a project title");
      return;
    }
    createProjectMutation.mutate({
      title: newProjectTitle.trim(),
      aspectRatio: newProjectAspectRatio,
      resolution: newProjectResolution,
      folderId: selectedFolderId || undefined,
    });
  };
  
  // Save project
  const saveProject = () => {
    if (!currentProjectId) return;
    updateProjectMutation.mutate({
      id: currentProjectId,
      title: projectTitle,
      totalDuration,
    });
  };
  
  // Add scene
  const addScene = () => {
    if (!currentProjectId) return;
    if (limits.maxScenes !== -1 && scenes.length >= limits.maxScenes) {
      toast.error(`Your plan allows up to ${limits.maxScenes} scenes. Upgrade for more.`);
      return;
    }
    createSceneMutation.mutate({
      projectId: currentProjectId,
      duration: 5000,
      backgroundType: "color",
      backgroundValue: "#1a1a2e",
    });
  };
  
  // Update scene locally (with debounced save)
  const updateSceneLocal = (sceneId: number, updates: Partial<LocalScene>) => {
    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, ...updates } : s));
    setHasUnsavedChanges(true);
  };
  
  // Save scene to database
  const saveScene = (scene: LocalScene) => {
    updateSceneMutation.mutate({
      id: scene.id,
      title: scene.title,
      duration: scene.duration,
      backgroundType: scene.backgroundType as "color" | "image" | "video" | "gradient",
      backgroundValue: scene.backgroundValue || undefined,
      script: scene.script || undefined,
      transitionType: scene.transitionType as "none" | "fade" | "dissolve" | "slide_left" | "slide_right" | "zoom",
      transitionDuration: scene.transitionDuration,
    });
  };
  
  // Delete scene
  const deleteScene = (sceneId: number) => {
    if (scenes.length <= 1) {
      toast.error("You need at least one scene");
      return;
    }
    deleteSceneMutation.mutate({ id: sceneId });
  };
  
  // Reorder scenes
  const moveScene = (fromIndex: number, toIndex: number) => {
    if (!currentProjectId) return;
    const newScenes = [...scenes];
    const [removed] = newScenes.splice(fromIndex, 1);
    newScenes.splice(toIndex, 0, removed);
    newScenes.forEach((s, i) => s.order = i);
    setScenes(newScenes);
    
    reorderScenesMutation.mutate({
      projectId: currentProjectId,
      sceneIds: newScenes.map(s => s.id),
    });
  };
  
  // Start export
  const startExport = () => {
    if (!currentProjectId) return;
    createExportMutation.mutate({
      projectId: currentProjectId,
      format: exportFormat,
      resolution: exportResolution,
      quality: exportQuality,
    });
  };
  
  // Format duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Format date
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  // Auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <Video className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Video Studio Pro</h1>
          <p className="text-muted-foreground mb-8">Sign in to create professional AI-powered videos</p>
          <Button asChild size="lg">
            <a href={getLoginUrl()}>Sign In to Continue</a>
          </Button>
        </div>
      </div>
    );
  }
  
  // Projects List View
  if (viewMode === "projects") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Video className="w-8 h-8 text-primary" />
                Video Studio Pro
              </h1>
              <p className="text-muted-foreground mt-1">Create professional AI-powered videos</p>
            </div>
            <div className="flex gap-3">
              <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <FolderPlus className="w-4 h-4 mr-2" />
                    New Folder
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                    <DialogDescription>Organize your video projects into folders</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Folder Name</Label>
                      <Input 
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="My Folder"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button 
                      onClick={() => createFolderMutation.mutate({ name: newFolderName })}
                      disabled={!newFolderName.trim() || createFolderMutation.isPending}
                    >
                      {createFolderMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create Folder
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Video Project</DialogTitle>
                    <DialogDescription>Start a new video project from scratch or use a template</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Project Title</Label>
                      <Input 
                        value={newProjectTitle}
                        onChange={(e) => setNewProjectTitle(e.target.value)}
                        placeholder="My Awesome Video"
                      />
                    </div>
                    <div>
                      <Label>Aspect Ratio</Label>
                      <Select value={newProjectAspectRatio} onValueChange={(v) => setNewProjectAspectRatio(v as "16:9" | "9:16" | "1:1" | "4:5")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASPECT_RATIOS.map(ar => (
                            <SelectItem key={ar.id} value={ar.id}>{ar.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Resolution</Label>
                      <Select value={newProjectResolution} onValueChange={(v) => setNewProjectResolution(v as "720p" | "1080p" | "4k")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="720p">720p HD</SelectItem>
                          <SelectItem value="1080p">1080p Full HD</SelectItem>
                          <SelectItem value="4k" disabled={limits.maxResolution !== "4k"}>
                            4K Ultra HD {limits.maxResolution !== "4k" && "(Upgrade Required)"}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button 
                      onClick={handleCreateProject}
                      disabled={!newProjectTitle.trim() || createProjectMutation.isPending}
                    >
                      {createProjectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create Project
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Usage Stats */}
          {usageStats && (
            <Card className="mb-8">
              <CardContent className="pt-6">
                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Projects</p>
                    <p className="text-2xl font-bold">{usageStats.totals.projects}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avatars</p>
                    <p className="text-2xl font-bold">{usageStats.totals.avatars}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Assets</p>
                    <p className="text-2xl font-bold">{usageStats.totals.assets}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Plan</p>
                    <Badge variant="outline" className="mt-1">{userPlan.toUpperCase()}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="grid grid-cols-12 gap-6">
            {/* Folders Sidebar */}
            <div className="col-span-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Folders</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <Button 
                    variant={selectedFolderId === null ? "secondary" : "ghost"} 
                    className="w-full justify-start"
                    onClick={() => setSelectedFolderId(null)}
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    All Projects
                  </Button>
                  {folders?.map((folder: { id: number; name: string; color: string | null }) => (
                    <div key={folder.id} className="flex items-center gap-1">
                      <Button 
                        variant={selectedFolderId === folder.id ? "secondary" : "ghost"} 
                        className="flex-1 justify-start"
                        onClick={() => setSelectedFolderId(folder.id)}
                      >
                        <FolderOpen className="w-4 h-4 mr-2" style={{ color: folder.color || undefined }} />
                        {folder.name}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => deleteFolderMutation.mutate({ id: folder.id })}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Folder
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            
            {/* Projects Grid */}
            <div className="col-span-9">
              {projectsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : projects && projects.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {projects.map((project: {
                    id: number;
                    title: string;
                    thumbnailUrl: string | null;
                    aspectRatio: string;
                    resolution: string;
                    status: string;
                    totalDuration: number | null;
                    updatedAt: Date;
                  }) => (
                    <Card 
                      key={project.id} 
                      className="cursor-pointer hover:border-primary/50 transition-colors group"
                      onClick={() => openProject(project.id)}
                    >
                      <div className="aspect-video bg-muted relative overflow-hidden rounded-t-lg">
                        {project.thumbnailUrl ? (
                          <img src={project.thumbnailUrl} alt={project.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-12 h-12 text-muted-foreground/50" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button variant="secondary" size="sm">
                            <Play className="w-4 h-4 mr-2" />
                            Open
                          </Button>
                        </div>
                        <Badge className="absolute top-2 right-2" variant="secondary">
                          {project.aspectRatio}
                        </Badge>
                      </div>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{project.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatDuration(project.totalDuration || 0)} • {project.resolution}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Updated {formatDate(project.updatedAt)}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                duplicateProjectMutation.mutate({ id: project.id });
                              }}>
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("Are you sure you want to delete this project?")) {
                                    deleteProjectMutation.mutate({ id: project.id });
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <Badge 
                          variant={project.status === "completed" ? "default" : "secondary"}
                          className="mt-2"
                        >
                          {project.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="py-20">
                  <CardContent className="text-center">
                    <Video className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first video project to get started</p>
                    <Button onClick={() => setShowNewProjectDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Project
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Editor View
  const selectedScene = scenes[selectedSceneIndex];
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Editor Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={closeEditor}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Input 
                  value={projectTitle}
                  onChange={(e) => {
                    setProjectTitle(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="text-lg font-medium border-none bg-transparent px-0 h-auto focus-visible:ring-0"
                />
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="text-xs">Unsaved</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">
                {formatDuration(totalDuration)}
              </Badge>
              <Button 
                variant="outline" 
                onClick={saveProject}
                disabled={updateProjectMutation.isPending}
              >
                {updateProjectMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
              <Button onClick={() => setActiveTab("export")}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Editor Content */}
      <div className="flex-1 flex">
        {/* Left Panel - Scene List */}
        <div className="w-64 border-r bg-card overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Scenes</h3>
              <Button variant="ghost" size="icon" onClick={addScene}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {scenes.map((scene, index) => (
                <div
                  key={scene.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSceneIndex === index 
                      ? "border-primary bg-primary/5" 
                      : "border-transparent hover:border-border hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedSceneIndex(index)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    <span className="text-sm font-medium flex-1 truncate">{scene.title}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreVertical className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          createSceneMutation.mutate({
                            projectId: currentProjectId!,
                            title: `${scene.title} (Copy)`,
                            duration: scene.duration,
                            backgroundType: scene.backgroundType as "color" | "image" | "video" | "gradient",
                            backgroundValue: scene.backgroundValue || undefined,
                            script: scene.script || undefined,
                          });
                        }}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => deleteScene(scene.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div 
                    className="aspect-video rounded bg-muted mb-2 flex items-center justify-center"
                    style={{ backgroundColor: scene.backgroundValue || "#1a1a2e" }}
                  >
                    <Film className="w-6 h-6 text-white/30" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDuration(scene.duration)}</span>
                    <span>{scene.transitionType}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Preview Area */}
          <div className="flex-1 p-6 flex items-center justify-center bg-black/20">
            <div 
              className="relative rounded-lg overflow-hidden shadow-2xl"
              style={{
                aspectRatio: currentProject?.aspectRatio?.replace(":", "/") || "16/9",
                maxHeight: "60vh",
                width: "auto",
                backgroundColor: selectedScene?.backgroundValue || "#1a1a2e",
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                {selectedScene?.script ? (
                  <div className="text-white text-center p-8 max-w-lg">
                    <p className="text-lg">{selectedScene.script}</p>
                  </div>
                ) : (
                  <div className="text-white/30 text-center">
                    <Film className="w-16 h-16 mx-auto mb-4" />
                    <p>Add content to this scene</p>
                  </div>
                )}
              </div>
              
              {/* Playback Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/20"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>
                  <div className="flex-1">
                    <Slider 
                      value={[currentTime]} 
                      max={totalDuration}
                      step={100}
                      onValueChange={([v]) => setCurrentTime(v)}
                      className="cursor-pointer"
                    />
                  </div>
                  <span className="text-white text-sm">
                    {formatDuration(currentTime)} / {formatDuration(totalDuration)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom Panel - Tabs */}
          <div className="border-t bg-card">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <div className="border-b px-4">
                <TabsList className="h-12">
                  <TabsTrigger value="scenes" className="gap-2">
                    <Layers className="w-4 h-4" />
                    Scene Editor
                  </TabsTrigger>
                  <TabsTrigger value="audio" className="gap-2">
                    <Music className="w-4 h-4" />
                    Audio
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-2">
                    <Eye className="w-4 h-4" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="export" className="gap-2">
                    <Download className="w-4 h-4" />
                    Export
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <div className="p-4 max-h-64 overflow-y-auto">
                <TabsContent value="scenes" className="mt-0">
                  {selectedScene && (
                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label>Scene Title</Label>
                          <Input 
                            value={selectedScene.title}
                            onChange={(e) => updateSceneLocal(selectedScene.id, { title: e.target.value })}
                            onBlur={() => saveScene(selectedScene)}
                          />
                        </div>
                        <div>
                          <Label>Duration (seconds)</Label>
                          <div className="flex items-center gap-2">
                            <Slider 
                              value={[selectedScene.duration / 1000]}
                              min={1}
                              max={60}
                              step={1}
                              onValueChange={([v]) => updateSceneLocal(selectedScene.id, { duration: v * 1000 })}
                              onValueCommit={() => saveScene(selectedScene)}
                            />
                            <span className="text-sm w-12">{selectedScene.duration / 1000}s</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label>Background Color</Label>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="color"
                              value={selectedScene.backgroundValue || "#1a1a2e"}
                              onChange={(e) => updateSceneLocal(selectedScene.id, { backgroundValue: e.target.value })}
                              onBlur={() => saveScene(selectedScene)}
                              className="w-12 h-10 p-1"
                            />
                            <Input 
                              value={selectedScene.backgroundValue || "#1a1a2e"}
                              onChange={(e) => updateSceneLocal(selectedScene.id, { backgroundValue: e.target.value })}
                              onBlur={() => saveScene(selectedScene)}
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Transition</Label>
                          <Select 
                            value={selectedScene.transitionType}
                            onValueChange={(v) => {
                              updateSceneLocal(selectedScene.id, { transitionType: v });
                              saveScene({ ...selectedScene, transitionType: v });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="fade">Fade</SelectItem>
                              <SelectItem value="dissolve">Dissolve</SelectItem>
                              <SelectItem value="slide_left">Slide Left</SelectItem>
                              <SelectItem value="slide_right">Slide Right</SelectItem>
                              <SelectItem value="zoom">Zoom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label>Script / Voiceover Text</Label>
                          <Textarea 
                            value={selectedScene.script || ""}
                            onChange={(e) => updateSceneLocal(selectedScene.id, { script: e.target.value })}
                            onBlur={() => saveScene(selectedScene)}
                            placeholder="Enter the text for this scene..."
                            rows={4}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="audio" className="mt-0">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Voiceover</Label>
                        <Switch checked={voiceoverEnabled} onCheckedChange={setVoiceoverEnabled} />
                      </div>
                      {voiceoverEnabled && (
                        <>
                          <div>
                            <Label>Voice</Label>
                            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {VOICE_OPTIONS.map(voice => (
                                  <SelectItem key={voice.id} value={voice.id}>
                                    {voice.name} ({voice.gender}) - {voice.style}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Speed: {voiceSpeed[0]}x</Label>
                            <Slider 
                              value={voiceSpeed}
                              min={0.5}
                              max={2}
                              step={0.1}
                              onValueChange={setVoiceSpeed}
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Background Music</Label>
                        <Switch checked={musicEnabled} onCheckedChange={setMusicEnabled} />
                      </div>
                      {musicEnabled && (
                        <>
                          <div>
                            <Label>Genre</Label>
                            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MUSIC_GENRES.map(genre => (
                                  <SelectItem key={genre.id} value={genre.id}>
                                    {genre.name} - {genre.description}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Volume: {musicVolume[0]}%</Label>
                            <Slider 
                              value={musicVolume}
                              min={0}
                              max={100}
                              step={5}
                              onValueChange={setMusicVolume}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="preview" className="mt-0">
                  <div className="text-center py-8">
                    <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">Preview Your Video</h3>
                    <p className="text-muted-foreground mb-4">
                      Generate a preview to see how your video will look
                    </p>
                    <Button>
                      <Play className="w-4 h-4 mr-2" />
                      Generate Preview
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="export" className="mt-0">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="font-medium">Export Settings</h3>
                      <div>
                        <Label>Resolution</Label>
                        <Select value={exportResolution} onValueChange={(v) => setExportResolution(v as "720p" | "1080p" | "4k")}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="720p">720p HD</SelectItem>
                            <SelectItem value="1080p">1080p Full HD</SelectItem>
                            <SelectItem value="4k" disabled={limits.maxResolution !== "4k"}>
                              4K Ultra HD {limits.maxResolution !== "4k" && "(Upgrade Required)"}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Format</Label>
                        <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "mp4" | "webm" | "mov" | "gif")}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mp4">MP4 (Recommended)</SelectItem>
                            <SelectItem value="webm">WebM</SelectItem>
                            <SelectItem value="mov">MOV</SelectItem>
                            <SelectItem value="gif">GIF</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Quality</Label>
                        <Select value={exportQuality} onValueChange={(v) => setExportQuality(v as "draft" | "standard" | "high" | "ultra")}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft (Fast)</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="ultra">Ultra (Slow)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={startExport}
                        disabled={createExportMutation.isPending}
                      >
                        {createExportMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        Start Export
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-medium">Export History</h3>
                      {exportJobs && exportJobs.length > 0 ? (
                        <div className="space-y-2">
                          {exportJobs.map((job: {
                            id: number;
                            status: string;
                            format: string;
                            resolution: string;
                            progress: number;
                            outputUrl: string | null;
                            createdAt: Date;
                          }) => (
                            <div key={job.id} className="p-3 rounded-lg border">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant={
                                  job.status === "completed" ? "default" :
                                  job.status === "processing" ? "secondary" :
                                  job.status === "failed" ? "destructive" : "outline"
                                }>
                                  {job.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(job.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm">{job.format.toUpperCase()} • {job.resolution}</p>
                              {job.status === "processing" && (
                                <Progress value={job.progress} className="mt-2" />
                              )}
                              {job.status === "completed" && job.outputUrl && (
                                <Button variant="outline" size="sm" className="mt-2" asChild>
                                  <a href={job.outputUrl} download>
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                  </a>
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No exports yet</p>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
