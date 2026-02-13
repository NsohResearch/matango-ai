import { useRoute } from "wouter";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Heart, Share2, ArrowLeft, Lock, Loader2, Wand2 } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function InfluencerDetail() {
  const [match, params] = useRoute("/influencer/:id");
  const id = match ? parseInt(params.id) : 0;
  const { user, isAuthenticated } = useAuth();
  const [contentPrompt, setContentPrompt] = useState("");
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  const { data: influencer, isLoading } = trpc.influencer.get.useQuery(
    { id },
    { enabled: !!id }
  );

  const { data: content, refetch: refetchContent } = trpc.ai.getContent.useQuery(
    { influencerId: id },
    { enabled: !!id && isAuthenticated && influencer?.userId === user?.id }
  );

  const generateContentMutation = trpc.ai.generateContent.useMutation({
    onSuccess: () => {
      toast.success("Content generated successfully!");
      refetchContent();
      setContentPrompt("");
      setIsGenerateOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isOwner = isAuthenticated && influencer?.userId === user?.id;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!influencer) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 text-center">
          <h1 className="text-3xl font-bold mb-4">Influencer Not Found</h1>
          <p className="text-muted-foreground mb-8">This influencer doesn't exist or has been removed.</p>
          <Link href="/discover">
            <Button>Back to Discover</Button>
          </Link>
        </div>
      </div>
    );
  }

  const stats = influencer.stats as { followers: number; likes: number; posts: number } | null;
  const tags = influencer.tags as string[] | null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <Link href={isOwner ? "/dashboard" : "/discover"}>
          <Button variant="ghost" className="mb-6 pl-0 hover:bg-transparent hover:text-primary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {isOwner ? "Dashboard" : "Discover"}
          </Button>
        </Link>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-white/5 rounded-2xl overflow-hidden sticky top-24">
              <div className="aspect-[3/4] relative">
                {influencer.avatarUrl ? (
                  <img src={influencer.avatarUrl} alt={influencer.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center">
                    <span className="text-6xl">{influencer.name.charAt(0)}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {influencer.name}{influencer.age ? `, ${influencer.age}` : ""}
                  </h1>
                  {tags && tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <Link href={`/chat/${influencer.id}`}>
                      <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Chat
                      </Button>
                    </Link>
                    <Button size="icon" variant="outline" className="border-white/20 hover:bg-white/10 text-white" onClick={() => toast.info("Feature coming soon!")}>
                      <Heart className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="outline" className="border-white/20 hover:bg-white/10 text-white" onClick={() => toast.info("Feature coming soon!")}>
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-white/5">
                <h3 className="font-bold text-lg mb-3">About</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {influencer.bio || "No bio yet."}
                </p>
                
                {influencer.personality && (
                  <>
                    <h3 className="font-bold text-lg mb-3">Personality</h3>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      {influencer.personality}
                    </p>
                  </>
                )}
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="font-bold text-white">{stats?.followers || 0}</div>
                    <div className="text-xs text-muted-foreground">Followers</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="font-bold text-white">{stats?.likes || 0}</div>
                    <div className="text-xs text-muted-foreground">Likes</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="font-bold text-white">{stats?.posts || 0}</div>
                    <div className="text-xs text-muted-foreground">Posts</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column - Content Gallery */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Content Gallery</h2>
              {isOwner && (
                <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-secondary text-white hover:bg-secondary/90">
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate Content
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-white/10">
                    <DialogHeader>
                      <DialogTitle>Generate New Content</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Textarea
                        placeholder="Describe the content you want to generate... e.g., 'A photo at a coffee shop, casual outfit, morning light'"
                        value={contentPrompt}
                        onChange={(e) => setContentPrompt(e.target.value)}
                        className="bg-white/5 border-white/10 min-h-[100px]"
                      />
                      <Button 
                        onClick={() => generateContentMutation.mutate({ influencerId: id, prompt: contentPrompt })}
                        disabled={generateContentMutation.isPending || !contentPrompt.trim()}
                        className="w-full bg-secondary text-white hover:bg-secondary/90"
                      >
                        {generateContentMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                        ) : (
                          <><Wand2 className="w-4 h-4 mr-2" /> Generate</>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {/* Show avatar as first content if exists */}
              {influencer.avatarUrl && (
                <div className="aspect-[4/5] rounded-xl overflow-hidden border border-white/5 relative group cursor-pointer">
                  <img src={influencer.avatarUrl} alt="Avatar" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-primary/80 text-primary-foreground">Avatar</Badge>
                  </div>
                </div>
              )}

              {/* Show generated content */}
              {content && content.map((item) => (
                <div key={item.id} className="aspect-[4/5] rounded-xl overflow-hidden border border-white/5 relative group cursor-pointer">
                  <img src={item.imageUrl} alt="Content" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="secondary" size="sm" className="bg-white/20 backdrop-blur-md text-white border-none">
                      View Full Size
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Private Content Placeholders for non-owners */}
              {!isOwner && [1, 2, 3].map((i) => (
                <div key={`private-${i}`} className="aspect-[4/5] rounded-xl overflow-hidden border border-white/5 relative bg-card flex flex-col items-center justify-center text-center p-6">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <Lock className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-bold text-white mb-1">Private Content</h3>
                  <p className="text-xs text-muted-foreground mb-4">Subscribe to view this exclusive content</p>
                  <Button size="sm" variant="outline" className="border-primary/50 text-primary hover:bg-primary/10" onClick={() => toast.info("Feature coming soon!")}>
                    Unlock Access
                  </Button>
                </div>
              ))}

              {/* Empty state for owners with no content */}
              {isOwner && (!content || content.length === 0) && !influencer.avatarUrl && (
                <div className="col-span-2 aspect-video rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-6">
                  <Wand2 className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="font-bold text-white mb-1">No Content Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Generate your first content using AI</p>
                  <Button onClick={() => setIsGenerateOpen(true)} className="bg-secondary text-white hover:bg-secondary/90">
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Content
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
