import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  FlaskConical, 
  Plus, 
  Play, 
  Pause, 
  Trophy, 
  BarChart3,
  Target,
  Zap,
  TrendingUp,
  Eye,
  MousePointer,
  ShoppingCart,
  Lightbulb
} from "lucide-react";
import { getLoginUrl } from "@/const";

const TEST_TYPES = [
  { id: "caption", name: "Caption", icon: "📝", description: "Test different caption styles" },
  { id: "image", name: "Image", icon: "🖼️", description: "Compare visual variations" },
  { id: "cta", name: "CTA", icon: "🎯", description: "Test call-to-action buttons" },
  { id: "timing", name: "Timing", icon: "⏰", description: "Find optimal posting times" },
  { id: "audience", name: "Audience", icon: "👥", description: "Segment audience targeting" },
];

const METRICS = [
  { id: "engagement", name: "Engagement Rate", icon: TrendingUp },
  { id: "clicks", name: "Click-Through Rate", icon: MousePointer },
  { id: "conversions", name: "Conversions", icon: ShoppingCart },
  { id: "reach", name: "Reach", icon: Eye },
  { id: "impressions", name: "Impressions", icon: BarChart3 },
];

export default function ABTesting() {
  const { user, loading: authLoading } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<number | null>(null);
  
  // Form state
  const [testName, setTestName] = useState("");
  const [testDescription, setTestDescription] = useState("");
  const [testType, setTestType] = useState<string>("caption");
  const [targetMetric, setTargetMetric] = useState<string>("engagement");
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [confidenceLevel, setConfidenceLevel] = useState(95);
  const [minSampleSize, setMinSampleSize] = useState(100);

  const { data: tests, isLoading, refetch } = trpc.abTests.list.useQuery(
    undefined,
    { enabled: !!user }
  );

  const { data: testDetails } = trpc.abTests.get.useQuery(
    { id: selectedTest! },
    { enabled: !!selectedTest }
  );

  const { data: insights } = trpc.abTests.getInsights.useQuery(
    { id: selectedTest! },
    { enabled: !!selectedTest }
  );

  const createMutation = trpc.abTests.create.useMutation({
    onSuccess: (data) => {
      toast.success("A/B test created!");
      setIsCreateOpen(false);
      resetForm();
      refetch();
      if (data) setSelectedTest(data.id);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create test");
    },
  });

  const startMutation = trpc.abTests.start.useMutation({
    onSuccess: () => {
      toast.success("Test started!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start test");
    },
  });

  const pauseMutation = trpc.abTests.pause.useMutation({
    onSuccess: () => {
      toast.success("Test paused");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to pause test");
    },
  });

  const declareWinnerMutation = trpc.abTests.declareWinner.useMutation({
    onSuccess: () => {
      toast.success("Winner declared!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to declare winner");
    },
  });

  const addVariantMutation = trpc.abTests.addVariant.useMutation({
    onSuccess: () => {
      toast.success("Variant added!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add variant");
    },
  });

  const resetForm = () => {
    setTestName("");
    setTestDescription("");
    setTestType("caption");
    setTargetMetric("engagement");
    setAutoOptimize(true);
    setConfidenceLevel(95);
    setMinSampleSize(100);
  };

  const handleCreate = () => {
    if (!testName.trim()) {
      toast.error("Please enter a test name");
      return;
    }

    createMutation.mutate({
      name: testName,
      description: testDescription,
      testType: testType as any,
      targetMetric: targetMetric as any,
      autoOptimize,
      confidenceLevel,
      minSampleSize,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    window.location.href = getLoginUrl();
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running": return "bg-green-500";
      case "paused": return "bg-yellow-500";
      case "completed": return "bg-blue-500";
      case "draft": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <FlaskConical className="w-8 h-8 text-primary" />
              A/B Testing
            </h1>
            <p className="text-muted-foreground">
              Optimize your content with data-driven experiments
            </p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Test
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create A/B Test</DialogTitle>
                <DialogDescription>
                  Set up a new experiment to optimize your content performance
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Test Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Caption Style Test - Q1 Campaign"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="What are you testing and why?"
                    value={testDescription}
                    onChange={(e) => setTestDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Test Type</Label>
                    <Select value={testType} onValueChange={setTestType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEST_TYPES.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            <span className="flex items-center gap-2">
                              <span>{type.icon}</span>
                              <span>{type.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Target Metric</Label>
                    <Select value={targetMetric} onValueChange={setTargetMetric}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {METRICS.map((metric) => (
                          <SelectItem key={metric.id} value={metric.id}>
                            {metric.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Confidence Level</Label>
                    <Select value={confidenceLevel.toString()} onValueChange={(v) => setConfidenceLevel(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="80">80%</SelectItem>
                        <SelectItem value="90">90%</SelectItem>
                        <SelectItem value="95">95%</SelectItem>
                        <SelectItem value="99">99%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Min. Sample Size</Label>
                    <Input
                      type="number"
                      min={50}
                      max={10000}
                      value={minSampleSize}
                      onChange={(e) => setMinSampleSize(parseInt(e.target.value) || 100)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <Label className="text-base">Auto-Optimize</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically shift traffic to winning variant
                    </p>
                  </div>
                  <Switch
                    checked={autoOptimize}
                    onCheckedChange={setAutoOptimize}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Test"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Tests List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="font-semibold text-lg">Your Tests</h2>
            
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : tests?.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <FlaskConical className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No A/B tests yet</p>
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Test
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tests?.map((test: any) => (
                  <Card 
                    key={test.id}
                    className={`cursor-pointer transition-all hover:border-primary/50 ${selectedTest === test.id ? 'border-primary' : ''}`}
                    onClick={() => setSelectedTest(test.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium truncate flex-1">{test.name}</h3>
                        <Badge variant="secondary" className={`${getStatusColor(test.status)} text-white ml-2`}>
                          {test.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {test.description || `${test.testType} test`}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {test.targetMetric || "engagement"}
                        </span>
                        <span>
                          {new Date(test.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Test Details */}
          <div className="lg:col-span-2">
            {selectedTest && testDetails ? (
              <div className="space-y-6">
                {/* Test Header */}
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{testDetails.name}</CardTitle>
                        <CardDescription>{testDetails.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {testDetails.status === "draft" || testDetails.status === "paused" ? (
                          <Button 
                            onClick={() => startMutation.mutate({ id: selectedTest })}
                            disabled={startMutation.isPending || (testDetails.variants?.length || 0) < 2}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Start Test
                          </Button>
                        ) : testDetails.status === "running" ? (
                          <Button 
                            variant="outline"
                            onClick={() => pauseMutation.mutate({ id: selectedTest })}
                            disabled={pauseMutation.isPending}
                          >
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Insights */}
                {insights && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-primary" />
                        AI Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {insights.insights.map((insight: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Zap className="w-4 h-4 text-primary mt-0.5" />
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                      {insights.leadingVariant && (
                        <div className="mt-4 p-3 bg-background rounded-lg flex items-center gap-3">
                          <Trophy className="w-5 h-5 text-yellow-500" />
                          <span className="font-medium">Leading: {insights.leadingVariant}</span>
                          {insights.isStatisticallySignificant && (
                            <Badge variant="default" className="ml-auto">Statistically Significant</Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Variants */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Variants</CardTitle>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          addVariantMutation.mutate({
                            abTestId: selectedTest,
                            name: `Variant ${(testDetails.variants?.length || 0) + 1}`,
                            isControl: (testDetails.variants?.length || 0) === 0,
                            trafficPercentage: 50,
                          });
                        }}
                        disabled={addVariantMutation.isPending}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Variant
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!testDetails.variants?.length ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="mb-4">Add at least 2 variants to start testing</p>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            addVariantMutation.mutate({
                              abTestId: selectedTest,
                              name: "Control (A)",
                              isControl: true,
                              trafficPercentage: 50,
                            });
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Control Variant
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {testDetails.variants.map((variant: any, index: number) => (
                          <div 
                            key={variant.id}
                            className="p-4 border rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="font-medium">{variant.name}</span>
                                {variant.isControl && (
                                  <Badge variant="secondary">Control</Badge>
                                )}
                                {testDetails.winnerVariantId === variant.id && (
                                  <Badge className="bg-yellow-500">
                                    <Trophy className="w-3 h-3 mr-1" />
                                    Winner
                                  </Badge>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {variant.trafficPercentage || 50}% traffic
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-4 text-center">
                              <div>
                                <p className="text-2xl font-bold">{variant.impressions || 0}</p>
                                <p className="text-xs text-muted-foreground">Impressions</p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold">{variant.clicks || 0}</p>
                                <p className="text-xs text-muted-foreground">Clicks</p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold">{variant.conversions || 0}</p>
                                <p className="text-xs text-muted-foreground">Conversions</p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold">
                                  {variant.impressions > 0 
                                    ? ((variant.engagements / variant.impressions) * 100).toFixed(1) 
                                    : "0.0"}%
                                </p>
                                <p className="text-xs text-muted-foreground">Engagement</p>
                              </div>
                            </div>

                            {testDetails.status === "running" && !testDetails.winnerVariantId && (
                              <div className="mt-4">
                                <Progress 
                                  value={(variant.impressions / (testDetails.minSampleSize || 100)) * 100} 
                                  className="h-2"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {variant.impressions || 0} / {testDetails.minSampleSize || 100} samples
                                </p>
                              </div>
                            )}

                            {testDetails.status === "running" && !testDetails.winnerVariantId && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-3"
                                onClick={() => declareWinnerMutation.mutate({
                                  testId: selectedTest,
                                  variantId: variant.id,
                                })}
                                disabled={declareWinnerMutation.isPending}
                              >
                                <Trophy className="w-4 h-4 mr-2" />
                                Declare Winner
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[400px]">
                <CardContent className="text-center">
                  <FlaskConical className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Select a Test</h3>
                  <p className="text-muted-foreground">
                    Choose a test from the list to view details and manage variants
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
