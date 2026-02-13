import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Flag,
  Plus,
  Search,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Users,
  Percent,
  Globe,
  CreditCard,
  X,
  Save,
} from "lucide-react";

interface FeatureFlag {
  id: number;
  key: string;
  name: string;
  description: string;
  defaultState: boolean;
  isActive: boolean;
  rules: {
    plans?: string[];
    userIds?: number[];
    percentage?: number;
    regions?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export default function AdminFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);

  // Mock data
  useEffect(() => {
    setFlags([
      {
        id: 1,
        key: "new_video_studio",
        name: "New Video Studio",
        description: "Enable the redesigned video studio with AI enhancements",
        defaultState: false,
        isActive: true,
        rules: { plans: ["agency", "agency_plus"], percentage: 50 },
        createdAt: "2025-01-01",
        updatedAt: "2025-01-05",
      },
      {
        id: 2,
        key: "brand_brain_v2",
        name: "Brand Brain V2",
        description: "Next generation brand intelligence features",
        defaultState: false,
        isActive: true,
        rules: { plans: ["agency_plus"] },
        createdAt: "2024-12-15",
        updatedAt: "2024-12-20",
      },
      {
        id: 3,
        key: "multi_language_support",
        name: "Multi-Language Support",
        description: "Enable content generation in multiple languages",
        defaultState: true,
        isActive: true,
        rules: {},
        createdAt: "2024-11-01",
        updatedAt: "2024-11-01",
      },
      {
        id: 4,
        key: "beta_analytics",
        name: "Beta Analytics Dashboard",
        description: "New analytics dashboard with AI insights",
        defaultState: false,
        isActive: false,
        rules: { userIds: [1, 2, 3] },
        createdAt: "2025-01-03",
        updatedAt: "2025-01-03",
      },
    ]);
    setLoading(false);
  }, []);

  const toggleFlag = (flagId: number) => {
    setFlags(flags.map(f => 
      f.id === flagId ? { ...f, isActive: !f.isActive } : f
    ));
  };

  const toggleDefaultState = (flagId: number) => {
    setFlags(flags.map(f => 
      f.id === flagId ? { ...f, defaultState: !f.defaultState } : f
    ));
  };

  const filteredFlags = flags.filter(flag =>
    flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    flag.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Feature Flags</h1>
            <p className="text-gray-400 text-sm mt-1">
              Control feature rollouts and A/B testing
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Flag
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search flags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Flags Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 text-center py-8 text-gray-400">
              Loading feature flags...
            </div>
          ) : filteredFlags.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-gray-400">
              No feature flags found
            </div>
          ) : (
            filteredFlags.map((flag) => (
              <div
                key={flag.id}
                className={`bg-gray-800 rounded-xl p-6 border transition-colors ${
                  flag.isActive ? "border-emerald-500/50" : "border-gray-700"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${flag.isActive ? "bg-emerald-500/20" : "bg-gray-700"}`}>
                      <Flag className={`w-5 h-5 ${flag.isActive ? "text-emerald-500" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{flag.name}</h3>
                      <p className="text-gray-500 text-xs font-mono">{flag.key}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFlag(flag.id)}
                    className="focus:outline-none"
                  >
                    {flag.isActive ? (
                      <ToggleRight className="w-8 h-8 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-500" />
                    )}
                  </button>
                </div>

                <p className="text-gray-400 text-sm mb-4">{flag.description}</p>

                {/* Rules */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {flag.rules.plans && flag.rules.plans.length > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded text-xs text-purple-400">
                      <CreditCard className="w-3 h-3" />
                      {flag.rules.plans.join(", ")}
                    </div>
                  )}
                  {flag.rules.percentage !== undefined && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded text-xs text-blue-400">
                      <Percent className="w-3 h-3" />
                      {flag.rules.percentage}% rollout
                    </div>
                  )}
                  {flag.rules.userIds && flag.rules.userIds.length > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 rounded text-xs text-orange-400">
                      <Users className="w-3 h-3" />
                      {flag.rules.userIds.length} specific users
                    </div>
                  )}
                  {flag.rules.regions && flag.rules.regions.length > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-cyan-500/20 rounded text-xs text-cyan-400">
                      <Globe className="w-3 h-3" />
                      {flag.rules.regions.join(", ")}
                    </div>
                  )}
                </div>

                {/* Default State */}
                <div className="flex items-center justify-between py-2 border-t border-gray-700">
                  <span className="text-sm text-gray-400">Default State</span>
                  <button
                    onClick={() => toggleDefaultState(flag.id)}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      flag.defaultState
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {flag.defaultState ? "ON" : "OFF"}
                  </button>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <span className="text-xs text-gray-500">
                    Updated {formatDate(flag.updatedAt)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingFlag(flag)}
                      className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create/Edit Modal */}
        {(showCreateModal || editingFlag) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">
                  {editingFlag ? "Edit Feature Flag" : "Create Feature Flag"}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingFlag(null);
                  }}
                  className="p-1 rounded hover:bg-gray-700 text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Flag Key</label>
                  <input
                    type="text"
                    defaultValue={editingFlag?.key}
                    placeholder="e.g., new_feature_v2"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    defaultValue={editingFlag?.name}
                    placeholder="e.g., New Feature V2"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea
                    defaultValue={editingFlag?.description}
                    placeholder="Describe what this flag controls..."
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Rollout Percentage</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={editingFlag?.rules.percentage || 100}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Target Plans</label>
                  <div className="flex flex-wrap gap-2">
                    {["free", "basic", "agency", "agency_plus"].map((plan) => (
                      <label key={plan} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          defaultChecked={editingFlag?.rules.plans?.includes(plan)}
                          className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-gray-300 capitalize">{plan.replace("_", " ")}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingFlag(null);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm flex items-center gap-2 transition-colors">
                  <Save className="w-4 h-4" />
                  {editingFlag ? "Save Changes" : "Create Flag"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
