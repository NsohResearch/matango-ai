import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  User,
  Mic,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Upload,
  Plus,
  Loader2,
  Check,
  Search,
  Star,
  Globe,
  Sparkles,
} from "lucide-react";

// Built-in voice options (TTS voices)
const BUILT_IN_VOICES = [
  { id: "alloy", name: "Alloy", gender: "Female", accent: "American", style: "Warm & Professional", preview: true },
  { id: "echo", name: "Echo", gender: "Male", accent: "American", style: "Deep & Authoritative", preview: true },
  { id: "fable", name: "Fable", gender: "Female", accent: "British", style: "Elegant & Refined", preview: true },
  { id: "nova", name: "Nova", gender: "Female", accent: "American", style: "Energetic & Youthful", preview: true },
  { id: "onyx", name: "Onyx", gender: "Male", accent: "American", style: "Smooth & Confident", preview: true },
  { id: "shimmer", name: "Shimmer", gender: "Female", accent: "American", style: "Soft & Friendly", preview: true },
];

// Built-in avatar styles
const AVATAR_STYLES = [
  { id: "realistic", name: "Realistic", description: "Photorealistic human avatars" },
  { id: "stylized", name: "Stylized", description: "Artistic, illustrated style" },
  { id: "anime", name: "Anime", description: "Japanese animation style" },
  { id: "3d", name: "3D Rendered", description: "High-quality 3D models" },
];

interface Avatar {
  id: number;
  name: string;
  thumbnailUrl: string | null;
  style: string;
  gender: string | null;
  ethnicity: string | null;
  ageRange: string | null;
  isDefault: boolean;
}

interface Voice {
  id: number;
  name: string;
  provider: string;
  voiceId: string;
  gender: string | null;
  accent: string | null;
  style: string | null;
  previewUrl: string | null;
  isDefault: boolean;
}

interface AvatarVoiceSelectorProps {
  selectedAvatarId: number | null;
  selectedVoiceId: number | null;
  onAvatarSelect: (avatarId: number | null) => void;
  onVoiceSelect: (voiceId: number | null) => void;
  voiceSettings?: {
    speed: number;
    pitch: number;
    volume: number;
  };
  onVoiceSettingsChange?: (settings: { speed: number; pitch: number; volume: number }) => void;
}

