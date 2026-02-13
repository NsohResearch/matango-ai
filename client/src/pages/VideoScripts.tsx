import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Film, 
  Play, 
  Clock, 
  Copy, 
  Check, 
  Sparkles, 
  Video, 
  Smartphone, 
  Youtube, 
  Instagram,
  Building2,
  ChevronRight,
  User,
  Pause,
  Volume2
} from "lucide-react";
import { toast } from "sonner";

type Scene = {
  sceneNumber: number;
  title: string;
  dialogue: string;
  visualNotes?: string;
  onScreenText?: string;
  durationHint?: string;
};

type DeliveryNotes = {
  pacing?: string;
  emphasis?: string[];
  pauses?: string[];
  tone?: string;
};

type VideoScript = {
  id: number;
  name: string;
  slug?: string;
  scriptType: string;
  durationSeconds?: number;
  scenes?: Scene[];
  fullScript?: string;
  deliveryNotes?: DeliveryNotes;
  isSystemScript?: boolean;
};

const scriptTypeIcons: Record<string, React.ReactNode> = {
  master: <Film className="h-4 w-4" />,
  tiktok: <Smartphone className="h-4 w-4" />,
  youtube_shorts: <Youtube className="h-4 w-4" />,
  instagram_reels: <Instagram className="h-4 w-4" />,
  agency: <Building2 className="h-4 w-4" />,
  custom: <Video className="h-4 w-4" />,
};

const scriptTypeLabels: Record<string, string> = {
  master: "Master Script (75-90s)",
  tiktok: "TikTok / IG Reels (20-30s)",
  youtube_shorts: "YouTube Shorts (45s)",
  instagram_reels: "Instagram Reels (30-45s)",
  agency: "Agency Version (60s)",
  custom: "Custom Script",
};

