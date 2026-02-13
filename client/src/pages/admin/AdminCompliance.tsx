import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Shield,
  FileText,
  Download,
  Trash2,
  Clock,
  User,
  Search,
  CheckCircle,
  AlertTriangle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Globe,
  Lock,
  Mail,
} from "lucide-react";

interface DataRequest {
  id: number;
  type: "export" | "deletion" | "access" | "rectification";
  status: "pending" | "processing" | "completed" | "rejected";
  requester: {
    id: number;
    name: string;
    email: string;
  };
  tenant?: {
    id: number;
    name: string;
  };
  requestedAt: string;
  completedAt?: string;
  processedBy?: string;
  notes?: string;
}

interface ComplianceStats {
  pendingRequests: number;
  completedThisMonth: number;
  avgProcessingTime: number;
  upcomingDeadlines: number;
}

const typeLabels = {
  export: "Data Export (GDPR Art. 20)",
  deletion: "Right to Erasure (GDPR Art. 17)",
  access: "Subject Access Request (GDPR Art. 15)",
  rectification: "Data Rectification (GDPR Art. 16)",
};

const typeColors = {
  export: "bg-blue-500/20 text-blue-400",
  deletion: "bg-red-500/20 text-red-400",
  access: "bg-purple-500/20 text-purple-400",
  rectification: "bg-yellow-500/20 text-yellow-400",
};

