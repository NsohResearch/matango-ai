import { useState, ReactNode } from "react";
import { Link, useLocation, Redirect } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  LayoutDashboard,
  Users,
  Building2,
  CreditCard,
  Flag,
  Link2,
  Server,
  HeadphonesIcon,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  Menu,
  X,
  AlertTriangle,
  Activity,
  FileText,
  Eye,
  UserPlus,
} from "lucide-react";

const navigation = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Tenants", href: "/admin/tenants", icon: Building2 },
  { name: "Sales Leads", href: "/admin/leads", icon: UserPlus },
  { name: "Billing", href: "/admin/billing", icon: CreditCard },
  { name: "Feature Flags", href: "/admin/feature-flags", icon: Flag },
  { name: "Integrations", href: "/admin/integrations", icon: Link2 },
  { name: "System Health", href: "/admin/system-health", icon: Server },
  { name: "Moderation", href: "/admin/moderation", icon: Eye },
  { name: "Compliance", href: "/admin/compliance", icon: FileText },
  { name: "GDPR Requests", href: "/admin/gdpr", icon: Shield },
  { name: "Audit Log", href: "/admin/audit-log", icon: Activity },
];

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, loading } = useAuth();
  const [pathname] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Check if user is admin or super_admin
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="text-lg font-semibold text-white">Admin Console</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>

      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="fixed inset-y-0 left-0 w-64 bg-gray-800 border-r border-gray-700 pt-16"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="px-3 py-4 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? "bg-emerald-600 text-white"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div
        className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ${
          sidebarCollapsed ? "lg:w-16" : "lg:w-64"
        }`}
      >
        <div className="flex flex-col flex-grow bg-gray-800 border-r border-gray-700 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <Activity className="w-6 h-6 text-emerald-500" />
                <span className="text-lg font-semibold text-white">Admin</span>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={sidebarCollapsed ? item.name : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  } ${sidebarCollapsed ? "justify-center" : ""}`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="text-sm font-medium">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-gray-700">
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? "justify-center" : ""}`}>
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-medium">
                {user?.name?.charAt(0) || "A"}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400 truncate capitalize">{user?.role?.replace("_", " ")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div 
        className="pt-14 lg:pt-0 transition-all duration-300"
        style={{ paddingLeft: sidebarCollapsed ? "4rem" : "16rem" }}
      >
        {/* Top bar */}
        <div className="hidden lg:flex sticky top-0 z-30 h-16 bg-gray-800 border-b border-gray-700 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-white">
              {navigation.find((n) => 
                pathname === n.href || 
                (n.href !== "/admin" && pathname.startsWith(n.href))
              )?.name || "Admin Console"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <Link
              href="/"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Exit Admin
            </Link>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
