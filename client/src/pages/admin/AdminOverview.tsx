import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  DollarSign,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Server,
  Image,
  Video,
  Send,
  RefreshCw,
  Pause,
  Play,
  Bell,
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  iconColor?: string;
}

function StatCard({ title, value, change, changeLabel, icon: Icon, iconColor = "text-emerald-500" }: StatCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {change >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={change >= 0 ? "text-emerald-500 text-sm" : "text-red-500 text-sm"}>
                {change >= 0 ? "+" : ""}{change}%
              </span>
              {changeLabel && <span className="text-gray-500 text-sm">{changeLabel}</span>}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-gray-700/50 ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

interface QueueStatusProps {
  name: string;
  pending: number;
  processing: number;
  failed: number;
  icon: React.ElementType;
}

function QueueStatus({ name, pending, processing, failed, icon: Icon }: QueueStatusProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-700 last:border-0">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-gray-400" />
        <span className="text-sm text-white">{name}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4 text-yellow-500" />
          <span className="text-sm text-gray-300">{pending}</span>
        </div>
        <div className="flex items-center gap-1">
          <Activity className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-gray-300">{processing}</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-gray-300">{failed}</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const [stats, setStats] = useState({
    mrr: 0,
    arr: 0,
    churn: 0,
    nrr: 0,
    activeTenants: 0,
    dau: 0,
    wau: 0,
    assetsPerDay: 0,
    publishSuccessRate: 0,
  });

  const [queues, setQueues] = useState({
    imageJobs: { pending: 0, processing: 0, failed: 0 },
    videoJobs: { pending: 0, processing: 0, failed: 0 },
    publishJobs: { pending: 0, processing: 0, failed: 0 },
    webhooks: { pending: 0, processing: 0, failed: 0 },
  });

  const [alerts, setAlerts] = useState<Array<{
    id: number;
    type: "warning" | "error" | "info";
    message: string;
    time: string;
  }>>([]);

  const [systemStatus, setSystemStatus] = useState<"operational" | "degraded" | "maintenance">("operational");

  // TODO: Add trpc.admin.getStats query when backend is ready

  // Mock data for demo
  useEffect(() => {
    setStats({
      mrr: 12450,
      arr: 149400,
      churn: 2.3,
      nrr: 108,
      activeTenants: 156,
      dau: 89,
      wau: 342,
      assetsPerDay: 1247,
      publishSuccessRate: 98.7,
    });

    setQueues({
      imageJobs: { pending: 23, processing: 5, failed: 2 },
      videoJobs: { pending: 8, processing: 3, failed: 0 },
      publishJobs: { pending: 15, processing: 2, failed: 1 },
      webhooks: { pending: 0, processing: 0, failed: 0 },
    });

    setAlerts([
      { id: 1, type: "warning", message: "High API latency detected on image generation", time: "5 min ago" },
      { id: 2, type: "error", message: "Instagram token refresh failed for 3 tenants", time: "12 min ago" },
      { id: 3, type: "info", message: "Scheduled maintenance window in 2 hours", time: "1 hour ago" },
    ]);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* System Status Banner */}
        {systemStatus !== "operational" && (
          <div className={`rounded-lg p-4 flex items-center justify-between ${
            systemStatus === "degraded" ? "bg-yellow-900/30 border border-yellow-700" : "bg-blue-900/30 border border-blue-700"
          }`}>
            <div className="flex items-center gap-3">
              <AlertTriangle className={systemStatus === "degraded" ? "w-5 h-5 text-yellow-500" : "w-5 h-5 text-blue-500"} />
              <span className="text-white">
                {systemStatus === "degraded" 
                  ? "System is operating in degraded mode. Some features may be unavailable."
                  : "Scheduled maintenance is in progress."}
              </span>
            </div>
            <button className="text-sm text-gray-300 hover:text-white">View Details</button>
          </div>
        )}

        {/* Revenue Stats */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Revenue & Growth</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Monthly Recurring Revenue"
              value={formatCurrency(stats.mrr)}
              change={12.5}
              changeLabel="vs last month"
              icon={DollarSign}
              iconColor="text-emerald-500"
            />
            <StatCard
              title="Annual Recurring Revenue"
              value={formatCurrency(stats.arr)}
              change={8.3}
              changeLabel="vs last month"
              icon={TrendingUp}
              iconColor="text-blue-500"
            />
            <StatCard
              title="Churn Rate"
              value={`${stats.churn}%`}
              change={-0.5}
              changeLabel="vs last month"
              icon={TrendingDown}
              iconColor="text-red-500"
            />
            <StatCard
              title="Net Revenue Retention"
              value={`${stats.nrr}%`}
              change={3.2}
              changeLabel="vs last month"
              icon={Activity}
              iconColor="text-purple-500"
            />
          </div>
        </div>

        {/* Platform Stats */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Platform Activity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Active Tenants"
              value={stats.activeTenants}
              change={5}
              changeLabel="this week"
              icon={Building2}
              iconColor="text-cyan-500"
            />
            <StatCard
              title="Daily Active Users"
              value={stats.dau}
              change={12}
              changeLabel="vs yesterday"
              icon={Users}
              iconColor="text-orange-500"
            />
            <StatCard
              title="Assets Generated/Day"
              value={stats.assetsPerDay.toLocaleString()}
              change={18}
              changeLabel="vs last week"
              icon={Image}
              iconColor="text-pink-500"
            />
            <StatCard
              title="Publish Success Rate"
              value={`${stats.publishSuccessRate}%`}
              icon={CheckCircle}
              iconColor="text-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Queue Health */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Queue Health</h2>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600" title="Refresh">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600" title="Pause All">
                  <Pause className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-500 pb-2">
                <span>Queue</span>
                <div className="flex items-center gap-4">
                  <span className="w-12 text-center">Pending</span>
                  <span className="w-12 text-center">Active</span>
                  <span className="w-12 text-center">Failed</span>
                </div>
              </div>
              <QueueStatus name="Image Generation" {...queues.imageJobs} icon={Image} />
              <QueueStatus name="Video Generation" {...queues.videoJobs} icon={Video} />
              <QueueStatus name="Publishing" {...queues.publishJobs} icon={Send} />
              <QueueStatus name="Webhooks" {...queues.webhooks} icon={Server} />
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Alerts</h2>
              <button className="text-sm text-emerald-500 hover:text-emerald-400">View All</button>
            </div>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                  <p>No active alerts</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${
                      alert.type === "error"
                        ? "bg-red-900/20 border-red-800"
                        : alert.type === "warning"
                        ? "bg-yellow-900/20 border-yellow-800"
                        : "bg-blue-900/20 border-blue-800"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle
                        className={`w-5 h-5 flex-shrink-0 ${
                          alert.type === "error"
                            ? "text-red-500"
                            : alert.type === "warning"
                            ? "text-yellow-500"
                            : "text-blue-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors">
              <Pause className="w-4 h-4" />
              Pause Background Workers
            </button>
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors">
              <AlertTriangle className="w-4 h-4" />
              Toggle Degraded Mode
            </button>
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors">
              <Bell className="w-4 h-4" />
              Broadcast Notice
            </button>
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors">
              <RefreshCw className="w-4 h-4" />
              Refresh All Caches
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
