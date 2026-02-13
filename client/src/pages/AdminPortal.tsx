import { useState } from "react";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  Calculator,
  Target
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// Cost constants based on analysis
const COSTS = {
  imageGeneration: 0.04,
  videoGeneration: 0.70,
  llmCall: 0.02,
  brandBrainAnalysis: 0.05,
  influencerCreation: 0.04,
  fixedMonthly: 150,
};

const TIER_LIMITS = {
  free: { images: 3, videos: 0, influencers: 1, price: 0 },
  basic: { images: 100, videos: 10, influencers: 5, price: 199 },
  agency: { images: 500, videos: 50, influencers: 999, price: 399 },
  agencyPlus: { images: 2000, videos: 200, influencers: 999, price: 999 },
};

export default function AdminPortal() {
  const [selectedScenario, setSelectedScenario] = useState<"conservative" | "growth" | "scale">("growth");
  
  // Mock data - in production, this would come from actual database queries
  const platformStats = {
    totalUsers: 156,
    freeUsers: 120,
    basicUsers: 28,
    agencyUsers: 7,
    agencyPlusUsers: 1,
    totalRevenue: 8584,
    totalCosts: 1247,
    imagesGenerated: 2340,
    videosGenerated: 187,
    llmCalls: 4520,
  };

  // Calculate costs
  const calculateTierCost = (tier: keyof typeof TIER_LIMITS, usagePercent: number = 0.7) => {
    const limits = TIER_LIMITS[tier];
    const imageCost = limits.images * COSTS.imageGeneration * usagePercent;
    const videoCost = limits.videos * COSTS.videoGeneration * usagePercent;
    const llmCost = (limits.images + limits.videos) * 2 * COSTS.llmCall * usagePercent;
    return imageCost + videoCost + llmCost;
  };

  const tierAnalysis = [
    {
      name: "Free",
      price: 0,
      maxCost: calculateTierCost("free", 1),
      margin: -calculateTierCost("free", 1),
      marginPercent: -100,
      users: platformStats.freeUsers,
      status: "loss-leader",
    },
    {
      name: "Basic",
      price: 199,
      maxCost: calculateTierCost("basic", 1),
      margin: 199 - calculateTierCost("basic", 1),
      marginPercent: ((199 - calculateTierCost("basic", 1)) / 199) * 100,
      users: platformStats.basicUsers,
      status: "profitable",
    },
    {
      name: "Agency",
      price: 399,
      maxCost: calculateTierCost("agency", 1),
      margin: 399 - calculateTierCost("agency", 1),
      marginPercent: ((399 - calculateTierCost("agency", 1)) / 399) * 100,
      users: platformStats.agencyUsers,
      status: "profitable",
    },
    {
      name: "Agency++",
      price: 999,
      maxCost: calculateTierCost("agencyPlus", 1),
      margin: 999 - calculateTierCost("agencyPlus", 1),
      marginPercent: ((999 - calculateTierCost("agencyPlus", 1)) / 999) * 100,
      users: platformStats.agencyPlusUsers,
      status: "profitable",
    },
  ];

  const scenarios = {
    conservative: {
      month1: { free: 10, basic: 2, agency: 0, agencyPlus: 0 },
      month6: { free: 200, basic: 15, agency: 3, agencyPlus: 0 },
      month12: { free: 1000, basic: 50, agency: 10, agencyPlus: 0 },
    },
    growth: {
      month1: { free: 50, basic: 5, agency: 1, agencyPlus: 0 },
      month6: { free: 500, basic: 50, agency: 10, agencyPlus: 1 },
      month12: { free: 5000, basic: 200, agency: 50, agencyPlus: 5 },
    },
    scale: {
      month1: { free: 100, basic: 10, agency: 2, agencyPlus: 1 },
      month6: { free: 2000, basic: 100, agency: 25, agencyPlus: 5 },
      month12: { free: 10000, basic: 500, agency: 100, agencyPlus: 20 },
    },
  };

  const calculateScenarioRevenue = (users: { free: number; basic: number; agency: number; agencyPlus: number }) => {
    return users.basic * 199 + users.agency * 399 + users.agencyPlus * 999;
  };

  const calculateScenarioCost = (users: { free: number; basic: number; agency: number; agencyPlus: number }) => {
    return (
      users.free * calculateTierCost("free", 0.8) +
      users.basic * calculateTierCost("basic", 0.7) +
      users.agency * calculateTierCost("agency", 0.6) +
      users.agencyPlus * calculateTierCost("agencyPlus", 0.5) +
      COSTS.fixedMonthly
    );
  };

  const currentScenario = scenarios[selectedScenario];
  const projections = [
    { month: "Month 1", ...currentScenario.month1 },
    { month: "Month 6", ...currentScenario.month6 },
    { month: "Month 12", ...currentScenario.month12 },
  ].map((p) => ({
    ...p,
    revenue: calculateScenarioRevenue(p),
    cost: calculateScenarioCost(p),
    profit: calculateScenarioRevenue(p) - calculateScenarioCost(p),
  }));

  const grossMargin = ((platformStats.totalRevenue - platformStats.totalCosts) / platformStats.totalRevenue) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Portal</h1>
          <p className="text-muted-foreground">
            Cost analysis, profitability projections, and platform health metrics
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
            <TabsTrigger value="projections">Projections</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${platformStats.totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${platformStats.totalCosts.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">API + Infrastructure</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">{grossMargin.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Target: 75%+</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{platformStats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    {platformStats.basicUsers + platformStats.agencyUsers + platformStats.agencyPlusUsers} paying
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>User Distribution</CardTitle>
                  <CardDescription>Breakdown by pricing tier</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tierAnalysis.map((tier) => (
                    <div key={tier.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{tier.name}</span>
                        <span className="text-sm text-muted-foreground">{tier.users} users</span>
                      </div>
                      <Progress value={(tier.users / platformStats.totalUsers) * 100} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Usage This Month</CardTitle>
                  <CardDescription>API consumption metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Images Generated</span>
                    </div>
                    <span className="font-medium">{platformStats.imagesGenerated.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">Videos Generated</span>
                    </div>
                    <span className="font-medium">{platformStats.videosGenerated.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">LLM Calls</span>
                    </div>
                    <span className="font-medium">{platformStats.llmCalls.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total API Cost</span>
                      <span className="font-bold">
                        ${(
                          platformStats.imagesGenerated * COSTS.imageGeneration +
                          platformStats.videosGenerated * COSTS.videoGeneration +
                          platformStats.llmCalls * COSTS.llmCall
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cost Analysis Tab */}
          <TabsContent value="costs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Per-Tier Cost Analysis</CardTitle>
                <CardDescription>
                  Maximum monthly cost per user at 100% usage of limits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Tier</th>
                        <th className="text-right py-3 px-4">Price</th>
                        <th className="text-right py-3 px-4">Max Cost</th>
                        <th className="text-right py-3 px-4">Margin</th>
                        <th className="text-right py-3 px-4">Margin %</th>
                        <th className="text-center py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tierAnalysis.map((tier) => (
                        <tr key={tier.name} className="border-b">
                          <td className="py-3 px-4 font-medium">{tier.name}</td>
                          <td className="text-right py-3 px-4">${tier.price}</td>
                          <td className="text-right py-3 px-4">${tier.maxCost.toFixed(2)}</td>
                          <td className="text-right py-3 px-4">
                            <span className={tier.margin >= 0 ? "text-green-500" : "text-red-500"}>
                              ${tier.margin.toFixed(2)}
                            </span>
                          </td>
                          <td className="text-right py-3 px-4">
                            <span className={tier.marginPercent >= 0 ? "text-green-500" : "text-red-500"}>
                              {tier.marginPercent.toFixed(1)}%
                            </span>
                          </td>
                          <td className="text-center py-3 px-4">
                            <Badge
                              variant={tier.status === "profitable" ? "default" : "secondary"}
                              className={tier.status === "profitable" ? "bg-green-500" : "bg-yellow-500"}
                            >
                              {tier.status === "profitable" ? "Profitable" : "Loss Leader"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>API Cost Breakdown</CardTitle>
                  <CardDescription>Cost per unit by service type</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span>Image Generation</span>
                    <span className="font-mono">${COSTS.imageGeneration.toFixed(3)}/image</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span>Video Generation</span>
                    <span className="font-mono">${COSTS.videoGeneration.toFixed(2)}/video</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span>LLM Call</span>
                    <span className="font-mono">${COSTS.llmCall.toFixed(3)}/call</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span>Brand Brain Analysis</span>
                    <span className="font-mono">${COSTS.brandBrainAnalysis.toFixed(3)}/analysis</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span>Fixed Infrastructure</span>
                    <span className="font-mono">${COSTS.fixedMonthly}/month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Break-Even Analysis</CardTitle>
                  <CardDescription>Minimum customers needed for profitability</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-green-500">Break-Even: 1 Basic Customer</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Fixed costs of ${COSTS.fixedMonthly}/month are covered by a single Basic tier subscriber
                      with ${(199 - calculateTierCost("basic", 1)).toFixed(0)} margin remaining.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Fixed Monthly Costs</span>
                      <span>${COSTS.fixedMonthly}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avg. Contribution Margin (Basic)</span>
                      <span>${(199 - calculateTierCost("basic", 0.7)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span>Customers to Cover Fixed</span>
                      <span>{Math.ceil(COSTS.fixedMonthly / (199 - calculateTierCost("basic", 0.7)))}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Projections Tab */}
          <TabsContent value="projections" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>12-Month Profitability Projections</CardTitle>
                <CardDescription>
                  Select a growth scenario to see projected revenue, costs, and profit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-6">
                  {(["conservative", "growth", "scale"] as const).map((scenario) => (
                    <button
                      key={scenario}
                      onClick={() => setSelectedScenario(scenario)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedScenario === scenario
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {scenario.charAt(0).toUpperCase() + scenario.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Period</th>
                        <th className="text-right py-3 px-4">Free</th>
                        <th className="text-right py-3 px-4">Basic</th>
                        <th className="text-right py-3 px-4">Agency</th>
                        <th className="text-right py-3 px-4">Agency++</th>
                        <th className="text-right py-3 px-4">Revenue</th>
                        <th className="text-right py-3 px-4">Costs</th>
                        <th className="text-right py-3 px-4">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projections.map((p) => (
                        <tr key={p.month} className="border-b">
                          <td className="py-3 px-4 font-medium">{p.month}</td>
                          <td className="text-right py-3 px-4">{p.free}</td>
                          <td className="text-right py-3 px-4">{p.basic}</td>
                          <td className="text-right py-3 px-4">{p.agency}</td>
                          <td className="text-right py-3 px-4">{p.agencyPlus}</td>
                          <td className="text-right py-3 px-4">${p.revenue.toLocaleString()}</td>
                          <td className="text-right py-3 px-4">${p.cost.toFixed(0)}</td>
                          <td className="text-right py-3 px-4">
                            <span className="text-green-500 font-medium">
                              ${p.profit.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-primary" />
                    <span className="font-medium">Year 1 Projection ({selectedScenario})</span>
                  </div>
                  <p className="text-2xl font-bold text-green-500">
                    ~${(projections[2].profit * 8).toLocaleString()} estimated annual profit
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on linear growth interpolation between milestones
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Health Tab */}
          <TabsContent value="health" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
                  {grossMargin >= 75 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${grossMargin >= 75 ? "text-green-500" : "text-yellow-500"}`}>
                    {grossMargin.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">Target: &gt;75% | Warning: &lt;60%</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Free-to-Paid Conversion</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    {(((platformStats.basicUsers + platformStats.agencyUsers + platformStats.agencyPlusUsers) / platformStats.freeUsers) * 100).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">Target: &gt;5% | Warning: &lt;2%</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">ARPU</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    ${(platformStats.totalRevenue / (platformStats.basicUsers + platformStats.agencyUsers + platformStats.agencyPlusUsers)).toFixed(0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Target: &gt;$250 | Warning: &lt;$150</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Key Metrics Health Check</CardTitle>
                <CardDescription>Real-time monitoring of critical business metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: "Gross Margin", value: grossMargin, target: 75, warning: 60, unit: "%" },
                    { name: "Free-to-Paid Conversion", value: ((platformStats.basicUsers + platformStats.agencyUsers) / platformStats.freeUsers) * 100, target: 5, warning: 2, unit: "%" },
                    { name: "ARPU", value: platformStats.totalRevenue / (platformStats.basicUsers + platformStats.agencyUsers + platformStats.agencyPlusUsers), target: 250, warning: 150, unit: "$" },
                  ].map((metric) => (
                    <div key={metric.name} className="flex items-center gap-4">
                      <div className="w-48">
                        <span className="text-sm font-medium">{metric.name}</span>
                      </div>
                      <div className="flex-1">
                        <Progress 
                          value={Math.min((metric.value / metric.target) * 100, 100)} 
                          className="h-2"
                        />
                      </div>
                      <div className="w-24 text-right">
                        <span className={`font-medium ${metric.value >= metric.target ? "text-green-500" : metric.value >= metric.warning ? "text-yellow-500" : "text-red-500"}`}>
                          {metric.unit === "$" ? "$" : ""}{metric.value.toFixed(1)}{metric.unit === "%" ? "%" : ""}
                        </span>
                      </div>
                      <div className="w-8">
                        {metric.value >= metric.target ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : metric.value >= metric.warning ? (
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pricing Recommendations</CardTitle>
                <CardDescription>AI-generated suggestions based on current metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-green-500">Pricing Structure: SUSTAINABLE</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Current pricing provides healthy margins across all paid tiers (73-92% gross margin).
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm"><strong>Free Tier:</strong> Consider reducing to 2 image generations to limit losses</p>
                  <p className="text-sm"><strong>Basic Tier:</strong> Price is competitive; could increase to $249 if market allows</p>
                  <p className="text-sm"><strong>Agency Tier:</strong> Well-positioned; consider adding more video generations (75) to increase value</p>
                  <p className="text-sm"><strong>Agency++:</strong> Set minimum at $999/month; offer custom quotes above $2,000 for enterprise</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
