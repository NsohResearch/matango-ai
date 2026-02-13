import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot, 
  Zap, 
  Brain, 
  MessageSquare, 
  BarChart3, 
  Target, 
  Video, 
  Image, 
  Calendar,
  Users,
  TrendingUp,
  Shield,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  XCircle
} from "lucide-react";

const AAO_TYPES = [
  {
    id: "content",
    name: "Content AAO",
    icon: Sparkles,
    color: "bg-purple-500",
    description: "Generates and optimizes marketing content across all channels",
    capabilities: [
      "Blog posts and articles",
      "Social media posts",
      "Email sequences",
      "Ad copy variations",
      "Landing page content",
      "Video scripts",
    ],
    example: "K'ah generates 50 LinkedIn post variations from your Brand Brain, A/B tests them, and learns which hooks resonate with your ICP.",
  },
  {
    id: "engagement",
    name: "Engagement AAO",
    icon: MessageSquare,
    color: "bg-blue-500",
    description: "Manages audience interactions and community engagement",
    capabilities: [
      "Comment responses",
      "DM handling",
      "Community moderation",
      "Lead qualification",
      "Sentiment analysis",
      "Conversation routing",
    ],
    example: "Automatically responds to LinkedIn comments within your brand voice, escalating high-intent leads to your sales team.",
  },
  {
    id: "analytics",
    name: "Analytics AAO",
    icon: BarChart3,
    color: "bg-green-500",
    description: "Processes data and generates actionable insights",
    capabilities: [
      "Performance tracking",
      "Trend identification",
      "Competitor monitoring",
      "ROI calculation",
      "Attribution modeling",
      "Predictive analytics",
    ],
    example: "Analyzes your campaign performance across channels and recommends budget reallocation to maximize ROAS.",
  },
  {
    id: "campaign",
    name: "Campaign AAO",
    icon: Target,
    color: "bg-orange-500",
    description: "Orchestrates multi-channel marketing campaigns",
    capabilities: [
      "Campaign planning",
      "Asset coordination",
      "Channel optimization",
      "A/B test management",
      "Budget allocation",
      "Timeline management",
    ],
    example: "Launches a product announcement across LinkedIn, Twitter, email, and ads simultaneously with channel-optimized messaging.",
  },
  {
    id: "video",
    name: "Video AAO",
    icon: Video,
    color: "bg-red-500",
    description: "Creates and edits video content at scale",
    capabilities: [
      "Script generation",
      "Avatar animation",
      "Lip-sync videos",
      "Video editing",
      "Thumbnail creation",
      "Caption generation",
    ],
    example: "Transforms your blog post into a 60-second explainer video with AI avatar, captions, and platform-optimized formats.",
  },
  {
    id: "visual",
    name: "Visual AAO",
    icon: Image,
    color: "bg-pink-500",
    description: "Generates and manages visual brand assets",
    capabilities: [
      "Image generation",
      "Brand consistency",
      "Style adaptation",
      "Asset variations",
      "Format optimization",
      "Visual A/B testing",
    ],
    example: "Creates 20 ad creative variations maintaining brand consistency, then identifies top performers through automated testing.",
  },
  {
    id: "scheduling",
    name: "Scheduling AAO",
    icon: Calendar,
    color: "bg-teal-500",
    description: "Manages content calendar and publishing automation",
    capabilities: [
      "Optimal timing",
      "Cross-platform sync",
      "Queue management",
      "Evergreen recycling",
      "Holiday awareness",
      "Timezone optimization",
    ],
    example: "Automatically schedules your content at optimal times for each platform and audience segment based on engagement data.",
  },
  {
    id: "lead",
    name: "Lead AAO",
    icon: Users,
    color: "bg-indigo-500",
    description: "Captures and nurtures leads through the funnel",
    capabilities: [
      "Lead capture",
      "Scoring & qualification",
      "Nurture sequences",
      "CRM integration",
      "Follow-up automation",
      "Pipeline management",
    ],
    example: "Captures leads from your content, scores them based on engagement, and triggers personalized nurture sequences.",
  },
];

const COMPARISON_DATA = [
  {
    feature: "Availability",
    aao: "24/7/365",
    tools: "When you use them",
    humans: "Business hours",
  },
  {
    feature: "Consistency",
    aao: "Perfect brand alignment",
    tools: "Depends on user",
    humans: "Varies by person",
  },
  {
    feature: "Scalability",
    aao: "Unlimited parallel tasks",
    tools: "Limited by licenses",
    humans: "Limited by headcount",
  },
  {
    feature: "Learning",
    aao: "Continuous improvement",
    tools: "No learning",
    humans: "Gradual improvement",
  },
  {
    feature: "Cost",
    aao: "Fixed subscription",
    tools: "Per-seat pricing",
    humans: "Salaries + benefits",
  },
  {
    feature: "Integration",
    aao: "Native cross-channel",
    tools: "Requires setup",
    humans: "Manual coordination",
  },
  {
    feature: "Speed",
    aao: "Instant execution",
    tools: "User-dependent",
    humans: "Hours to days",
  },
  {
    feature: "Brand Memory",
    aao: "Perfect recall",
    tools: "No memory",
    humans: "Inconsistent",
  },
];

