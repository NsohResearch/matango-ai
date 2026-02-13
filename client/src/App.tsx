import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Discover from "./pages/Discover";
import Pricing from "./pages/Pricing";
import InfluencerDetail from "./pages/InfluencerDetail";
import Dashboard from "./pages/Dashboard";
import CreateInfluencer from "./pages/CreateInfluencer";
import Chat from "./pages/Chat";
import Schedule from "./pages/Schedule";
import Analytics from "./pages/Analytics";
import Templates from "./pages/Templates";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import Notifications from "./pages/Notifications";
import Team from "./pages/Team";
import BrandBrain from "./pages/BrandBrain";
import CampaignFactory from "./pages/CampaignFactory";
import InfluencerStudio from "./pages/InfluencerStudio";
import VideoStudio from "./pages/VideoStudio";
import Leads from "./pages/Leads";
import AnalyticsHub from "./pages/AnalyticsHub";
import SocialConnections from "./pages/SocialConnections";
import ABTesting from "./pages/ABTesting";
import WhiteLabel from "./pages/WhiteLabel";
import VideoScripts from "./pages/VideoScripts";
import Brands from "./pages/Brands";
import AdminPortal from "./pages/AdminPortal";
import AdminLeads from "./pages/AdminLeads";
import MeetKah from "./pages/MeetKah";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminTenants from "./pages/admin/AdminTenants";
import AdminTenantDetail from "./pages/admin/AdminTenantDetail";
import AdminBilling from "./pages/admin/AdminBilling";
import AdminFeatureFlags from "./pages/admin/AdminFeatureFlags";
import AdminAuditLog from "./pages/admin/AdminAuditLog";
import AdminIntegrations from "./pages/admin/AdminIntegrations";
import AdminSystemHealth from "./pages/admin/AdminSystemHealth";
import AdminModeration from "./pages/admin/AdminModeration";
import AdminCompliance from "./pages/admin/AdminCompliance";
import AdminGdprRequests from "./pages/admin/AdminGdprRequests";
import VideoStudioPro from "./pages/VideoStudioPro";
import CreateInfluencerPro from "./pages/CreateInfluencerPro";
import GenerationWorkspace from "./pages/GenerationWorkspace";
import KahChatWidget from "./components/KahChatWidget";
import About from "./pages/About";
import TemplateMarketplace from "./pages/TemplateMarketplace";
import AAOGlossary from "./pages/AAOGlossary";
import AAOStudioPage from "./pages/AAOStudioPage";
import AccountSettings from "./pages/AccountSettings";
import AIProvidersPage from "./pages/AIProvidersPage";
import UsageAnalyticsPage from "./pages/UsageAnalyticsPage";
import AssetLibrary from "./pages/AssetLibrary";
import StoryStudio from "./pages/StoryStudio";
import BulkCreate from "./pages/BulkCreate";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/discover" component={Discover} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/meet-kah" component={MeetKah} />
      <Route path="/about" component={About} />
      <Route path="/influencer/:id" component={InfluencerDetail} />
      <Route path="/dashboard" component={Dashboard} />
<Route path="/create-influencer" component={CreateInfluencer} />
      <Route path="/create-influencer-pro" component={CreateInfluencerPro} />
      <Route path="/generation-workspace" component={GenerationWorkspace} />
      <Route path="/generation-workspace/:id" component={GenerationWorkspace} />  <Route path="/chat/:id" component={Chat} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/templates" component={Templates} />
      <Route path="/campaigns" component={Campaigns} />
      <Route path="/campaigns/:id" component={CampaignDetail} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/team" component={Team} />
      <Route path="/brand-brain" component={BrandBrain} />
      <Route path="/campaign-factory" component={CampaignFactory} />
      <Route path="/influencer-studio" component={InfluencerStudio} />
      <Route path="/studio">{() => <Redirect to="/influencer-studio" />}</Route>
      <Route path="/video-studio" component={VideoStudio} />
      <Route path="/video-studio-pro" component={VideoStudioPro} />
      <Route path="/leads" component={Leads} />
      <Route path="/analytics-hub" component={AnalyticsHub} />
      <Route path="/social-connections" component={SocialConnections} />
      <Route path="/social">{() => <Redirect to="/social-connections" />}</Route>
      <Route path="/video">{() => <Redirect to="/video-studio" />}</Route>
      <Route path="/ab-testing" component={ABTesting} />
      <Route path="/white-label" component={WhiteLabel} />
      <Route path="/video-scripts" component={VideoScripts} />
      <Route path="/brands" component={Brands} />
      <Route path="/brands/new" component={Brands} />
      <Route path="/template-marketplace" component={TemplateMarketplace} />
      <Route path="/aao-studio" component={AAOStudioPage} />
      <Route path="/aao-glossary" component={AAOGlossary} />
      <Route path="/account-settings" component={AccountSettings} />
      <Route path="/settings" component={AccountSettings} />
      <Route path="/ai-providers" component={AIProvidersPage} />
      <Route path="/usage-analytics" component={UsageAnalyticsPage} />
      <Route path="/asset-library" component={AssetLibrary} />
      <Route path="/story-studio" component={StoryStudio} />
      <Route path="/bulk-create" component={BulkCreate} />
      <Route path="/admin" component={AdminOverview} />
      <Route path="/admin/tenants" component={AdminTenants} />
      <Route path="/admin/tenants/:id" component={AdminTenantDetail} />
      <Route path="/admin/billing" component={AdminBilling} />
      <Route path="/admin/feature-flags" component={AdminFeatureFlags} />
      <Route path="/admin/audit-log" component={AdminAuditLog} />
      <Route path="/admin/integrations" component={AdminIntegrations} />
      <Route path="/admin/system-health" component={AdminSystemHealth} />
      <Route path="/admin/moderation" component={AdminModeration} />
      <Route path="/admin/compliance" component={AdminCompliance} />
      <Route path="/admin/gdpr" component={AdminGdprRequests} />
      <Route path="/admin/leads" component={AdminLeads} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
          <KahChatWidget />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
