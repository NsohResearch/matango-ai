import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { motion } from "framer-motion";
import { 
  Brain, 
  Zap, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  Target,
  Layers,
  Shield,
  TrendingUp,
  Clock,
  Infinity,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

// AAO Taxonomy data
const aaoTypes = [
  {
    name: "Founder AAO",
    subtitle: "The Strategic Operator",
    icon: Brain,
    color: "from-primary to-emerald-400",
    description: "Acts as the always-on strategic brain of the brand or agency.",
    responsibilities: [
      "Owns the Brand Brain",
      "Maintains ICP definitions, positioning, voice rules",
      "Approves campaign angles",
      "Enforces brand consistency across all operators"
    ],
    replaces: ["Fractional CMO", "Strategy decks", "Repetitive alignment meetings"],
    memoryScope: "Long-term, Brand-wide, Immutable unless explicitly updated"
  },
  {
    name: "Campaign AAO",
    subtitle: "The Execution Operator",
    icon: Zap,
    color: "from-secondary to-pink-400",
    description: "Transforms strategy into multi-channel, measurable execution.",
    responsibilities: [
      "Converts Brand Brain → Campaign Angle",
      "Generates copy, visuals, ads, emails, landing pages",
      "Manages A/B tests",
      "Optimizes based on performance signals"
    ],
    replaces: ["Campaign managers", "Media planners", "Growth hackers juggling tools"],
    memoryScope: "Campaign-specific, Performance-aware, Iterative learning"
  },
  {
    name: "Influencer AAO",
    subtitle: "The Persona & Distribution Operator",
    icon: Users,
    color: "from-blue-500 to-cyan-400",
    description: "Embodies the brand as a persistent digital persona.",
    responsibilities: [
      "Generates images, videos, scripts, social posts",
      "Maintains visual and voice consistency",
      "Operates across TikTok, YouTube, Instagram, LinkedIn",
      "Feeds engagement data back into the loop"
    ],
    replaces: ["Creators", "Influencers", "On-camera talent", "Video spokespeople"],
    memoryScope: "Persona-specific, Style-aware, Engagement-trained"
  }
];

// Comparison table data - AAO vs Tools vs Agents
const comparisonData = [
  { dimension: "Persistent Memory", tools: false, agents: "partial", aao: true },
  { dimension: "Role Clarity", tools: false, agents: false, aao: true },
  { dimension: "Governance", tools: false, agents: false, aao: true },
  { dimension: "Brand Consistency", tools: false, agents: "partial", aao: true },
  { dimension: "Multi-Client Scale", tools: false, agents: "partial", aao: true },
  { dimension: "Agency-Ready", tools: false, agents: false, aao: true },
];

// Enhanced comparison: AAO vs Marketing Tools vs Human Teams
const fullComparisonData = [
  { feature: "Availability", aao: "24/7/365", tools: "When you use them", humans: "Business hours" },
  { feature: "Consistency", aao: "Perfect brand alignment", tools: "Depends on user", humans: "Varies by person" },
  { feature: "Scalability", aao: "Unlimited parallel tasks", tools: "Limited by licenses", humans: "Limited by headcount" },
  { feature: "Learning", aao: "Continuous improvement", tools: "No learning", humans: "Gradual improvement" },
  { feature: "Cost", aao: "Fixed subscription", tools: "Per-seat pricing", humans: "Salaries + benefits" },
  { feature: "Integration", aao: "Native cross-channel", tools: "Requires setup", humans: "Manual coordination" },
  { feature: "Speed", aao: "Instant execution", tools: "User-dependent", humans: "Hours to days" },
  { feature: "Brand Memory", aao: "Perfect recall", tools: "No memory", humans: "Inconsistent" },
  { feature: "Error Rate", aao: "Near-zero (guardrails)", tools: "User-dependent", humans: "Human error" },
  { feature: "Burnout Risk", aao: "None", tools: "N/A", humans: "High" },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-background/0" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/20 blur-[120px] rounded-full opacity-30" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              <span>The AI Marketing Agency for the Age of AAO</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter leading-[1.1] mb-6">
              From Hustle to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                Operatorship
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Traditional marketing agencies are built on people. People get tired. People context-switch. People sleep.
              <br /><br />
              <span className="text-foreground font-semibold">Matango.ai is built on AAOs — AI-Amplified Operators.</span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* What is an AAO Section */}
      <section className="py-24 bg-black/30 relative">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                What is an <span className="text-primary">AAO</span>?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                An AAO is not a tool. Not a chatbot. Not a single automation.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {[
                { icon: Brain, text: "Holds brand memory" },
                { icon: Zap, text: "Executes campaigns" },
                { icon: Layers, text: "Publishes across channels" },
                { icon: TrendingUp, text: "Learns from outcomes" },
                { icon: Infinity, text: "Never forgets" },
                { icon: Clock, text: "Never burns out" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="p-3 rounded-lg bg-primary/20">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <span className="font-medium">{item.text}</span>
                </motion.div>
              ))}
            </div>

            <div className="text-center">
              <p className="text-xl text-muted-foreground">
                Matango.ai is an AI Marketing Agency where{" "}
                <span className="text-primary font-semibold">humans set the direction</span>
                {" "}and operators do the work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AAO Taxonomy Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              AAO <span className="text-secondary">Taxonomy</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Matango.ai is built on specialized AAOs, not generic agents. Each AAO has a clear operational boundary, persistent memory scope, defined outcome, and feedback loop.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {aaoTypes.map((aao, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity rounded-2xl" 
                     style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }} />
                <div className="relative p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/30 transition-colors h-full">
                  <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${aao.color} mb-6`}>
                    <aao.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-1">{aao.name}</h3>
                  <p className="text-primary text-sm font-medium mb-4">{aao.subtitle}</p>
                  <p className="text-muted-foreground mb-6">{aao.description}</p>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground/80 mb-2">Primary Responsibilities</h4>
                      <ul className="space-y-1">
                        {aao.responsibilities.map((r, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold text-foreground/80 mb-2">What It Replaces</h4>
                      <div className="flex flex-wrap gap-2">
                        {aao.replaces.map((r, j) => (
                          <span key={j} className="px-2 py-1 text-xs rounded-full bg-white/10 text-muted-foreground">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-white/10">
                      <p className="text-xs text-muted-foreground">
                        <span className="text-foreground/80 font-medium">Memory Scope:</span> {aao.memoryScope}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* AAO Interaction Flow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-white/10"
          >
            <h3 className="text-xl font-bold text-center mb-8">AAO Interaction Model</h3>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
              {[
                { name: "Founder AAO", icon: Brain },
                { name: "Campaign AAO", icon: Zap },
                { name: "Influencer AAO", icon: Users },
                { name: "Distribution + Analytics", icon: TrendingUp },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <div className="p-3 rounded-xl bg-white/10 mb-2">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-center">{item.name}</span>
                  </div>
                  {i < 3 && (
                    <ChevronRight className="w-6 h-6 text-muted-foreground hidden md:block" />
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground mt-6">
              This is not agent chaos. It is <span className="text-primary font-semibold">operator orchestration</span>.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-24 bg-black/30 relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              AAOs vs <span className="text-primary">Tools</span> vs <span className="text-secondary">Agents</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Why Matango.ai wins: AAOs operate like digital employees, not chatbots.
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 font-semibold">Dimension</th>
                  <th className="text-center py-4 px-4 font-semibold text-muted-foreground">Tools</th>
                  <th className="text-center py-4 px-4 font-semibold text-muted-foreground">Generic AI Agents</th>
                  <th className="text-center py-4 px-4 font-semibold text-primary">Matango AAOs</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-4 px-4 font-medium">{row.dimension}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-red-400">✗</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {row.agents === "partial" ? (
                        <span className="text-yellow-400">⚠️</span>
                      ) : (
                        <span className="text-red-400">✗</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-primary">✓</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* AAO vs Marketing Tools vs Human Teams Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              AAO vs <span className="text-primary">Marketing Tools</span> vs <span className="text-blue-400">Human Teams</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See how AI-Amplified Operators compare to traditional marketing approaches.
            </p>
          </motion.div>

          <div className="max-w-5xl mx-auto overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 font-semibold">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      <span className="text-primary">AAOs</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="text-muted-foreground">Marketing Tools</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span className="text-muted-foreground">Human Teams</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {fullComparisonData.map((row, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-medium">{row.feature}</td>
                    <td className="py-4 px-4 text-center text-primary font-medium">{row.aao}</td>
                    <td className="py-4 px-4 text-center text-muted-foreground">{row.tools}</td>
                    <td className="py-4 px-4 text-center text-muted-foreground">{row.humans}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 text-center"
          >
            <Link href="/aao-glossary">
              <Button variant="outline" className="border-primary/30 hover:bg-primary/10">
                Learn More About AAOs
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* From SaaS to Operatorware Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-secondary/30 bg-secondary/10 text-secondary text-sm font-medium mb-6">
                <Target className="w-4 h-4" />
                <span>Category Creation</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                From SaaS → <span className="text-secondary">Operatorware</span>
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="p-6 rounded-xl bg-red-500/10 border border-red-500/20"
              >
                <h3 className="text-xl font-bold mb-4 text-red-400">Why SaaS Breaks</h3>
                <p className="text-muted-foreground mb-4">
                  AI marketing today is a SaaS graveyard: one app for copy, another for images, another for video, another for scheduling, another for analytics, another for CRM.
                </p>
                <p className="text-muted-foreground">
                  This fragmentation creates structural failure: brand memory gets lost, consistency collapses, and <span className="text-foreground">humans become the integration layer</span>.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="p-6 rounded-xl bg-primary/10 border border-primary/20"
              >
                <h3 className="text-xl font-bold mb-4 text-primary">What Operatorware Changes</h3>
                <p className="text-muted-foreground mb-4">
                  Operatorware replaces "tool usage" with "operator outcomes."
                </p>
                <p className="text-muted-foreground">
                  Instead of "generate a post" or "edit a video," you define an outcome: <span className="text-foreground">"Grow Brand X on LinkedIn and TikTok with consistent voice, weekly cadence, and measurable lead flow."</span>
                </p>
                <p className="text-primary font-semibold mt-4">
                  And operators execute end-to-end.
                </p>
              </motion.div>
            </div>

            {/* Moat Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl bg-white/5 border border-white/10"
            >
              <h3 className="text-xl font-bold mb-6 text-center">Why This Creates a Moat</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { icon: Brain, title: "Memory Moat", desc: "Brand Brains + performance memory compound" },
                  { icon: Layers, title: "Workflow Moat", desc: "Orchestration across studios + publishing + analytics" },
                  { icon: Shield, title: "Governance Moat", desc: "Entitlements, safety, audit logs, rate limits" },
                  { icon: TrendingUp, title: "Distribution Moat", desc: "Integrated posting + attribution + optimization" },
                  { icon: Users, title: "Expansion Moat", desc: "Agencies scale by adding operators, not headcount" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-white/5">
                    <item.icon className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* The New Agency Model */}
      <section className="py-24 bg-gradient-to-b from-primary/10 to-background relative">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-8">
                The New <span className="text-primary">Agency Model</span>
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-muted-foreground text-sm mb-2">Old model:</p>
                  <p className="text-xl font-semibold">"Let's hire more people."</p>
                </div>
                <div className="p-6 rounded-xl bg-primary/10 border border-primary/30">
                  <p className="text-primary text-sm mb-2">Matango model:</p>
                  <p className="text-xl font-semibold">"Deploy another K'ah."</p>
                </div>
              </div>

              <p className="text-2xl font-bold text-primary mb-8">
                That is the AAO future. That is Matango.ai.
              </p>

              <div className="p-6 rounded-xl bg-white/5 border border-white/10 mb-8">
                <p className="text-lg text-muted-foreground">
                  Matango.ai is the AI Marketing Agency where AAOs like K'ah run growth loops—<span className="text-primary font-semibold">24/7, brand-perfect, and never tired</span>.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/meet-kah">
                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Meet K'ah, Our Lead AAO
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/5">
                    View Pricing
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer Tagline */}
      <section className="py-12 border-t border-white/10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-2xl font-bold">
            <span className="text-primary">One Loop.</span>{" "}
            <span className="text-secondary">One Brand Brain.</span>{" "}
            <span className="text-foreground">Always-On Growth.</span>
          </p>
        </div>
      </section>
    </div>
  );
}
