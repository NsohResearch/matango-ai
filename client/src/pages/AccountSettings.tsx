/**
 * Account Settings Page
 * 
 * Provides comprehensive account management including:
 * - Profile information
 * - Subscription management (cancel, pause, resume)
 * - Usage counters with visual progress bars
 * - Account lifecycle controls (pause, deactivate, delete)
 * - Security settings
 */
import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { AccountDeletionWizard } from "@/components/AccountDeletionWizard";
import { toast } from "sonner";
import { 
  User, 
  CreditCard, 
  Shield, 
  Trash2, 
  PauseCircle, 
  Power, 
  ArrowDownCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Calendar,
  Mail,
  Crown,
  Image,
  Video,
  Users,
  Zap,
  HardDrive,
  BarChart3,
  XCircle,
  PlayCircle,
  Settings,
  Activity,
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";

export default function AccountSettings() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [showDeletionWizard, setShowDeletionWizard] = useState(false);
  const [pauseDuration, setPauseDuration] = useState<string>("30d");
  
  // Fetch account lifecycle status
  const { data: lifecycleStatus, isLoading: statusLoading, refetch: refetchStatus } = 
    trpc.accountLifecycle.getStatus.useQuery(undefined, {
      enabled: isAuthenticated,
    });
  
  // Fetch subscription details from Stripe
  const { data: subscriptionDetails, isLoading: subLoading, refetch: refetchSub } =
    trpc.accountLifecycle.getSubscriptionDetails.useQuery(undefined, {
      enabled: isAuthenticated,
    });

  // Fetch usage and limits
  const { data: usageData, isLoading: usageLoading, refetch: refetchUsage } =
    trpc.accountLifecycle.getMyUsageAndLimits.useQuery(undefined, {
      enabled: isAuthenticated,
    });
  
  // Fetch lifecycle history
  const { data: lifecycleHistory, isLoading: historyLoading } = 
    trpc.accountLifecycle.getHistory.useQuery(undefined, {
      enabled: isAuthenticated,
    });
  
  // Mutations
  const reactivateMutation = trpc.accountLifecycle.reactivate.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchStatus();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const restoreMutation = trpc.accountLifecycle.restore.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchStatus();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const resumeBillingMutation = trpc.accountLifecycle.resumeBilling.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchStatus();
      refetchSub();
    },
    onError: (error) => toast.error(error.message),
  });

  const pauseBillingMutation = trpc.accountLifecycle.pauseBilling.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchStatus();
      refetchSub();
    },
    onError: (error) => toast.error(error.message),
  });

  const downgradeMutation = trpc.accountLifecycle.downgrade.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchStatus();
      refetchSub();
      refetchUsage();
    },
    onError: (error) => toast.error(error.message),
  });

  const deactivateMutation = trpc.accountLifecycle.deactivate.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchStatus();
    },
    onError: (error) => toast.error(error.message),
  });
  
  // Computed usage items
  const usageItems = useMemo(() => {
    if (!usageData) return [];
    const limits = usageData.tenantLimits || usageData.planLimits;
    return [
      {
        label: "Images Generated",
        icon: Image,
        used: usageData.usage?.imagesGenerated || 0,
        limit: limits?.imagesPerMonth || limits?.maxImagesPerMonth || 0,
        color: "text-pink-500",
        bgColor: "bg-pink-500",
      },
      {
        label: "Videos Generated",
        icon: Video,
        used: usageData.usage?.videosGenerated || 0,
        limit: limits?.videosPerMonth || limits?.maxVideosPerMonth || 0,
        color: "text-purple-500",
        bgColor: "bg-purple-500",
      },
      {
        label: "AI Influencers",
        icon: Users,
        used: usageData.stats?.influencerCount || 0,
        limit: limits?.influencersLimit || limits?.maxInfluencers || 0,
        color: "text-blue-500",
        bgColor: "bg-blue-500",
      },
      {
        label: "Credits Remaining",
        icon: Zap,
        used: usageData.credits || 0,
        limit: null, // Credits don't have a monthly limit
        color: "text-yellow-500",
        bgColor: "bg-yellow-500",
        isCredits: true,
      },
    ];
  }, [usageData]);
  
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated || !user) {
    window.location.href = getLoginUrl();
    return null;
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>;
      case "DEACTIVATED":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Deactivated</Badge>;
      case "SUSPENDED":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Suspended</Badge>;
      case "SOFT_DELETED_90D":
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">Pending Deletion</Badge>;
      case "RETENTION_12M":
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Retention Period</Badge>;
      case "HARD_DELETED":
        return <Badge variant="destructive">Deleted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getPlanBadge = (plan: string) => {
    const planColors: Record<string, string> = {
      free: "bg-gray-500/10 text-gray-500 border-gray-500/20",
      starter: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      basic: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      pro: "bg-primary/10 text-primary border-primary/20",
      agency: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      agency_plus: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      lifetime: "bg-gradient-to-r from-amber-500/10 to-primary/10 text-amber-500 border-amber-500/20",
    };
    
    return (
      <Badge className={planColors[plan] || "bg-gray-500/10 text-gray-500"}>
        <Crown className="w-3 h-3 mr-1" />
        {plan.charAt(0).toUpperCase() + plan.slice(1).replace("_", " ")}
      </Badge>
    );
  };
  
  const formatDate = (date: Date | string | number | null | undefined) => {
    if (!date) return "N/A";
    const d = typeof date === "number" ? new Date(date * 1000) : new Date(date);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  
  const formatAction = (action: string) => {
    return action
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  };

  const getUsageColor = (pct: number) => {
    if (pct >= 90) return "text-red-500";
    if (pct >= 75) return "text-yellow-500";
    return "text-emerald-500";
  };

  const sub = subscriptionDetails?.stripeSubscription;
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
            <p className="text-muted-foreground">
              Manage your account, subscription, usage, and security settings.
            </p>
          </div>
          
          {/* Account Status Alert */}
          {lifecycleStatus && lifecycleStatus.accountStatus !== "ACTIVE" && (
            <Alert 
              variant={lifecycleStatus.accountStatus === "SOFT_DELETED_90D" ? "destructive" : "default"}
              className="mb-6"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Account Status: {lifecycleStatus.accountStatus.replace(/_/g, " ")}</AlertTitle>
              <AlertDescription>
                {lifecycleStatus.accountStatus === "DEACTIVATED" && (
                  <>
                    Your account is deactivated. Click below to reactivate.
                    <Button 
                      size="sm" 
                      className="ml-4"
                      onClick={() => reactivateMutation.mutate()}
                      disabled={reactivateMutation.isPending}
                    >
                      {reactivateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Reactivate Account
                    </Button>
                  </>
                )}
                {lifecycleStatus.accountStatus === "SOFT_DELETED_90D" && (
                  <>
                    Your account is scheduled for deletion. You have until {formatDate(lifecycleStatus.recoveryDeadline)} to restore it.
                    <Button 
                      size="sm" 
                      className="ml-4"
                      onClick={() => restoreMutation.mutate()}
                      disabled={restoreMutation.isPending}
                    >
                      {restoreMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Restore Account
                    </Button>
                  </>
                )}
                {lifecycleStatus.accountStatus === "RETENTION_12M" && (
                  <>
                    Your account is in retention period. Contact support to restore it before {formatDate(lifecycleStatus.retentionUntil)}.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Billing Pause Alert */}
          {lifecycleStatus?.activeBillingPause && (
            <Alert className="mb-6 border-blue-500/30 bg-blue-500/5">
              <PauseCircle className="h-4 w-4 text-blue-500" />
              <AlertTitle className="text-blue-500">Billing Paused</AlertTitle>
              <AlertDescription className="text-blue-500/80">
                Your billing is paused until {formatDate(lifecycleStatus.activeBillingPause.pauseEndDate)}.
                <Button 
                  size="sm" 
                  variant="outline"
                  className="ml-4"
                  onClick={() => resumeBillingMutation.mutate()}
                  disabled={resumeBillingMutation.isPending}
                >
                  {resumeBillingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Resume Billing
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Tabs */}
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="subscription" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Subscription</span>
              </TabsTrigger>
              <TabsTrigger value="usage" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Usage</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Your account details</CardDescription>
                      </div>
                    </div>
                    {lifecycleStatus && getStatusBadge(lifecycleStatus.accountStatus)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{user.name || "Not set"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {user.email || "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Role</p>
                      <p className="font-medium capitalize">{user.role}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Member Since</p>
                      <p className="font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(user.createdAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Activity */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Account Activity</CardTitle>
                      <CardDescription>Recent account lifecycle events</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : lifecycleHistory && lifecycleHistory.length > 0 ? (
                    <div className="space-y-3">
                      {lifecycleHistory.slice(0, 10).map((event) => (
                        <div key={event.id} className="flex items-center gap-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <div className="flex-1">
                            <span className="font-medium">{formatAction(event.action)}</span>
                            {event.fromStatus && event.toStatus && (
                              <span className="text-muted-foreground">
                                {" "}({event.fromStatus} → {event.toStatus})
                              </span>
                            )}
                          </div>
                          <span className="text-muted-foreground">
                            {formatDate(event.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No account activity recorded yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subscription Tab */}
            <TabsContent value="subscription" className="space-y-6">
              {/* Current Plan */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Current Plan</CardTitle>
                        <CardDescription>Your subscription and billing details</CardDescription>
                      </div>
                    </div>
                    {lifecycleStatus && getPlanBadge(lifecycleStatus.plan)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Plan</p>
                      <p className="font-medium capitalize">{subscriptionDetails?.plan || user.plan}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Credits</p>
                      <p className="font-medium flex items-center gap-1">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        {(subscriptionDetails?.credits || user.credits || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Billing Cycle</p>
                      <p className="font-medium capitalize">{subscriptionDetails?.billingCycle || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-medium flex items-center gap-2">
                        {sub?.status === "active" ? (
                          <><CheckCircle2 className="h-4 w-4 text-green-500" /> Active</>
                        ) : sub?.status === "paused" ? (
                          <><PauseCircle className="h-4 w-4 text-blue-500" /> Paused</>
                        ) : sub?.status === "canceled" || sub?.cancelAtPeriodEnd ? (
                          <><XCircle className="h-4 w-4 text-red-500" /> Canceling</>
                        ) : lifecycleStatus?.hasActiveSubscription ? (
                          <><CheckCircle2 className="h-4 w-4 text-green-500" /> Active</>
                        ) : (
                          <><Clock className="h-4 w-4 text-muted-foreground" /> No subscription</>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Stripe Subscription Details */}
                  {sub && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Current Period</p>
                          <p className="text-sm font-medium">
                            {formatDate(sub.currentPeriodStart)} — {formatDate(sub.currentPeriodEnd)}
                          </p>
                        </div>
                        {sub.trialEnd && (
                          <div>
                            <p className="text-sm text-muted-foreground">Trial Ends</p>
                            <p className="text-sm font-medium">{formatDate(sub.trialEnd)}</p>
                          </div>
                        )}
                        {sub.cancelAtPeriodEnd && (
                          <div>
                            <p className="text-sm text-muted-foreground">Cancels At</p>
                            <p className="text-sm font-medium text-red-500">
                              End of current period ({formatDate(sub.currentPeriodEnd)})
                            </p>
                          </div>
                        )}
                        {sub.pauseCollection && (
                          <div>
                            <p className="text-sm text-muted-foreground">Paused Until</p>
                            <p className="text-sm font-medium text-blue-500">
                              {sub.pauseCollection.resumes_at ? formatDate(sub.pauseCollection.resumes_at) : "Indefinitely"}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
                <CardFooter className="flex gap-3 flex-wrap">
                  <Button variant="outline" asChild>
                    <a href="/pricing">
                      <Crown className="mr-2 h-4 w-4" />
                      Upgrade Plan
                    </a>
                  </Button>
                </CardFooter>
              </Card>

              {/* Subscription Actions */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Settings className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Subscription Management</CardTitle>
                      <CardDescription>Pause, resume, or downgrade your subscription</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Pause Billing */}
                  {!lifecycleStatus?.activeBillingPause && lifecycleStatus?.accountStatus === "ACTIVE" && (
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          <PauseCircle className="h-4 w-4 text-blue-500" />
                          Pause Billing
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Temporarily pause your subscription. Your data is preserved.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={pauseDuration} onValueChange={setPauseDuration}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30d">30 days</SelectItem>
                            <SelectItem value="60d">60 days</SelectItem>
                            <SelectItem value="90d">90 days</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (confirm(`Pause billing for ${pauseDuration}? You can resume anytime.`)) {
                              pauseBillingMutation.mutate({ duration: pauseDuration as any });
                            }
                          }}
                          disabled={pauseBillingMutation.isPending}
                        >
                          {pauseBillingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Pause
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Resume Billing */}
                  {lifecycleStatus?.activeBillingPause && (
                    <div className="flex items-center justify-between p-4 rounded-lg border border-blue-500/30 bg-blue-500/5">
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          <PlayCircle className="h-4 w-4 text-blue-500" />
                          Resume Billing
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Paused until {formatDate(lifecycleStatus.activeBillingPause.pauseEndDate)}
                        </p>
                      </div>
                      <Button
                        onClick={() => resumeBillingMutation.mutate()}
                        disabled={resumeBillingMutation.isPending}
                      >
                        {resumeBillingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Resume Now
                      </Button>
                    </div>
                  )}

                  {/* Downgrade */}
                  {(subscriptionDetails?.plan || user.plan) !== "free" && (
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          <ArrowDownCircle className="h-4 w-4 text-amber-500" />
                          Downgrade to Free
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Switch to the free plan. You'll lose access to premium features.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (confirm("Downgrade to the free plan? Premium features will be disabled at the end of your billing period.")) {
                            downgradeMutation.mutate({ reason: "User-initiated downgrade" });
                          }
                        }}
                        disabled={downgradeMutation.isPending}
                      >
                        {downgradeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Downgrade
                      </Button>
                    </div>
                  )}

                  {/* Deactivate */}
                  <div className="flex items-center justify-between p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        <Power className="h-4 w-4 text-amber-500" />
                        Deactivate Account
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Temporarily deactivate your account. You can reactivate anytime.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                      onClick={() => {
                        if (confirm("Deactivate your account? You can reactivate anytime by logging in.")) {
                          deactivateMutation.mutate({ reason: "User-initiated deactivation" });
                        }
                      }}
                      disabled={deactivateMutation.isPending || lifecycleStatus?.accountStatus !== "ACTIVE"}
                    >
                      {deactivateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Deactivate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Usage Tab */}
            <TabsContent value="usage" className="space-y-6">
              {/* Usage Counters */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <BarChart3 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Usage This Month</CardTitle>
                        <CardDescription>
                          Your current resource consumption against plan limits
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refetchUsage()}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {usageLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {usageItems.map((item) => {
                        const pct = item.isCredits ? 100 : getUsagePercentage(item.used, item.limit || 0);
                        return (
                          <div key={item.label}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <item.icon className={`h-4 w-4 ${item.color}`} />
                                <span className="text-sm font-medium">{item.label}</span>
                              </div>
                              <span className={`text-sm font-mono ${item.isCredits ? item.color : getUsageColor(pct)}`}>
                                {item.isCredits
                                  ? item.used.toLocaleString()
                                  : `${item.used.toLocaleString()} / ${item.limit === 0 ? "∞" : (item.limit || 0).toLocaleString()}`}
                              </span>
                            </div>
                            {!item.isCredits && (
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all rounded-full ${
                                    pct >= 90 ? "bg-red-500" : pct >= 75 ? "bg-yellow-500" : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            )}
                            {!item.isCredits && pct >= 90 && (
                              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Approaching limit — consider upgrading your plan
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Plan Limits Summary */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Plan Limits</CardTitle>
                      <CardDescription>
                        Your current plan entitlements ({(usageData?.plan || user.plan || "free").replace("_", " ")})
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {usageLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: "Influencers", value: usageData?.tenantLimits?.influencersLimit || usageData?.planLimits?.maxInfluencers || 0, icon: Users },
                        { label: "Images/mo", value: usageData?.tenantLimits?.imagesPerMonth || usageData?.planLimits?.maxImagesPerMonth || 0, icon: Image },
                        { label: "Videos/mo", value: usageData?.tenantLimits?.videosPerMonth || usageData?.planLimits?.maxVideosPerMonth || 0, icon: Video },
                        { label: "Brands", value: usageData?.tenantLimits?.brandsLimit || usageData?.planLimits?.maxBrands || 0, icon: Crown },
                        { label: "Team Members", value: usageData?.tenantLimits?.teamMembersLimit || usageData?.planLimits?.maxTeamMembers || 0, icon: Users },
                        { label: "Storage (GB)", value: usageData?.tenantLimits?.storageGb || usageData?.planLimits?.maxStorageGb || 0, icon: HardDrive },
                      ].map((item) => (
                        <div key={item.label} className="p-4 rounded-lg bg-muted/50 border">
                          <item.icon className="h-4 w-4 text-muted-foreground mb-2" />
                          <p className="text-2xl font-bold">{item.value === 0 ? "∞" : item.value.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" asChild>
                    <a href="/pricing">
                      <Crown className="mr-2 h-4 w-4" />
                      Upgrade for Higher Limits
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              {/* Danger Zone */}
              <Card className="border-destructive/30">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <Shield className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <CardTitle className="text-destructive">Danger Zone</CardTitle>
                      <CardDescription>Irreversible account actions</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                    <div>
                      <h4 className="font-medium">Delete Account</h4>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all associated data.
                      </p>
                    </div>
                    <Button 
                      variant="destructive"
                      onClick={() => setShowDeletionWizard(true)}
                      disabled={lifecycleStatus?.accountStatus !== "ACTIVE" && lifecycleStatus?.accountStatus !== "DEACTIVATED"}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Account
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Note: Account deletion includes a 90-day self-restore window and a 12-month support restore window before permanent deletion.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
      
      <AppFooter />
      
      {/* Deletion Wizard Modal */}
      <AccountDeletionWizard
        isOpen={showDeletionWizard}
        onClose={() => {
          setShowDeletionWizard(false);
          refetchStatus();
        }}
        userEmail={user.email || ""}
        userName={user.name || "User"}
        currentPlan={lifecycleStatus?.plan || user.plan || "free"}
      />
    </div>
  );
}
