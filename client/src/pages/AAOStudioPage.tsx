import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Rocket, 
  Calendar as CalendarIcon, 
  Download, 
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Video,
  FileText,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AAOStudioPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("deploy");
  const [sessionId, setSessionId] = useState<number | null>(null);
  
  // Deployment form state
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [selectedScriptId, setSelectedScriptId] = useState<number | null>(null);
  const [destination, setDestination] = useState<string>("download_only");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  // tRPC queries and mutations
  const { data: sessions } = trpc.workflow.listSessions.useQuery();
  const { data: assets } = trpc.gallery.listAssets.useQuery(
    { sessionId: sessionId!, types: ["generated_video"] },
    { enabled: !!sessionId }
  );
  const { data: scripts } = trpc.scripts.listBySession.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );
  const { data: deployments, refetch: refetchDeployments } = trpc.aao.listAll.useQuery();

  const deployCampaign = trpc.aao.deployCampaignAsset.useMutation({
    onSuccess: () => {
      toast.success("Deployment created successfully");
      refetchDeployments();
      setActiveTab("history");
    },
    onError: (error) => {
      toast.error(`Deployment failed: ${error.message}`);
    },
  });

  const cancelDeployment = trpc.aao.cancelDeployment.useMutation({
    onSuccess: () => {
      toast.success("Deployment cancelled");
      refetchDeployments();
    },
  });

  const platforms = [
    { id: "tiktok", name: "TikTok", icon: "📱" },
    { id: "instagram", name: "Instagram", icon: "📸" },
    { id: "youtube", name: "YouTube", icon: "▶️" },
    { id: "linkedin", name: "LinkedIn", icon: "💼" },
    { id: "twitter", name: "X (Twitter)", icon: "🐦" },
  ];

  const handleDeploy = async () => {
    if (!sessionId) {
      toast.error("Please select a workflow session first");
      return;
    }

    if (destination === "schedule" && !scheduledDate) {
      toast.error("Please select a scheduled date");
      return;
    }

    deployCampaign.mutate({
      sessionId,
      videoAssetId: selectedVideoId || undefined,
      scriptId: selectedScriptId || undefined,
      destination: destination as "publish_track" | "download_only" | "draft" | "schedule",
      scheduledFor: scheduledDate?.toISOString(),
      targetPlatforms: selectedPlatforms.map(p => ({ platform: p })),
      notes: notes || undefined,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "published":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "processing":
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case "queued":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "cancelled":
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getDestinationLabel = (dest: string) => {
    switch (dest) {
      case "publish_track":
        return "Publish & Track";
      case "download_only":
        return "Download Only";
      case "draft":
        return "Save as Draft";
      case "schedule":
        return "Scheduled";
      default:
        return dest;
    }
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
            <h1 className="text-3xl font-bold tracking-tight">AAO Studio</h1>
            <p className="text-muted-foreground mt-1">
              Deploy your content across platforms
            </p>
          </div>
          {sessionId && (
            <Badge variant="outline" className="text-sm">
              Session #{sessionId}
            </Badge>
          )}
        </div>

        {/* Session Selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label className="shrink-0">Workflow Session:</Label>
              <Select
                value={sessionId ? sessionId.toString() : undefined}
                onValueChange={(v) => setSessionId(parseInt(v))}
              >
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Select a session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions?.map((session) => (
                    <SelectItem key={session.id} value={session.id.toString()}>
                      #{session.id} - {session.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="deploy" className="flex items-center gap-2">
              <Rocket className="w-4 h-4" />
              Deploy
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Deploy Tab */}
          <TabsContent value="deploy" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Deployment Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-primary" />
                    Create Deployment
                  </CardTitle>
                  <CardDescription>
                    Configure how you want to deploy your content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Video Selection */}
                  <div className="space-y-2">
                    <Label>Video Asset</Label>
                    <Select
                      value={selectedVideoId?.toString() || "__none__"}
                      onValueChange={(v) => setSelectedVideoId(v && v !== "__none__" ? parseInt(v) : null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a video" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {assets?.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id.toString()}>
                            Video #{asset.id} - {asset.durationSeconds}s
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Script Selection */}
                  <div className="space-y-2">
                    <Label>Script (optional)</Label>
                    <Select
                      value={selectedScriptId?.toString() || "__none__"}
                      onValueChange={(v) => setSelectedScriptId(v && v !== "__none__" ? parseInt(v) : null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a script" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {scripts?.map((script) => (
                          <SelectItem key={script.id} value={script.id.toString()}>
                            {script.platform} - {script.fullScript?.substring(0, 30)}...
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Destination */}
                  <div className="space-y-2">
                    <Label>Destination</Label>
                    <Select value={destination} onValueChange={setDestination}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="download_only">
                          <div className="flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Download Only
                          </div>
                        </SelectItem>
                        <SelectItem value="draft">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Save as Draft
                          </div>
                        </SelectItem>
                        <SelectItem value="schedule">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            Schedule
                          </div>
                        </SelectItem>
                        <SelectItem value="publish_track">
                          <div className="flex items-center gap-2">
                            <Rocket className="w-4 h-4" />
                            Publish & Track
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Schedule Date */}
                  {destination === "schedule" && (
                    <div className="space-y-2">
                      <Label>Schedule Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !scheduledDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={scheduledDate}
                            onSelect={setScheduledDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  {/* Target Platforms */}
                  {(destination === "publish_track" || destination === "schedule") && (
                    <div className="space-y-2">
                      <Label>Target Platforms</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {platforms.map((platform) => (
                          <div
                            key={platform.id}
                            className="flex items-center space-x-2 p-2 border rounded-lg"
                          >
                            <Checkbox
                              id={platform.id}
                              checked={selectedPlatforms.includes(platform.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedPlatforms([...selectedPlatforms, platform.id]);
                                } else {
                                  setSelectedPlatforms(
                                    selectedPlatforms.filter((p) => p !== platform.id)
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor={platform.id}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                            >
                              <span>{platform.icon}</span>
                              {platform.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      placeholder="Add any notes about this deployment..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="resize-none"
                    />
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleDeploy}
                    disabled={deployCampaign.isPending || !sessionId}
                  >
                    {deployCampaign.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Deploying...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4 mr-2" />
                        Deploy Content
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Preview Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Deployment Preview</CardTitle>
                  <CardDescription>
                    Review your deployment configuration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Destination</span>
                        <Badge variant="outline">{getDestinationLabel(destination)}</Badge>
                      </div>
                      
                      {selectedVideoId && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Video</span>
                          <span className="text-sm">#{selectedVideoId}</span>
                        </div>
                      )}
                      
                      {selectedScriptId && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Script</span>
                          <span className="text-sm">#{selectedScriptId}</span>
                        </div>
                      )}
                      
                      {scheduledDate && destination === "schedule" && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Scheduled</span>
                          <span className="text-sm">{format(scheduledDate, "PPP")}</span>
                        </div>
                      )}
                      
                      {selectedPlatforms.length > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Platforms</span>
                          <div className="flex gap-1">
                            {selectedPlatforms.map((p) => (
                              <Badge key={p} variant="secondary" className="text-xs">
                                {platforms.find((pl) => pl.id === p)?.icon}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {!sessionId && (
                      <div className="text-center text-sm text-muted-foreground p-4 border border-dashed rounded-lg">
                        Select a workflow session to begin
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Deployment History</CardTitle>
                <CardDescription>
                  Track all your content deployments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deployments && deployments.length > 0 ? (
                  <div className="space-y-4">
                    {deployments.map((deployment) => (
                      <div
                        key={deployment.id}
                        className="p-4 border rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(deployment.status)}
                            <span className="font-medium">Deployment #{deployment.id}</span>
                            <Badge variant="outline">
                              {getDestinationLabel(deployment.destination)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {["queued", "processing"].includes(deployment.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelDeployment.mutate({ deploymentId: deployment.id })}
                              >
                                Cancel
                              </Button>
                            )}
                            {deployment.status === "published" && (
                              <Button size="sm" variant="outline">
                                <ExternalLink className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Session #{deployment.sessionId}</span>
                          {deployment.videoAssetId && (
                            <span className="flex items-center gap-1">
                              <Video className="w-3 h-3" />
                              Video #{deployment.videoAssetId}
                            </span>
                          )}
                          {deployment.scriptId && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              Script #{deployment.scriptId}
                            </span>
                          )}
                          <span>
                            {new Date(deployment.createdAt).toLocaleString()}
                          </span>
                        </div>

                        {deployment.notes && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {deployment.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
                    <Rocket className="w-8 h-8 mb-2 opacity-50" />
                    <p>No deployments yet</p>
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