export default function AvatarVoiceSelector({
  selectedAvatarId,
  selectedVoiceId,
  onAvatarSelect,
  onVoiceSelect,
  voiceSettings = { speed: 1, pitch: 1, volume: 1 },
  onVoiceSettingsChange,
}: AvatarVoiceSelectorProps) {
  const [activeTab, setActiveTab] = useState<"avatars" | "voices">("avatars");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateAvatarDialog, setShowCreateAvatarDialog] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState<string | null>(null);
  
  // New avatar form state
  const [newAvatarName, setNewAvatarName] = useState("");
  const [newAvatarStyle, setNewAvatarStyle] = useState("realistic");
  const [newAvatarGender, setNewAvatarGender] = useState("female");
  const [newAvatarEthnicity, setNewAvatarEthnicity] = useState("diverse");
  const [newAvatarAgeRange, setNewAvatarAgeRange] = useState("adult");
  
  // tRPC queries
  const { data: avatars, isLoading: avatarsLoading, refetch: refetchAvatars } = trpc.creator.avatars.list.useQuery();
  const { data: voices, isLoading: voicesLoading, refetch: refetchVoices } = trpc.creator.voices.list.useQuery();
  
  // tRPC mutations
  const createAvatarMutation = trpc.creator.avatars.create.useMutation({
    onSuccess: () => {
      toast.success("Avatar created!");
      setShowCreateAvatarDialog(false);
      setNewAvatarName("");
      refetchAvatars();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const createVoiceMutation = trpc.creator.voices.create.useMutation({
    onSuccess: () => {
      toast.success("Voice added!");
      refetchVoices();
    },
    onError: (error) => toast.error(error.message),
  });
  
  // Filter avatars based on search
  const filteredAvatars = avatars?.filter((avatar) =>
    avatar.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Combine user and system voices
  const allVoices = voices ? [...voices.userVoices, ...voices.systemVoices] : [];
  
  // Filter voices based on search
  const filteredVoices = allVoices.filter((voice) =>
    voice.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Play voice preview
  const playVoicePreview = (voiceId: string) => {
    if (isPlayingPreview === voiceId) {
      setIsPlayingPreview(null);
      // Stop audio
    } else {
      setIsPlayingPreview(voiceId);
      // Play preview audio
      toast.info("Voice preview playing...");
      setTimeout(() => setIsPlayingPreview(null), 3000);
    }
  };
  
  // Handle create avatar
  const handleCreateAvatar = () => {
    if (!newAvatarName.trim()) {
      toast.error("Please enter an avatar name");
      return;
    }
    createAvatarMutation.mutate({
      name: newAvatarName.trim(),
      style: newAvatarStyle as "realistic" | "cartoon" | "anime" | "3d" | "illustrated",
      gender: newAvatarGender as "male" | "female" | "neutral",
      imageUrl: "/images/default-avatar.png", // Placeholder, will be generated
    });
  };
  
  // Add built-in voice to user's collection
  const addBuiltInVoice = (voice: typeof BUILT_IN_VOICES[0]) => {
    createVoiceMutation.mutate({
      name: voice.name,
      provider: "openai" as const,
      providerId: voice.id,
      gender: voice.gender.toLowerCase() as "male" | "female" | "neutral",
      accent: voice.accent,
      style: "professional" as const,
    });
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
        <div className="px-4 pt-4 border-b">
          <TabsList className="w-full">
            <TabsTrigger value="avatars" className="flex-1 gap-2">
              <User className="w-4 h-4" />
              Avatars
            </TabsTrigger>
            <TabsTrigger value="voices" className="flex-1 gap-2">
              <Mic className="w-4 h-4" />
              Voices
            </TabsTrigger>
          </TabsList>
        </div>
        
        {/* Search */}
        <div className="px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        {/* Avatars Tab */}
        <TabsContent value="avatars" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Create Avatar Button */}
              <Dialog open={showCreateAvatarDialog} onOpenChange={setShowCreateAvatarDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Avatar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create AI Avatar</DialogTitle>
                    <DialogDescription>
                      Design a custom AI avatar for your videos
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Avatar Name</Label>
                      <Input
                        value={newAvatarName}
                        onChange={(e) => setNewAvatarName(e.target.value)}
                        placeholder="My Avatar"
                      />
                    </div>
                    <div>
                      <Label>Style</Label>
                      <Select value={newAvatarStyle} onValueChange={setNewAvatarStyle}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AVATAR_STYLES.map(style => (
                            <SelectItem key={style.id} value={style.id}>
                              {style.name} - {style.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Gender</Label>
                        <Select value={newAvatarGender} onValueChange={setNewAvatarGender}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="non-binary">Non-Binary</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Age Range</Label>
                        <Select value={newAvatarAgeRange} onValueChange={setNewAvatarAgeRange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="young_adult">Young Adult (18-25)</SelectItem>
                            <SelectItem value="adult">Adult (25-40)</SelectItem>
                            <SelectItem value="middle_aged">Middle Aged (40-55)</SelectItem>
                            <SelectItem value="senior">Senior (55+)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Ethnicity/Appearance</Label>
                      <Select value={newAvatarEthnicity} onValueChange={setNewAvatarEthnicity}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diverse">Diverse/Global</SelectItem>
                          <SelectItem value="caucasian">Caucasian</SelectItem>
                          <SelectItem value="african">African</SelectItem>
                          <SelectItem value="asian">Asian</SelectItem>
                          <SelectItem value="hispanic">Hispanic/Latino</SelectItem>
                          <SelectItem value="middle_eastern">Middle Eastern</SelectItem>
                          <SelectItem value="south_asian">South Asian</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      onClick={handleCreateAvatar}
                      disabled={createAvatarMutation.isPending}
                    >
                      {createAvatarMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create Avatar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              {/* No Avatar Option */}
              <Card
                className={`cursor-pointer transition-colors ${
                  selectedAvatarId === null ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                }`}
                onClick={() => onAvatarSelect(null)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">No Avatar</h4>
                    <p className="text-sm text-muted-foreground">Video without avatar presenter</p>
                  </div>
                  {selectedAvatarId === null && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </CardContent>
              </Card>
              
              {/* Avatar List */}
              {avatarsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredAvatars && filteredAvatars.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {filteredAvatars.map((avatar) => (
                    <Card
                      key={avatar.id}
                      className={`cursor-pointer transition-colors ${
                        selectedAvatarId === avatar.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                      }`}
                      onClick={() => onAvatarSelect(avatar.id)}
                    >
                      <CardContent className="p-3">
                        <div className="aspect-square rounded-lg bg-muted mb-2 overflow-hidden">
                          {avatar.thumbnailUrl ? (
                            <img src={avatar.thumbnailUrl} alt={avatar.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-12 h-12 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-sm truncate">{avatar.name}</h4>
                            <p className="text-xs text-muted-foreground capitalize">{avatar.style}</p>
                          </div>
                          {selectedAvatarId === avatar.id && (
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        {avatar.isDefault && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No avatars found</p>
                  <p className="text-sm">Create your first avatar above</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        
        {/* Voices Tab */}
        <TabsContent value="voices" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Voice Settings */}
              {selectedVoiceId && onVoiceSettingsChange && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Voice Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs">Speed</Label>
                        <span className="text-xs text-muted-foreground">{voiceSettings.speed.toFixed(1)}x</span>
                      </div>
                      <Slider
                        value={[voiceSettings.speed]}
                        min={0.5}
                        max={2}
                        step={0.1}
                        onValueChange={([v]) => onVoiceSettingsChange({ ...voiceSettings, speed: v })}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs">Pitch</Label>
                        <span className="text-xs text-muted-foreground">{voiceSettings.pitch.toFixed(1)}x</span>
                      </div>
                      <Slider
                        value={[voiceSettings.pitch]}
                        min={0.5}
                        max={2}
                        step={0.1}
                        onValueChange={([v]) => onVoiceSettingsChange({ ...voiceSettings, pitch: v })}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs">Volume</Label>
                        <span className="text-xs text-muted-foreground">{Math.round(voiceSettings.volume * 100)}%</span>
                      </div>
                      <Slider
                        value={[voiceSettings.volume]}
                        min={0}
                        max={1}
                        step={0.05}
                        onValueChange={([v]) => onVoiceSettingsChange({ ...voiceSettings, volume: v })}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* No Voice Option */}
              <Card
                className={`cursor-pointer transition-colors ${
                  selectedVoiceId === null ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                }`}
                onClick={() => onVoiceSelect(null)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <VolumeX className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">No Voiceover</h4>
                    <p className="text-sm text-muted-foreground">Video without narration</p>
                  </div>
                  {selectedVoiceId === null && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </CardContent>
              </Card>
              
              {/* Built-in Voices */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  AI Voices
                </h4>
                <div className="space-y-2">
                  {BUILT_IN_VOICES.map((voice) => (
                    <Card
                      key={voice.id}
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            playVoicePreview(voice.id);
                          }}
                        >
                          {isPlayingPreview === voice.id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{voice.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {voice.gender} • {voice.accent} • {voice.style}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addBuiltInVoice(voice)}
                          disabled={createVoiceMutation.isPending}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              
              {/* User's Voices */}
              {allVoices.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    My Voices
                  </h4>
                  <div className="space-y-2">
                    {filteredVoices.map((voice) => (
                      <Card
                        key={voice.id}
                        className={`cursor-pointer transition-colors ${
                          selectedVoiceId === voice.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                        }`}
                        onClick={() => onVoiceSelect(voice.id)}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              playVoicePreview(voice.providerId);
                            }}
                          >
                            {isPlayingPreview === voice.providerId ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{voice.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              {voice.gender} • {voice.language} • {voice.style}
                            </p>
                          </div>
                          {selectedVoiceId === voice.id && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                          {voice.isSystem && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              System
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
