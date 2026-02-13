import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  Eye, 
  Pencil, 
  Trash2, 
  Copy,
  Loader2,
  Link as LinkIcon,
  Check
} from "lucide-react";
import { getLoginUrl } from "@/const";

export default function Team() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [selectedInfluencer, setSelectedInfluencer] = useState<number | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("viewer");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data: influencers } = trpc.influencer.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: collaborators, isLoading, refetch } = trpc.collaborators.list.useQuery(
    { influencerId: selectedInfluencer! },
    { enabled: isAuthenticated && !!selectedInfluencer }
  );

  const { data: sharedInfluencers } = trpc.collaborators.getSharedInfluencers.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const inviteMutation = trpc.collaborators.invite.useMutation({
    onSuccess: (data) => {
      toast.success("Invitation sent!");
      setIsInviteOpen(false);
      setInviteEmail("");
      refetch();
      
      // Copy invite link
      const inviteLink = `${window.location.origin}/invite/${data.inviteToken}`;
      navigator.clipboard.writeText(inviteLink);
      toast.info("Invite link copied to clipboard!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateRoleMutation = trpc.collaborators.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeMutation = trpc.collaborators.remove.useMutation({
    onSuccess: () => {
      toast.success("Collaborator removed");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleInvite = () => {
    if (!selectedInfluencer || !inviteEmail) {
      toast.error("Please select an influencer and enter an email");
      return;
    }
    inviteMutation.mutate({
      influencerId: selectedInfluencer,
      email: inviteEmail,
      role: inviteRole,
    });
  };

  const copyInviteLink = (token: string) => {
    const inviteLink = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedToken(token);
    toast.success("Invite link copied!");
    setTimeout(() => setCopiedToken(null), 2000);
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
          <Users className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Team Collaboration</h1>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Invite team members to collaborate on your AI influencers.
            Share management responsibilities with editors and viewers.
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
      
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Team Collaboration
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage team members and shared influencers
            </p>
          </div>
        </div>
        
        <Tabs defaultValue="my-team" className="space-y-6">
          <TabsList className="bg-card border border-white/10">
            <TabsTrigger value="my-team">My Team</TabsTrigger>
            <TabsTrigger value="shared">Shared With Me</TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-team" className="space-y-6">
            {/* Influencer Selector */}
            <div className="flex flex-col md:flex-row gap-4">
              <Select
                value={selectedInfluencer?.toString() || ""}
                onValueChange={(v) => setSelectedInfluencer(parseInt(v))}
              >
                <SelectTrigger className="w-full md:w-64 bg-card border-white/10">
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
              
              <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-primary text-primary-foreground"
                    disabled={!selectedInfluencer}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-white/10">
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to collaborate on this influencer
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@example.com"
                        className="bg-background border-white/10"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select
                        value={inviteRole}
                        onValueChange={(v: "editor" | "viewer") => setInviteRole(v)}
                      >
                        <SelectTrigger className="bg-background border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              Viewer - Can view content and analytics
                            </div>
                          </SelectItem>
                          <SelectItem value="editor">
                            <div className="flex items-center gap-2">
                              <Pencil className="w-4 h-4" />
                              Editor - Can create and edit content
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="bg-background/50 rounded-lg p-4 text-sm">
                      <h4 className="font-medium mb-2">Role Permissions</h4>
                      <div className="space-y-2 text-muted-foreground">
                        <p><strong>Viewer:</strong> View influencer profile, content, analytics, and chat history</p>
                        <p><strong>Editor:</strong> All viewer permissions + create content, schedule posts, manage campaigns</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleInvite}
                        disabled={inviteMutation.isPending || !inviteEmail}
                        className="bg-primary text-primary-foreground"
                      >
                        {inviteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Send Invitation
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Collaborators List */}
            {!selectedInfluencer ? (
              <div className="text-center py-20">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Select an Influencer</h3>
                <p className="text-muted-foreground">
                  Choose an influencer to manage team members
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : collaborators?.length === 0 ? (
              <div className="text-center py-20">
                <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Team Members Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Invite colleagues to collaborate on this influencer
                </p>
                <Button 
                  onClick={() => setIsInviteOpen(true)}
                  className="bg-primary text-primary-foreground"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite First Member
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {collaborators?.map((collab) => (
                  <Card key={collab.id} className="bg-card border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback>
                              {collab.inviteEmail?.charAt(0).toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{collab.inviteEmail}</p>
                              <Badge 
                                variant="outline"
                                className={
                                  collab.status === "accepted" 
                                    ? "border-green-500/50 text-green-400"
                                    : "border-yellow-500/50 text-yellow-400"
                                }
                              >
                                {collab.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              {collab.role === "editor" ? (
                                <><Pencil className="w-3 h-3" /> Editor</>
                              ) : (
                                <><Eye className="w-3 h-3" /> Viewer</>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {collab.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyInviteLink(collab.inviteToken!)}
                            >
                              {copiedToken === collab.inviteToken ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          
                          <Select
                            value={collab.role}
                            onValueChange={(v: "editor" | "viewer") => 
                              updateRoleMutation.mutate({ id: collab.id, role: v })
                            }
                          >
                            <SelectTrigger className="w-32 bg-background border-white/10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => removeMutation.mutate({ id: collab.id })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="shared" className="space-y-6">
            {sharedInfluencers?.length === 0 ? (
              <div className="text-center py-20">
                <LinkIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Shared Influencers</h3>
                <p className="text-muted-foreground">
                  When someone invites you to collaborate, their influencers will appear here
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sharedInfluencers?.map((influencer) => (
                  <Card key={influencer.id} className="bg-card border-white/10">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={influencer.avatarUrl || undefined} />
                          <AvatarFallback>{influencer.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{influencer.name}</CardTitle>
                          <CardDescription className="text-xs">
                            Shared with you
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {influencer.bio || "No bio available"}
                      </p>
                      <Button variant="outline" className="w-full" asChild>
                        <a href={`/influencer/${influencer.id}`}>View Profile</a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
