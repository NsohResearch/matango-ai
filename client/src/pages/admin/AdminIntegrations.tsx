import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Plug,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Clock,
  Activity,
  Webhook,
  Key,
  Settings,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
} from "lucide-react";

interface Integration {
  id: string;
  name: string;
  type: "oauth" | "api" | "webhook";
  status: "healthy" | "degraded" | "down";
  lastChecked: string;
  uptime: number;
  latency: number;
  errorRate: number;
  config: {
    clientId?: string;
    webhookUrl?: string;
    apiVersion?: string;
  };
}

interface WebhookEvent {
  id: number;
  endpoint: string;
  event: string;
  status: "delivered" | "failed" | "pending";
  timestamp: string;
  responseCode?: number;
  retryCount: number;
  payload?: string;
}

const statusColors = {
  healthy: "bg-emerald-500",
  degraded: "bg-yellow-500",
  down: "bg-red-500",
};

const statusBgColors = {
  healthy: "bg-emerald-500/20 text-emerald-400",
  degraded: "bg-yellow-500/20 text-yellow-400",
  down: "bg-red-500/20 text-red-400",
};

export default function AdminIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"integrations" | "webhooks">("integrations");
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  // Mock data
  useEffect(() => {
    setIntegrations([
      {
        id: "google-oauth",
        name: "Google OAuth",
        type: "oauth",
        status: "healthy",
        lastChecked: "2025-01-08T19:50:00Z",
        uptime: 99.98,
        latency: 145,
        errorRate: 0.02,
        config: { clientId: "xxx...xxx.apps.googleusercontent.com" },
      },
      {
        id: "stripe",
        name: "Stripe",
        type: "api",
        status: "healthy",
        lastChecked: "2025-01-08T19:50:00Z",
        uptime: 99.99,
        latency: 89,
        errorRate: 0.01,
        config: { apiVersion: "2024-12-18" },
      },
      {
        id: "instagram",
        name: "Instagram API",
        type: "oauth",
        status: "degraded",
        lastChecked: "2025-01-08T19:50:00Z",
        uptime: 98.5,
        latency: 450,
        errorRate: 1.5,
        config: { clientId: "xxx...xxx" },
      },
      {
        id: "tiktok",
        name: "TikTok API",
        type: "oauth",
        status: "healthy",
        lastChecked: "2025-01-08T19:50:00Z",
        uptime: 99.8,
        latency: 210,
        errorRate: 0.2,
        config: { clientId: "xxx...xxx" },
      },
      {
        id: "mailgun",
        name: "Mailgun",
        type: "api",
        status: "healthy",
        lastChecked: "2025-01-08T19:50:00Z",
        uptime: 99.95,
        latency: 120,
        errorRate: 0.05,
        config: {},
      },
      {
        id: "openai",
        name: "OpenAI API",
        type: "api",
        status: "healthy",
        lastChecked: "2025-01-08T19:50:00Z",
        uptime: 99.9,
        latency: 350,
        errorRate: 0.1,
        config: { apiVersion: "v1" },
      },
    ]);

    setWebhookEvents([
      {
        id: 1,
        endpoint: "stripe",
        event: "invoice.payment_succeeded",
        status: "delivered",
        timestamp: "2025-01-08T19:45:00Z",
        responseCode: 200,
        retryCount: 0,
      },
      {
        id: 2,
        endpoint: "stripe",
        event: "customer.subscription.updated",
        status: "delivered",
        timestamp: "2025-01-08T19:30:00Z",
        responseCode: 200,
        retryCount: 0,
      },
      {
        id: 3,
        endpoint: "instagram",
        event: "media.comment",
        status: "failed",
        timestamp: "2025-01-08T19:15:00Z",
        responseCode: 500,
        retryCount: 3,
      },
      {
        id: 4,
        endpoint: "stripe",
        event: "invoice.payment_failed",
        status: "delivered",
        timestamp: "2025-01-08T19:00:00Z",
        responseCode: 200,
        retryCount: 0,
      },
      {
        id: 5,
        endpoint: "tiktok",
        event: "video.published",
        status: "pending",
        timestamp: "2025-01-08T18:45:00Z",
        retryCount: 1,
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "degraded":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "down":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const healthyCount = integrations.filter((i) => i.status === "healthy").length;
  const degradedCount = integrations.filter((i) => i.status === "degraded").length;
  const downCount = integrations.filter((i) => i.status === "down").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Integrations & Webhooks</h1>
            <p className="text-gray-400 text-sm mt-1">
              Monitor third-party services and webhook delivery
            </p>
          </div>
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Refresh All
          </button>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Integrations</p>
                <p className="text-2xl font-bold text-white mt-1">{integrations.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/20">
                <Plug className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Healthy</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{healthyCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/20">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Degraded</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{degradedCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/20">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Down</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{downCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/20">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab("integrations")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "integrations"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Plug className="w-4 h-4" />
              Integrations
            </button>
            <button
              onClick={() => setActiveTab("webhooks")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "webhooks"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Webhook className="w-4 h-4" />
              Webhook Events
            </button>
          </nav>
        </div>

        {/* Integrations Tab */}
        {activeTab === "integrations" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-2 text-center py-8 text-gray-400">
                Loading integrations...
              </div>
            ) : (
              integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${statusColors[integration.status]}`} />
                      <div>
                        <h3 className="text-white font-medium">{integration.name}</h3>
                        <p className="text-gray-500 text-xs capitalize">{integration.type}</p>
                      </div>
                    </div>
                    {getStatusIcon(integration.status)}
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Uptime</p>
                      <p className="text-white font-medium">{integration.uptime}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Latency</p>
                      <p className="text-white font-medium">{integration.latency}ms</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Error Rate</p>
                      <p className="text-white font-medium">{integration.errorRate}%</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                    <span className="text-xs text-gray-500">
                      Last checked: {formatTimestamp(integration.lastChecked)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                        <Settings className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Webhooks Tab */}
        {activeTab === "webhooks" && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Endpoint
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Event
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Response
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {webhookEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3 text-gray-400 text-sm">
                        {formatTimestamp(event.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white capitalize">{event.endpoint}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-300 font-mono text-sm">{event.event}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            event.status === "delivered"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : event.status === "failed"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {event.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {event.responseCode || "-"}
                        {event.retryCount > 0 && (
                          <span className="ml-2 text-xs text-yellow-500">
                            ({event.retryCount} retries)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {event.status === "failed" && (
                          <button className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm flex items-center gap-1 ml-auto transition-colors">
                            <RotateCcw className="w-3 h-3" />
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
