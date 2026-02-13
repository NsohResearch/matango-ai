import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Plus, 
  Film, 
  Sparkles, 
  Play, 
  Image as ImageIcon, 
  Calendar,
  Loader2,
  ChevronRight,
  Trash2,
  RefreshCw
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";

export default function Campaigns() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedInfluencer, setSelectedInfluencer] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: "", description: "" });

  const { data: influencers, isLoading: influencersLoading } = trpc.influencer.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: campaigns, isLoading: campaignsLoading, refetch } = trpc.campaigns.list.useQuery(
    { influencerId: selectedInfluencer! },
    { enabled: isAuthenticated && !!selectedInfluencer }
  );

  const createMutation = trpc.campaigns.create.useMutation({
    onSuccess: (data) => {
      toast.success("Campaign created! Now add your story.");
      setIsCreateOpen(false);
      setNewCampaign({ name: "", description: "" });
      setLocation(`/campaigns/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.campaigns.delete.useMutation({
    onSuccess: () => {
      toast.success("Campaign deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = () => {
    if (!selectedInfluencer) {
      toast.error("Please select an influencer first");
      return;
    }
    createMutation.mutate({
      influencerId: selectedInfluencer,
      ...newCampaign,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <Film className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Story Mode Campaigns</h1>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Create multi-scene visual stories for your AI influencers. 
            Plan entire content campaigns with AI-generated scenes.
          </p>
          <Button asChild className="bg-primary text-primary-foreground">
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Film className="w-8 h-8 text-primary" />
              Story Mode
            </h1>
            <p className="text-muted-foreground mt-1">
              Create multi-scene visual campaigns for your influencers
            </p>
          </div>
          
          <div className="flex gap-4">
            <Select
              value={selectedInfluencer ? selectedInfluencer.toString() : undefined}
              onValueChange={(v) => setSelectedInfluencer(parseInt(v))}
            >
              <SelectTrigger className="w-48 bg-card border-white/10">
                <SelectValue placeholder="Select Influencer" />
              </SelectTrigger>
              <SelectContent>
                {influencers?.map((inf) => (
                  <SelectItem key={inf.id} value={inf.id.toString()}>
                    {inf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-primary text-primary-foreground"
                  disabled={!selectedInfluencer}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-white/10">
                <DialogHeader>
                  <DialogTitle>Create New Campaign</DialogTitle>
                  <DialogDescription>
                    Start a new visual story campaign for your influencer
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Campaign Name</Label>
                    <Input
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                      placeholder="e.g., Summer Beach Collection"
                      className="bg-background border-white/10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description (Optional)</Label>
                    <Textarea
                      value={newCampaign.description}
                      onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                      placeholder="Brief description of this campaign..."
                      rows={3}
                      className="bg-background border-white/10"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={createMutation.isPending || !newCampaign.name}
                      className="bg-primary text-primary-foreground"
                    >
                      {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create Campaign
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Content */}
        {!selectedInfluencer ? (
          <div className="text-center py-20">
            <Film className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Select an Influencer</h3>
            <p className="text-muted-foreground">
              Choose an influencer to view or create campaigns
            </p>
          </div>
        ) : campaignsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : campaigns?.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Campaigns Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first visual story campaign
            </p>
            <Button 
              onClick={() => setIsCreateOpen(true)}
              className="bg-primary text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Campaign
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns?.map((campaign) => (
              <CampaignCard 
                key={campaign.id} 
                campaign={campaign} 
                onDelete={() => deleteMutation.mutate({ id: campaign.id })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CampaignCard({ campaign, onDelete }: { campaign: any; onDelete: () => void }) {
  const progress = campaign.totalScenes > 0 
    ? (campaign.completedScenes / campaign.totalScenes) * 100 
    : 0;
  
  const statusColors: Record<string, string> = {
    draft: "bg-gray-500/20 text-gray-400",
    preview: "bg-yellow-500/20 text-yellow-400",
    generating: "bg-blue-500/20 text-blue-400",
    completed: "bg-green-500/20 text-green-400",
    published: "bg-primary/20 text-primary",
  };

  return (
    <Card className="bg-card border-white/10 hover:border-primary/50 transition-colors group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{campaign.name}</CardTitle>
            <CardDescription className="text-xs mt-1 line-clamp-2">
              {campaign.description || "No description"}
            </CardDescription>
          </div>
          <Badge className={statusColors[campaign.status] || statusColors.draft}>
            {campaign.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <ImageIcon className="w-4 h-4" />
            <span>{campaign.totalScenes || 0} scenes</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        
        {campaign.totalScenes > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-primary">{campaign.completedScenes}/{campaign.totalScenes}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        <div className="flex gap-2 pt-2">
          <Link href={`/campaigns/${campaign.id}`} className="flex-1">
            <Button className="w-full bg-primary text-primary-foreground">
              {campaign.status === "draft" ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Story
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  View Campaign
                </>
              )}
            </Button>
          </Link>
          <Button
            variant="outline"
            size="icon"
            className="text-red-400 hover:text-red-300"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
