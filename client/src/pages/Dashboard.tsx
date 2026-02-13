import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import AAOOnboardingWizard from "@/components/AAOOnboardingWizard";
import AAOActivityWidget from "@/components/AAOActivityWidget";
import GrowthLoopCard from "@/components/GrowthLoopCard";
import OnboardingGate from "@/components/OnboardingGate";
import { 
  Plus, 
  Sparkles, 
  Users, 
  Image, 
  CreditCard, 
  Loader2, 
  MessageCircle, 
  Calendar, 
  BarChart3, 
  ArrowRight,
  FileText,
  Film,
  Bell,
  UserPlus,
  Share2,
  Beaker,
  Crown,
  Brain,
  Layers,
  Video,
  Target,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  Clock,
  Zap
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const completeOnboardingMutation = trpc.auth.completeOnboarding.useMutation();
  
  // Check if user needs onboarding (first time users)
  useEffect(() => {
    if (user && !user.onboardingCompleted) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, [user]);
  
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    completeOnboardingMutation.mutate();
  };
  
  const { data: influencers, isLoading: influencersLoading } = trpc.influencer.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: scheduledPosts } = trpc.schedule.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: dashboard } = trpc.analytics.getDashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: unreadNotifications } = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: socialConnections } = trpc.socialConnections.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: abTests } = trpc.abTests.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: brandBrain } = trpc.brandBrain.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Check if Brand Brain is configured
  const isBrandBrainConfigured = brandBrain && brandBrain.productName && brandBrain.productName.trim() !== '';

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <RefreshCw className="w-12 h-12 text-primary mb-6 loop-rotate" />
          <h1 className="text-3xl font-bold mb-4">Start Your Growth Loop</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            Sign in to access your Brand Brain and start building your always-on marketing system.
          </p>
          <a href={getLoginUrl()}>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8">
              Build Your Brand Brain
            </Button>
          </a>
        </div>
      </div>
    );
  }

  const connectedPlatforms = socialConnections?.filter((c: any) => c.isActive)?.length || 0;
  const runningTests = abTests?.filter((t: any) => t.status === 'running')?.length || 0;



  // Quick actions organized by purpose
  const createActions = [
    {
      title: "Influencer Studio",
      description: "Create & train AI characters",
      icon: Sparkles,
      href: "/studio",
    },
    {
      title: "Video Lab",
      description: "Lip-sync & animation",
      icon: Video,
      href: "/video-studio",
    },
    {
      title: "Templates",
      description: "Pre-built content prompts",
      icon: FileText,
      href: "/templates",
    },
  ];

  const manageActions = [
    {
      title: "Chat",
      description: "Talk with AI influencers",
      icon: MessageCircle,
      href: influencers && influencers.length > 0 ? `/chat/${influencers[0].id}` : "/create",
    },
    {
      title: "Schedule",
      description: "Content calendar",
      icon: Calendar,
      href: "/schedule",
      badge: scheduledPosts?.length ? `${scheduledPosts.length} pending` : undefined,
    },
    {
      title: "Leads CRM",
      description: "Manage prospects",
      icon: Users,
      href: "/leads",
    },
  ];

  const optimizeActions = [
    {
      title: "A/B Testing",
      description: "Optimize campaigns",
      icon: Beaker,
      href: "/ab-testing",
      badge: runningTests > 0 ? `${runningTests} running` : undefined,
    },
    {
      title: "Team",
      description: "Collaborate",
      icon: UserPlus,
      href: "/team",
    },
    {
      title: "White Label",
      description: "Agency branding",
      icon: Crown,
      href: "/white-label",
      badge: "Agency",
    },
  ];

  return (
    <OnboardingGate>
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      {/* AAO Onboarding Wizard */}
      <AAOOnboardingWizard
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
      />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.name || 'Creator'}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" />
              Your growth loop is running
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/notifications">
              <Button variant="outline" className="relative border-border">
                <Bell className="w-4 h-4" />
                {unreadNotifications && unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Button>
            </Link>
            <Link href="/brand-brain">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full">
                <Brain className="w-4 h-4 mr-2" />
                Brand Brain
              </Button>
            </Link>
          </div>
        </div>

        {/* The 5-Step Growth Loop */}
        <GrowthLoopCard
          isBrandBrainConfigured={isBrandBrainConfigured}
          connectedPlatforms={connectedPlatforms}
          runningTests={runningTests}
          brandBrainName={brandBrain?.productName}
        />
        
        {/* AAO Activity Widget + Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* AAO Activity Widget - takes 1 column on mobile, spans full width on larger screens */}
          <div className="md:col-span-1">
            <AAOActivityWidget compact />
          </div>
          
          {/* Stats Cards - 3 columns on larger screens */}
          <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-xs">
                <Users className="w-3 h-3" />
                AI Influencers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{influencers?.length || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-xs">
                <TrendingUp className="w-3 h-3" />
                Total Reach
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard?.totalFollowers?.toLocaleString() || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-xs">
                <Zap className="w-3 h-3" />
                Credits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{user?.credits || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-xs">
                <CreditCard className="w-3 h-3" />
                Plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="bg-primary/20 text-primary border-none capitalize">
                {user?.plan || 'Free'}
              </Badge>
            </CardContent>
          </Card>
          </div>
        </div>

        {/* Action Sections */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Create Section */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Create
            </h2>
            <div className="space-y-2">
              {createActions.map((action) => (
                <Link key={action.title} href={action.href}>
                  <Card className="bg-card border-border hover:border-primary/30 transition-all cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <action.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{action.title}</h3>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Manage Section */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-accent" />
              Manage
            </h2>
            <div className="space-y-2">
              {manageActions.map((action) => (
                <Link key={action.title} href={action.href}>
                  <Card className="bg-card border-border hover:border-primary/30 transition-all cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <action.icon className="w-4 h-4 text-accent" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{action.title}</h3>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                      {action.badge ? (
                        <Badge variant="secondary" className="text-xs bg-accent/10 text-accent border-none">
                          {action.badge}
                        </Badge>
                      ) : (
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Optimize Section */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" />
              Optimize
            </h2>
            <div className="space-y-2">
              {optimizeActions.map((action) => (
                <Link key={action.title} href={action.href}>
                  <Card className="bg-card border-border hover:border-primary/30 transition-all cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <action.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{action.title}</h3>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                      {action.badge ? (
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-none">
                          {action.badge}
                        </Badge>
                      ) : (
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* My Influencers */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">My AI Influencers</h2>
            <Link href="/create">
              <Button variant="outline" size="sm" className="border-border">
                <Plus className="w-4 h-4 mr-2" />
                Create New
              </Button>
            </Link>
          </div>
          
          {influencersLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : influencers && influencers.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {influencers.slice(0, 6).map((influencer: any) => (
                <Link key={influencer.id} href={`/influencer/${influencer.id}`}>
                  <Card className="bg-card border-border hover:border-primary/30 transition-all cursor-pointer overflow-hidden">
                    <div className="aspect-square relative">
                      <img 
                        src={influencer.avatarUrl || "/placeholder-avatar.jpg"} 
                        alt={influencer.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <h3 className="font-bold text-sm text-white truncate">{influencer.name}</h3>
                        <p className="text-xs text-white/70">@{influencer.handle}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="py-12 text-center">
                <Sparkles className="w-12 h-12 text-primary/50 mx-auto mb-4" />
                <h3 className="font-bold mb-2">No influencers yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Create your first AI influencer to start the growth loop
                </p>
                <Link href="/create">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Influencer
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
    </OnboardingGate>
  );
}
