import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Palette, 
  Globe, 
  Building2, 
  Mail, 
  Image, 
  Link2, 
  Users, 
  Plus,
  Save,
  Eye,
  ExternalLink,
  Crown
} from "lucide-react";
import { getLoginUrl } from "@/const";

export default function WhiteLabel() {
  const { user, loading: authLoading } = useAuth();
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
  
  // Form state for white label settings
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#CCFF00");
  const [secondaryColor, setSecondaryColor] = useState("#7C3AED");
  const [accentColor, setAccentColor] = useState("#FF6B6B");
  const [customDomain, setCustomDomain] = useState("");
  const [hideMatangoBranding, setHideMatangoBranding] = useState(false);
  const [customFooterText, setCustomFooterText] = useState("");
  const [customSupportEmail, setCustomSupportEmail] = useState("");
  const [emailFromName, setEmailFromName] = useState("");
  const [emailReplyTo, setEmailReplyTo] = useState("");

  // Client form state
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientLogoUrl, setClientLogoUrl] = useState("");

  const { data: settings, isLoading, refetch } = trpc.whiteLabel.get.useQuery(
    undefined,
    { enabled: !!user }
  );

  const { data: clients, refetch: refetchClients } = trpc.whiteLabel.listClients.useQuery(
    { whiteLabelId: settings?.id || 0 },
    { enabled: !!settings?.id }
  );

  const createMutation = trpc.whiteLabel.create.useMutation({
    onSuccess: () => {
      toast.success("White label settings created!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create settings");
    },
  });

  const updateMutation = trpc.whiteLabel.update.useMutation({
    onSuccess: () => {
      toast.success("Settings saved!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  const createClientMutation = trpc.whiteLabel.createClient.useMutation({
    onSuccess: () => {
      toast.success("Client workspace created!");
      setIsCreateClientOpen(false);
      setClientName("");
      setClientEmail("");
      setClientLogoUrl("");
      refetchClients();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create client");
    },
  });

  // Load existing settings into form
  useEffect(() => {
    if (settings) {
      setBrandName(settings.brandName || "");
      setLogoUrl(settings.logoUrl || "");
      setFaviconUrl(settings.faviconUrl || "");
      setPrimaryColor(settings.primaryColor || "#CCFF00");
      setSecondaryColor(settings.secondaryColor || "#7C3AED");
      setAccentColor(settings.accentColor || "#FF6B6B");
      setCustomDomain(settings.customDomain || "");
      setHideMatangoBranding(settings.hideMatangoBranding || false);
      setCustomFooterText(settings.customFooterText || "");
      setCustomSupportEmail(settings.customSupportEmail || "");
      setEmailFromName(settings.emailFromName || "");
      setEmailReplyTo(settings.emailReplyTo || "");
    }
  }, [settings]);

  const handleSave = () => {
    if (!brandName.trim()) {
      toast.error("Please enter a brand name");
      return;
    }

    const data = {
      brandName,
      logoUrl: logoUrl || undefined,
      faviconUrl: faviconUrl || undefined,
      primaryColor,
      secondaryColor,
      accentColor,
      customDomain: customDomain || undefined,
      hideMatangoBranding,
      customFooterText: customFooterText || undefined,
      customSupportEmail: customSupportEmail || undefined,
      emailFromName: emailFromName || undefined,
      emailReplyTo: emailReplyTo || undefined,
    };

    if (settings?.id) {
      updateMutation.mutate({ id: settings.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    window.location.href = getLoginUrl();
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Crown className="w-8 h-8 text-primary" />
              White Label
            </h1>
            <p className="text-muted-foreground">
              Customize the platform with your own branding for client-facing dashboards
            </p>
          </div>
          
          <Badge variant="secondary" className="text-sm">
            Agency Tier Feature
          </Badge>
        </div>

        <Tabs defaultValue="branding" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="domain">Domain</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
          </TabsList>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Brand Identity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Brand Identity
                  </CardTitle>
                  <CardDescription>
                    Set your agency's name and logo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="brandName">Brand Name</Label>
                    <Input
                      id="brandName"
                      placeholder="Your Agency Name"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">Logo URL</Label>
                    <Input
                      id="logoUrl"
                      placeholder="https://example.com/logo.png"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                    />
                    {logoUrl && (
                      <div className="mt-2 p-4 bg-muted rounded-lg flex items-center justify-center">
                        <img src={logoUrl} alt="Logo preview" className="max-h-16 max-w-full" />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="faviconUrl">Favicon URL</Label>
                    <Input
                      id="faviconUrl"
                      placeholder="https://example.com/favicon.ico"
                      value={faviconUrl}
                      onChange={(e) => setFaviconUrl(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Color Scheme */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Color Scheme
                  </CardTitle>
                  <CardDescription>
                    Customize your brand colors
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Primary</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer border-0"
                        />
                        <Input
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Secondary</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer border-0"
                        />
                        <Input
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Accent</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer border-0"
                        />
                        <Input
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Color Preview */}
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-3">Preview</p>
                    <div className="flex gap-2">
                      <Button style={{ backgroundColor: primaryColor, color: '#000' }}>
                        Primary Button
                      </Button>
                      <Button style={{ backgroundColor: secondaryColor, color: '#fff' }}>
                        Secondary
                      </Button>
                      <Button variant="outline" style={{ borderColor: accentColor, color: accentColor }}>
                        Accent
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Email Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email Settings
                  </CardTitle>
                  <CardDescription>
                    Customize email sender information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailFromName">From Name</Label>
                    <Input
                      id="emailFromName"
                      placeholder="Your Agency"
                      value={emailFromName}
                      onChange={(e) => setEmailFromName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="emailReplyTo">Reply-To Email</Label>
                    <Input
                      id="emailReplyTo"
                      type="email"
                      placeholder="support@youragency.com"
                      value={emailReplyTo}
                      onChange={(e) => setEmailReplyTo(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customSupportEmail">Support Email</Label>
                    <Input
                      id="customSupportEmail"
                      type="email"
                      placeholder="help@youragency.com"
                      value={customSupportEmail}
                      onChange={(e) => setCustomSupportEmail(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Footer & Branding */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="w-5 h-5" />
                    Footer & Branding
                  </CardTitle>
                  <CardDescription>
                    Customize footer text and branding visibility
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customFooterText">Custom Footer Text</Label>
                    <Textarea
                      id="customFooterText"
                      placeholder="© 2025 Your Agency. All rights reserved."
                      value={customFooterText}
                      onChange={(e) => setCustomFooterText(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <Label className="text-base">Hide Matango Branding</Label>
                      <p className="text-sm text-muted-foreground">
                        Remove "Powered by Matango.ai" from the footer
                      </p>
                    </div>
                    <Switch
                      checked={hideMatangoBranding}
                      onCheckedChange={setHideMatangoBranding}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </TabsContent>

          {/* Domain Tab */}
          <TabsContent value="domain" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Custom Domain
                </CardTitle>
                <CardDescription>
                  Use your own domain for the white-labeled platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="customDomain">Custom Domain</Label>
                  <Input
                    id="customDomain"
                    placeholder="app.youragency.com"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter your custom domain without https://
                  </p>
                </div>

                {customDomain && (
                  <div className="p-4 bg-muted rounded-lg space-y-4">
                    <h4 className="font-medium">DNS Configuration</h4>
                    <p className="text-sm text-muted-foreground">
                      Add the following DNS records to your domain:
                    </p>
                    <div className="bg-background p-3 rounded font-mono text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span>CNAME</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span>{customDomain.split('.')[0]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Value:</span>
                        <span>cname.matango.ai</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Link2 className="w-4 h-4 mr-2" />
                      Verify Domain
                    </Button>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button 
                    onClick={handleSave}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Domain Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Client Workspaces</h2>
                <p className="text-muted-foreground">
                  Manage separate workspaces for each of your clients
                </p>
              </div>
              
              <Dialog open={isCreateClientOpen} onOpenChange={setIsCreateClientOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!settings?.id}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Client
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Client Workspace</DialogTitle>
                    <DialogDescription>
                      Create a new workspace for your client
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientName">Client Name</Label>
                      <Input
                        id="clientName"
                        placeholder="Acme Corporation"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="clientEmail">Client Email</Label>
                      <Input
                        id="clientEmail"
                        type="email"
                        placeholder="contact@acme.com"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="clientLogoUrl">Client Logo URL (Optional)</Label>
                      <Input
                        id="clientLogoUrl"
                        placeholder="https://example.com/client-logo.png"
                        value={clientLogoUrl}
                        onChange={(e) => setClientLogoUrl(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateClientOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => {
                        if (!clientName.trim()) {
                          toast.error("Please enter a client name");
                          return;
                        }
                        createClientMutation.mutate({
                          whiteLabelId: settings!.id,
                          clientName,
                          clientEmail: clientEmail || undefined,
                          clientLogoUrl: clientLogoUrl || undefined,
                        });
                      }}
                      disabled={createClientMutation.isPending}
                    >
                      {createClientMutation.isPending ? "Creating..." : "Create Workspace"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {!settings?.id ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <Crown className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">Set Up White Label First</h3>
                  <p className="text-muted-foreground mb-4">
                    Configure your branding settings before adding client workspaces
                  </p>
                </CardContent>
              </Card>
            ) : clients?.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">No Client Workspaces</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first client workspace to get started
                  </p>
                  <Button onClick={() => setIsCreateClientOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Client
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients?.map((client: any) => (
                  <Card key={client.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        {client.clientLogoUrl ? (
                          <img 
                            src={client.clientLogoUrl} 
                            alt={client.clientName}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{client.clientName}</h3>
                          {client.clientEmail && (
                            <p className="text-sm text-muted-foreground truncate">
                              {client.clientEmail}
                            </p>
                          )}
                        </div>
                        <Badge variant={client.isActive ? "default" : "secondary"}>
                          {client.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
