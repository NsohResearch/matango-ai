import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import { ArrowRight, Play, Brain, Zap, BarChart3, RefreshCw, Target, Layers } from "lucide-react";
import { AppFooter } from "@/components/layout/AppFooter";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      
      {/* Hero Section - "End the Marketing Tool Parade" */}
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-40 overflow-hidden">
        {/* Background gradient - Teal glow */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-background/0" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-primary/20 blur-[150px] rounded-full opacity-40" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* K'ah Video Placeholder - Rectangular Frame Above Hero */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <a href="#how-it-works-video" className="block">
                <div className="relative max-w-2xl mx-auto rounded-2xl overflow-hidden border-2 border-primary/30 shadow-2xl group cursor-pointer">
                  {/* Glow effect */}
                  <div className="absolute -inset-4 bg-gradient-to-b from-primary/20 to-transparent blur-2xl opacity-60 -z-10" />
                  
                  {/* Video thumbnail - 16:9 aspect ratio */}
                  <div className="aspect-video relative">
                    <img 
                      src="https://files.manuscdn.com/user_upload_by_module/session_file/93518399/kHLxNoehXKDKBjlu.png" 
                      alt="K'ah - Your AI Marketing Guide" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    
                    {/* Dark overlay for better text visibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    
                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                        <Play className="w-6 h-6 md:w-8 md:h-8 text-white ml-1" fill="white" />
                      </div>
                    </div>
                    
                    {/* Video info overlay */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                      <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
                        <p className="text-white text-sm font-medium">End the Marketing Tool Parade</p>
                        <p className="text-white/70 text-xs">0:56 • Introduction</p>
                      </div>
                      <div className="bg-primary/90 backdrop-blur-sm rounded-lg px-3 py-1.5">
                        <p className="text-white text-xs font-medium">Featuring K'ah</p>
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full system-badge text-primary text-sm font-medium mb-8">
                <RefreshCw className="w-4 h-4 loop-rotate" />
                <span>AI-Amplified Operators (AAO) for Always-On Growth</span>
              </div>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-5xl lg:text-7xl font-bold tracking-tighter leading-[1.1] mb-6"
            >
              End the Marketing<br />
              <span className="gradient-text">Tool Parade.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              Meet the AI-Amplified Operators (AAO)—digital team members that think, execute, and learn your brand story 24/7. No more context switching. No more fragmented tools. Just continuous growth.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <a href={isAuthenticated ? "/brand-brain" : getLoginUrl()}>
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg h-14 px-8 rounded-full teal-glow hover:shadow-[0_0_40px_oklch(0.6_0.15_175_/_0.5)] transition-all">
                  Build Your Brand Brain
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </a>
              <a href="#how-it-works-video">
                <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/5 text-lg h-14 px-8 rounded-full group">
                  <Play className="mr-2 w-5 h-5 group-hover:text-accent" />
                  Watch How It Works
                </Button>
              </a>
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-8 text-sm text-muted-foreground italic"
            >
              "Marketing isn't about tools. It's about operators. Matango.ai deploys AAOs that never sleep."
            </motion.p>
          </div>
        </div>
      </section>

      {/* K'ah Video Introduction Section */}
      <section id="how-it-works-video" className="py-16 relative">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8"
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Meet <span className="gradient-text">K'ah</span>
              </h2>
              <p className="text-muted-foreground mb-4">
                Your first AI-Amplified Operator (AAO)
              </p>
              <Link href="/meet-kah">
                <span className="text-primary hover:underline text-sm cursor-pointer">Learn how K'ah was created →</span>
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-2xl"
            >
              {/* K'ah Video Player */}
              <div className="aspect-video relative">
                <video 
                  controls
                  poster="https://files.manuscdn.com/user_upload_by_module/session_file/93518399/kHLxNoehXKDKBjlu.png"
                  className="w-full h-full object-cover"
                  preload="metadata"
                >
                  <source src="https://files.manuscdn.com/user_upload_by_module/session_file/93518399/RnFhVNSULPqOWctO.mp4" type="video/mp4" />
                  <track 
                    kind="captions" 
                    src="/kah_intro_video.vtt" 
                    srcLang="en" 
                    label="English" 
                    default 
                  />
                  Your browser does not support the video tag.
                </video>
                
                {/* Video Info Overlay (visible when paused) */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                  <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
                    <p className="text-white text-sm font-medium">End the Marketing Tool Parade</p>
                    <p className="text-white/70 text-xs">Introduction</p>
                  </div>
                  <div className="bg-primary/90 backdrop-blur-sm rounded-lg px-3 py-2">
                    <p className="text-white text-xs font-medium">Featuring K'ah</p>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mt-6 text-sm text-muted-foreground"
            >
              "Your brand already has roots. Let's help them spread." — K'ah
            </motion.p>
          </div>
        </div>
      </section>

      {/* Problem Section - The Tool Parade */}
      <section className="py-24 bg-secondary/20 relative">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Sound Familiar?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                "Tool 1. Tool 2. Tool 3…"<br />
                By the end of the tutorial, you're teaching tools — not strategy.
              </p>
            </motion.div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { 
                  title: "Context Lost", 
                  desc: "Every tool needs your brand context re-entered. Your ICP, voice, and proof scattered across 10+ platforms.",
                  stat: "4+ hrs/week"
                },
                { 
                  title: "No Memory", 
                  desc: "Tools don't remember what worked. You're guessing instead of learning from every campaign.",
                  stat: "Zero feedback"
                },
                { 
                  title: "Fragmented Results", 
                  desc: "Analytics in one place, content in another, leads in a third. No unified view of growth.",
                  stat: "Broken loop"
                },
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 rounded-xl bg-background/50 border border-border"
                >
                  <div className="text-xs font-mono text-muted-foreground mb-2">{item.stat}</div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section - The Continuous Loop */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                Matango.ai Replaces the Tool Parade<br />
                <span className="gradient-text">With One Continuous Loop</span>
              </h2>
              <p className="text-muted-foreground text-lg">
                One system. One brand brain. Always-on growth.
              </p>
            </motion.div>
          </div>
          
          {/* The Loop Visualization */}
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { 
                  icon: Brain, 
                  step: "01", 
                  title: "Build Brand Brain", 
                  desc: "Define your ICP, voice, claims, and proof once. Your brand memory powers everything.",
                  verb: "Remember"
                },
                { 
                  icon: Layers, 
                  step: "02", 
                  title: "Generate Campaign", 
                  desc: "One campaign object creates LinkedIn posts, ads, emails, landing pages, and video scripts.",
                  verb: "Create"
                },
                { 
                  icon: Target, 
                  step: "03", 
                  title: "Publish Everywhere", 
                  desc: "Schedule and publish across all channels. Capture leads with built-in UTM tracking.",
                  verb: "Execute"
                },
                { 
                  icon: RefreshCw, 
                  step: "04", 
                  title: "Learn & Improve", 
                  desc: "Performance feeds back automatically. AI insights tell you what's working and what to try next.",
                  verb: "Optimize"
                },
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="relative p-6 rounded-2xl bg-card border border-border card-hover group"
                >
                  {/* Connecting line */}
                  {i < 3 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-primary/50 to-primary/20" />
                  )}
                  
                  <div className="text-xs font-mono text-primary mb-4">{item.step}</div>
                  <div className="mb-4 p-3 rounded-xl bg-primary/10 w-fit group-hover:bg-primary/20 transition-colors">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-xs font-medium text-accent mb-1">{item.verb}</div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
            
            {/* Loop arrow */}
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="hidden lg:flex justify-center mt-8"
            >
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="w-16 h-0.5 bg-gradient-to-r from-transparent to-primary/50" />
                <RefreshCw className="w-5 h-5 text-primary loop-rotate" />
                <span className="text-primary font-medium">Continuous improvement loop</span>
                <div className="w-16 h-0.5 bg-gradient-to-l from-transparent to-primary/50" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Core Principles */}
      <section className="py-24 bg-secondary/20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              System, Not Tools
            </h2>
            <p className="text-muted-foreground text-lg">
              Three principles that make Matango.ai fundamentally different.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: <Brain className="w-8 h-8 text-primary" />,
                title: "One Brand Brain",
                desc: "Your ICP, voice, claims, and proof live in one place. Never re-enter context again. Every campaign inherits your brand memory."
              },
              {
                icon: <Zap className="w-8 h-8 text-accent" />,
                title: "Unified Campaign Object",
                desc: "One campaign contains audience, angle, assets, schedule, landing page, ads, emails, and results. Single source of truth."
              },
              {
                icon: <BarChart3 className="w-8 h-8 text-primary" />,
                title: "Closed-Loop Learning",
                desc: "Performance feeds strategy automatically. Stop guessing—let data drive your next best action. The system gets smarter with every campaign."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-2xl bg-card border border-border card-hover group"
              >
                <div className="mb-6 p-4 rounded-xl bg-primary/10 w-fit group-hover:bg-primary/20 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Audience Messages */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Built For Teams Ready to Deploy AAOs
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                audience: "AI Founders & Startups",
                message: "Deploy operators, not tools.",
                desc: "Your AAOs hold brand memory, execute campaigns, and learn from outcomes—24/7, without burnout."
              },
              {
                audience: "Agencies",
                message: "Scale with operators, not headcount.",
                desc: "Deploy AAOs for each client. White-label the platform. Deliver consistent results without hiring."
              },
              {
                audience: "Creators",
                message: "Your AAO works while you sleep.",
                desc: "Your Influencer AAO generates content, publishes across channels, and learns what resonates—all on autopilot."
              }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-2xl bg-card border border-border card-hover text-center"
              >
                <div className="text-xs font-mono text-primary mb-4">{item.audience}</div>
                <h3 className="text-xl font-bold mb-3 gradient-text">{item.message}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-background" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Ready to End the<br />
              <span className="gradient-text">Tool Parade?</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Start with your Brand Brain. Let the system handle the rest.
            </p>
            <a href={isAuthenticated ? "/brand-brain" : getLoginUrl()}>
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xl h-16 px-10 rounded-full teal-glow hover:shadow-[0_0_50px_oklch(0.6_0.15_175_/_0.5)] transition-all">
                Build Your Brand Brain
                <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
            </a>
            <p className="mt-6 text-sm text-muted-foreground">
              Free tier available. No credit card required.
            </p>
          </motion.div>
        </div>
      </section>
      
      <AppFooter />
    </div>
  );
}