function ScriptViewer({ script }: { script: VideoScript }) {
  const [copiedFull, setCopiedFull] = useState(false);
  const [activeScene, setActiveScene] = useState(0);

  const copyFullScript = () => {
    if (script.fullScript) {
      navigator.clipboard.writeText(script.fullScript);
      setCopiedFull(true);
      toast.success("Script copied to clipboard");
      setTimeout(() => setCopiedFull(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">{script.name}</h3>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="outline" className="border-electric-lime/30 text-electric-lime">
              {scriptTypeIcons[script.scriptType]}
              <span className="ml-1">{scriptTypeLabels[script.scriptType] || script.scriptType}</span>
            </Badge>
            {script.durationSeconds && (
              <span className="text-sm text-gray-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {script.durationSeconds}s
              </span>
            )}
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={copyFullScript}
          className="border-gray-700 hover:border-electric-lime"
        >
          {copiedFull ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
          Copy Script
        </Button>
      </div>

      {/* Scenes */}
      {script.scenes && script.scenes.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Scenes</h4>
          <div className="grid gap-3">
            {script.scenes.map((scene, index) => (
              <Card 
                key={scene.sceneNumber}
                className={`bg-midnight-blue/50 border-gray-800 cursor-pointer transition-all ${
                  activeScene === index ? 'border-electric-lime/50 ring-1 ring-electric-lime/20' : 'hover:border-gray-700'
                }`}
                onClick={() => setActiveScene(index)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-deep-teal/30 flex items-center justify-center text-electric-lime font-medium text-sm">
                      {scene.sceneNumber}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-white">{scene.title}</h5>
                        {scene.durationHint && (
                          <span className="text-xs text-gray-500">{scene.durationHint}</span>
                        )}
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">"{scene.dialogue}"</p>
                      {scene.visualNotes && (
                        <p className="text-xs text-gray-500 italic">
                          Visual: {scene.visualNotes}
                        </p>
                      )}
                      {scene.onScreenText && (
                        <div className="mt-2 px-3 py-1.5 bg-black/30 rounded text-xs text-electric-lime font-mono">
                          📺 {scene.onScreenText}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Delivery Notes */}
      {script.deliveryNotes && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Delivery Notes</h4>
          <Card className="bg-midnight-blue/30 border-gray-800">
            <CardContent className="p-4 space-y-3">
              {script.deliveryNotes.tone && (
                <div className="flex items-start gap-2">
                  <Volume2 className="h-4 w-4 text-electric-lime mt-0.5" />
                  <div>
                    <span className="text-xs text-gray-500 uppercase">Tone</span>
                    <p className="text-sm text-gray-300">{script.deliveryNotes.tone}</p>
                  </div>
                </div>
              )}
              {script.deliveryNotes.pacing && (
                <div className="flex items-start gap-2">
                  <Play className="h-4 w-4 text-electric-lime mt-0.5" />
                  <div>
                    <span className="text-xs text-gray-500 uppercase">Pacing</span>
                    <p className="text-sm text-gray-300">{script.deliveryNotes.pacing}</p>
                  </div>
                </div>
              )}
              {script.deliveryNotes.emphasis && script.deliveryNotes.emphasis.length > 0 && (
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-electric-lime mt-0.5" />
                  <div>
                    <span className="text-xs text-gray-500 uppercase">Emphasis</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {script.deliveryNotes.emphasis.map((word, i) => (
                        <Badge key={i} variant="secondary" className="bg-deep-teal/30 text-white text-xs">
                          {word}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {script.deliveryNotes.pauses && script.deliveryNotes.pauses.length > 0 && (
                <div className="flex items-start gap-2">
                  <Pause className="h-4 w-4 text-electric-lime mt-0.5" />
                  <div>
                    <span className="text-xs text-gray-500 uppercase">Strategic Pauses</span>
                    <ul className="text-sm text-gray-300 mt-1 space-y-0.5">
                      {script.deliveryNotes.pauses.map((pause, i) => (
                        <li key={i}>• {pause}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Full Script */}
      {script.fullScript && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Full Script</h4>
          <Card className="bg-black/30 border-gray-800">
            <CardContent className="p-4">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                {script.fullScript}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ScriptGenerator() {
  const [topic, setTopic] = useState("");
  const [scriptType, setScriptType] = useState<"master" | "tiktok" | "youtube_shorts" | "instagram_reels" | "agency" | "custom">("tiktok");
  const [targetAudience, setTargetAudience] = useState("");
  const [keyMessage, setKeyMessage] = useState("");
  const [generatedScript, setGeneratedScript] = useState<VideoScript | null>(null);

  const generateMutation = trpc.videoScripts.generate.useMutation({
    onSuccess: (data: any) => {
      setGeneratedScript(data.script);
      toast.success("Script generated successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to generate script");
    },
  });

  const handleGenerate = () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic for your script");
      return;
    }
    generateMutation.mutate({ topic, scriptType, targetAudience: targetAudience || undefined, keyMessage: keyMessage || undefined });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-midnight-blue/50 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-electric-lime" />
            Generate Custom Script
          </CardTitle>
          <CardDescription>
            Create a video script tailored to your brand using AI. Your Brand Brain context will be automatically included.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic / Main Message *</Label>
              <Textarea
                id="topic"
                placeholder="e.g., Why marketing fragmentation is killing your growth..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="bg-black/30 border-gray-700 min-h-[80px]"
              />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scriptType">Script Type</Label>
                <Select value={scriptType} onValueChange={(value) => setScriptType(value as "master" | "tiktok" | "youtube_shorts" | "instagram_reels" | "agency" | "custom")}>
                  <SelectTrigger className="bg-black/30 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiktok">TikTok / IG Reels (20-30s)</SelectItem>
                    <SelectItem value="youtube_shorts">YouTube Shorts (45s)</SelectItem>
                    <SelectItem value="instagram_reels">Instagram Reels (30-45s)</SelectItem>
                    <SelectItem value="agency">Agency Version (60s)</SelectItem>
                    <SelectItem value="master">Master Script (75-90s)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetAudience">Target Audience (optional)</Label>
                <Input
                  id="targetAudience"
                  placeholder="e.g., AI entrepreneurs, agency owners..."
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="bg-black/30 border-gray-700"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="keyMessage">Key Message (optional)</Label>
            <Input
              id="keyMessage"
              placeholder="e.g., One loop. One brand brain. Always-on growth."
              value={keyMessage}
              onChange={(e) => setKeyMessage(e.target.value)}
              className="bg-black/30 border-gray-700"
            />
          </div>
          <Button 
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !topic.trim()}
            className="w-full bg-electric-lime text-midnight-blue hover:bg-electric-lime/90"
          >
            {generateMutation.isPending ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                Generating Script...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Script
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedScript && (
        <Card className="bg-midnight-blue/30 border-gray-800">
          <CardHeader>
            <CardTitle>Generated Script</CardTitle>
          </CardHeader>
          <CardContent>
            <ScriptViewer script={generatedScript} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function VideoScriptsPage() {
  const [selectedScript, setSelectedScript] = useState<VideoScript | null>(null);

  const { data: systemScripts, isLoading: loadingSystem } = trpc.videoScripts.listSystem.useQuery();

  const { data: systemInfluencer } = trpc.systemInfluencers.getBySlug.useQuery({ slug: "matango-official" });

  return (
    <div className="min-h-screen bg-gradient-to-b from-midnight-blue to-black">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Video Script Generator</h1>
          <p className="text-gray-400">
            Create compelling video scripts that follow the Matango brand philosophy. 
            System &gt; Tools. Always.
          </p>
        </div>

        {/* Matango Influencer Card */}
        {systemInfluencer && (
          <Card className="bg-gradient-to-r from-deep-teal/30 to-midnight-blue/50 border-electric-lime/20 mb-8">
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-electric-lime/20 to-deep-teal/30 flex items-center justify-center">
                  <User className="h-10 w-10 text-electric-lime" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-1">{systemInfluencer.name}</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    {systemInfluencer.genderPresentation} • {systemInfluencer.ageAppearance} • {systemInfluencer.ethnicity}
                  </p>
                  <p className="text-gray-300 text-sm mb-4">{systemInfluencer.personaDescription}</p>
                  <div className="flex flex-wrap gap-2">
                    {systemInfluencer.voiceTraits?.map((trait: string, i: number) => (
                      <Badge key={i} variant="outline" className="border-electric-lime/30 text-electric-lime text-xs">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList className="bg-midnight-blue/50 border border-gray-800">
            <TabsTrigger value="templates" className="data-[state=active]:bg-deep-teal data-[state=active]:text-white">
              <Film className="h-4 w-4 mr-2" />
              Script Templates
            </TabsTrigger>
            <TabsTrigger value="generate" className="data-[state=active]:bg-deep-teal data-[state=active]:text-white">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Custom
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Script List */}
              <div className="lg:col-span-1 space-y-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                  Matango Auto-Generated Scripts
                </h3>
                {loadingSystem ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <Card key={i} className="bg-midnight-blue/30 border-gray-800 animate-pulse">
                        <CardContent className="p-4 h-20" />
                      </Card>
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3 pr-4">
                      {systemScripts?.map((script: VideoScript) => (
                        <Card
                          key={script.id}
                          className={`bg-midnight-blue/30 border-gray-800 cursor-pointer transition-all hover:border-gray-700 ${
                            selectedScript?.id === script.id ? 'border-electric-lime/50 ring-1 ring-electric-lime/20' : ''
                          }`}
                          onClick={() => setSelectedScript(script)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-deep-teal/30 flex items-center justify-center text-electric-lime">
                                  {scriptTypeIcons[script.scriptType] || <Video className="h-5 w-5" />}
                                </div>
                                <div>
                                  <h4 className="font-medium text-white text-sm">{script.name}</h4>
                                  <p className="text-xs text-gray-500">
                                    {script.durationSeconds}s • {script.scenes?.length || 0} scenes
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Script Viewer */}
              <div className="lg:col-span-2">
                {selectedScript ? (
                  <Card className="bg-midnight-blue/30 border-gray-800">
                    <CardContent className="p-6">
                      <ScriptViewer script={selectedScript} />
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-midnight-blue/30 border-gray-800 h-[600px] flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a script to view</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="generate">
            <ScriptGenerator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
