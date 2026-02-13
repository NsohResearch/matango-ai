import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Download,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface RevenueStats {
  mrr: number;
  arr: number;
  mrrGrowth: number;
  churnRate: number;
  ltv: number;
  arpu: number;
  activeSubscriptions: number;
  trialConversions: number;
}

interface Subscription {
  id: number;
  tenantName: string;
  email: string;
  plan: string;
  status: "active" | "trialing" | "past_due" | "canceled" | "paused";
  mrr: number;
  startDate: string;
  nextBillingDate: string;
  stripeSubscriptionId: string;
}

const statusColors = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  trialing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  past_due: "bg-red-500/20 text-red-400 border-red-500/30",
  canceled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  paused: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

export default function AdminBilling() {
  const [stats, setStats] = useState<RevenueStats>({
    mrr: 0,
    arr: 0,
    mrrGrowth: 0,
    churnRate: 0,
    ltv: 0,
    arpu: 0,
    activeSubscriptions: 0,
    trialConversions: 0,
  });
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Mock data
  useEffect(() => {
    setStats({
      mrr: 12450,
      arr: 149400,
      mrrGrowth: 12.5,
      churnRate: 2.3,
      ltv: 2890,
      arpu: 285,
      activeSubscriptions: 156,
      trialConversions: 34,
    });

    setSubscriptions([
      {
        id: 1,
        tenantName: "Acme Corp",
        email: "admin@acme.com",
        plan: "agency",
        status: "active",
        mrr: 399,
        startDate: "2024-06-15",
        nextBillingDate: "2025-02-15",
        stripeSubscriptionId: "sub_abc123",
      },
      {
        id: 2,
        tenantName: "StartupXYZ",
        email: "founder@startupxyz.io",
        plan: "basic",
        status: "active",
        mrr: 199,
        startDate: "2024-09-22",
        nextBillingDate: "2025-02-22",
        stripeSubscriptionId: "sub_def456",
      },
      {
        id: 3,
        tenantName: "Creative Agency",
        email: "hello@creative.agency",
        plan: "agency_plus",
        status: "active",
        mrr: 999,
        startDate: "2024-03-10",
        nextBillingDate: "2025-02-10",
        stripeSubscriptionId: "sub_ghi789",
      },
      {
        id: 4,
        tenantName: "New User",
        email: "newuser@gmail.com",
        plan: "basic",
        status: "trialing",
        mrr: 0,
        startDate: "2025-01-02",
        nextBillingDate: "2025-01-09",
        stripeSubscriptionId: "sub_jkl012",
      },
      {
        id: 5,
        tenantName: "Late Payer",
        email: "late@company.com",
        plan: "agency",
        status: "past_due",
        mrr: 399,
        startDate: "2024-08-01",
        nextBillingDate: "2025-01-01",
        stripeSubscriptionId: "sub_mno345",
      },
    ]);
    setLoading(false);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch =
      sub.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage);
  const paginatedSubscriptions = filteredSubscriptions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Billing & Revenue</h1>
            <p className="text-gray-400 text-sm mt-1">
              Monitor subscriptions and revenue metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors">
              <ExternalLink className="w-4 h-4" />
              Open Stripe
            </button>
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-400">Monthly Recurring Revenue</p>
                <p className="text-2xl font-bold text-white mt-1">{formatCurrency(stats.mrr)}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-500 text-sm">+{stats.mrrGrowth}%</span>
                  <span className="text-gray-500 text-sm">vs last month</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/20">
                <DollarSign className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-400">Annual Recurring Revenue</p>
                <p className="text-2xl font-bold text-white mt-1">{formatCurrency(stats.arr)}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/20">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Subscriptions</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.activeSubscriptions}</p>
                <p className="text-gray-500 text-sm mt-2">
                  {stats.trialConversions} trials converting
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/20">
                <Users className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-400">Churn Rate</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.churnRate}%</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingDown className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-500 text-sm">-0.5%</span>
                  <span className="text-gray-500 text-sm">vs last month</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-red-500/20">
                <TrendingDown className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="text-sm text-gray-400">Average Revenue Per User</p>
            <p className="text-xl font-bold text-white mt-1">{formatCurrency(stats.arpu)}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="text-sm text-gray-400">Customer Lifetime Value</p>
            <p className="text-xl font-bold text-white mt-1">{formatCurrency(stats.ltv)}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="text-sm text-gray-400">Trial Conversion Rate</p>
            <p className="text-xl font-bold text-white mt-1">
              {((stats.trialConversions / (stats.trialConversions + 20)) * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search subscriptions..."
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
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="past_due">Past Due</option>
                <option value="canceled">Canceled</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Tenant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Plan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    MRR
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Next Billing
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
                      Loading subscriptions...
                    </td>
                  </tr>
                ) : paginatedSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No subscriptions found
                    </td>
                  </tr>
                ) : (
                  paginatedSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-750">
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-white font-medium">{sub.tenantName}</p>
                          <p className="text-sm text-gray-400">{sub.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-white capitalize">{sub.plan.replace("_", " ")}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[sub.status]}`}>
                          {sub.status.replace("_", " ").charAt(0).toUpperCase() + sub.status.slice(1).replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-white">
                        {formatCurrency(sub.mrr)}
                      </td>
                      <td className="px-4 py-4 text-gray-400">
                        {formatDate(sub.nextBillingDate)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors">
                            View in Stripe
                          </button>
                          {sub.status === "active" && (
                            <button className="px-3 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded text-sm transition-colors">
                              Pause
                            </button>
                          )}
                          {sub.status === "paused" && (
                            <button className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded text-sm transition-colors">
                              Resume
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
                {Math.min(currentPage * itemsPerPage, filteredSubscriptions.length)} of{" "}
                {filteredSubscriptions.length} results
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
      </div>
    </AdminLayout>
  );
}
