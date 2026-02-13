import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Activity,
  Server,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Play,
  Pause,
  Trash2,
  Eye,
  BarChart3,
} from "lucide-react";

interface SystemMetric {
  name: string;
  value: number;
  max: number;
  unit: string;
  status: "healthy" | "warning" | "critical";
}

interface QueueStats {
  name: string;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  avgProcessTime: number;
  status: "running" | "paused" | "stalled";
}

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "outage";
  uptime: number;
  lastIncident?: string;
  responseTime: number;
}

export default function AdminSystemHealth() {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [queues, setQueues] = useState<QueueStats[]>([]);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Mock data
  useEffect(() => {
    setMetrics([
      { name: "CPU Usage", value: 45, max: 100, unit: "%", status: "healthy" },
      { name: "Memory Usage", value: 68, max: 100, unit: "%", status: "healthy" },
      { name: "Disk Usage", value: 72, max: 100, unit: "%", status: "warning" },
      { name: "Network I/O", value: 125, max: 1000, unit: "MB/s", status: "healthy" },
    ]);

    setQueues([
      {
        name: "image-generation",
        pending: 45,
        processing: 8,
        completed: 12450,
        failed: 23,
        avgProcessTime: 4.5,
        status: "running",
      },
      {
        name: "video-generation",
        pending: 12,
        processing: 3,
        completed: 3210,
        failed: 8,
        avgProcessTime: 45.2,
        status: "running",
      },
      {
        name: "email-notifications",
        pending: 0,
        processing: 0,
        completed: 8920,
        failed: 12,
        avgProcessTime: 0.8,
        status: "running",
      },
      {
        name: "content-moderation",
        pending: 156,
        processing: 10,
        completed: 45600,
        failed: 45,
        avgProcessTime: 2.1,
        status: "running",
      },
      {
        name: "analytics-processing",
        pending: 890,
        processing: 0,
        completed: 125000,
        failed: 120,
        avgProcessTime: 0.3,
        status: "paused",
      },
    ]);

    setServices([
      { name: "API Server", status: "operational", uptime: 99.99, responseTime: 45 },
      { name: "Database", status: "operational", uptime: 99.98, responseTime: 12 },
      { name: "Redis Cache", status: "operational", uptime: 99.99, responseTime: 2 },
      { name: "S3 Storage", status: "operational", uptime: 99.99, responseTime: 85 },
      { name: "AI Services", status: "degraded", uptime: 98.5, lastIncident: "High latency", responseTime: 450 },
      { name: "CDN", status: "operational", uptime: 99.99, responseTime: 15 },
    ]);

    setLoading(false);
    setLastUpdated(new Date());
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "operational":
      case "running":
        return "text-emerald-500";
      case "warning":
      case "degraded":
      case "paused":
        return "text-yellow-500";
      case "critical":
      case "outage":
      case "stalled":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-emerald-500";
      case "warning":
        return "bg-yellow-500";
      case "critical":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const overallStatus = services.every((s) => s.status === "operational")
    ? "operational"
    : services.some((s) => s.status === "outage")
    ? "outage"
    : "degraded";

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">System Health</h1>
            <p className="text-gray-400 text-sm mt-1">
              Monitor infrastructure and job queues
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
            <button
              onClick={() => setLastUpdated(new Date())}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Overall Status Banner */}
        <div
          className={`rounded-xl p-4 border ${
            overallStatus === "operational"
              ? "bg-emerald-500/10 border-emerald-500/30"
              : overallStatus === "degraded"
              ? "bg-yellow-500/10 border-yellow-500/30"
              : "bg-red-500/10 border-red-500/30"
          }`}
        >
          <div className="flex items-center gap-3">
            {overallStatus === "operational" ? (
              <CheckCircle className="w-6 h-6 text-emerald-500" />
            ) : overallStatus === "degraded" ? (
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500" />
            )}
            <div>
              <p className={`font-medium ${getStatusColor(overallStatus)}`}>
                {overallStatus === "operational"
                  ? "All Systems Operational"
                  : overallStatus === "degraded"
                  ? "Some Systems Degraded"
                  : "System Outage Detected"}
              </p>
              <p className="text-sm text-gray-400">
                {services.filter((s) => s.status === "operational").length} of {services.length} services operational
              </p>
            </div>
          </div>
        </div>

        {/* System Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <div key={metric.name} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-400">{metric.name}</p>
                <div className={`w-2 h-2 rounded-full ${getProgressColor(metric.status)}`} />
              </div>
              <p className="text-2xl font-bold text-white mb-2">
                {metric.value}
                <span className="text-sm text-gray-400 ml-1">{metric.unit}</span>
              </p>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getProgressColor(metric.status)}`}
                  style={{ width: `${(metric.value / metric.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Services Status */}
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-gray-400" />
              Services
            </h2>
          </div>
          <div className="divide-y divide-gray-700">
            {services.map((service) => (
              <div key={service.name} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      service.status === "operational"
                        ? "bg-emerald-500"
                        : service.status === "degraded"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                  />
                  <div>
                    <p className="text-white font-medium">{service.name}</p>
                    {service.lastIncident && (
                      <p className="text-yellow-500 text-xs">{service.lastIncident}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="text-gray-400">Uptime</p>
                    <p className="text-white">{service.uptime}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400">Response</p>
                    <p className="text-white">{service.responseTime}ms</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Job Queues */}
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-400" />
              Job Queues
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Queue
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Pending
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Processing
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Completed
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Failed
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Avg Time
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {queues.map((queue) => (
                  <tr key={queue.name} className="hover:bg-gray-750">
                    <td className="px-4 py-3">
                      <span className="text-white font-mono">{queue.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          queue.status === "running"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : queue.status === "paused"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {queue.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {queue.pending.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-400">
                      {queue.processing}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400">
                      {queue.completed.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-red-400">
                      {queue.failed}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {queue.avgProcessTime}s
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {queue.status === "running" ? (
                          <button className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-yellow-400 transition-colors" title="Pause">
                            <Pause className="w-4 h-4" />
                          </button>
                        ) : (
                          <button className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-emerald-400 transition-colors" title="Resume">
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <button className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="View Jobs">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors" title="Clear Failed">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
