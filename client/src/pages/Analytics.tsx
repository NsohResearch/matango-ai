import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, TrendingUp, TrendingDown, Users, Heart, Eye, BarChart3, Loader2, Plus, AlertCircle, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function Analytics() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [selectedInfluencer, setSelectedInfluencer] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("30");
  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [recordForm, setRecordForm] = useState({
    followers: "",
    followersGain: "",
    likes: "",
    views: "",
    engagementRate: "",
    postsCount: "",
  });

  const utils = trpc.useUtils();

  const { data: influencers, isLoading: loadingInfluencers } = trpc.influencer.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: dashboard, isLoading: loadingDashboard, refetch: refetchDashboard } = trpc.analytics.getDashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: history, isLoading: loadingHistory, refetch: refetchHistory } = trpc.analytics.getHistory.useQuery(
    { influencerId: parseInt(selectedInfluencer), days: parseInt(timeRange) },
    { enabled: isAuthenticated && selectedInfluencer !== "all" && !!selectedInfluencer }
  );

  const { data: overview, refetch: refetchOverview } = trpc.analytics.getOverview.useQuery(
    { influencerId: parseInt(selectedInfluencer) },
    { enabled: isAuthenticated && selectedInfluencer !== "all" && !!selectedInfluencer }
  );

  const recordMetricsMutation = trpc.analytics.recordMetrics.useMutation({
    onSuccess: () => {
      toast.success("Metrics recorded successfully");
      setIsRecordDialogOpen(false);
      setRecordForm({
        followers: "",
        followersGain: "",
        likes: "",
        views: "",
        engagementRate: "",
        postsCount: "",
      });
      // Refresh all analytics data
      refetchDashboard();
      if (selectedInfluencer !== "all") {
        refetchHistory();
        refetchOverview();
      }
      utils.influencer.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to record metrics", {
        description: error.message,
      });
    },
  });

  const handleRecordMetrics = () => {
    if (!selectedInfluencer || selectedInfluencer === "all") {
      toast.error("Please select an influencer first");
      return;
    }

    const followers = parseInt(recordForm.followers) || 0;
    const followersGain = parseInt(recordForm.followersGain) || 0;
    const likes = parseInt(recordForm.likes) || 0;
    const views = parseInt(recordForm.views) || 0;
    const engagementRate = parseFloat(recordForm.engagementRate) || 0;
    const postsCount = parseInt(recordForm.postsCount) || 0;

    if (followers < 0 || likes < 0 || views < 0 || postsCount < 0) {
      toast.error("Values cannot be negative");
      return;
    }

    if (engagementRate < 0 || engagementRate > 100) {
      toast.error("Engagement rate must be between 0 and 100");
      return;
    }

    recordMetricsMutation.mutate({
      influencerId: parseInt(selectedInfluencer),
      followers,
      followersGain,
      likes,
      views,
      engagementRate,
      postsCount,
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  // Calculate real trend percentages from history data
  const calculateTrend = useMemo(() => {
    if (!history || history.length < 2) return { followers: 0, likes: 0, views: 0, engagement: 0 };
    
    const recent = history.slice(-7);
    const older = history.slice(0, 7);
    
    if (recent.length === 0 || older.length === 0) return { followers: 0, likes: 0, views: 0, engagement: 0 };
    
    const recentFollowers = recent.reduce((sum, d) => sum + d.followers, 0) / recent.length;
    const olderFollowers = older.reduce((sum, d) => sum + d.followers, 0) / older.length;
    const followersTrend = olderFollowers > 0 ? ((recentFollowers - olderFollowers) / olderFollowers) * 100 : 0;
    
    const recentLikes = recent.reduce((sum, d) => sum + d.likes, 0) / recent.length;
    const olderLikes = older.reduce((sum, d) => sum + d.likes, 0) / older.length;
    const likesTrend = olderLikes > 0 ? ((recentLikes - olderLikes) / olderLikes) * 100 : 0;
    
    const recentViews = recent.reduce((sum, d) => sum + d.views, 0) / recent.length;
    const olderViews = older.reduce((sum, d) => sum + d.views, 0) / older.length;
    const viewsTrend = olderViews > 0 ? ((recentViews - olderViews) / olderViews) * 100 : 0;
    
    const recentEngagement = recent.reduce((sum, d) => sum + parseFloat(d.engagementRate), 0) / recent.length;
    const olderEngagement = older.reduce((sum, d) => sum + parseFloat(d.engagementRate), 0) / older.length;
    const engagementTrend = olderEngagement > 0 ? ((recentEngagement - olderEngagement) / olderEngagement) * 100 : 0;
    
    return {
      followers: followersTrend,
      likes: likesTrend,
      views: viewsTrend,
      engagement: engagementTrend,
    };
  }, [history]);

  const stats = [
    {
      title: "Total Followers",
      value: selectedInfluencer === "all" ? dashboard?.totalFollowers || 0 : overview?.followers || 0,
      change: calculateTrend.followers,
      icon: Users,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
    },
    {
      title: "Total Likes",
      value: selectedInfluencer === "all" ? dashboard?.totalLikes || 0 : overview?.likes || 0,
      change: calculateTrend.likes,
      icon: Heart,
      color: "text-pink-400",
      bgColor: "bg-pink-400/10",
    },
    {
      title: "Total Views",
      value: selectedInfluencer === "all" ? (dashboard?.totalFollowers || 0) * 10 : overview?.views || 0,
      change: calculateTrend.views,
      icon: Eye,
      color: "text-purple-400",
      bgColor: "bg-purple-400/10",
    },
    {
      title: "Engagement Rate",
      value: selectedInfluencer === "all" ? dashboard?.avgEngagementRate || "0" : overview?.engagementRate || 0,
      suffix: "%",
      change: calculateTrend.engagement,
      icon: BarChart3,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  // Auth loading state
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

  // Auth required
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <BarChart3 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Sign In Required</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            Please sign in to view your analytics dashboard
          </p>
          <a href={getLoginUrl()}>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Sign In to Continue
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="hover:bg-white/5">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
              <p className="text-muted-foreground">Track your influencer performance</p>
            </div>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <Select value={selectedInfluencer} onValueChange={setSelectedInfluencer}>
              <SelectTrigger className="w-[180px] bg-card border-white/10">
                <SelectValue placeholder="All Influencers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Influencers</SelectItem>
                {influencers?.map((inf) => (
                  <SelectItem key={inf.id} value={inf.id.toString()}>
                    {inf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px] bg-card border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                refetchDashboard();
                if (selectedInfluencer !== "all") {
                  refetchHistory();
                  refetchOverview();
                }
              }}
              className="border-white/10 hover:bg-white/5"
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>

            {selectedInfluencer !== "all" && (
              <Dialog open={isRecordDialogOpen} onOpenChange={setIsRecordDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Record Metrics
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-white/10">
                  <DialogHeader>
                    <DialogTitle>Record Analytics Metrics</DialogTitle>
                    <DialogDescription>
                      Manually record today's metrics for this influencer
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="followers">Followers</Label>
                        <Input
                          id="followers"
                          type="number"
                          min="0"
                          placeholder="10000"
                          value={recordForm.followers}
                          onChange={(e) => setRecordForm({ ...recordForm, followers: e.target.value })}
                          className="bg-background border-white/10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="followersGain">Followers Gain</Label>
                        <Input
                          id="followersGain"
                          type="number"
                          placeholder="+100"
                          value={recordForm.followersGain}
                          onChange={(e) => setRecordForm({ ...recordForm, followersGain: e.target.value })}
                          className="bg-background border-white/10"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="likes">Likes</Label>
                        <Input
                          id="likes"
                          type="number"
                          min="0"
                          placeholder="5000"
                          value={recordForm.likes}
                          onChange={(e) => setRecordForm({ ...recordForm, likes: e.target.value })}
                          className="bg-background border-white/10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="views">Views</Label>
                        <Input
                          id="views"
                          type="number"
                          min="0"
                          placeholder="50000"
                          value={recordForm.views}
                          onChange={(e) => setRecordForm({ ...recordForm, views: e.target.value })}
                          className="bg-background border-white/10"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="engagementRate">Engagement Rate (%)</Label>
                        <Input
                          id="engagementRate"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="5.5"
                          value={recordForm.engagementRate}
                          onChange={(e) => setRecordForm({ ...recordForm, engagementRate: e.target.value })}
                          className="bg-background border-white/10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postsCount">Posts Count</Label>
                        <Input
                          id="postsCount"
                          type="number"
                          min="0"
                          placeholder="3"
                          value={recordForm.postsCount}
                          onChange={(e) => setRecordForm({ ...recordForm, postsCount: e.target.value })}
                          className="bg-background border-white/10"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRecordDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleRecordMetrics}
                      disabled={recordMetricsMutation.isPending}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {recordMetricsMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Save Metrics
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {loadingDashboard || loadingInfluencers ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          </div>
        ) : influencers && influencers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4">No Influencers Yet</h2>
            <p className="text-muted-foreground mb-8 max-w-md">
              Create your first AI influencer to start tracking analytics
            </p>
            <Link href="/create">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Create Influencer
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-card border-white/5 hover:border-white/10 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                          <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <div className={`flex items-center gap-1 text-sm ${stat.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {stat.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {stat.change >= 0 ? "+" : ""}{stat.change.toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-3xl font-bold mb-1">
                        {typeof stat.value === "number" ? formatNumber(stat.value) : stat.value}
                        {stat.suffix}
                      </div>
                      <div className="text-sm text-muted-foreground">{stat.title}</div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Followers Growth Chart */}
              <Card className="bg-card border-white/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    Followers Growth
                  </CardTitle>
                  <CardDescription>
                    {selectedInfluencer === "all" 
                      ? "Select an influencer to view detailed growth"
                      : `Tracking over the last ${timeRange} days`
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedInfluencer === "all" ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <p>Select an influencer to view growth chart</p>
                    </div>
                  ) : loadingHistory ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : history && history.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history}>
                          <defs>
                            <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#666"
                            tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          />
                          <YAxis stroke="#666" tickFormatter={formatNumber} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "8px" }}
                            labelFormatter={(value) => new Date(value).toLocaleDateString()}
                            formatter={(value: number) => [formatNumber(value), "Followers"]}
                          />
                          <Area
                            type="monotone"
                            dataKey="followers"
                            stroke="#3b82f6"
                            fillOpacity={1}
                            fill="url(#colorFollowers)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No data available yet</p>
                        <p className="text-sm">Record metrics to see growth trends</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Engagement Chart */}
              <Card className="bg-card border-white/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Engagement Rate
                  </CardTitle>
                  <CardDescription>
                    {selectedInfluencer === "all" 
                      ? "Select an influencer to view engagement trends"
                      : "Daily engagement rate percentage"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedInfluencer === "all" ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <p>Select an influencer to view engagement chart</p>
                    </div>
                  ) : loadingHistory ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : history && history.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#666"
                            tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          />
                          <YAxis stroke="#666" domain={[0, 'auto']} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "8px" }}
                            labelFormatter={(value) => new Date(value).toLocaleDateString()}
                            formatter={(value: string) => [`${value}%`, "Engagement"]}
                          />
                          <Line
                            type="monotone"
                            dataKey="engagementRate"
                            stroke="#CCFF00"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No data available yet</p>
                        <p className="text-sm">Record metrics to see engagement trends</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Influencer Performance Table */}
            {selectedInfluencer === "all" && influencers && influencers.length > 0 && (
              <Card className="bg-card border-white/5 mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Influencer Performance</CardTitle>
                  <CardDescription>Overview of all your AI influencers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Influencer</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Followers</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Likes</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Posts</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {influencers.map((inf) => (
                          <tr key={inf.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {inf.avatarUrl ? (
                                  <img src={inf.avatarUrl} alt={inf.name} className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                                    {inf.name.charAt(0)}
                                  </div>
                                )}
                                <span className="font-medium">{inf.name}</span>
                              </div>
                            </td>
                            <td className="text-right py-3 px-4">{formatNumber(inf.stats?.followers || 0)}</td>
                            <td className="text-right py-3 px-4">{formatNumber(inf.stats?.likes || 0)}</td>
                            <td className="text-right py-3 px-4">{inf.stats?.posts || 0}</td>
                            <td className="text-right py-3 px-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedInfluencer(inf.id.toString())}
                                className="text-primary hover:text-primary/80"
                              >
                                View Details
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
