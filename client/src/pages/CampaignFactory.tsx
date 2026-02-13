import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { 
  Sparkles, 
  Wand2, 
  Image as ImageIcon, 
  FileText, 
  Mail, 
  Globe, 
  Instagram, 
  Twitter, 
  Youtube,
  Zap,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Download,
  Copy,
  RefreshCw,
  Layers,
  Target,
  MessageSquare,
  Video
} from "lucide-react";
import { getLoginUrl } from "@/const";

type AssetType = "social_post" | "ad_creative" | "email" | "landing_page" | "video_script" | "blog_outline";
type Platform = "instagram" | "twitter" | "linkedin" | "facebook" | "youtube" | "tiktok";

interface GeneratedAsset {
  id: string;
  type: AssetType;
  platform?: Platform;
  content: string;
  imageUrl?: string;
  headline?: string;
  cta?: string;
}

export default function CampaignFactory() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  
  // Form state
  const [campaignGoal, setCampaignGoal] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [keyMessage, setKeyMessage] = useState("");
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<AssetType[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [tone, setTone] = useState<string>("professional");
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [activeTab, setActiveTab] = useState("setup");

  // Get Brand Brain data
  const { data: brandBrain } = trpc.brandBrain.get.useQuery(undefined, {
    enabled: !!user,
  });

  // Get user's influencers
  const { data: influencers } = trpc.influencer.list.useQuery(undefined, {
    enabled: !!user,
  });

  const [selectedInfluencer, setSelectedInfluencer] = useState<string>("none");

  const assetTypes: { id: AssetType; label: string; icon: React.ReactNode; description: string }[] = [
    { id: "social_post", label: "Social Posts", icon: <MessageSquare className="w-5 h-5" />, description: "Engaging posts for social media" },
    { id: "ad_creative", label: "Ad Creatives", icon: <Target className="w-5 h-5" />, description: "High-converting ad copy & visuals" },
    { id: "email", label: "Email Sequences", icon: <Mail className="w-5 h-5" />, description: "Nurture & convert with email" },
    { id: "landing_page", label: "Landing Pages", icon: <Globe className="w-5 h-5" />, description: "Conversion-optimized pages" },
    { id: "video_script", label: "Video Scripts", icon: <Video className="w-5 h-5" />, description: "Scripts for video content" },
    { id: "blog_outline", label: "Blog Outlines", icon: <FileText className="w-5 h-5" />, description: "SEO-friendly blog structures" },
  ];

  const platforms: { id: Platform; label: string; icon: React.ReactNode }[] = [
    { id: "instagram", label: "Instagram", icon: <Instagram className="w-5 h-5" /> },
    { id: "twitter", label: "Twitter/X", icon: <Twitter className="w-5 h-5" /> },
    { id: "linkedin", label: "LinkedIn", icon: <Globe className="w-5 h-5" /> },
    { id: "facebook", label: "Facebook", icon: <Globe className="w-5 h-5" /> },
    { id: "youtube", label: "YouTube", icon: <Youtube className="w-5 h-5" /> },
    { id: "tiktok", label: "TikTok", icon: <Video className="w-5 h-5" /> },
  ];

  const toggleAssetType = (type: AssetType) => {
    setSelectedAssetTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const generateCampaign = async () => {
    if (!campaignGoal || selectedAssetTypes.length === 0) {
      toast.error("Please fill in the campaign goal and select at least one asset type");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedAssets([]);
    setActiveTab("results");

    try {
      // Simulate progressive generation
      const totalAssets = selectedAssetTypes.length * Math.max(selectedPlatforms.length, 1);
      let completed = 0;

      const newAssets: GeneratedAsset[] = [];

      for (const assetType of selectedAssetTypes) {
        if (assetType === "social_post" && selectedPlatforms.length > 0) {
          for (const platform of selectedPlatforms) {
            // Generate social post for each platform
            const asset = await generateAsset(assetType, platform);
            newAssets.push(asset);
            completed++;
            setGenerationProgress((completed / totalAssets) * 100);
            setGeneratedAssets([...newAssets]);
          }
        } else {
          // Generate other asset types
          const asset = await generateAsset(assetType);
          newAssets.push(asset);
          completed++;
          setGenerationProgress((completed / totalAssets) * 100);
          setGeneratedAssets([...newAssets]);
        }
      }

      toast.success(`Generated ${newAssets.length} campaign assets!`);
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to generate campaign assets");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAsset = async (type: AssetType, platform?: Platform): Promise<GeneratedAsset> => {
    // Simulate API call with delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const brandContext = brandBrain ? `
Brand: ${brandBrain.productName}
Tagline: ${brandBrain.tagline || ""}
Tone: ${brandBrain.brandTone || tone}
Key Outcomes: ${brandBrain.keyOutcomes?.join(", ") || ""}
Differentiators: ${brandBrain.differentiators?.join(", ") || ""}
` : "";

    // Generate content based on type
    const templates: Record<AssetType, () => GeneratedAsset> = {
      social_post: () => ({
        id: `${type}-${platform}-${Date.now()}`,
        type,
        platform,
        headline: `${campaignGoal.slice(0, 50)}...`,
        content: `🚀 ${keyMessage || campaignGoal}\n\n${brandBrain?.differentiators?.[0] || "Transform your business today."}\n\n✨ ${brandBrain?.keyOutcomes?.[0] || "See results in days, not months."}\n\n👉 Link in bio\n\n#AI #Marketing #Growth ${platform === "instagram" ? "#InstaMarketing" : ""}`,
        cta: "Learn More →",
      }),
      ad_creative: () => ({
        id: `${type}-${Date.now()}`,
        type,
        headline: `Stop ${targetAudience || "struggling"} with marketing`,
        content: `${keyMessage || campaignGoal}\n\n${brandBrain?.tagline || "The smarter way to grow."}\n\n✓ ${brandBrain?.keyOutcomes?.[0] || "10x faster content creation"}\n✓ ${brandBrain?.keyOutcomes?.[1] || "AI-powered optimization"}\n✓ ${brandBrain?.keyOutcomes?.[2] || "Always-on growth"}`,
        cta: "Start Free Trial",
      }),
      email: () => ({
        id: `${type}-${Date.now()}`,
        type,
        headline: `Subject: ${keyMessage || "Your marketing just got easier"}`,
        content: `Hi [First Name],\n\n${campaignGoal}\n\nI wanted to share something that's been helping ${targetAudience || "entrepreneurs"} like you:\n\n${brandBrain?.productName || "Our platform"} - ${brandBrain?.tagline || "the all-in-one marketing solution"}\n\nHere's what you'll get:\n• ${brandBrain?.keyOutcomes?.[0] || "Automated content creation"}\n• ${brandBrain?.keyOutcomes?.[1] || "Multi-channel distribution"}\n• ${brandBrain?.keyOutcomes?.[2] || "Real-time analytics"}\n\nReady to transform your marketing?\n\n[CTA Button]\n\nBest,\n[Your Name]`,
        cta: "Get Started Now",
      }),
      landing_page: () => ({
        id: `${type}-${Date.now()}`,
        type,
        headline: brandBrain?.tagline || keyMessage || "Transform Your Marketing Today",
        content: `HERO SECTION:\nHeadline: ${brandBrain?.tagline || keyMessage}\nSubheadline: ${campaignGoal}\nCTA: Start Free Trial\n\nSOCIAL PROOF:\n"${brandBrain?.claimsProofMapping?.[0]?.claim || "10,000+ marketers trust us"}"\n\nFEATURES:\n${brandBrain?.keyOutcomes?.map((o: string, i: number) => `${i + 1}. ${o}`).join("\n") || "1. AI Content Generation\n2. Multi-Channel Publishing\n3. Analytics Dashboard"}\n\nOBJECTION HANDLING:\n${brandBrain?.objectionHandling?.[0]?.objection || "Q: Is it easy to use?"}\n${brandBrain?.objectionHandling?.[0]?.response || "A: Yes! Setup takes just 5 minutes."}\n\nFINAL CTA:\nHeadline: Ready to grow?\nButton: Start Your Free Trial`,
        cta: "Start Free Trial",
      }),
      video_script: () => ({
        id: `${type}-${Date.now()}`,
        type,
        headline: `Video Script: ${keyMessage || campaignGoal.slice(0, 30)}`,
        content: `[HOOK - 0:00-0:03]\n"${targetAudience || "Marketers"}, stop doing this..."\n\n[PROBLEM - 0:03-0:10]\n"You're spending hours on content that doesn't convert..."\n\n[AGITATE - 0:10-0:20]\n"While your competitors are using AI to 10x their output..."\n\n[SOLUTION - 0:20-0:40]\n"Introducing ${brandBrain?.productName || "our platform"} - ${brandBrain?.tagline || "your AI marketing co-pilot"}"\n\n[BENEFITS - 0:40-0:55]\n• ${brandBrain?.keyOutcomes?.[0] || "Create content in seconds"}\n• ${brandBrain?.keyOutcomes?.[1] || "Publish everywhere"}\n• ${brandBrain?.keyOutcomes?.[2] || "Track what works"}\n\n[CTA - 0:55-1:00]\n"Click the link below to start free. No credit card required."`,
        cta: "Watch Demo",
      }),
      blog_outline: () => ({
        id: `${type}-${Date.now()}`,
        type,
        headline: `Blog: How ${targetAudience || "Smart Marketers"} Are Using AI in 2025`,
        content: `TITLE: How ${targetAudience || "Smart Marketers"} Are Using AI to ${keyMessage || "10x Their Results"}\n\nMETA DESCRIPTION: Discover how AI is transforming marketing for ${targetAudience || "entrepreneurs"}. Learn the strategies top performers use.\n\nOUTLINE:\n\n1. INTRODUCTION\n   - Hook: The marketing landscape has changed\n   - Thesis: AI is the new competitive advantage\n\n2. THE PROBLEM WITH TRADITIONAL MARKETING\n   - Time-consuming content creation\n   - Inconsistent brand voice\n   - Fragmented tools\n\n3. ENTER AI-POWERED MARKETING\n   - What it means for ${targetAudience || "your business"}\n   - Key capabilities: ${brandBrain?.keyOutcomes?.slice(0, 3).join(", ") || "content, distribution, analytics"}\n\n4. CASE STUDY\n   - ${brandBrain?.claimsProofMapping?.[0]?.claim || "Real results from real users"}\n\n5. HOW TO GET STARTED\n   - Step 1: Define your brand voice\n   - Step 2: Set up your campaigns\n   - Step 3: Let AI do the heavy lifting\n\n6. CONCLUSION\n   - Recap key points\n   - CTA: Try ${brandBrain?.productName || "our platform"} free`,
        cta: "Read Full Article",
      }),
    };

    return templates[type]();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const regenerateAsset = async (assetId: string) => {
    const asset = generatedAssets.find(a => a.id === assetId);
    if (!asset) return;

    toast.info("Regenerating asset...");
    const newAsset = await generateAsset(asset.type, asset.platform);
    setGeneratedAssets(prev => prev.map(a => a.id === assetId ? { ...newAsset, id: assetId } : a));
    toast.success("Asset regenerated!");
  };

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
          <Layers className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Campaign Factory</h1>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Generate multi-channel marketing campaigns with AI. Sign in to start creating.
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
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Layers className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Campaign Factory</h1>
          </div>
          <p className="text-muted-foreground">
            Generate complete multi-channel campaigns from a single brief. Powered by your Brand Brain.
          </p>
          {brandBrain && (
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="outline" className="border-primary/50 text-primary">
                <Sparkles className="w-3 h-3 mr-1" />
                Brand Brain Connected: {brandBrain.productName}
              </Badge>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="setup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              1. Campaign Setup
            </TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              2. Generated Assets
            </TabsTrigger>
          </TabsList>

          {/* Setup Tab */}
          <TabsContent value="setup" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left Column - Campaign Brief */}
              <div className="space-y-6">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      Campaign Brief
                    </CardTitle>
                    <CardDescription>
                      Tell us about your campaign goals
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Campaign Goal *</Label>
                      <Textarea
                        placeholder="e.g., Launch our new AI writing tool to content creators and drive 1000 signups"
                        value={campaignGoal}
                        onChange={(e) => setCampaignGoal(e.target.value)}
                        className="bg-white/5 border-white/10 min-h-[100px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Target Audience</Label>
                      <Input
                        placeholder="e.g., Content creators, solopreneurs, marketing teams"
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        className="bg-white/5 border-white/10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Key Message</Label>
                      <Input
                        placeholder="e.g., Create content 10x faster with AI"
                        value={keyMessage}
                        onChange={(e) => setKeyMessage(e.target.value)}
                        className="bg-white/5 border-white/10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tone</Label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger className="bg-white/5 border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="playful">Playful</SelectItem>
                          <SelectItem value="authoritative">Authoritative</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {influencers && influencers.length > 0 && (
                      <div className="space-y-2">
                        <Label>Use AI Influencer (Optional)</Label>
                        <Select value={selectedInfluencer} onValueChange={setSelectedInfluencer}>
                          <SelectTrigger className="bg-white/5 border-white/10">
                            <SelectValue placeholder="Select an influencer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {influencers.map((inf) => (
                              <SelectItem key={inf.id} value={inf.id.toString()}>
                                {inf.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {!brandBrain && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Set up your Brand Brain first</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Get better, more consistent campaigns by configuring your brand voice and messaging.
                          </p>
                          <Button asChild size="sm" variant="link" className="text-primary p-0 h-auto mt-2">
                            <Link href="/brand-brain">Configure Brand Brain →</Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column - Asset Types & Platforms */}
              <div className="space-y-6">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-primary" />
                      Asset Types *
                    </CardTitle>
                    <CardDescription>
                      Select what you want to generate
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {assetTypes.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => toggleAssetType(type.id)}
                          className={`p-4 rounded-lg border text-left transition-all ${
                            selectedAssetTypes.includes(type.id)
                              ? "bg-primary/20 border-primary"
                              : "bg-white/5 border-white/10 hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={selectedAssetTypes.includes(type.id) ? "text-primary" : "text-muted-foreground"}>
                              {type.icon}
                            </span>
                            <span className="font-medium text-sm">{type.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {selectedAssetTypes.includes("social_post") && (
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-primary" />
                        Platforms
                      </CardTitle>
                      <CardDescription>
                        Select platforms for social posts
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {platforms.map((platform) => (
                          <button
                            key={platform.id}
                            onClick={() => togglePlatform(platform.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                              selectedPlatforms.includes(platform.id)
                                ? "bg-primary/20 border-primary text-primary"
                                : "bg-white/5 border-white/10 hover:border-white/20"
                            }`}
                          >
                            {platform.icon}
                            <span className="text-sm">{platform.label}</span>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={generateCampaign}
                  disabled={isGenerating || !campaignGoal || selectedAssetTypes.length === 0}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Campaign...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5 mr-2" />
                      Generate Campaign Assets
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            {isGenerating && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <div>
                      <p className="font-medium">Generating your campaign assets...</p>
                      <p className="text-sm text-muted-foreground">
                        This may take a minute. We're crafting each asset with your brand voice.
                      </p>
                    </div>
                  </div>
                  <Progress value={generationProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2 text-right">
                    {Math.round(generationProgress)}% complete
                  </p>
                </CardContent>
              </Card>
            )}

            {generatedAssets.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    Generated Assets ({generatedAssets.length})
                  </h2>
                  <Button variant="outline" size="sm" className="border-white/10">
                    <Download className="w-4 h-4 mr-2" />
                    Export All
                  </Button>
                </div>

                <div className="grid gap-4">
                  {generatedAssets.map((asset) => (
                    <Card key={asset.id} className="bg-white/5 border-white/10">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-primary/50 text-primary">
                              {assetTypes.find(t => t.id === asset.type)?.label}
                            </Badge>
                            {asset.platform && (
                              <Badge variant="outline" className="border-white/20">
                                {platforms.find(p => p.id === asset.platform)?.label}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => regenerateAsset(asset.id)}
                              className="h-8 w-8 p-0"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(asset.content)}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {asset.headline && (
                          <CardTitle className="text-lg mt-2">{asset.headline}</CardTitle>
                        )}
                      </CardHeader>
                      <CardContent>
                        <pre className="whitespace-pre-wrap text-sm text-muted-foreground bg-black/20 p-4 rounded-lg font-sans">
                          {asset.content}
                        </pre>
                        {asset.cta && (
                          <div className="mt-4 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Suggested CTA:</span>
                            <Badge className="bg-primary/20 text-primary border-0">
                              {asset.cta}
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {!isGenerating && generatedAssets.length === 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No assets generated yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Set up your campaign brief and click generate to create your marketing assets.
                  </p>
                  <Button onClick={() => setActiveTab("setup")} variant="outline" className="border-white/10">
                    Go to Setup
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
