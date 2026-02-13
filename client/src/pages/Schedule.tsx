import { useState } from "react";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar, Clock, Instagram, Plus, Trash2, Loader2, ArrowLeft, Sparkles, Edit, AlertCircle, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getLoginUrl } from "@/const";

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-4 h-4" />,
  tiktok: <span className="text-sm font-bold">TT</span>,
  twitter: <span className="text-sm font-bold">X</span>,
  youtube: <span className="text-sm font-bold">YT</span>,
};

const platformColors: Record<string, string> = {
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
  tiktok: "bg-black",
  twitter: "bg-blue-500",
  youtube: "bg-red-500",
};

const platformLimits: Record<string, number> = {
  instagram: 2200,
  tiktok: 2200,
  twitter: 280,
  youtube: 5000,
};

export default function Schedule() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [selectedInfluencer, setSelectedInfluencer] = useState<string>("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [contentDescription, setContentDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [autoGenerateCaption, setAutoGenerateCaption] = useState(false);

  const utils = trpc.useUtils();

  const { data: influencers, isLoading: loadingInfluencers } = trpc.influencer.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: posts, isLoading, refetch } = trpc.schedule.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createPostMutation = trpc.schedule.create.useMutation({
    onSuccess: (data) => {
      toast.success("Post scheduled successfully!");
      if (data.caption && autoGenerateCaption) {
        toast.info("AI-generated caption applied", {
          description: "You can edit it anytime",
        });
      }
      refetch();
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to schedule post", {
        description: error.message,
      });
    },
  });

  const updatePostMutation = trpc.schedule.update.useMutation({
    onSuccess: () => {
      toast.success("Post updated successfully!");
      refetch();
      setIsEditOpen(false);
      setEditingPost(null);
    },
    onError: (error) => {
      toast.error("Failed to update post", {
        description: error.message,
      });
    },
  });

  const deletePostMutation = trpc.schedule.delete.useMutation({
    onSuccess: () => {
      toast.success("Scheduled post deleted");
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to delete post", {
        description: error.message,
      });
    },
  });

  const generateCaptionMutation = trpc.schedule.generateCaption.useMutation({
    onSuccess: (data) => {
      setCaption(data.caption);
      toast.success("Caption generated!");
    },
    onError: (error) => {
      toast.error("Failed to generate caption", {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setSelectedInfluencer("");
    setSelectedPlatform("");
    setCaption("");
    setContentDescription("");
    setScheduledDate("");
    setScheduledTime("");
    setAutoGenerateCaption(false);
  };

  const handleCreate = () => {
    if (!selectedInfluencer || !selectedPlatform || !scheduledDate || !scheduledTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);
    
    if (scheduledFor <= new Date()) {
      toast.error("Scheduled time must be in the future");
      return;
    }

    const maxLength = platformLimits[selectedPlatform] || 2200;
    if (caption.length > maxLength) {
      toast.error(`Caption exceeds ${selectedPlatform} limit of ${maxLength} characters`);
      return;
    }

    createPostMutation.mutate({
      influencerId: parseInt(selectedInfluencer),
      platform: selectedPlatform as "instagram" | "tiktok" | "twitter" | "youtube",
      caption: autoGenerateCaption && !caption ? undefined : caption,
      scheduledFor: scheduledFor.toISOString(),
      autoGenerateCaption: autoGenerateCaption && !caption,
    });
  };

  const handleUpdate = () => {
    if (!editingPost) return;

    const updates: any = { id: editingPost.id };
    
    if (caption !== editingPost.caption) {
      updates.caption = caption;
    }
    
    if (scheduledDate && scheduledTime) {
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);
      if (scheduledFor <= new Date()) {
        toast.error("Scheduled time must be in the future");
        return;
      }
      updates.scheduledFor = scheduledFor.toISOString();
    }

    updatePostMutation.mutate(updates);
  };

  const handleGenerateCaption = () => {
    if (!selectedInfluencer || !selectedPlatform) {
      toast.error("Please select an influencer and platform first");
      return;
    }

    generateCaptionMutation.mutate({
      influencerId: parseInt(selectedInfluencer),
      platform: selectedPlatform as "instagram" | "tiktok" | "twitter" | "youtube",
      contentDescription: contentDescription || undefined,
    });
  };

  const openEditDialog = (post: any) => {
    setEditingPost(post);
    setCaption(post.caption || "");
    setScheduledDate(new Date(post.scheduledFor).toISOString().split("T")[0]);
    setScheduledTime(new Date(post.scheduledFor).toTimeString().slice(0, 5));
    setIsEditOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "published": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "failed": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "cancelled": return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const groupPostsByDate = (posts: any[]) => {
    const grouped: Record<string, any[]> = {};
    const sortedPosts = [...posts].sort((a, b) => 
      new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
    );
    
    sortedPosts.forEach(post => {
      const date = new Date(post.scheduledFor).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(post);
    });
    return grouped;
  };

  const groupedPosts = posts ? groupPostsByDate(posts) : {};

  // Auth loading
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

  // Auth required
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Calendar className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Sign In Required</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            Please sign in to schedule posts for your AI influencers
          </p>
          <a href={getLoginUrl()}>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Sign In to Continue
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="hover:bg-white/5">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Content Schedule</h1>
              <p className="text-muted-foreground">Plan and schedule your social media posts</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              className="border-white/10 hover:bg-white/5"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Post
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-white/10 max-w-md">
                <DialogHeader>
                  <DialogTitle>Schedule New Post</DialogTitle>
                  <DialogDescription>
                    Create a scheduled post with AI-generated captions
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Influencer *</Label>
                    <Select value={selectedInfluencer} onValueChange={setSelectedInfluencer}>
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue placeholder="Select influencer" />
                      </SelectTrigger>
                      <SelectContent>
                        {influencers?.map((inf) => (
                          <SelectItem key={inf.id} value={inf.id.toString()}>
                            {inf.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Platform *</Label>
                    <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="twitter">Twitter/X</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">AI Caption Generation</Label>
                      <p className="text-xs text-muted-foreground">Let AI write your caption</p>
                    </div>
                    <Switch
                      checked={autoGenerateCaption}
                      onCheckedChange={setAutoGenerateCaption}
                    />
                  </div>

                  {autoGenerateCaption && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Content Description (optional)</Label>
                      <Input
                        value={contentDescription}
                        onChange={(e) => setContentDescription(e.target.value)}
                        placeholder="Describe what the post is about..."
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Caption</Label>
                      {selectedInfluencer && selectedPlatform && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleGenerateCaption}
                          disabled={generateCaptionMutation.isPending}
                          className="text-primary hover:text-primary/80 h-auto py-1"
                        >
                          {generateCaptionMutation.isPending ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3 mr-1" />
                          )}
                          Generate
                        </Button>
                      )}
                    </div>
                    <Textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder={autoGenerateCaption ? "Leave empty for AI generation, or write your own..." : "Write your caption..."}
                      className="bg-white/5 border-white/10 min-h-[100px]"
                      maxLength={platformLimits[selectedPlatform] || 2200}
                    />
                    {selectedPlatform && (
                      <p className={`text-xs mt-1 ${caption.length > (platformLimits[selectedPlatform] || 2200) ? "text-destructive" : "text-muted-foreground"}`}>
                        {caption.length}/{platformLimits[selectedPlatform] || 2200} characters
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Date *</Label>
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="bg-white/5 border-white/10"
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Time *</Label>
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={createPostMutation.isPending}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {createPostMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scheduling...</>
                    ) : (
                      <><Calendar className="w-4 h-4 mr-2" /> Schedule Post</>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-card border-white/10 max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Scheduled Post</DialogTitle>
              <DialogDescription>
                Update the caption or reschedule this post
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Caption</Label>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="bg-white/5 border-white/10 min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Date</Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="bg-white/5 border-white/10"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Time</Label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={updatePostMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {updatePostMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {isLoading || loadingInfluencers ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading schedule...</p>
            </div>
          </div>
        ) : influencers && influencers.length === 0 ? (
          <Card className="bg-card border-white/5">
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-bold text-lg mb-2">No Influencers Yet</h3>
              <p className="text-muted-foreground mb-6">
                Create an AI influencer first to start scheduling posts
              </p>
              <Link href="/create">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Create Influencer
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : posts && posts.length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedPosts).map(([date, datePosts]) => (
              <div key={date}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  {date}
                </h2>
                <div className="grid gap-4">
                  {datePosts.map((post, index) => {
                    const influencer = influencers?.find(i => i.id === post.influencerId);
                    const isPast = new Date(post.scheduledFor) < new Date();
                    
                    return (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className={`bg-card border-white/5 hover:border-white/10 transition-colors ${isPast && post.status === "scheduled" ? "opacity-60" : ""}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className={`w-10 h-10 rounded-lg ${platformColors[post.platform]} flex items-center justify-center text-white flex-shrink-0`}>
                                {platformIcons[post.platform]}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="font-medium">{influencer?.name || "Unknown"}</span>
                                  <Badge variant="outline" className={getStatusColor(post.status)}>
                                    {post.status}
                                  </Badge>
                                  {isPast && post.status === "scheduled" && (
                                    <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                      Overdue
                                    </Badge>
                                  )}
                                </div>
                                
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                  {post.caption || <span className="italic">No caption</span>}
                                </p>
                                
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(post.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  <span className="capitalize">{post.platform}</span>
                                </div>
                              </div>
                              
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                                  onClick={() => openEditDialog(post)}
                                  disabled={post.status !== "scheduled"}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this scheduled post?")) {
                                      deletePostMutation.mutate({ id: post.id });
                                    }
                                  }}
                                  disabled={deletePostMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="bg-card border-white/5">
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-bold text-lg mb-2">No Scheduled Posts</h3>
              <p className="text-muted-foreground mb-6">
                Start scheduling content for your AI influencers
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Schedule Your First Post
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
