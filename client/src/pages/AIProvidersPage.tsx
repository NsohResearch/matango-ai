import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Key, 
  Plus, 
  Check, 
  X, 
  RefreshCw, 
  Trash2, 
  ExternalLink,
  Star,
  Zap,
  Shield,
  TrendingUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react";

export default function AIProvidersPage() {
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const { data: providers, isLoading: loadingProviders } = trpc.aiProviders.listProviders.useQuery();
  const { data: credentials, isLoading: loadingCredentials, refetch: refetchCredentials } = trpc.aiProviders.listCredentials.useQuery();
  const { data: usageStats } = trpc.aiProviders.getUsageStats.useQuery({ days: 30 });
  
  const addCredential = trpc.aiProviders.addCredential.useMutation({
    onSuccess: () => {
      toast.success("API key added successfully");
      setIsAddDialogOpen(false);
      setApiKey("");
      setSelectedProvider(null);
      refetchCredentials();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const validateCredential = trpc.aiProviders.validateCredential.useMutation({
    onSuccess: (result) => {
      if (result.isValid) {
        toast.success("API key validated successfully");
      } else {
        toast.error(`Validation failed: ${result.error}`);
      }
      refetchCredentials();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const deleteCredential = trpc.aiProviders.deleteCredential.useMutation({
    onSuccess: () => {
      toast.success("API key removed");
      refetchCredentials();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const updateCredential = trpc.aiProviders.updateCredential.useMutation({
    onSuccess: () => {
      toast.success("Settings updated");
      refetchCredentials();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const externalProviders = providers?.filter(p => !p.isBuiltIn) || [];
  const builtInProvider = providers?.find(p => p.isBuiltIn);
  
  const getProviderCredential = (providerId: number) => {
    return credentials?.find(c => c.providerId === providerId);
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Providers</h1>
          <p className="text-muted-foreground mt-2">
            Connect your own AI service API keys to unlock premium video generation capabilities.
          </p>
        </div>
        
        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connected Providers</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{credentials?.filter(c => c.isValid).length || 0}</div>
              <p className="text-xs text-muted-foreground">of {externalProviders.length} available</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageStats?.totalRequests || 0}</div>
              <p className="text-xs text-muted-foreground">last 30 days</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${((usageStats?.byProvider?.reduce((sum, p) => sum + p.totalCostCents, 0) || 0) / 100).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">across all providers</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {usageStats?.totalRequests 
                  ? Math.round((usageStats.byProvider?.reduce((sum, p) => sum + p.successfulRequests, 0) || 0) / usageStats.totalRequests * 100)
                  : 100}%
              </div>
              <p className="text-xs text-muted-foreground">generation success</p>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="providers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="credentials">My API Keys</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
          </TabsList>
          
          {/* Providers Tab */}
          <TabsContent value="providers" className="space-y-4">
            {/* Built-in Provider */}
            {builtInProvider && (
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {builtInProvider.name}
                          <Badge variant="default" className="bg-primary">Included</Badge>
                        </CardTitle>
                        <CardDescription>{builtInProvider.description}</CardDescription>
                      </div>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(builtInProvider.capabilities as Record<string, boolean>)?.textToVideo && (
                      <Badge variant="outline">Text to Video</Badge>
                    )}
                    {(builtInProvider.capabilities as Record<string, boolean>)?.imageToVideo && (
                      <Badge variant="outline">Image to Video</Badge>
                    )}
                    {(builtInProvider.capabilities as Record<string, boolean>)?.textToImage && (
                      <Badge variant="outline">Text to Image</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* External Providers */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {loadingProviders ? (
                <div className="col-span-full flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                externalProviders.map((provider) => {
                  const credential = getProviderCredential(provider.id);
                  const isConnected = credential?.isValid;
                  
                  return (
                    <Card key={provider.id} className={isConnected ? "border-green-500/50" : ""}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <Key className="w-5 h-5" />
                            </div>
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                {provider.name}
                                {provider.isPremium && (
                                  <Star className="w-4 h-4 text-yellow-500" />
                                )}
                              </CardTitle>
                            </div>
                          </div>
                          {isConnected ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : credential ? (
                            <AlertCircle className="w-5 h-5 text-yellow-500" />
                          ) : null}
                        </div>
                        <CardDescription className="mt-2">{provider.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-1">
                          {(provider.capabilities as Record<string, boolean>)?.textToVideo && (
                            <Badge variant="secondary" className="text-xs">Text→Video</Badge>
                          )}
                          {(provider.capabilities as Record<string, boolean>)?.imageToVideo && (
                            <Badge variant="secondary" className="text-xs">Image→Video</Badge>
                          )}
                          {(provider.capabilities as Record<string, boolean>)?.lipSync && (
                            <Badge variant="secondary" className="text-xs">Lip Sync</Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          ~${(provider.estimatedCostPerUnit / 100).toFixed(2)} per {provider.costUnit}
                        </div>
                        
                        <div className="flex gap-2">
                          {isConnected ? (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => validateCredential.mutate({ id: credential!.id })}
                                disabled={validateCredential.isPending}
                              >
                                {validateCredential.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4" />
                                )}
                                <span className="ml-1">Revalidate</span>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => deleteCredential.mutate({ id: credential!.id })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          ) : credential ? (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => validateCredential.mutate({ id: credential.id })}
                                disabled={validateCredential.isPending}
                              >
                                {validateCredential.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4" />
                                )}
                                <span className="ml-1">Retry</span>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => deleteCredential.mutate({ id: credential.id })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <Dialog open={isAddDialogOpen && selectedProvider === provider.id} onOpenChange={(open) => {
                              setIsAddDialogOpen(open);
                              if (!open) setSelectedProvider(null);
                            }}>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedProvider(provider.id);
                                    setIsAddDialogOpen(true);
                                  }}
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Connect
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Connect {provider.name}</DialogTitle>
                                  <DialogDescription>
                                    Enter your API key to enable {provider.name} for video generation.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="apiKey">API Key</Label>
                                    <Input
                                      id="apiKey"
                                      type="password"
                                      placeholder="sk-..."
                                      value={apiKey}
                                      onChange={(e) => setApiKey(e.target.value)}
                                    />
                                  </div>
                                  {provider.docsUrl && (
                                    <Alert>
                                      <AlertDescription className="flex items-center gap-2">
                                        <span>Get your API key from</span>
                                        <a 
                                          href={provider.docsUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline inline-flex items-center gap-1"
                                        >
                                          {provider.name} Dashboard
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                </div>
                                <DialogFooter>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      setIsAddDialogOpen(false);
                                      setApiKey("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    onClick={() => {
                                      addCredential.mutate({
                                        providerId: provider.id,
                                        apiKey,
                                        setPrimary: false,
                                      });
                                    }}
                                    disabled={!apiKey || addCredential.isPending}
                                  >
                                    {addCredential.isPending ? (
                                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : null}
                                    Connect
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                          
                          {provider.websiteUrl && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={provider.websiteUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
          
          {/* Credentials Tab */}
          <TabsContent value="credentials" className="space-y-4">
            {loadingCredentials ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : credentials?.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Key className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No API Keys Connected</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Connect your AI provider API keys to unlock premium video generation.
                  </p>
                  <Button onClick={() => {
                    const firstProvider = externalProviders[0];
                    if (firstProvider) {
                      setSelectedProvider(firstProvider.id);
                      setIsAddDialogOpen(true);
                    }
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First API Key
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {credentials?.map((cred) => (
                  <Card key={cred.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          cred.isValid ? "bg-green-500/20" : "bg-yellow-500/20"
                        }`}>
                          {cred.isValid ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-yellow-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {cred.providerName}
                            {cred.isPrimary && (
                              <Badge variant="secondary">Primary</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Key: {cred.keyHint} • {cred.totalRequests} requests
                          </div>
                          {cred.validationError && (
                            <div className="text-sm text-red-500 mt-1">
                              {cred.validationError}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {cred.lastValidatedAt && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Validated {new Date(cred.lastValidatedAt).toLocaleDateString()}
                          </div>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => validateCredential.mutate({ id: cred.id })}
                          disabled={validateCredential.isPending}
                        >
                          <RefreshCw className={`w-4 h-4 ${validateCredential.isPending ? "animate-spin" : ""}`} />
                        </Button>
                        {!cred.isPrimary && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateCredential.mutate({ id: cred.id, setPrimary: true })}
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteCredential.mutate({ id: cred.id })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-4">
            {usageStats?.byProvider && usageStats.byProvider.length > 0 ? (
              <div className="space-y-4">
                {usageStats.byProvider.map((provider, idx) => (
                  <Card key={idx}>
                    <CardHeader>
                      <CardTitle>{provider.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <div className="text-2xl font-bold">{provider.totalRequests}</div>
                          <div className="text-sm text-muted-foreground">Total Requests</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-500">{provider.successfulRequests}</div>
                          <div className="text-sm text-muted-foreground">Successful</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-500">{provider.failedRequests}</div>
                          <div className="text-sm text-muted-foreground">Failed</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">${(provider.totalCostCents / 100).toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">Estimated Cost</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Usage Data Yet</h3>
                  <p className="text-muted-foreground text-center">
                    Start generating videos with your connected providers to see usage statistics.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
