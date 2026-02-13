import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Search,
  Filter,
  Download,
  FileText,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  User,
  Calendar,
  ExternalLink,
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
import { Textarea } from "@/components/ui/textarea";

const statusColors = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

const typeColors = {
  export: "bg-blue-600",
  delete: "bg-red-600",
};

export default function AdminGdprRequests() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  // Action dialogs
  const [processExportDialog, setProcessExportDialog] = useState<{ open: boolean; requestId: number | null; userName: string }>({ open: false, requestId: null, userName: "" });
  const [processDeletionDialog, setProcessDeletionDialog] = useState<{ open: boolean; requestId: number | null; userName: string }>({ open: false, requestId: null, userName: "" });
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; requestId: number | null; userName: string }>({ open: false, requestId: null, userName: "" });
  const [rejectReason, setRejectReason] = useState("");

  const itemsPerPage = 10;

  // Fetch GDPR requests from API
  const { data: requestsData, isLoading, refetch } = trpc.gdpr.listAll.useQuery({
    page: currentPage,
    limit: itemsPerPage,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    requestType: typeFilter !== "all" ? typeFilter as any : undefined,
  });

  // Mutations
  const processExportMutation = trpc.gdpr.processExport.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Export processed successfully");
      } else {
        toast.error(`Export failed: ${data.error}`);
      }
      setProcessExportDialog({ open: false, requestId: null, userName: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to process export: ${error.message}`);
    },
  });

  const processDeletionMutation = trpc.gdpr.processDeletion.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Deletion processed successfully");
      } else {
        toast.error(`Deletion failed: ${data.error}`);
      }
      setProcessDeletionDialog({ open: false, requestId: null, userName: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to process deletion: ${error.message}`);
    },
  });

  const rejectDeletionMutation = trpc.gdpr.rejectDeletion.useMutation({
    onSuccess: () => {
      toast.success("Request rejected");
      setRejectDialog({ open: false, requestId: null, userName: "" });
      setRejectReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to reject request: ${error.message}`);
    },
  });

  const requests = requestsData?.requests || [];
  const totalPages = requestsData?.totalPages || 1;
  const total = requestsData?.total || 0;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4" />;
      case "processing": return <Loader2 className="w-4 h-4 animate-spin" />;
      case "completed": return <CheckCircle className="w-4 h-4" />;
      case "failed": return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const handleProcessExport = () => {
    if (processExportDialog.requestId) {
      processExportMutation.mutate({
        requestId: processExportDialog.requestId,
      });
    }
  };

  const handleProcessDeletion = () => {
    if (processDeletionDialog.requestId) {
      processDeletionMutation.mutate({
        requestId: processDeletionDialog.requestId,
        confirmDeletion: true,
      });
    }
  };

  const handleReject = () => {
    if (rejectDialog.requestId && rejectReason) {
      rejectDeletionMutation.mutate({
        requestId: rejectDialog.requestId,
        reason: rejectReason,
      });
    }
  };

  // Calculate days until GDPR deadline (30 days)
  const getDaysRemaining = (createdAt: string) => {
    const created = new Date(createdAt);
    const deadline = new Date(created);
    deadline.setDate(deadline.getDate() + 30);
    const now = new Date();
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">GDPR Requests</h1>
            <p className="text-gray-400 text-sm mt-1">
              Process data export and deletion requests for GDPR compliance
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
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {requests.filter((r: any) => r.status === "pending").length}
                </p>
                <p className="text-xs text-gray-400">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {requests.filter((r: any) => r.requestType === "export").length}
                </p>
                <p className="text-xs text-gray-400">Export Requests</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {requests.filter((r: any) => r.requestType === "delete").length}
                </p>
                <p className="text-xs text-gray-400">Deletion Requests</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {requests.filter((r: any) => r.status === "completed").length}
                </p>
                <p className="text-xs text-gray-400">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
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
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Types</option>
                  <option value="export">Export</option>
                  <option value="delete">Deletion</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Request
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Deadline
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
                      Loading requests...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No GDPR requests found
                    </td>
                  </tr>
                ) : (
                  requests.map((request: any) => {
                    const daysRemaining = getDaysRemaining(request.createdAt);
                    const isUrgent = daysRemaining <= 7 && request.status === "pending";
                    
                    return (
                      <tr key={request.id} className={`hover:bg-gray-750 ${isUrgent ? "bg-red-900/10" : ""}`}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              request.requestType === "export" ? "bg-blue-500/20" : "bg-red-500/20"
                            }`}>
                              {request.requestType === "export" ? (
                                <FileText className="w-5 h-5 text-blue-400" />
                              ) : (
                                <Trash2 className="w-5 h-5 text-red-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-white font-medium">#{request.id}</p>
                              <p className="text-sm text-gray-400">
                                {request.requestType === "export" ? "Data Export" : "Account Deletion"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-white">{request.userName || "Unknown"}</p>
                              <p className="text-sm text-gray-400">{request.userEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium text-white ${typeColors[request.requestType as keyof typeof typeColors]}`}>
                            {request.requestType.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium border flex items-center gap-1 w-fit ${statusColors[request.status as keyof typeof statusColors]}`}>
                            {getStatusIcon(request.status)}
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {request.status === "pending" && (
                            <div className={`flex items-center gap-1 ${isUrgent ? "text-red-400" : "text-gray-400"}`}>
                              {isUrgent && <AlertTriangle className="w-4 h-4" />}
                              <span className="text-sm">
                                {daysRemaining > 0 ? `${daysRemaining} days` : "Overdue"}
                              </span>
                            </div>
                          )}
                          {request.status !== "pending" && (
                            <span className="text-gray-500 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-gray-400 text-sm">
                          {formatDate(request.createdAt)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {request.status === "pending" && request.requestType === "export" && (
                              <button 
                                onClick={() => setProcessExportDialog({ open: true, requestId: request.id, userName: request.userName || request.userEmail })}
                                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
                              >
                                Process
                              </button>
                            )}
                            
                            {request.status === "pending" && request.requestType === "delete" && (
                              <>
                                <button 
                                  onClick={() => setProcessDeletionDialog({ open: true, requestId: request.id, userName: request.userName || request.userEmail })}
                                  className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => setRejectDialog({ open: true, requestId: request.id, userName: request.userName || request.userEmail })}
                                  className="px-3 py-1.5 rounded bg-gray-600 hover:bg-gray-500 text-white text-xs font-medium transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {request.status === "completed" && request.requestType === "export" && request.downloadUrl && (
                              <a 
                                href={request.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                Download
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
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

      {/* Process Export Dialog */}
      <Dialog open={processExportDialog.open} onOpenChange={(open) => setProcessExportDialog({ ...processExportDialog, open })}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Process Data Export</DialogTitle>
            <DialogDescription className="text-gray-400">
              Generate and send data export for <span className="text-white font-medium">{processExportDialog.userName}</span>.
              This will collect all user data and create a downloadable file.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessExportDialog({ open: false, requestId: null, userName: "" })}>
              Cancel
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-500"
              onClick={handleProcessExport}
              disabled={processExportMutation.isPending}
            >
              {processExportMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Process Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Deletion Dialog */}
      <Dialog open={processDeletionDialog.open} onOpenChange={(open) => setProcessDeletionDialog({ ...processDeletionDialog, open })}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Approve Account Deletion
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              <span className="text-red-400 font-medium">This action is irreversible.</span> All data for{" "}
              <span className="text-white font-medium">{processDeletionDialog.userName}</span> will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <p className="text-red-400 text-sm">
                The following data will be deleted:
              </p>
              <ul className="mt-2 text-sm text-gray-400 list-disc list-inside space-y-1">
                <li>User profile and settings</li>
                <li>All influencers and content</li>
                <li>Campaigns and assets</li>
                <li>Chat messages and notifications</li>
                <li>Social media connections</li>
                <li>Analytics and usage data</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessDeletionDialog({ open: false, requestId: null, userName: "" })}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleProcessDeletion}
              disabled={processDeletionMutation.isPending}
            >
              {processDeletionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Deletion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Deletion Request</DialogTitle>
            <DialogDescription className="text-gray-400">
              Provide a reason for rejecting the deletion request from{" "}
              <span className="text-white font-medium">{rejectDialog.userName}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Reason for rejection</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, requestId: null, userName: "" })}>
              Cancel
            </Button>
            <Button 
              className="bg-gray-600 hover:bg-gray-500"
              onClick={handleReject}
              disabled={rejectDeletionMutation.isPending || !rejectReason}
            >
              {rejectDeletionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
