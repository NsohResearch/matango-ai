import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Search,
  Filter,
  Download,
  Building2,
  Ban,
  Eye,
  Edit,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  EyeOff,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const statusColors = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  suspended: "bg-red-500/20 text-red-400 border-red-500/30",
  read_only: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  trial: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  churned: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const planColors = {
  free: "bg-gray-600",
  basic: "bg-blue-600",
  agency: "bg-purple-600",
  agency_plus: "bg-emerald-600",
};

export default function AdminTenants() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTenants, setSelectedTenants] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Action dialogs
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; tenantId: number | null; tenantName: string }>({ open: false, tenantId: null, tenantName: "" });
  const [suspendReason, setSuspendReason] = useState("");
  const [readOnlyDialog, setReadOnlyDialog] = useState<{ open: boolean; tenantId: number | null; tenantName: string }>({ open: false, tenantId: null, tenantName: "" });
  const [readOnlyReason, setReadOnlyReason] = useState("");
  const [unsuspendDialog, setUnsuspendDialog] = useState<{ open: boolean; tenantId: number | null; tenantName: string }>({ open: false, tenantId: null, tenantName: "" });

  const itemsPerPage = 10;

  // Fetch tenants from API
  const { data: tenantsData, isLoading, refetch } = trpc.admin.listTenants.useQuery({
    page: currentPage,
    limit: itemsPerPage,
    search: searchQuery || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    plan: planFilter !== "all" ? planFilter : undefined,
  });

  // Mutations
  const suspendMutation = trpc.admin.suspendTenant.useMutation({
    onSuccess: () => {
      toast.success("Tenant suspended successfully");
      setSuspendDialog({ open: false, tenantId: null, tenantName: "" });
      setSuspendReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to suspend tenant: ${error.message}`);
    },
  });

  const unsuspendMutation = trpc.admin.unsuspendTenant.useMutation({
    onSuccess: () => {
      toast.success("Tenant reactivated successfully");
      setUnsuspendDialog({ open: false, tenantId: null, tenantName: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to reactivate tenant: ${error.message}`);
    },
  });

  const setReadOnlyMutation = trpc.admin.setTenantReadOnly.useMutation({
    onSuccess: () => {
      toast.success("Tenant set to read-only mode");
      setReadOnlyDialog({ open: false, tenantId: null, tenantName: "" });
      setReadOnlyReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to set read-only: ${error.message}`);
    },
  });

  const tenants = tenantsData?.tenants || [];
  const totalPages = tenantsData?.totalPages || 1;
  const total = tenantsData?.total || 0;

  const toggleSelectAll = () => {
    if (selectedTenants.length === tenants.length) {
      setSelectedTenants([]);
    } else {
      setSelectedTenants(tenants.map((t: any) => t.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedTenants.includes(id)) {
      setSelectedTenants(selectedTenants.filter((t) => t !== id));
    } else {
      setSelectedTenants([...selectedTenants, id]);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleSuspend = () => {
    if (suspendDialog.tenantId) {
      suspendMutation.mutate({
        userId: suspendDialog.tenantId,
        reason: suspendReason || "Policy violation",
      });
    }
  };

  const handleUnsuspend = () => {
    if (unsuspendDialog.tenantId) {
      unsuspendMutation.mutate({
        userId: unsuspendDialog.tenantId,
      });
    }
  };

  const handleSetReadOnly = () => {
    if (readOnlyDialog.tenantId) {
      setReadOnlyMutation.mutate({
        userId: readOnlyDialog.tenantId,
        reason: readOnlyReason || "Account under review",
      });
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "active": return "Active";
      case "suspended": return "Suspended";
      case "read_only": return "Read Only";
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Tenant Management</h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage tenant accounts, suspensions, and access controls
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => refetch()}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                showFilters ? "bg-emerald-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-700 flex flex-wrap gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="read_only">Read Only</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Plan</label>
                <select
                  value={planFilter}
                  onChange={(e) => {
                    setPlanFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Plans</option>
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="agency">Agency</option>
                  <option value="agency_plus">Agency++</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedTenants.length > 0 && (
          <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg p-4 flex items-center justify-between">
            <span className="text-emerald-400 text-sm">
              {selectedTenants.length} tenant(s) selected
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  // Bulk suspend
                  toast.info("Bulk operations coming soon");
                }}
                className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-sm"
              >
                Suspend All
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedTenants.length === tenants.length && tenants.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading tenants...
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No tenants found
                    </td>
                  </tr>
                ) : (
                  tenants.map((tenant: any) => (
                    <tr key={tenant.id} className="hover:bg-gray-750">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedTenants.includes(tenant.id)}
                          onChange={() => toggleSelect(tenant.id)}
                          className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <Link href={`/admin/tenants/${tenant.id}`}>
                              <span className="text-white font-medium hover:text-emerald-400 cursor-pointer">
                                {tenant.name || "Unnamed User"}
                              </span>
                            </Link>
                            <p className="text-sm text-gray-400">{tenant.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium text-white ${planColors[tenant.plan as keyof typeof planColors] || "bg-gray-600"}`}>
                          {(tenant.plan || "free").replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[tenant.tenantStatus as keyof typeof statusColors] || statusColors.active}`}>
                          {getStatusDisplay(tenant.tenantStatus || "active")}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          <span className="text-gray-300">{tenant.influencerCount || 0} influencers</span>
                          <p className="text-gray-500 text-xs">
                            {tenant.imagesGenerated || 0} images
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-400 text-sm">
                        {tenant.createdAt ? formatDate(tenant.createdAt) : "N/A"}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/tenants/${tenant.id}`}>
                            <button className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="View Details">
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>
                          
                          {tenant.tenantStatus === "active" && (
                            <>
                              <button 
                                onClick={() => setReadOnlyDialog({ open: true, tenantId: tenant.id, tenantName: tenant.name || tenant.email })}
                                className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-yellow-400 transition-colors" 
                                title="Set Read-Only"
                              >
                                <EyeOff className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setSuspendDialog({ open: true, tenantId: tenant.id, tenantName: tenant.name || tenant.email })}
                                className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors" 
                                title="Suspend"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          
                          {(tenant.tenantStatus === "suspended" || tenant.tenantStatus === "read_only") && (
                            <button 
                              onClick={() => setUnsuspendDialog({ open: true, tenantId: tenant.id, tenantName: tenant.name || tenant.email })}
                              className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-emerald-400 transition-colors" 
                              title="Reactivate"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, total)} of{" "}
                {total} results
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialog.open} onOpenChange={(open) => setSuspendDialog({ ...suspendDialog, open })}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Suspend Tenant</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to suspend <span className="text-white font-medium">{suspendDialog.tenantName}</span>? 
              They will lose access to all features until reactivated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Reason for suspension</label>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter reason for suspension..."
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog({ open: false, tenantId: null, tenantName: "" })}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleSuspend}
              disabled={suspendMutation.isPending}
            >
              {suspendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Suspend Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Read-Only Dialog */}
      <Dialog open={readOnlyDialog.open} onOpenChange={(open) => setReadOnlyDialog({ ...readOnlyDialog, open })}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Set Read-Only Mode</DialogTitle>
            <DialogDescription className="text-gray-400">
              Set <span className="text-white font-medium">{readOnlyDialog.tenantName}</span> to read-only mode. 
              They will be able to view their data but cannot create or modify content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Reason</label>
              <Textarea
                value={readOnlyReason}
                onChange={(e) => setReadOnlyReason(e.target.value)}
                placeholder="Enter reason for read-only mode..."
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReadOnlyDialog({ open: false, tenantId: null, tenantName: "" })}>
              Cancel
            </Button>
            <Button 
              className="bg-yellow-600 hover:bg-yellow-500"
              onClick={handleSetReadOnly}
              disabled={setReadOnlyMutation.isPending}
            >
              {setReadOnlyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Set Read-Only
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsuspend Dialog */}
      <Dialog open={unsuspendDialog.open} onOpenChange={(open) => setUnsuspendDialog({ ...unsuspendDialog, open })}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Reactivate Tenant</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to reactivate <span className="text-white font-medium">{unsuspendDialog.tenantName}</span>? 
              They will regain full access to all features.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnsuspendDialog({ open: false, tenantId: null, tenantName: "" })}>
              Cancel
            </Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-500"
              onClick={handleUnsuspend}
              disabled={unsuspendMutation.isPending}
            >
              {unsuspendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Reactivate Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
