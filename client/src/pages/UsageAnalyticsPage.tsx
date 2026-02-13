/**
 * Usage Analytics Dashboard
 * 
 * Displays AI provider usage statistics, cost breakdown, and spending trends.
 */

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Zap, Image, Video, BarChart3, PieChart } from "lucide-react";

type TimeRange = "7d" | "30d" | "90d" | "all";

export default function UsageAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  // Fetch usage summary
  const { data: usageSummary, isLoading: summaryLoading } = trpc.aiProviders.getUsageSummary.useQuery({
    timeRange,
  });

  // Fetch usage by provider
  const { data: providerUsage, isLoading: providerLoading } = trpc.aiProviders.getUsageByProvider.useQuery({
    timeRange,
  });

  // Fetch daily usage for chart
  const { data: dailyUsage, isLoading: dailyLoading } = trpc.aiProviders.getDailyUsage.useQuery({
    timeRange,
  });

  const isLoading = summaryLoading || providerLoading || dailyLoading;

  // Calculate totals and trends
  const totalCost = usageSummary?.totalCostCents ? (usageSummary.totalCostCents / 100).toFixed(2) : "0.00";
  const totalGenerations = usageSummary?.totalGenerations || 0;
  const totalCredits = usageSummary?.totalCredits || 0;

  // Provider colors for charts
  const providerColors: Record<string, string> = {
    manus: "#10b981", // emerald
    "openai-sora": "#8b5cf6", // violet
    runway: "#f59e0b", // amber
    replicate: "#3b82f6", // blue
    pika: "#ec4899", // pink
    stability: "#6366f1", // indigo
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Usage Analytics</h1>
            <p className="text-muted-foreground">
              Track your AI generation usage and costs across all providers
            </p>
          </div>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalCost}</div>
                  <p className="text-xs text-muted-foreground">
                    {usageSummary?.costTrend && usageSummary.costTrend > 0 ? (
                      <span className="text-red-500 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        +{usageSummary.costTrend}% from last period
                      </span>
                    ) : usageSummary?.costTrend && usageSummary.costTrend < 0 ? (
                      <span className="text-green-500 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        {usageSummary.costTrend}% from last period
                      </span>
                    ) : (
                      "No change from last period"
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Generations</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalGenerations.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Across all providers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalCredits.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {usageSummary?.creditsRemaining !== undefined && (
                      <span>{usageSummary.creditsRemaining.toLocaleString()} remaining</span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Cost/Generation</CardTitle>
                  <PieChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${totalGenerations > 0 
                      ? ((usageSummary?.totalCostCents || 0) / totalGenerations / 100).toFixed(3)
                      : "0.00"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Per generation
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analytics */}
            <Tabs defaultValue="providers" className="space-y-4">
              <TabsList>
                <TabsTrigger value="providers">By Provider</TabsTrigger>
                <TabsTrigger value="type">By Type</TabsTrigger>
                <TabsTrigger value="daily">Daily Trend</TabsTrigger>
              </TabsList>

              {/* Provider Breakdown */}
              <TabsContent value="providers" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Usage by Provider</CardTitle>
                    <CardDescription>
                      Cost and generation breakdown by AI provider
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {providerUsage && providerUsage.length > 0 ? (
                      <div className="space-y-6">
                        {providerUsage.map((provider) => {
                          const percentage = usageSummary?.totalCostCents 
                            ? (provider.costCents / usageSummary.totalCostCents) * 100 
                            : 0;
                          const color = providerColors[provider.providerSlug] || "#6b7280";
                          
                          return (
                            <div key={provider.providerSlug} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="font-medium">{provider.providerName}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {provider.generations} generations
                                  </Badge>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold">
                                    ${(provider.costCents / 100).toFixed(2)}
                                  </span>
                                  <span className="text-muted-foreground text-sm ml-2">
                                    ({percentage.toFixed(1)}%)
                                  </span>
                                </div>
                              </div>
                              <Progress 
                                value={percentage} 
                                className="h-2"
                                style={{ 
                                  // @ts-ignore - CSS variable for progress color
                                  "--progress-color": color 
                                }}
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{provider.credits} credits</span>
                                <span>
                                  Avg: ${(provider.costCents / provider.generations / 100).toFixed(3)}/gen
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No usage data available for this period
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Type Breakdown */}
              <TabsContent value="type" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="flex flex-row items-center gap-2">
                      <Image className="w-5 h-5 text-primary" />
                      <div>
                        <CardTitle>Image Generation</CardTitle>
                        <CardDescription>AI image creation stats</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Images</span>
                          <span className="font-bold">
                            {usageSummary?.imageGenerations?.toLocaleString() || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Cost</span>
                          <span className="font-bold">
                            ${((usageSummary?.imageCostCents || 0) / 100).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Cost/Image</span>
                          <span className="font-bold">
                            ${usageSummary?.imageGenerations 
                              ? ((usageSummary.imageCostCents || 0) / usageSummary.imageGenerations / 100).toFixed(3)
                              : "0.00"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center gap-2">
                      <Video className="w-5 h-5 text-primary" />
                      <div>
                        <CardTitle>Video Generation</CardTitle>
                        <CardDescription>AI video creation stats</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Videos</span>
                          <span className="font-bold">
                            {usageSummary?.videoGenerations?.toLocaleString() || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Cost</span>
                          <span className="font-bold">
                            ${((usageSummary?.videoCostCents || 0) / 100).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Cost/Video</span>
                          <span className="font-bold">
                            ${usageSummary?.videoGenerations 
                              ? ((usageSummary.videoCostCents || 0) / usageSummary.videoGenerations / 100).toFixed(3)
                              : "0.00"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Duration</span>
                          <span className="font-bold">
                            {usageSummary?.totalVideoDurationSeconds 
                              ? `${Math.floor(usageSummary.totalVideoDurationSeconds / 60)}m ${usageSummary.totalVideoDurationSeconds % 60}s`
                              : "0s"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Daily Trend */}
              <TabsContent value="daily" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Usage Trend</CardTitle>
                    <CardDescription>
                      Generation activity and spending over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dailyUsage && dailyUsage.length > 0 ? (
                      <div className="space-y-4">
                        {/* Simple bar chart representation */}
                        <div className="flex items-end gap-1 h-48">
                          {dailyUsage.map((day, index) => {
                            const maxCost = Math.max(...dailyUsage.map(d => d.costCents));
                            const height = maxCost > 0 ? (day.costCents / maxCost) * 100 : 0;
                            
                            return (
                              <div 
                                key={index}
                                className="flex-1 flex flex-col items-center gap-1"
                              >
                                <div 
                                  className="w-full bg-primary/80 rounded-t transition-all hover:bg-primary"
                                  style={{ height: `${Math.max(height, 2)}%` }}
                                  title={`${day.date}: $${(day.costCents / 100).toFixed(2)} (${day.generations} gens)`}
                                />
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Date labels */}
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{dailyUsage[0]?.date}</span>
                          <span>{dailyUsage[dailyUsage.length - 1]?.date}</span>
                        </div>

                        {/* Summary stats */}
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              {dailyUsage.reduce((sum, d) => sum + d.generations, 0)}
                            </div>
                            <div className="text-xs text-muted-foreground">Total Generations</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              ${(dailyUsage.reduce((sum, d) => sum + d.costCents, 0) / 100).toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">Total Spent</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              {Math.round(dailyUsage.reduce((sum, d) => sum + d.generations, 0) / dailyUsage.length)}
                            </div>
                            <div className="text-xs text-muted-foreground">Avg/Day</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No daily usage data available for this period
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
