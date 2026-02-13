import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  User,
  CreditCard,
  Activity,
  Settings,
  Shield,
  Clock,
  Mail,
  Calendar,
  DollarSign,
  Image,
  Video,
  Users,
  AlertTriangle,
  CheckCircle,
  Ban,
  Play,
  Pause,
  RefreshCw,
  Download,
  Edit,
  Trash2,
  Eye,
  Key,
  Globe,
  Save,
  X,
  Loader2,
  Crown,
  Zap,
  HardDrive,
  Palette,
} from "lucide-react";

const tabs = [
  { id: "overview", name: "Overview", icon: Building2 },
  { id: "billing", name: "Billing", icon: CreditCard },
  { id: "usage", name: "Usage & Limits", icon: Activity },
  { id: "entitlements", name: "Entitlements", icon: Settings },
  { id: "security", name: "Security", icon: Shield },
  { id: "audit", name: "Audit Log", icon: Clock },
];

export default function AdminTenantDetail() {
  const [, params] = useRoute("/admin/tenants/:id");
  const tenantId = parseInt(params?.id || "0");
  const [activeTab, setActiveTab] = useState("overview");
  const [editingLimits, setEditingLimits] = useState(false);
  const [limitValues, setLimitValues] = useState<Record<string, number>>({});

  // Real API calls
  const { data: tenantData, isLoading: tenantLoading, refetch: refetchTenant } =
    trpc.admin.getTenantDetails.useQuery(
      { userId: tenantId },
      { enabled: tenantId > 0 }
    );

  const { data: tenantLimits, isLoading: limitsLoading, refetch: refetchLimits } =
    trpc.admin.getTenantLimits.useQuery(
      { userId: tenantId },
      { enabled: tenantId > 0 }
    );

  const { data: tenantUsage, isLoading: usageLoading, refetch: refetchUsage } =
    trpc.admin.getTenantUsage.useQuery(
      { userId: tenantId },
      { enabled: tenantId > 0 }
    );

  // Mutations
  const suspendMutation = trpc.admin.suspendTenant.useMutation({
    onSuccess: () => {
      toast.success("Tenant suspended successfully");
      refetchTenant();
    },
    onError: (err) => toast.error(err.message),
  });

  const unsuspendMutation = trpc.admin.unsuspendTenant.useMutation({
    onSuccess: () => {
      toast.success("Tenant reactivated successfully");
      refetchTenant();
    },
    onError: (err) => toast.error(err.message),
  });

  const setReadOnlyMutation = trpc.admin.setTenantReadOnly.useMutation({
    onSuccess: () => {
      toast.success("Tenant set to read-only");
      refetchTenant();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateLimitsMutation = trpc.admin.updateTenantLimits.useMutation({
    onSuccess: () => {
      toast.success("Limits updated successfully");
      setEditingLimits(false);
      refetchLimits();
      refetchUsage();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetLimitsMutation = trpc.admin.resetTenantLimits.useMutation({
    onSuccess: () => {
      toast.success("Limits reset to plan defaults");
      refetchLimits();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetUsageMutation = trpc.admin.resetTenantUsage.useMutation({
    onSuccess: () => {
      toast.success("Usage counters reset");
      refetchUsage();
    },
    onError: (err) => toast.error(err.message),
  });

  const changePlanMutation = trpc.admin.changeTenantPlan.useMutation({
    onSuccess: (data) => {
      toast.success(`Plan changed from ${data.previousPlan} to ${data.newPlan}`);
      refetchTenant();
      refetchLimits();
    },
    onError: (err) => toast.error(err.message),
  });

  // Initialize limit values when data loads
  useEffect(() => {
    if (tenantLimits) {
      setLimitValues({
        influencersLimit: tenantLimits.influencersLimit || 0,
        imagesPerMonth: tenantLimits.imagesPerMonth || 0,
        videosPerMonth: tenantLimits.videosPerMonth || 0,
        brandsLimit: tenantLimits.brandsLimit || 0,
        customDomainsLimit: tenantLimits.customDomainsLimit || 0,
        teamMembersLimit: tenantLimits.teamMembersLimit || 0,
        storageGb: tenantLimits.storageGb || 0,
      });
    }
  }, [tenantLimits]);

  const user = tenantData?.user;
  const stats = tenantData?.stats;

  const formatDate = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      active: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
      suspended: { bg: "bg-red-500/20", text: "text-red-400" },
      read_only: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
      trial: { bg: "bg-blue-500/20", text: "text-blue-400" },
    };
    const style = map[status] || { bg: "bg-gray-500/20", text: "text-gray-400" };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${style.bg} ${style.text}`}>
        {status?.replace("_", " ").toUpperCase() || "UNKNOWN"}
      </span>
    );
  };

  if (tenantLoading || !user) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      </AdminLayout>
    );
  }

  const handleSaveLimits = () => {
    updateLimitsMutation.mutate({
      userId: tenantId,
      limits: limitValues,
    });
  };

  const handleSuspend = () => {
    const reason = prompt("Enter suspension reason:");
    if (reason) {
      suspendMutation.mutate({ userId: tenantId, reason });
    }
  };

  const handleSetReadOnly = () => {
    const reason = prompt("Enter read-only reason:");
    if (reason) {
      setReadOnlyMutation.mutate({ userId: tenantId, reason });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/tenants">
            <button className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{user.name || "Unknown User"}</h1>
              {getStatusBadge(user.tenantStatus || "active")}
              <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-400 capitalize">
                {user.plan || "free"}
              </span>
            </div>
            <p className="text-gray-400 text-sm mt-1">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            {user.tenantStatus === "active" ? (
              <>
                <button
                  onClick={handleSuspend}
                  disabled={suspendMutation.isPending}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {suspendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                  Suspend
                </button>
                <button
                  onClick={handleSetReadOnly}
                  disabled={setReadOnlyMutation.isPending}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {setReadOnlyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  Read Only
                </button>
              </>
            ) : user.tenantStatus === "suspended" || user.tenantStatus === "read_only" ? (
              <button
                onClick={() => unsuspendMutation.mutate({ userId: tenantId })}
                disabled={unsuspendMutation.isPending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {unsuspendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Reactivate
              </button>
            ) : null}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700">
          <nav className="flex gap-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Account Info */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-white">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Plan</p>
                    <p className="text-white capitalize">{(user.plan || "free").replace("_", " ")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Crown className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Credits</p>
                    <p className="text-white">{user.credits?.toLocaleString() || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Member Since</p>
                    <p className="text-white">{formatDate(user.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Last Active</p>
                    <p className="text-white">{formatDate(user.lastSignedIn)}</p>
                  </div>
                </div>
                {user.stripeCustomerId && (
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Stripe Customer</p>
                      <p className="text-white font-mono text-xs">{user.stripeCustomerId}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <Users className="w-5 h-5 text-emerald-500 mb-2" />
                  <p className="text-2xl font-bold text-white">{stats?.influencerCount || 0}</p>
                  <p className="text-xs text-gray-400">Influencers</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <Palette className="w-5 h-5 text-blue-500 mb-2" />
                  <p className="text-2xl font-bold text-white">{stats?.campaignCount || 0}</p>
                  <p className="text-xs text-gray-400">Campaigns</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <Image className="w-5 h-5 text-pink-500 mb-2" />
                  <p className="text-2xl font-bold text-white">{tenantUsage?.imagesGenerated || 0}</p>
                  <p className="text-xs text-gray-400">Images This Month</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <Video className="w-5 h-5 text-purple-500 mb-2" />
                  <p className="text-2xl font-bold text-white">{tenantUsage?.videosGenerated || 0}</p>
                  <p className="text-xs text-gray-400">Videos This Month</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    if (confirm("Reset usage counters for this tenant?")) {
                      resetUsageMutation.mutate({ userId: tenantId });
                    }
                  }}
                  disabled={resetUsageMutation.isPending}
                  className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {resetUsageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Reset Usage Counters
                </button>
                <button
                  onClick={() => {
                    if (confirm("Reset limits to plan defaults?")) {
                      resetLimitsMutation.mutate({ userId: tenantId });
                    }
                  }}
                  disabled={resetLimitsMutation.isPending}
                  className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {resetLimitsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  Reset Limits to Plan Defaults
                </button>
                <button
                  onClick={() => setActiveTab("entitlements")}
                  className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit Entitlements
                </button>
                <button
                  onClick={() => toast.info("Feature coming soon")}
                  className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export Data (GDPR)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === "billing" && (
          <div className="space-y-6">
            {/* Stripe Info */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Stripe Integration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Customer ID</p>
                  <p className="text-white font-mono text-sm">{user.stripeCustomerId || "Not linked"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Subscription ID</p>
                  <p className="text-white font-mono text-sm">{user.stripeSubscriptionId || "No subscription"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Plan Status</p>
                  <p className="text-white capitalize">{user.planStatus || "none"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Billing Cycle</p>
                  <p className="text-white capitalize">{user.billingCycle || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Plan Management */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Plan Management</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["free", "basic", "agency", "agency_plus"].map((plan) => (
                  <button
                    key={plan}
                    onClick={() => {
                      if (confirm(`Change plan to ${plan.replace("_", " ")}? This will reset limits.`)) {
                        changePlanMutation.mutate({ userId: tenantId, plan: plan as any, resetLimits: true });
                      }
                    }}
                    disabled={changePlanMutation.isPending || user.plan === plan}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      user.plan === plan
                        ? "bg-emerald-600 text-white ring-2 ring-emerald-400"
                        : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                    } disabled:opacity-50`}
                  >
                    <Crown className="w-4 h-4 mx-auto mb-1" />
                    {plan.replace("_", " ").toUpperCase()}
                  </button>
                ))}
              </div>
              {changePlanMutation.isPending && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Changing plan...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Usage Tab */}
        {activeTab === "usage" && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Current Usage</h3>
                <button
                  onClick={() => {
                    if (confirm("Reset all usage counters for this month?")) {
                      resetUsageMutation.mutate({ userId: tenantId });
                    }
                  }}
                  disabled={resetUsageMutation.isPending}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {resetUsageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Reset Counters
                </button>
              </div>

              {usageLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-6">
                  {[
                    { label: "Images Generated", used: tenantUsage?.imagesGenerated || 0, limit: tenantLimits?.imagesPerMonth || 0, icon: Image, color: "text-pink-500" },
                    { label: "Videos Generated", used: tenantUsage?.videosGenerated || 0, limit: tenantLimits?.videosPerMonth || 0, icon: Video, color: "text-purple-500" },
                    { label: "Influencers", used: stats?.influencerCount || 0, limit: tenantLimits?.influencersLimit || 0, icon: Users, color: "text-blue-500" },
                    { label: "Credits Used", used: tenantUsage?.creditsUsed || 0, limit: user.credits || 0, icon: Zap, color: "text-yellow-500" },
                  ].map((item) => {
                    const pct = getUsagePercentage(item.used, item.limit);
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <item.icon className={`w-4 h-4 ${item.color}`} />
                            <span className="text-gray-300">{item.label}</span>
                          </div>
                          <span className="text-white font-mono text-sm">
                            {item.used.toLocaleString()} / {item.limit === 0 ? "∞" : item.limit.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${getUsageColor(pct)}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Entitlements Editor Tab */}
        {activeTab === "entitlements" && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Plan Entitlements</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Override plan limits for this tenant. Changes take effect immediately.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {editingLimits ? (
                    <>
                      <button
                        onClick={() => {
                          setEditingLimits(false);
                          // Reset to original values
                          if (tenantLimits) {
                            setLimitValues({
                              influencersLimit: tenantLimits.influencersLimit || 0,
                              imagesPerMonth: tenantLimits.imagesPerMonth || 0,
                              videosPerMonth: tenantLimits.videosPerMonth || 0,
                              brandsLimit: tenantLimits.brandsLimit || 0,
                              customDomainsLimit: tenantLimits.customDomainsLimit || 0,
                              teamMembersLimit: tenantLimits.teamMembersLimit || 0,
                              storageGb: tenantLimits.storageGb || 0,
                            });
                          }
                        }}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveLimits}
                        disabled={updateLimitsMutation.isPending}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {updateLimitsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          if (confirm("Reset all limits to plan defaults?")) {
                            resetLimitsMutation.mutate({ userId: tenantId });
                          }
                        }}
                        disabled={resetLimitsMutation.isPending}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {resetLimitsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Reset to Defaults
                      </button>
                      <button
                        onClick={() => setEditingLimits(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Limits
                      </button>
                    </>
                  )}
                </div>
              </div>

              {limitsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { key: "influencersLimit", label: "Max Influencers", icon: Users, description: "Maximum number of AI influencers" },
                    { key: "imagesPerMonth", label: "Images per Month", icon: Image, description: "Monthly image generation limit" },
                    { key: "videosPerMonth", label: "Videos per Month", icon: Video, description: "Monthly video generation limit" },
                    { key: "brandsLimit", label: "Max Brands", icon: Building2, description: "Maximum number of brands" },
                    { key: "customDomainsLimit", label: "Custom Domains", icon: Globe, description: "Custom domain connections" },
                    { key: "teamMembersLimit", label: "Team Members", icon: Users, description: "Maximum team size" },
                    { key: "storageGb", label: "Storage (GB)", icon: HardDrive, description: "Storage allocation in GB" },
                  ].map((field) => (
                    <div key={field.key} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <field.icon className="w-4 h-4 text-gray-400" />
                        <label className="text-sm font-medium text-white">{field.label}</label>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">{field.description}</p>
                      {editingLimits ? (
                        <input
                          type="number"
                          min={0}
                          value={limitValues[field.key] || 0}
                          onChange={(e) =>
                            setLimitValues((prev) => ({
                              ...prev,
                              [field.key]: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-2xl font-bold text-white">
                          {(tenantLimits as any)?.[field.key]?.toLocaleString() || 0}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Security Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">Account Status</p>
                  <p className="text-sm text-gray-400">Current tenant status</p>
                </div>
                {getStatusBadge(user.tenantStatus || "active")}
              </div>
              {user.suspensionReason && (
                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Suspension Reason</p>
                    <p className="text-sm text-gray-400">{user.suspensionReason}</p>
                    {user.suspendedAt && (
                      <p className="text-xs text-gray-500 mt-1">Suspended on {formatDate(user.suspendedAt)}</p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">Role</p>
                  <p className="text-sm text-gray-400">User role in the system</p>
                </div>
                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400 capitalize">
                  {user.role || "user"}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">OpenID</p>
                  <p className="text-sm text-gray-400">OAuth identity</p>
                </div>
                <span className="text-white font-mono text-xs">{user.openId || "N/A"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === "audit" && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Audit Log</h3>
            <p className="text-gray-400 text-sm">
              Audit events for this tenant are tracked in the system audit log. View the full audit trail from the Admin Audit Log page.
            </p>
            <Link href="/admin/audit">
              <button className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm transition-colors">
                View Full Audit Log
              </button>
            </Link>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
