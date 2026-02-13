import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  FileText, 
  Sparkles, 
  Copy, 
  Check, 
  ChevronRight, 
  Clock,
  Target,
  Zap,
  Save,
  Trash2,
  RefreshCw
} from "lucide-react";
import { Streamdown } from "streamdown";

interface ScriptContent {
  hook: string;
  body: string;
  cta: string;
  shotList?: { shot: number; description: string; duration?: string }[];
  safetyNotes?: string[];
  deliveryNotes?: {
    pacing?: string;
    emphasis?: string[];
    pauses?: string[];
  };
}

export default function VideoScriptsPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("generate");
  const [copied, setCopied] = useState(false);
  
  // Form state
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [platform, setPlatform] = useState<string>("tiktok");
  const [language, setLanguage] = useState("en");
  const [tone, setTone] = useState("confident");
  const [brief, setBrief] = useState("");
  const [targetDuration, setTargetDuration] = useState<number>(30);
  
  // Generated script state
  const [generatedScript, setGeneratedScript] = useState<ScriptContent | null>(null);

  // tRPC mutations and queries
  const createSession = trpc.workflow.createSession.useMutation({
    onSuccess: (data) => {
      setSessionId(data.id);
      toast.success("Workflow session created");
    },
    onError: (error) => {
      toast.error(`Failed to create session: ${error.message}`);
    },
  });

  const generateScript = trpc.scripts.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedScript(data.contentJson as ScriptContent);
      toast.success("Script generated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to generate script: ${error.message}`);
    },
  });

  const saveScript = trpc.scripts.save.useMutation({
    onSuccess: () => {
      toast.success("Script saved to session");
      setActiveTab("library");
    },
    onError: (error) => {
      toast.error(`Failed to save script: ${error.message}`);
    },
  });

  const { data: sessions } = trpc.workflow.listSessions.useQuery();
  const { data: savedScripts, refetch: refetchScripts } = trpc.scripts.listBySession.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );

  const handleGenerate = async () => {
    if (!brief.trim()) {
      toast.error("Please enter a brief for your script");
      return;
    }

    // Create session if not exists
    if (!sessionId) {
      const result = await createSession.mutateAsync({
        title: `Script Session - ${new Date().toLocaleDateString()}`,
        description: brief.substring(0, 200),
      });
      
      generateScript.mutate({
        sessionId: result.id,
        platform: platform as "tiktok" | "instagram" | "youtube" | "ads" | "linkedin" | "other",
        language,
        tone,
        brief,
        targetDurationSeconds: targetDuration,
      });
    } else {
      generateScript.mutate({
        sessionId,
        platform: platform as "tiktok" | "instagram" | "youtube" | "ads" | "linkedin" | "other",
        language,
        tone,
        brief,
        targetDurationSeconds: targetDuration,
      });
    }
  };

  const handleSaveScript = () => {
    if (!generatedScript || !sessionId) return;

    saveScript.mutate({
      sessionId,
      platform: platform as "tiktok" | "instagram" | "youtube" | "ads" | "linkedin" | "other",
      language,
      tone,
      contentJson: generatedScript,
      estimatedDurationSeconds: targetDuration,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const getFullScript = () => {
    if (!generatedScript) return "";
    return `${generatedScript.hook}\n\n${generatedScript.body}\n\n${generatedScript.cta}`;
  };

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
            <h1 className="text-3xl font-bold tracking-tight">Video Scripts</h1>
            <p className="text-muted-foreground mt-1">
              Generate AI-powered scripts for your video content
            </p>
          </div>
          {sessionId && (
            <Badge variant="outline" className="text-sm">
              Session #{sessionId}
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Library
            </TabsTrigger>
          </TabsList>

          {/* Generate Tab */}
          <TabsContent value="generate" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Input Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Script Brief
                  </CardTitle>
                  <CardDescription>
                    Describe what you want your video to communicate
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="platform">Platform</Label>
                      <Select value={platform} onValueChange={setPlatform}>
                        <SelectTrigger id="platform">
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                          <SelectItem value="instagram">Instagram Reels</SelectItem>
                          <SelectItem value="youtube">YouTube Shorts</SelectItem>
                          <SelectItem value="ads">Paid Ads</SelectItem>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tone">Tone</Label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger id="tone">
                          <SelectValue placeholder="Select tone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="confident">Confident</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="inspirational">Inspirational</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger id="language">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                          <SelectItem value="pt">Portuguese</SelectItem>
                          <SelectItem value="zh">Chinese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (seconds)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min={5}
                        max={300}
                        value={targetDuration}
                        onChange={(e) => setTargetDuration(parseInt(e.target.value) || 30)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="brief">Content Brief</Label>
                    <Textarea
                      id="brief"
                      placeholder="Describe your video content, target audience, key message, and any specific requirements..."
                      className="min-h-[150px] resize-none"
                      value={brief}
                      onChange={(e) => setBrief(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {brief.length}/2000 characters
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleGenerate}
                    disabled={generateScript.isPending || !brief.trim()}
                  >
                    {generateScript.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Script
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Generated Script Preview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      Generated Script
                    </CardTitle>
                    {generatedScript && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(getFullScript())}
                        >
                          {copied ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleSaveScript}
                          disabled={saveScript.isPending}
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                  <CardDescription>
                    {generatedScript
                      ? "Review and edit your generated script"
                      : "Your generated script will appear here"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {generatedScript ? (
                    <div className="space-y-4">
                      {/* Hook */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">Hook</Badge>
                          <span className="text-xs text-muted-foreground">First 3 seconds</span>
                        </div>
                        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                          <Streamdown>{generatedScript.hook}</Streamdown>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">Body</Badge>
                          <span className="text-xs text-muted-foreground">Main content</span>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <Streamdown>{generatedScript.body}</Streamdown>
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">CTA</Badge>
                          <span className="text-xs text-muted-foreground">Call to action</span>
                        </div>
                        <div className="p-3 bg-secondary/10 rounded-lg border border-secondary/20">
                          <Streamdown>{generatedScript.cta}</Streamdown>
                        </div>
                      </div>

                      {/* Shot List */}
                      {generatedScript.shotList && generatedScript.shotList.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Shot List</Label>
                            <div className="space-y-2">
                              {generatedScript.shotList.map((shot) => (
                                <div
                                  key={shot.shot}
                                  className="flex items-start gap-3 p-2 bg-muted/30 rounded"
                                >
                                  <Badge variant="outline" className="shrink-0">
                                    {shot.shot}
                                  </Badge>
                                  <div className="flex-1">
                                    <p className="text-sm">{shot.description}</p>
                                    {shot.duration && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        <Clock className="w-3 h-3 inline mr-1" />
                                        {shot.duration}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Delivery Notes */}
                      {generatedScript.deliveryNotes && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Delivery Notes</Label>
                            <div className="text-sm text-muted-foreground space-y-1">
                              {generatedScript.deliveryNotes.pacing && (
                                <p><strong>Pacing:</strong> {generatedScript.deliveryNotes.pacing}</p>
                              )}
                              {generatedScript.deliveryNotes.emphasis && (
                                <p><strong>Emphasis:</strong> {generatedScript.deliveryNotes.emphasis.join(", ")}</p>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Next Step */}
                      <div className="pt-4">
                        <Button className="w-full" variant="outline">
                          Continue to Video Studio
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                      <FileText className="w-12 h-12 mb-4 opacity-50" />
                      <p>Enter your brief and click Generate to create a script</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Library Tab */}
          <TabsContent value="library" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Saved Scripts</CardTitle>
                <CardDescription>
                  View and manage your generated scripts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {savedScripts && savedScripts.length > 0 ? (
                  <div className="space-y-4">
                    {savedScripts.map((script) => (
                      <div
                        key={script.id}
                        className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge>{script.platform}</Badge>
                              <Badge variant="outline">{script.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {script.fullScript?.substring(0, 150)}...
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Created {new Date(script.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
                    <FileText className="w-8 h-8 mb-2 opacity-50" />
                    <p>No saved scripts yet</p>
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => setActiveTab("generate")}
                    >
                      Generate your first script
                    </Button>
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
