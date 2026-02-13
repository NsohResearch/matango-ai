import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Instagram, 
  Facebook, 
  Youtube, 
  Linkedin, 
  Music2, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  RefreshCw,
  Unplug,
  Plus
} from "lucide-react";
import { getLoginUrl } from "@/const";

const PLATFORMS = [
  { 
    id: "instagram" as const, 
    name: "Instagram", 
    icon: Instagram, 
    color: "from-purple-500 to-pink-500",
    description: "Share photos, stories, and reels"
  },
  { 
    id: "facebook" as const, 
    name: "Facebook", 
    icon: Facebook, 
    color: "from-blue-600 to-blue-500",
    description: "Post to pages and groups"
  },
  { 
    id: "youtube" as const, 
    name: "YouTube", 
    icon: Youtube, 
    color: "from-red-600 to-red-500",
    description: "Upload videos and shorts"
  },
  { 
    id: "tiktok" as const, 
    name: "TikTok", 
    icon: Music2, 
    color: "from-black to-gray-800",
    description: "Share short-form videos"
  },
  { 
    id: "linkedin" as const, 
    name: "LinkedIn", 
    icon: Linkedin, 
    color: "from-blue-700 to-blue-600",
    description: "Professional content and articles"
  },
];

export default function SocialConnections() {
  const { user, loading: authLoading } = useAuth();
  
  const { data: connections, isLoading, refetch } = trpc.socialConnections.list.useQuery(
    undefined,
    { enabled: !!user }
  );
  
  const disconnectMutation = trpc.socialConnections.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Account disconnected");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to disconnect");
    },
  });

  const { data: platformStatus } = trpc.socialConnections.getPlatformStatus.useQuery(
    undefined,
    { enabled: !!user }
  );

  const getOAuthUrl = trpc.socialConnections.getOAuthUrl.useQuery;

  // Handle OAuth callback from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const platform = urlParams.get('platform');
    
    if (code && platform) {
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
      
      // Handle the callback
      handleOAuthCallback(platform, code, state || undefined);
    }
  }, []);

  const handleCallbackMutation = trpc.socialConnections.handleCallback.useMutation({
    onSuccess: (result) => {
      if (result.created) {
        toast.success("Account connected successfully!");
      } else if (result.updated) {
        toast.success("Account reconnected successfully!");
      }
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to connect account");
    },
  });

  const handleOAuthCallback = (platform: string, code: string, state?: string) => {
    handleCallbackMutation.mutate({
      platform: platform as any,
      code,
      state,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-48 bg-muted rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    window.location.href = getLoginUrl();
    return null;
  }

  const getConnectionForPlatform = (platformId: string) => {
    return connections?.find((c: any) => c.platform === platformId);
  };

  const handleConnect = async (platformId: string) => {
    // Check if platform is configured
    const status = platformStatus?.find((p: any) => p.platform === platformId);
    if (!status?.configured) {
      toast.error(`${platformId} OAuth is not configured. Add API credentials in Settings → Secrets.`);
      return;
    }
    
    // Get OAuth URL and redirect
    try {
      const response = await fetch(`/api/trpc/socialConnections.getOAuthUrl?input=${encodeURIComponent(JSON.stringify({ platform: platformId }))}`);
      const data = await response.json();
      const url = data?.result?.data?.url;
      
      if (url) {
        window.location.href = url;
      } else {
        toast.error("Failed to get OAuth URL");
      }
    } catch (error) {
      toast.error("Failed to initiate OAuth flow");
    }
  };

  const handleDisconnect = (connectionId: number) => {
    disconnectMutation.mutate({ id: connectionId });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Social Connections</h1>
          <p className="text-muted-foreground">
            Connect your social media accounts to publish content directly from Matango.ai
          </p>
        </div>

        {/* Connection Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {PLATFORMS.map((platform) => {
            const connection = getConnectionForPlatform(platform.id);
            const Icon = platform.icon;
            
            return (
              <Card key={platform.id} className={`${connection ? 'border-primary/50' : 'border-border'}`}>
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${platform.color} flex items-center justify-center mb-2`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium">{platform.name}</span>
                  {connection ? (
                    <Badge variant="default" className="mt-1 text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      <XCircle className="w-3 h-3 mr-1" />
                      Not Connected
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Platform Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PLATFORMS.map((platform) => {
            const connection = getConnectionForPlatform(platform.id);
            const Icon = platform.icon;
            
            return (
              <Card key={platform.id} className="overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${platform.color}`} />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${platform.color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{platform.name}</CardTitle>
                        <CardDescription>{platform.description}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {connection ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        {connection.profilePictureUrl ? (
                          <img 
                            src={connection.profilePictureUrl} 
                            alt="Profile" 
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            @{connection.platformUsername || "Connected Account"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Connected {new Date(connection.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => toast.info("Syncing account data...")}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Sync
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-destructive hover:text-destructive"
                          onClick={() => handleDisconnect(connection.id)}
                          disabled={disconnectMutation.isPending}
                        >
                          <Unplug className="w-4 h-4 mr-2" />
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Connect your {platform.name} account to start publishing content directly.
                      </p>
                      <Button 
                        className="w-full"
                        onClick={() => handleConnect(platform.id)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Connect {platform.name}
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Section */}
        <Card className="mt-8 bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">About Social Media Integrations</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connecting your social media accounts allows Matango.ai to publish content on your behalf. 
              We use official APIs and OAuth authentication to ensure your accounts remain secure.
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Secure OAuth</p>
                  <p className="text-muted-foreground">We never store your passwords</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Revoke Anytime</p>
                  <p className="text-muted-foreground">Disconnect with one click</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Limited Permissions</p>
                  <p className="text-muted-foreground">Only posting access requested</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
