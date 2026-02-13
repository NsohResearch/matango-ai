import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Users, 
  Plus,
  Search,
  Filter,
  Mail,
  UserPlus,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Trash2,
  RefreshCw,
  FileText,
  Handshake,
  Scale,
} from "lucide-react";
import { getLoginUrl } from "@/const";

type Stage = "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

export default function Leads() {
  const { user, loading: authLoading } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    source: "landing_page",
    notes: "",
  });

  // Real tRPC queries
  const utils = trpc.useUtils();

  const leadsQuery = trpc.leads.list.useQuery(
    {
      search: searchQuery || undefined,
      stage: statusFilter !== "all" ? statusFilter as Stage : undefined,
    },
    { enabled: !!user }
  );

  const statsQuery = trpc.leads.stats.useQuery(undefined, { enabled: !!user });

  const createMutation = trpc.leads.create.useMutation({
    onSuccess: () => {
      toast.success("Lead added successfully!");
      setIsAddingLead(false);
      setNewLead({ name: "", email: "", company: "", role: "", source: "landing_page", notes: "" });
      utils.leads.list.invalidate();
      utils.leads.stats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStageMutation = trpc.leads.updateStage.useMutation({
    onSuccess: () => {
      toast.success("Lead status updated!");
      utils.leads.list.invalidate();
      utils.leads.stats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.leads.delete.useMutation({
    onSuccess: () => {
      toast.success("Lead deleted!");
      setDeletingId(null);
      utils.leads.list.invalidate();
      utils.leads.stats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const sources = [
    { id: "landing_page", label: "Landing Page" },
    { id: "referral", label: "Referral" },
    { id: "social_media", label: "Social Media" },
    { id: "webinar", label: "Webinar" },
    { id: "organic_search", label: "Organic Search" },
    { id: "paid_ads", label: "Paid Ads" },
    { id: "email_campaign", label: "Email Campaign" },
    { id: "other", label: "Other" },
  ];

  const statusColors: Record<Stage, string> = {
    new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    contacted: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    qualified: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    proposal: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    negotiation: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    won: "bg-green-500/20 text-green-400 border-green-500/30",
    lost: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const statusIcons: Record<Stage, React.ReactNode> = {
    new: <UserPlus className="w-3 h-3" />,
    contacted: <MessageSquare className="w-3 h-3" />,
    qualified: <Target className="w-3 h-3" />,
    proposal: <FileText className="w-3 h-3" />,
    negotiation: <Scale className="w-3 h-3" />,
    won: <CheckCircle2 className="w-3 h-3" />,
    lost: <XCircle className="w-3 h-3" />,
  };

  const addLead = () => {
    if (!newLead.name || !newLead.email) {
      toast.error("Name and email are required");
      return;
    }
    createMutation.mutate({
      email: newLead.email,
      name: newLead.name || undefined,
      company: newLead.company || undefined,
      role: newLead.role || undefined,
      source: newLead.source || undefined,
      notes: newLead.notes || undefined,
    });
  };

  const stats = statsQuery.data;
  const leadsList = leadsQuery.data?.leads ?? [];

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
          <Users className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Lead Management</h1>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Capture and manage leads from your AI-powered campaigns. Sign in to get started.
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
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">Lead Management</h1>
            </div>
            <p className="text-muted-foreground">
              Track and nurture leads captured from your campaigns and landing pages.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="border-white/10"
              onClick={() => {
                utils.leads.list.invalidate();
                utils.leads.stats.invalidate();
              }}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Dialog open={isAddingLead} onOpenChange={setIsAddingLead}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-background border-white/10">
                <DialogHeader>
                  <DialogTitle>Add New Lead</DialogTitle>
                  <DialogDescription>
                    Manually add a lead to your CRM
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        placeholder="John Doe"
                        value={newLead.name}
                        onChange={(e) => setNewLead(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        value={newLead.email}
                        onChange={(e) => setNewLead(prev => ({ ...prev, email: e.target.value }))}
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company</Label>
                      <Input
                        placeholder="Acme Inc"
                        value={newLead.company}
                        onChange={(e) => setNewLead(prev => ({ ...prev, company: e.target.value }))}
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input
                        placeholder="Marketing Director"
                        value={newLead.role}
                        onChange={(e) => setNewLead(prev => ({ ...prev, role: e.target.value }))}
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select 
                      value={newLead.source} 
                      onValueChange={(value) => setNewLead(prev => ({ ...prev, source: value }))}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sources.map((source) => (
                          <SelectItem key={source.id} value={source.id}>
                            {source.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Any additional notes..."
                      value={newLead.notes}
                      onChange={(e) => setNewLead(prev => ({ ...prev, notes: e.target.value }))}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setIsAddingLead(false)} className="border-white/10">
                      Cancel
                    </Button>
                    <Button 
                      onClick={addLead} 
                      className="bg-primary text-primary-foreground"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Add Lead
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Leads</p>
                  <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
                </div>
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-400">New</p>
                  <p className="text-2xl font-bold text-blue-400">{stats?.new ?? 0}</p>
                </div>
                <UserPlus className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-400">Qualified</p>
                  <p className="text-2xl font-bold text-purple-400">{stats?.qualified ?? 0}</p>
                </div>
                <Target className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-400">Won</p>
                  <p className="text-2xl font-bold text-green-400">{stats?.won ?? 0}</p>
                </div>
                <Handshake className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-primary">Conversion Rate</p>
                  <p className="text-2xl font-bold text-primary">{stats?.conversionRate ?? 0}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search leads by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-white/5 border-white/10">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="proposal">Proposal</SelectItem>
              <SelectItem value="negotiation">Negotiation</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Leads Table */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-0">
            {leadsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Loading leads...</span>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left p-4 font-medium text-muted-foreground">Lead</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Company</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Source</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Stage</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Created</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leadsList.map((lead) => (
                        <tr key={lead.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-primary font-medium">
                                  {(lead.name || lead.email).split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{lead.name || "—"}</p>
                                <p className="text-sm text-muted-foreground">{lead.email}</p>
                                {lead.role && <p className="text-xs text-muted-foreground">{lead.role}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-muted-foreground">{lead.company || "—"}</span>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="border-white/20">
                              {sources.find(s => s.id === lead.source)?.label || lead.source || "—"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Select
                              value={lead.stage}
                              onValueChange={(value) => updateStageMutation.mutate({ id: lead.id, stage: value as Stage })}
                            >
                              <SelectTrigger className={`w-[140px] border ${statusColors[lead.stage as Stage] || "border-white/20"}`}>
                                <div className="flex items-center gap-2">
                                  {statusIcons[lead.stage as Stage]}
                                  <span className="capitalize">{lead.stage}</span>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="qualified">Qualified</SelectItem>
                                <SelectItem value="proposal">Proposal</SelectItem>
                                <SelectItem value="negotiation">Negotiation</SelectItem>
                                <SelectItem value="won">Won</SelectItem>
                                <SelectItem value="lost">Lost</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-4">
                            <div>
                              <span className="text-sm text-muted-foreground">
                                {new Date(lead.createdAt).toLocaleDateString()}
                              </span>
                              {lead.lastContactedAt && (
                                <p className="text-xs text-muted-foreground">
                                  Last contact: {new Date(lead.lastContactedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {lead.email && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => window.open(`mailto:${lead.email}`, "_blank")}
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                              )}
                              <Dialog 
                                open={deletingId === lead.id} 
                                onOpenChange={(open) => !open && setDeletingId(null)}
                              >
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                                    onClick={() => setDeletingId(lead.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-background border-white/10">
                                  <DialogHeader>
                                    <DialogTitle>Delete Lead</DialogTitle>
                                    <DialogDescription>
                                      Are you sure you want to delete {lead.name || lead.email}? This action cannot be undone.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="flex justify-end gap-3 pt-4">
                                    <Button variant="outline" onClick={() => setDeletingId(null)} className="border-white/10">
                                      Cancel
                                    </Button>
                                    <Button 
                                      variant="destructive"
                                      onClick={() => deleteMutation.mutate({ id: lead.id })}
                                      disabled={deleteMutation.isPending}
                                    >
                                      {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                      Delete
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {leadsList.length === 0 && !leadsQuery.isLoading && (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="font-medium mb-2">No leads found</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {searchQuery || statusFilter !== "all" 
                        ? "Try adjusting your filters" 
                        : "Add your first lead to get started"}
                    </p>
                    {!searchQuery && statusFilter === "all" && (
                      <Button 
                        onClick={() => setIsAddingLead(true)}
                        className="bg-primary text-primary-foreground"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Lead
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Info Banner */}
        <Card className="mt-6 bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/20">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Lead Pipeline</h3>
                <p className="text-sm text-muted-foreground">
                  Leads move through stages: New → Contacted → Qualified → Proposal → Negotiation → Won/Lost. 
                  Update stages directly from the table to track your sales pipeline.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
