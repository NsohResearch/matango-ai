import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Ban,
  Flag,
  Image,
  Video,
  MessageSquare,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
} from "lucide-react";

interface ModerationItem {
  id: number;
  type: "image" | "video" | "text" | "profile";
  content: string;
  thumbnailUrl?: string;
  flagReason: string;
  confidence: number;
  status: "pending" | "approved" | "rejected" | "escalated";
  reporter?: {
    id: number;
    name: string;
    email: string;
  };
  tenant: {
    id: number;
    name: string;
  };
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

interface ModerationStats {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
  escalatedToday: number;
  avgReviewTime: number;
}

const typeIcons = {
  image: Image,
  video: Video,
  text: MessageSquare,
  profile: User,
};

const statusColors = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  escalated: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export default function AdminModeration() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [stats, setStats] = useState<ModerationStats>({
    pending: 0,
    approvedToday: 0,
    rejectedToday: 0,
    escalatedToday: 0,
    avgReviewTime: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const itemsPerPage = 10;

  // Mock data
  useEffect(() => {
    setStats({
      pending: 23,
      approvedToday: 156,
      rejectedToday: 12,
      escalatedToday: 3,
      avgReviewTime: 45,
    });

    setItems([
      {
        id: 1,
        type: "image",
        content: "AI-generated portrait with potential policy violation",
        thumbnailUrl: "/placeholder-image.jpg",
        flagReason: "Potential deepfake/impersonation",
        confidence: 0.87,
        status: "pending",
        tenant: { id: 1, name: "Acme Corp" },
        createdAt: "2025-01-08T19:30:00Z",
      },
      {
        id: 2,
        type: "text",
        content: "Marketing copy with potentially misleading claims about product efficacy...",
        flagReason: "Misleading claims",
        confidence: 0.72,
        status: "pending",
        tenant: { id: 2, name: "StartupXYZ" },
        createdAt: "2025-01-08T19:15:00Z",
      },
      {
        id: 3,
        type: "video",
        content: "AI influencer video promoting financial products",
        thumbnailUrl: "/placeholder-video.jpg",
        flagReason: "Unverified financial advice",
        confidence: 0.91,
        status: "pending",
        reporter: { id: 5, name: "User Report", email: "reporter@example.com" },
        tenant: { id: 3, name: "Finance Pro" },
        createdAt: "2025-01-08T19:00:00Z",
      },
      {
        id: 4,
        type: "profile",
        content: "AI influencer profile claiming to be a licensed professional",
        flagReason: "False credentials",
        confidence: 0.95,
        status: "escalated",
        tenant: { id: 4, name: "Health Co" },
        createdAt: "2025-01-08T18:45:00Z",
        reviewedAt: "2025-01-08T18:50:00Z",
        reviewedBy: "Admin User",
      },
      {
        id: 5,
        type: "image",
        content: "Product image with edited reviews",
        thumbnailUrl: "/placeholder-image.jpg",
        flagReason: "Fake reviews/testimonials",
        confidence: 0.68,
        status: "rejected",
        tenant: { id: 5, name: "Shop Direct" },
        createdAt: "2025-01-08T18:30:00Z",
        reviewedAt: "2025-01-08T18:35:00Z",
        reviewedBy: "Admin User",
      },
      {
        id: 6,
        type: "text",
        content: "Blog post about health supplements",
        flagReason: "Medical claims without disclaimer",
        confidence: 0.55,
        status: "approved",
        tenant: { id: 6, name: "Wellness Brand" },
        createdAt: "2025-01-08T18:00:00Z",
        reviewedAt: "2025-01-08T18:10:00Z",
        reviewedBy: "Admin User",
      },
    ]);
    setLoading(false);
  }, []);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleApprove = (id: number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, status: "approved" as const, reviewedAt: new Date().toISOString(), reviewedBy: "Admin User" } : item
    ));
    setSelectedItem(null);
  };

  const handleReject = (id: number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, status: "rejected" as const, reviewedAt: new Date().toISOString(), reviewedBy: "Admin User" } : item
    ));
    setSelectedItem(null);
  };

  const handleEscalate = (id: number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, status: "escalated" as const, reviewedAt: new Date().toISOString(), reviewedBy: "Admin User" } : item
    ));
    setSelectedItem(null);
  };

  const filteredItems = items.filter((item) => {
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesSearch = item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tenant.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Content Moderation</h1>
            <p className="text-gray-400 text-sm mt-1">
              Review flagged content and enforce policies
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gray-800 rounded-xl p-6 border border-yellow-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500/50" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Approved Today</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.approvedToday}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-500/50" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Rejected Today</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{stats.rejectedToday}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500/50" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Escalated</p>
                <p className="text-2xl font-bold text-purple-400 mt-1">{stats.escalatedToday}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-purple-500/50" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Avg Review Time</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.avgReviewTime}s</p>
              </div>
              <Clock className="w-8 h-8 text-gray-500/50" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search content or tenant..."
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
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="escalated">Escalated</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="text">Text</option>
              <option value="profile">Profiles</option>
            </select>
          </div>
        </div>

        {/* Moderation Queue */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Content
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Flag Reason
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Confidence
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Tenant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      Loading moderation queue...
                    </td>
                  </tr>
                ) : paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No items in queue
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => {
                    const TypeIcon = typeIcons[item.type];
                    return (
                      <tr key={item.id} className="hover:bg-gray-750">
                        <td className="px-4 py-4">
                          <p className="text-white text-sm line-clamp-2 max-w-xs">
                            {item.content}
                          </p>
                          <p className="text-gray-500 text-xs mt-1">
                            {formatTimestamp(item.createdAt)}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <TypeIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-300 capitalize">{item.type}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-yellow-400 text-sm">{item.flagReason}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  item.confidence >= 0.8 ? "bg-red-500" :
                                  item.confidence >= 0.6 ? "bg-yellow-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${item.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-gray-400 text-sm">{(item.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-gray-300">
                          {item.tenant.name}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[item.status]}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedItem(item)}
                              className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                              title="Review"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {item.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleApprove(item.id)}
                                  className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-emerald-400 transition-colors"
                                  title="Approve"
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleReject(item.id)}
                                  className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors"
                                  title="Reject"
                                >
                                  <ThumbsDown className="w-4 h-4" />
                                </button>
                              </>
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
                {Math.min(currentPage * itemsPerPage, filteredItems.length)} of{" "}
                {filteredItems.length} items
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

        {/* Review Modal */}
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl border border-gray-700 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Review Content</h2>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1 rounded hover:bg-gray-700 text-gray-400"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Content</p>
                  <p className="text-white mt-1">{selectedItem.content}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="text-white capitalize">{selectedItem.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Tenant</p>
                    <p className="text-white">{selectedItem.tenant.name}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Flag Reason</p>
                  <p className="text-yellow-400">{selectedItem.flagReason}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">AI Confidence</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          selectedItem.confidence >= 0.8 ? "bg-red-500" :
                          selectedItem.confidence >= 0.6 ? "bg-yellow-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${selectedItem.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-white">{(selectedItem.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {selectedItem.reporter && (
                  <div>
                    <p className="text-xs text-gray-500">Reported By</p>
                    <p className="text-white">{selectedItem.reporter.name} ({selectedItem.reporter.email})</p>
                  </div>
                )}
              </div>

              {selectedItem.status === "pending" && (
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => handleEscalate(selectedItem.id)}
                    className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg text-sm flex items-center gap-2 transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Escalate
                  </button>
                  <button
                    onClick={() => handleReject(selectedItem.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedItem.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
