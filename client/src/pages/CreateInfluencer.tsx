import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Loader2, Sparkles, ArrowLeft, Wand2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

export default function CreateInfluencer() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | undefined>(undefined);
  const [bio, setBio] = useState("");
  const [personality, setPersonality] = useState("");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [avatarPrompt, setAvatarPrompt] = useState("");
  const [avatarStyle, setAvatarStyle] = useState<"realistic" | "anime" | "artistic">("realistic");
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  const [createdInfluencerId, setCreatedInfluencerId] = useState<number | null>(null);

  const createMutation = trpc.influencer.create.useMutation({
    onSuccess: (data) => {
      setCreatedInfluencerId(data.id);
      toast.success("Influencer created! Now generate an avatar.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const generateAvatarMutation = trpc.ai.generateAvatar.useMutation({
    onSuccess: (data) => {
      setGeneratedAvatar(data.url);
      toast.success("Avatar generated successfully!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name for your influencer");
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      age,
      bio: bio.trim() || undefined,
      personality: personality.trim() || undefined,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      isPublic,
    });
  };

  const handleGenerateAvatar = async () => {
    if (!createdInfluencerId) {
      toast.error("Please create the influencer first");
      return;
    }
    if (!avatarPrompt.trim()) {
      toast.error("Please describe how your influencer should look");
      return;
    }

    generateAvatarMutation.mutate({
      influencerId: createdInfluencerId,
      prompt: avatarPrompt.trim(),
      style: avatarStyle,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <h1 className="text-3xl font-bold mb-4">Sign In Required</h1>
          <p className="text-muted-foreground mb-8">Please sign in to create an influencer</p>
          <a href={getLoginUrl()}>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Sign In
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6 pl-0 hover:bg-transparent hover:text-primary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create AI Influencer</h1>
          <p className="text-muted-foreground">Design your unique AI personality and generate their avatar</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Form */}
          <div className="space-y-6">
            <Card className="bg-card border-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Basic Info
                </CardTitle>
                <CardDescription>Define your influencer's identity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Luna Chen"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white/5 border-white/10"
                    disabled={!!createdInfluencerId}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="e.g., 22"
                    min={18}
                    max={100}
                    value={age || ""}
                    onChange={(e) => setAge(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="bg-white/5 border-white/10"
                    disabled={!!createdInfluencerId}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="A short bio for your influencer..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="bg-white/5 border-white/10 min-h-[80px]"
                    disabled={!!createdInfluencerId}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personality">Personality</Label>
                  <Textarea
                    id="personality"
                    placeholder="Describe their personality traits, interests, style..."
                    value={personality}
                    onChange={(e) => setPersonality(e.target.value)}
                    className="bg-white/5 border-white/10 min-h-[80px]"
                    disabled={!!createdInfluencerId}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    placeholder="e.g., fashion, fitness, lifestyle"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="bg-white/5 border-white/10"
                    disabled={!!createdInfluencerId}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Make Public</Label>
                    <p className="text-xs text-muted-foreground">Allow others to discover this influencer</p>
                  </div>
                  <Switch
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                    disabled={!!createdInfluencerId}
                  />
                </div>

                {!createdInfluencerId && (
                  <Button 
                    onClick={handleCreate} 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Influencer"
                    )}
                  </Button>
                )}

                {createdInfluencerId && (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm text-primary">
                    Influencer created! Now generate an avatar below.
                  </div>
                )}
              </CardContent>
            </Card>

            {createdInfluencerId && (
              <Card className="bg-card border-white/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-secondary" />
                    Generate Avatar
                  </CardTitle>
                  <CardDescription>Use AI to create your influencer's look</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="avatarPrompt">Describe Appearance *</Label>
                    <Textarea
                      id="avatarPrompt"
                      placeholder="e.g., Young Asian woman with long black hair, brown eyes, elegant makeup, wearing a white blouse, confident smile..."
                      value={avatarPrompt}
                      onChange={(e) => setAvatarPrompt(e.target.value)}
                      className="bg-white/5 border-white/10 min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Art Style</Label>
                    <Select value={avatarStyle} onValueChange={(v) => setAvatarStyle(v as typeof avatarStyle)}>
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realistic">Realistic (Photo-like)</SelectItem>
                        <SelectItem value="anime">Anime Style</SelectItem>
                        <SelectItem value="artistic">Artistic / Creative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleGenerateAvatar} 
                    className="w-full bg-secondary text-white hover:bg-secondary/90"
                    disabled={generateAvatarMutation.isPending}
                  >
                    {generateAvatarMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating... (this may take 10-20 seconds)
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate Avatar
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Preview */}
          <div>
            <Card className="bg-card border-white/5 sticky top-24">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>How your influencer will appear</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-white/5 border border-white/10 mb-4">
                  {generatedAvatar ? (
                    <img 
                      src={generatedAvatar} 
                      alt="Generated avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : generateAvatarMutation.isPending ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-6">
                      <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                      <p className="text-sm text-muted-foreground">Generating your AI influencer...</p>
                      <p className="text-xs text-muted-foreground mt-2">This usually takes 10-20 seconds</p>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-6">
                      <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4">
                        <Sparkles className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">Avatar preview will appear here</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-lg">{name || "Your Influencer"}</h3>
                  {age && <p className="text-sm text-muted-foreground">Age: {age}</p>}
                  {bio && <p className="text-sm text-muted-foreground">{bio}</p>}
                  {tags && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.split(",").map((tag, i) => tag.trim() && (
                        <span key={i} className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/80">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {generatedAvatar && (
                  <div className="mt-6 space-y-2">
                    <Link href="/dashboard">
                      <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                        Go to Dashboard
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      className="w-full border-white/10"
                      onClick={() => {
                        setGeneratedAvatar(null);
                        setAvatarPrompt("");
                      }}
                    >
                      Generate Another Avatar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
