import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { trpc } from "@/lib/trpc";
import { 
  BarChart3, 
  TrendingUp,
  Users,
  Eye,
  Heart,
  DollarSign,
  Target,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  RefreshCw,
  Loader2,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Video,
  Image as ImageIcon,
  FileText,
  Activity
} from "lucide-react";
import { getLoginUrl } from "@/const";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

export default function AnalyticsHub() {
  const { user, loading: authLoading } = useAuth();
  const [timeRange, setTimeRange] = useState("30d");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedInfluencerId, setSelectedInfluencerId] = useState<number | null>(null);

  // ---- Real tRPC queries ----
  const dashboardQuery = trpc.analytics.getDashboard.useQuery(undefined, {
    enabled: !!user,
  });

  const influencerListQuery = trpc.influencer.list.useQuery(undefined, {
    enabled: !!user,
  });

  const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 90;

  const overviewQuery = trpc.analytics.getOverview.useQuery(
    { influencerId: selectedInfluencerId! },
    { enabled: !!user && !!selectedInfluencerId }
  );

  const historyQuery = trpc.analytics.getHistory.useQuery(
    { influencerId: selectedInfluencerId!, days },
    { enabled: !!user && !!selectedInfluencerId }
  );

  // Video and generation stats from real data
  const videoJobsQuery = trpc.videoStudioV2.listJobs.useQuery(
    { influencerId: selectedInfluencerId!, limit: 100 },
    { enabled: !!user && !!selectedInfluencerId }
  );

  // Auto-select first influencer
  const influencers = influencerListQuery.data ?? [];
  useMemo(() => {
    if (influencers.length > 0 && !selectedInfluencerId) {
      setSelectedInfluencerId(influencers[0].id);
    }
  }, [influencers, selectedInfluencerId]);

  const dashboard = dashboardQuery.data;
  const overview = overviewQuery.data;
  const history = historyQuery.data ?? [];
  const videoJobs = videoJobsQuery.data ?? [];

  // Compute real stats
  const videoStats = useMemo(() => {
    const total = videoJobs.length;
    const completed = videoJobs.filter((j: any) => j.status === "completed").length;
    const active = videoJobs.filter((j: any) => j.status === "processing").length;
    const failed = videoJobs.filter((j: any) => j.status === "failed").length;
    return { total, completed, active, failed };
  }, [videoJobs]);

  // Format history data for charts
  const chartData = useMemo(() => {
    return history.map((d: any) => ({
      date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      followers: d.followers,
      followersGain: d.followersGain,
      likes: d.likes,
      views: d.views,
      engagementRate: parseFloat(d.engagementRate),
      posts: d.postsCount,
    }));
  }, [history]);

  // Generate real insights based on actual data
  const insights = useMemo(() => {
    const result: Array<{
      id: string;
      type: "success" | "warning" | "opportunity";
      title: string;
      description: string;
      metric?: string;
    }> = [];

    if (dashboard) {
      if (dashboard.totalInfluencers > 0) {
        result.push({
          id: "inf_count",
          type: "success",
          title: `${dashboard.totalInfluencers} Active Influencer${dashboard.totalInfluencers > 1 ? "s" : ""}`,
          description: `You have ${dashboard.totalInfluencers} influencer${dashboard.totalInfluencers > 1 ? "s" : ""} configured. ${dashboard.totalFollowers > 0 ? `Total reach: ${dashboard.totalFollowers.toLocaleString()} followers.` : "Upload training images and start generating content."}`,
          metric: String(dashboard.totalInfluencers),
        });
      } else {
        result.push({
          id: "no_inf",
          type: "warning",
          title: "No Influencers Created",
          description: "Create your first AI influencer in the Influencer Studio to start generating content and tracking analytics.",
        });
      }

      if (parseFloat(dashboard.avgEngagementRate) > 3) {
        result.push({
          id: "engagement",
          type: "success",
          title: "Strong Engagement Rate",
          description: `Your average engagement rate of ${dashboard.avgEngagementRate}% is above industry average. Keep creating high-quality content.`,
          metric: `${dashboard.avgEngagementRate}%`,
        });
      }
    }

    if (videoStats.completed > 0) {
      result.push({
        id: "video_complete",
        type: "success",
        title: `${videoStats.completed} Video${videoStats.completed > 1 ? "s" : ""} Generated`,
        description: `You've successfully generated ${videoStats.completed} video${videoStats.completed > 1 ? "s" : ""}. ${videoStats.active > 0 ? `${videoStats.active} currently in progress.` : "Generate more to grow your content library."}`,
        metric: String(videoStats.completed),
      });
    }

    if (videoStats.failed > 0) {
      result.push({
        id: "video_failed",
        type: "warning",
        title: `${videoStats.failed} Failed Video Job${videoStats.failed > 1 ? "s" : ""}`,
        description: "Some video generation jobs failed. Check the Video Studio for details and retry.",
        metric: String(videoStats.failed),
      });
    }

    if (result.length === 0) {
      result.push({
        id: "getting_started",
        type: "opportunity",
        title: "Get Started",
        description: "Create influencers, generate content, and track your growth — all from one dashboard.",
      });
    }

    return result;
  }, [dashboard, videoStats]);

  const insightIcons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
    opportunity: <Lightbulb className="w-5 h-5 text-blue-400" />,
  };

  const insightColors = {
    success: "border-green-500/30 bg-green-500/10",
    warning: "border-yellow-500/30 bg-yellow-500/10",
    opportunity: "border-blue-500/30 bg-blue-500/10",
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <BarChart3 className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Analytics Hub</h1>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Get real-time insights and analytics across all your influencer campaigns. Sign in to view your data.
          </p>
          <Button asChild size="lg" className="bg-primary text-primary-foreground">
            <a href={getLoginUrl()}>Sign In to Continue</a>
          </Button>
        </div>
      </div>
    );
  }

  const isLoading = dashboardQuery.isLoading || influencerListQuery.isLoading;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">Analytics Hub</h1>
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                <Activity className="w-3 h-3 mr-1" />
                Live Data
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Real-time analytics from your influencer campaigns and content generation.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {influencers.length > 1 && (
              <Select 
                value={selectedInfluencerId?.toString() ?? undefined} 
                onValueChange={(v) => setSelectedInfluencerId(Number(v))}
              >
                <SelectTrigger className="w-[180px] bg-white/5 border-white/10">
                  <Users className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Select Influencer" />
                </SelectTrigger>
                <SelectContent>
                  {influencers.map((inf) => (
                    <SelectItem key={inf.id} value={inf.id.toString()}>
                      {inf.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px] bg-white/5 border-white/10">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              className="border-white/10"
              onClick={() => {
                dashboardQuery.refetch();
                overviewQuery.refetch();
                historyQuery.refetch();
                videoJobsQuery.refetch();
              }}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading analytics...</span>
          </div>
        ) : (
          <>
            {/* AI Insights Banner */}
            <Card className="mb-8 bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 border-primary/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/20">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">Insights</h3>
                    <p className="text-muted-foreground mb-4">
                      Based on your actual platform data and content generation activity.
                    </p>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {insights.map((insight) => (
                        <div
                          key={insight.id}
                          className={`p-4 rounded-lg border ${insightColors[insight.type]}`}
                        >
                          <div className="flex items-start gap-3">
                            {insightIcons[insight.type]}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm mb-1">{insight.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-3">
                                {insight.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics - Real Data */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <Badge className="bg-primary/20 text-primary text-xs">
                      {dashboard?.totalInfluencers ?? 0}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold">
                    {dashboard?.totalFollowers 
                      ? dashboard.totalFollowers >= 1000 
                        ? `${(dashboard.totalFollowers / 1000).toFixed(1)}K` 
                        : dashboard.totalFollowers
                      : "0"}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Followers</p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Heart className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">{dashboard?.avgEngagementRate ?? "0.00"}%</p>
                  <p className="text-sm text-muted-foreground">Avg Engagement</p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Heart className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">
                    {dashboard?.totalLikes 
                      ? dashboard.totalLikes >= 1000 
                        ? `${(dashboard.totalLikes / 1000).toFixed(1)}K` 
                        : dashboard.totalLikes
                      : "0"}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Likes</p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Video className="w-5 h-5 text-muted-foreground" />
                    {videoStats.active > 0 && (
                      <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                        {videoStats.active} active
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold">{videoStats.completed}</p>
                  <p className="text-sm text-muted-foreground">Videos Generated</p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">{dashboard?.totalPosts ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Total Posts</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-white/5 border border-white/10">
                <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="growth" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Growth
                </TabsTrigger>
                <TabsTrigger value="content" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Content
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {selectedInfluencerId && overview ? (
                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Influencer Overview */}
                    <Card className="bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-primary" />
                          Selected Influencer Stats
                        </CardTitle>
                        <CardDescription>
                          {influencers.find(i => i.id === selectedInfluencerId)?.name ?? "Influencer"} — real-time metrics
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-lg bg-white/5">
                            <p className="text-sm text-muted-foreground mb-1">Followers</p>
                            <p className="text-xl font-bold">{overview.followers.toLocaleString()}</p>
                            {overview.followersGain !== 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                {overview.followersGain > 0 ? (
                                  <ArrowUpRight className="w-3 h-3 text-green-400" />
                                ) : (
                                  <ArrowDownRight className="w-3 h-3 text-red-400" />
                                )}
                                <span className={`text-xs ${overview.followersGain > 0 ? "text-green-400" : "text-red-400"}`}>
                                  {overview.followersGain > 0 ? "+" : ""}{overview.followersGain}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="p-4 rounded-lg bg-white/5">
                            <p className="text-sm text-muted-foreground mb-1">Likes</p>
                            <p className="text-xl font-bold">{overview.likes.toLocaleString()}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-white/5">
                            <p className="text-sm text-muted-foreground mb-1">Views</p>
                            <p className="text-xl font-bold">{overview.views.toLocaleString()}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-white/5">
                            <p className="text-sm text-muted-foreground mb-1">Engagement Rate</p>
                            <p className="text-xl font-bold">{(overview.engagementRate * 100).toFixed(1)}%</p>
                          </div>
                          <div className="p-4 rounded-lg bg-white/5 col-span-2">
                            <p className="text-sm text-muted-foreground mb-1">Posts Count</p>
                            <p className="text-xl font-bold">{overview.postsCount}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Video Generation Stats */}
                    <Card className="bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Video className="w-5 h-5 text-blue-500" />
                          Video Generation Activity
                        </CardTitle>
                        <CardDescription>
                          Content generation pipeline status
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-green-400" />
                              <span>Completed</span>
                            </div>
                            <span className="font-bold text-green-400">{videoStats.completed}</span>
                          </div>
                          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-blue-400" />
                              <span>In Progress</span>
                            </div>
                            <span className="font-bold text-blue-400">{videoStats.active}</span>
                          </div>
                          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-red-400" />
                              <span>Failed</span>
                            </div>
                            <span className="font-bold text-red-400">{videoStats.failed}</span>
                          </div>
                          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                            <div className="flex items-center gap-3">
                              <Activity className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">Total Jobs</span>
                            </div>
                            <span className="font-bold">{videoStats.total}</span>
                          </div>
                          {videoStats.total > 0 && (
                            <div>
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>Success Rate</span>
                                <span>{videoStats.total > 0 ? Math.round((videoStats.completed / videoStats.total) * 100) : 0}%</span>
                              </div>
                              <Progress 
                                value={videoStats.total > 0 ? (videoStats.completed / videoStats.total) * 100 : 0} 
                                className="h-2" 
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-12 text-center">
                      <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Influencer Selected</h3>
                      <p className="text-muted-foreground">
                        {influencers.length === 0 
                          ? "Create your first influencer in the Influencer Studio to see analytics here."
                          : "Select an influencer from the dropdown above to view detailed analytics."}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Platform Summary */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      Platform Summary
                    </CardTitle>
                    <CardDescription>Aggregated metrics across all influencers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg bg-white/5 text-center">
                        <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                        <p className="text-2xl font-bold">{dashboard?.totalInfluencers ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Influencers</p>
                      </div>
                      <div className="p-4 rounded-lg bg-white/5 text-center">
                        <Heart className="w-6 h-6 text-pink-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{dashboard?.totalLikes?.toLocaleString() ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Total Likes</p>
                      </div>
                      <div className="p-4 rounded-lg bg-white/5 text-center">
                        <Video className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{videoStats.total}</p>
                        <p className="text-xs text-muted-foreground">Video Jobs</p>
                      </div>
                      <div className="p-4 rounded-lg bg-white/5 text-center">
                        <FileText className="w-6 h-6 text-green-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{dashboard?.totalPosts ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Posts</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="growth" className="space-y-6">
                {chartData.length > 1 ? (
                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Follower Growth Chart */}
                    <Card className="bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-primary" />
                          Follower Growth
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                              <defs>
                                <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#CCFF00" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#CCFF00" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                              <XAxis dataKey="date" stroke="#666" fontSize={12} />
                              <YAxis stroke="#666" fontSize={12} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                labelStyle={{ color: '#fff' }}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="followers" 
                                stroke="#CCFF00" 
                                fillOpacity={1} 
                                fill="url(#colorFollowers)" 
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Engagement Rate Chart */}
                    <Card className="bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Heart className="w-5 h-5 text-pink-500" />
                          Engagement Rate
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                              <XAxis dataKey="date" stroke="#666" fontSize={12} />
                              <YAxis stroke="#666" fontSize={12} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                labelStyle={{ color: '#fff' }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="engagementRate" 
                                stroke="#EC4899" 
                                strokeWidth={2}
                                dot={{ fill: '#EC4899' }}
                                name="Engagement %"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-12 text-center">
                      <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Growth Data Yet</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        {selectedInfluencerId 
                          ? "Growth data will appear here as your influencer accumulates analytics over time. Use the 'Record Metrics' feature or connect social accounts to start tracking."
                          : "Select an influencer to view their growth trends."}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Likes & Views Chart */}
                {chartData.length > 1 && (
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="w-5 h-5 text-cyan-500" />
                        Likes & Views Over Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="date" stroke="#666" fontSize={12} />
                            <YAxis yAxisId="left" stroke="#666" fontSize={12} />
                            <YAxis yAxisId="right" orientation="right" stroke="#666" fontSize={12} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                              labelStyle={{ color: '#fff' }}
                            />
                            <Legend />
                            <Bar yAxisId="left" dataKey="likes" fill="#EC4899" name="Likes" radius={[4, 4, 0, 0]} />
                            <Bar yAxisId="right" dataKey="views" fill="#06B6D4" name="Views" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="content" className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Content Generation Summary */}
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-purple-500" />
                        Content Generation
                      </CardTitle>
                      <CardDescription>Your AI content creation activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                          <div className="flex items-center gap-3">
                            <ImageIcon className="w-5 h-5 text-purple-400" />
                            <span>Images Generated</span>
                          </div>
                          <span className="font-bold text-purple-400">
                            {/* This would come from a real count query */}
                            {dashboard?.totalPosts ?? 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                          <div className="flex items-center gap-3">
                            <Video className="w-5 h-5 text-blue-400" />
                            <span>Videos Generated</span>
                          </div>
                          <span className="font-bold text-blue-400">{videoStats.completed}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                          <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-green-400" />
                            <span>Active Influencers</span>
                          </div>
                          <span className="font-bold text-green-400">{dashboard?.totalInfluencers ?? 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Video Jobs */}
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-blue-500" />
                        Recent Video Jobs
                      </CardTitle>
                      <CardDescription>Latest video generation activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {videoJobs.length > 0 ? (
                        <div className="space-y-3">
                          {videoJobs.slice(0, 5).map((job: any) => (
                            <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{job.scriptText?.slice(0, 50) ?? `Job #${job.id}`}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(job.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge
                                className={
                                  job.status === "completed" ? "bg-green-500/20 text-green-400" :
                                  job.status === "processing" ? "bg-blue-500/20 text-blue-400" :
                                  job.status === "failed" ? "bg-red-500/20 text-red-400" :
                                  "bg-gray-500/20 text-gray-400"
                                }
                              >
                                {job.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Video className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No video jobs yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
