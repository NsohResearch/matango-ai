import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Search,
  Filter,
  Download,
  Clock,
  User,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";

interface AuditEntry {
  id: number;
  timestamp: string;
  action: string;
  category: "auth" | "billing" | "admin" | "content" | "system" | "security";
  actor: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  target?: {
    type: string;
    id: number;
    name: string;
  };
  details: string;
  ipAddress: string;
  userAgent: string;
  status: "success" | "failure" | "warning";
  metadata?: Record<string, unknown>;
}

const categoryColors = {
  auth: "bg-blue-500/20 text-blue-400",
  billing: "bg-emerald-500/20 text-emerald-400",
  admin: "bg-purple-500/20 text-purple-400",
  content: "bg-pink-500/20 text-pink-400",
  system: "bg-gray-500/20 text-gray-400",
  security: "bg-red-500/20 text-red-400",
};

const statusIcons = {
  success: CheckCircle,
  failure: XCircle,
  warning: AlertTriangle,
};

const statusColors = {
  success: "text-emerald-500",
  failure: "text-red-500",
  warning: "text-yellow-500",
};

export default function AdminAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("7d");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const itemsPerPage = 20;

  // Mock data
  useEffect(() => {
    const mockEntries: AuditEntry[] = [
      {
        id: 1,
        timestamp: "2025-01-08T19:45:00Z",
        action: "User Login",
        category: "auth",
        actor: { id: 1, name: "Admin User", email: "admin@matango.ai", role: "super_admin" },
        details: "Successful login via Google OAuth",
        ipAddress: "192.168.1.100",
        userAgent: "Chrome/120.0 (Windows)",
        status: "success",
      },
      {
        id: 2,
        timestamp: "2025-01-08T19:30:00Z",
        action: "Plan Upgraded",
        category: "billing",
        actor: { id: 2, name: "John Doe", email: "john@acme.com", role: "user" },
        target: { type: "subscription", id: 123, name: "Basic → Agency" },
        details: "User upgraded from Basic to Agency plan",
        ipAddress: "10.0.0.50",
        userAgent: "Safari/17.0 (macOS)",
        status: "success",
        metadata: { previousPlan: "basic", newPlan: "agency", mrr: 399 },
      },
      {
        id: 3,
        timestamp: "2025-01-08T19:15:00Z",
        action: "Tenant Suspended",
        category: "admin",
        actor: { id: 1, name: "Admin User", email: "admin@matango.ai", role: "super_admin" },
        target: { type: "tenant", id: 45, name: "Bad Actor Inc" },
        details: "Tenant suspended for TOS violation",
        ipAddress: "192.168.1.100",
        userAgent: "Chrome/120.0 (Windows)",
        status: "success",
        metadata: { reason: "spam_abuse", duration: "permanent" },
      },
      {
        id: 4,
        timestamp: "2025-01-08T19:00:00Z",
        action: "Content Flagged",
        category: "content",
        actor: { id: 0, name: "System", email: "system@matango.ai", role: "system" },
        target: { type: "image", id: 789, name: "Generated Image #789" },
        details: "AI-generated content flagged for manual review",
        ipAddress: "internal",
        userAgent: "Matango/ContentModerator",
        status: "warning",
        metadata: { flagReason: "potential_policy_violation", confidence: 0.87 },
      },
      {
        id: 5,
        timestamp: "2025-01-08T18:45:00Z",
        action: "Failed Login Attempt",
        category: "security",
        actor: { id: 0, name: "Unknown", email: "unknown@example.com", role: "unknown" },
        details: "Multiple failed login attempts detected",
        ipAddress: "203.0.113.50",
        userAgent: "curl/7.68.0",
        status: "failure",
        metadata: { attempts: 5, blocked: true },
      },
      {
        id: 6,
        timestamp: "2025-01-08T18:30:00Z",
        action: "Feature Flag Updated",
        category: "system",
        actor: { id: 1, name: "Admin User", email: "admin@matango.ai", role: "super_admin" },
        target: { type: "feature_flag", id: 12, name: "new_video_studio" },
        details: "Feature flag rollout increased to 50%",
        ipAddress: "192.168.1.100",
        userAgent: "Chrome/120.0 (Windows)",
        status: "success",
        metadata: { previousValue: 25, newValue: 50 },
      },
      {
        id: 7,
        timestamp: "2025-01-08T18:00:00Z",
        action: "API Key Generated",
        category: "security",
        actor: { id: 3, name: "Jane Smith", email: "jane@startup.io", role: "user" },
        target: { type: "api_key", id: 456, name: "Production API Key" },
        details: "New API key generated for production use",
        ipAddress: "172.16.0.25",
        userAgent: "Firefox/121.0 (Linux)",
        status: "success",
      },
      {
        id: 8,
        timestamp: "2025-01-08T17:30:00Z",
        action: "Payment Failed",
        category: "billing",
        actor: { id: 4, name: "Mike Johnson", email: "mike@company.com", role: "user" },
        target: { type: "invoice", id: 999, name: "INV-2025-001" },
        details: "Payment declined - insufficient funds",
        ipAddress: "10.0.0.75",
        userAgent: "Chrome/120.0 (macOS)",
        status: "failure",
        metadata: { amount: 399, declineCode: "insufficient_funds" },
      },
    ];
    setEntries(mockEntries);
    setLoading(false);
  }, []);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.actor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.details.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || entry.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Audit Log</h1>
            <p className="text-gray-400 text-sm mt-1">
              Track all system activities and changes
            </p>
          </div>
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors">
            <Download className="w-4 h-4" />
            Export Logs
          </button>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Categories</option>
              <option value="auth">Authentication</option>
              <option value="billing">Billing</option>
              <option value="admin">Admin</option>
              <option value="content">Content</option>
              <option value="system">System</option>
              <option value="security">Security</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="warning">Warning</option>
            </select>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
        </div>

        {/* Log Entries */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Actor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : paginatedEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No audit entries found
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map((entry) => {
                    const StatusIcon = statusIcons[entry.status];
                    return (
                      <tr key={entry.id} className="hover:bg-gray-750">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <Clock className="w-4 h-4" />
                            {formatTimestamp(entry.timestamp)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white font-medium">{entry.action}</p>
                          {entry.target && (
                            <p className="text-gray-500 text-xs">
                              {entry.target.type}: {entry.target.name}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${categoryColors[entry.category]}`}>
                            {entry.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-white text-sm">{entry.actor.name}</p>
                              <p className="text-gray-500 text-xs">{entry.actor.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusIcon className={`w-5 h-5 ${statusColors[entry.status]}`} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedEntry(entry)}
                            className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
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
                {Math.min(currentPage * itemsPerPage, filteredEntries.length)} of{" "}
                {filteredEntries.length} entries
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
        {selectedEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl border border-gray-700 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Audit Entry Details</h2>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="p-1 rounded hover:bg-gray-700 text-gray-400"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Timestamp</p>
                    <p className="text-white">{new Date(selectedEntry.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Action</p>
                    <p className="text-white">{selectedEntry.action}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Category</p>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${categoryColors[selectedEntry.category]}`}>
                      {selectedEntry.category}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p className={`capitalize ${statusColors[selectedEntry.status]}`}>
                      {selectedEntry.status}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Actor</p>
                  <p className="text-white">{selectedEntry.actor.name} ({selectedEntry.actor.email})</p>
                  <p className="text-gray-500 text-sm">Role: {selectedEntry.actor.role}</p>
                </div>

                {selectedEntry.target && (
                  <div>
                    <p className="text-xs text-gray-500">Target</p>
                    <p className="text-white">{selectedEntry.target.type}: {selectedEntry.target.name}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-500">Details</p>
                  <p className="text-white">{selectedEntry.details}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">IP Address</p>
                    <p className="text-white font-mono">{selectedEntry.ipAddress}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">User Agent</p>
                    <p className="text-white text-sm">{selectedEntry.userAgent}</p>
                  </div>
                </div>

                {selectedEntry.metadata && Object.keys(selectedEntry.metadata).length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Metadata</p>
                    <pre className="bg-gray-900 rounded-lg p-4 text-sm text-gray-300 overflow-x-auto">
                      {JSON.stringify(selectedEntry.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