const statusColors = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function AdminCompliance() {
  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [stats, setStats] = useState<ComplianceStats>({
    pendingRequests: 0,
    completedThisMonth: 0,
    avgProcessingTime: 0,
    upcomingDeadlines: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<DataRequest | null>(null);
  const itemsPerPage = 10;

  // Mock data
  useEffect(() => {
    setStats({
      pendingRequests: 5,
      completedThisMonth: 23,
      avgProcessingTime: 3.2,
      upcomingDeadlines: 2,
    });

    setRequests([
      {
        id: 1,
        type: "export",
        status: "pending",
        requester: { id: 1, name: "John Doe", email: "john@example.com" },
        tenant: { id: 1, name: "Acme Corp" },
        requestedAt: "2025-01-08T10:00:00Z",
      },
      {
        id: 2,
        type: "deletion",
        status: "processing",
        requester: { id: 2, name: "Jane Smith", email: "jane@example.com" },
        requestedAt: "2025-01-07T14:30:00Z",
        notes: "User requested full account deletion including all generated content",
      },
      {
        id: 3,
        type: "access",
        status: "completed",
        requester: { id: 3, name: "Bob Wilson", email: "bob@company.com" },
        tenant: { id: 2, name: "StartupXYZ" },
        requestedAt: "2025-01-05T09:00:00Z",
        completedAt: "2025-01-06T11:30:00Z",
        processedBy: "Admin User",
      },
      {
        id: 4,
        type: "rectification",
        status: "completed",
        requester: { id: 4, name: "Alice Brown", email: "alice@org.com" },
        requestedAt: "2025-01-04T16:00:00Z",
        completedAt: "2025-01-05T10:00:00Z",
        processedBy: "Admin User",
        notes: "Updated email address and company name",
      },
      {
        id: 5,
        type: "deletion",
        status: "rejected",
        requester: { id: 5, name: "Charlie Davis", email: "charlie@test.com" },
        tenant: { id: 3, name: "Test Corp" },
        requestedAt: "2025-01-03T12:00:00Z",
        completedAt: "2025-01-04T09:00:00Z",
        processedBy: "Admin User",
        notes: "Rejected: Active subscription with outstanding balance",
      },
    ]);
    setLoading(false);
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDeadline = (requestedAt: string) => {
    const deadline = new Date(requestedAt);
    deadline.setDate(deadline.getDate() + 30); // GDPR 30-day deadline
    return deadline;
  };

  const getDaysRemaining = (requestedAt: string) => {
    const deadline = getDeadline(requestedAt);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleProcess = (id: number) => {
    setRequests(requests.map(req =>
      req.id === id ? { ...req, status: "processing" as const } : req
    ));
  };

  const handleComplete = (id: number) => {
    setRequests(requests.map(req =>
      req.id === id ? { 
        ...req, 
        status: "completed" as const, 
        completedAt: new Date().toISOString(),
        processedBy: "Admin User"
      } : req
    ));
    setSelectedRequest(null);
  };

  const filteredRequests = requests.filter((req) => {
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    const matchesType = typeFilter === "all" || req.type === typeFilter;
    const matchesSearch = 
      req.requester.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requester.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Compliance & GDPR</h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage data subject requests and compliance obligations
            </p>
          </div>
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-xl p-6 border border-yellow-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending Requests</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.pendingRequests}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500/50" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Completed This Month</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.completedThisMonth}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-500/50" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Avg Processing Time</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.avgProcessingTime} days</p>
              </div>
              <Calendar className="w-8 h-8 text-gray-500/50" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-red-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Upcoming Deadlines</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{stats.upcomingDeadlines}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500/50" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Download className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-white font-medium">Bulk Export</p>
                <p className="text-gray-500 text-xs">Export all user data</p>
              </div>
            </div>
          </button>
          <button className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <FileText className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-white font-medium">Privacy Policy</p>
                <p className="text-gray-500 text-xs">View/edit policy</p>
              </div>
            </div>
          </button>
          <button className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Lock className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-white font-medium">Consent Log</p>
                <p className="text-gray-500 text-xs">View consent records</p>
              </div>
            </div>
          </button>
          <button className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Globe className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-white font-medium">Data Map</p>
                <p className="text-gray-500 text-xs">View data flows</p>
              </div>
            </div>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Types</option>
              <option value="export">Data Export</option>
              <option value="deletion">Deletion</option>
              <option value="access">Access Request</option>
              <option value="rectification">Rectification</option>
            </select>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Requester
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Requested
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Deadline
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      Loading requests...
                    </td>
                  </tr>
                ) : paginatedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No requests found
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((req) => {
                    const daysRemaining = getDaysRemaining(req.requestedAt);
                    const isUrgent = daysRemaining <= 7 && req.status !== "completed" && req.status !== "rejected";
                    return (
                      <tr key={req.id} className="hover:bg-gray-750">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-white font-medium">{req.requester.name}</p>
                              <p className="text-gray-500 text-xs">{req.requester.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[req.type]}`}>
                            {req.type.charAt(0).toUpperCase() + req.type.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[req.status]}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-gray-400 text-sm">
                          {formatDate(req.requestedAt)}
                        </td>
                        <td className="px-4 py-4">
                          {req.status !== "completed" && req.status !== "rejected" ? (
                            <span className={`text-sm ${isUrgent ? "text-red-400" : "text-gray-400"}`}>
                              {daysRemaining} days left
                              {isUrgent && <AlertTriangle className="w-4 h-4 inline ml-1" />}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedRequest(req)}
                              className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {req.status === "pending" && (
                              <button
                                onClick={() => handleProcess(req.id)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
                              >
                                Process
                              </button>
                            )}
                            {req.status === "processing" && (
                              <button
                                onClick={() => handleComplete(req.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm transition-colors"
                              >
                                Complete
                              </button>
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
                {Math.min(currentPage * itemsPerPage, filteredRequests.length)} of{" "}
                {filteredRequests.length} requests
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Request Details</h2>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-1 rounded hover:bg-gray-700 text-gray-400"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Request Type</p>
                  <p className="text-white">{typeLabels[selectedRequest.type]}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Requester</p>
                    <p className="text-white">{selectedRequest.requester.name}</p>
                    <p className="text-gray-400 text-sm">{selectedRequest.requester.email}</p>
                  </div>
                  {selectedRequest.tenant && (
                    <div>
                      <p className="text-xs text-gray-500">Tenant</p>
                      <p className="text-white">{selectedRequest.tenant.name}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Requested</p>
                    <p className="text-white">{formatDate(selectedRequest.requestedAt)}</p>
                  </div>
                  {selectedRequest.completedAt && (
                    <div>
                      <p className="text-xs text-gray-500">Completed</p>
                      <p className="text-white">{formatDate(selectedRequest.completedAt)}</p>
                    </div>
                  )}
                </div>

                {selectedRequest.notes && (
                  <div>
                    <p className="text-xs text-gray-500">Notes</p>
                    <p className="text-gray-300">{selectedRequest.notes}</p>
                  </div>
                )}

                {selectedRequest.processedBy && (
                  <div>
                    <p className="text-xs text-gray-500">Processed By</p>
                    <p className="text-white">{selectedRequest.processedBy}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                >
                  Close
                </button>
                {selectedRequest.status === "processing" && (
                  <button
                    onClick={() => handleComplete(selectedRequest.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm transition-colors"
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