export default function AAOGlossary() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            <Bot className="w-3 h-3 mr-1" />
            AI-Amplified Operators
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            What is an <span className="text-primary">AAO</span>?
          </h1>
          <p className="text-xl text-muted-foreground">
            AI-Amplified Operators (AAOs) are intelligent agents that execute marketing tasks 
            autonomously while staying aligned with your brand strategy. They're not just tools—they're 
            tireless team members that learn, adapt, and improve.
          </p>
        </div>

        {/* Key Differentiators */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            AAOs vs. Traditional Automation
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-red-500/20 bg-red-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500">
                  <XCircle className="w-5 h-5" />
                  Traditional Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• Require manual operation</p>
                <p>• No context awareness</p>
                <p>• Siloed functionality</p>
                <p>• Static rules-based</p>
                <p>• You do the thinking</p>
              </CardContent>
            </Card>
            
            <Card className="border-yellow-500/20 bg-yellow-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-500">
                  <Zap className="w-5 h-5" />
                  Basic Automation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• If-this-then-that logic</p>
                <p>• Limited adaptability</p>
                <p>• Breaks with edge cases</p>
                <p>• No learning capability</p>
                <p>• Requires constant tuning</p>
              </CardContent>
            </Card>
            
            <Card className="border-green-500/20 bg-green-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-500">
                  <CheckCircle2 className="w-5 h-5" />
                  AAOs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• Autonomous execution</p>
                <p>• Brand-aware decisions</p>
                <p>• Cross-channel intelligence</p>
                <p>• Continuous learning</p>
                <p>• You set direction, they execute</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* AAO Types */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            Types of AAOs in Matango.ai
          </h2>
          
          <Tabs defaultValue="content" className="space-y-6">
            <TabsList className="flex flex-wrap justify-center gap-2 h-auto">
              {AAO_TYPES.map((aao) => (
                <TabsTrigger 
                  key={aao.id} 
                  value={aao.id}
                  className="gap-2"
                >
                  <aao.icon className="w-4 h-4" />
                  {aao.name.replace(" AAO", "")}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {AAO_TYPES.map((aao) => (
              <TabsContent key={aao.id} value={aao.id}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${aao.color}`}>
                        <aao.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle>{aao.name}</CardTitle>
                        <CardDescription>{aao.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-3">Capabilities</h4>
                      <div className="grid md:grid-cols-2 gap-2">
                        {aao.capabilities.map((cap, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                            {cap}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Example in Action
                      </h4>
                      <p className="text-muted-foreground">{aao.example}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </section>

        {/* Comparison Table */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            AAO vs. Marketing Tools vs. Human Teams
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold">Feature</th>
                  <th className="text-left p-4 font-semibold">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-primary" />
                      AAOs
                    </div>
                  </th>
                  <th className="text-left p-4 font-semibold">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      Marketing Tools
                    </div>
                  </th>
                  <th className="text-left p-4 font-semibold">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      Human Teams
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_DATA.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-muted/50">
                    <td className="p-4 font-medium">{row.feature}</td>
                    <td className="p-4 text-green-600">{row.aao}</td>
                    <td className="p-4 text-muted-foreground">{row.tools}</td>
                    <td className="p-4 text-muted-foreground">{row.humans}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* How AAOs Work */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            How AAOs Work with Your Brand Brain
          </h2>
          
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">1. Brand Brain</h3>
                <p className="text-sm text-muted-foreground">
                  Your ICP, voice, claims, and strategy are stored as the single source of truth
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">2. You Set Direction</h3>
                <p className="text-sm text-muted-foreground">
                  Define goals, approve strategies, and set guardrails for your AAOs
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">3. AAOs Execute</h3>
                <p className="text-sm text-muted-foreground">
                  Operators work 24/7 generating, publishing, engaging, and analyzing
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">4. Continuous Learning</h3>
                <p className="text-sm text-muted-foreground">
                  Results feed back into the system, improving performance over time
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Trust & Safety */}
        <section className="mb-16">
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Trust & Safety
              </CardTitle>
              <CardDescription>
                AAOs are designed with guardrails to ensure brand safety and compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Brand Guardrails</h4>
                  <p className="text-sm text-muted-foreground">
                    Forbidden phrases, tone rules, and claim restrictions are enforced automatically
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Human Oversight</h4>
                  <p className="text-sm text-muted-foreground">
                    You can require approval for sensitive content or high-stakes actions
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Audit Trail</h4>
                  <p className="text-sm text-muted-foreground">
                    Every AAO action is logged for transparency and compliance review
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <section className="text-center">
          <h2 className="text-2xl font-bold mb-4">
            Ready to Deploy Your First AAO?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Start with K'ah, your marketing guide AAO, and expand to content, engagement, 
            and analytics operators as your needs grow.
          </p>
          <div className="flex justify-center gap-4">
            <a href="/brand-brain">
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors">
                Build Your Brand Brain
                <ArrowRight className="w-4 h-4" />
              </button>
            </a>
            <a href="/meet-kah">
              <button className="inline-flex items-center gap-2 px-6 py-3 border border-primary text-primary rounded-lg font-semibold hover:bg-primary/10 transition-colors">
                Meet K'ah
              </button>
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
