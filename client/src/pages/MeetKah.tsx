import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import KahCreationRoadmap from "@/components/KahCreationRoadmap";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Brain, Video, Mic, Palette, Users, Zap, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

export default function MeetKah() {
  const { isAuthenticated } = useAuth();

  const creationSteps = [
    {
      step: "01",
      title: "Define Your Brand Brain",
      description: "Start by building your Brand Brain—your ICP, voice, claims, and proof. This becomes the foundation for your AI influencer's personality and messaging.",
      icon: Brain,
    },
    {
      step: "02",
      title: "Generate Your Influencer",
      description: "Use our AI Influencer Studio to create a unique visual identity. Choose appearance, style, and aesthetic that aligns with your brand.",
      icon: Sparkles,
    },
    {
      step: "03",
      title: "Craft Their Voice",
      description: "Define how your influencer speaks—tone, vocabulary, catchphrases. Our AI learns from your Brand Brain to maintain consistency.",
      icon: Mic,
    },
    {
      step: "04",
      title: "Create Content",
      description: "Generate videos, images, and scripts featuring your AI influencer. They become the face of your campaigns across all channels.",
      icon: Video,
    },
  ];

  const kahTraits = [
    { trait: "Warm & Approachable", description: "K'ah's friendly demeanor makes complex marketing concepts accessible" },
    { trait: "Confident & Knowledgeable", description: "She speaks with authority about ending the tool parade" },
    { trait: "Authentic & Relatable", description: "Her style resonates with modern AI entrepreneurs" },
    { trait: "Consistent & On-Brand", description: "Every appearance reinforces the Matango.ai message" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-background/0" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-primary/20 blur-[150px] rounded-full opacity-40" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* K'ah Image */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <div className="relative rounded-2xl overflow-hidden border-2 border-primary/30 shadow-2xl">
                  <div className="absolute -inset-4 bg-gradient-to-b from-primary/20 to-transparent blur-2xl opacity-60 -z-10" />
                  <img 
                    src="https://files.manuscdn.com/user_upload_by_module/session_file/93518399/kHLxNoehXKDKBjlu.png" 
                    alt="K'ah - Matango.ai's AI Influencer" 
                    className="w-full h-auto"
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 bg-primary/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
                  <p className="text-white text-sm font-medium">AI-Amplified Operator (AAO)</p>
                </div>
              </motion.div>
              
              {/* Content */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full system-badge text-primary text-sm font-medium mb-6">
                  <Sparkles className="w-4 h-4" />
                  <span>Matango's First AAO</span>
                </div>
                
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] mb-6">
                  Meet <span className="gradient-text">K'ah</span>, Your Lead AAO
                </h1>
                
                <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                  K'ah is Matango.ai's first AI-Amplified Operator (AAO)—a digital team member who runs growth loops 24/7, never sleeps, and never loses brand context.
                </p>
                
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  She represents the future of marketing: operators, not tools. K'ah isn't just a mascot—she's a fully operational Influencer AAO who generates content, publishes across channels, and learns from outcomes. She's proof that you can scale marketing without scaling headcount.
                </p>
                
                <a href={isAuthenticated ? "/influencer-studio" : getLoginUrl()}>
                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg h-14 px-8 rounded-full teal-glow">
                    Deploy Your Own AAO
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </a>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* How K'ah Was Created */}
      <section className="py-24 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                How K'ah Was <span className="gradient-text">Created</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                K'ah was built using the exact same process you'll use to deploy your own AAO
              </p>
            </motion.div>
            
            {/* Visual Roadmap */}
            <KahCreationRoadmap />
            
            {/* Detailed Cards */}
            <div className="grid md:grid-cols-2 gap-8 mt-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-card border border-border rounded-2xl p-8"
              >
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  Brand Brain Foundation
                </h3>
                <p className="text-muted-foreground mb-4">
                  K'ah's personality stems from Matango.ai's Brand Brain. We defined our ICP (AI entrepreneurs tired of tool fragmentation), our voice (confident, warm, solution-focused), and our core message (end the marketing tool parade).
                </p>
                <p className="text-muted-foreground">
                  This foundation ensures every piece of content K'ah creates stays on-brand and resonates with our target audience.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-card border border-border rounded-2xl p-8"
              >
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Visual Identity
                </h3>
                <p className="text-muted-foreground mb-4">
                  We used AI image generation to create K'ah's appearance—a warm, approachable woman in her 20s with a professional yet friendly aesthetic. The warm orange studio lighting and red satin blouse were chosen to convey confidence and warmth.
                </p>
                <p className="text-muted-foreground">
                  Her consistent visual style across all content builds recognition and trust.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="bg-card border border-border rounded-2xl p-8"
              >
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Mic className="w-5 h-5 text-primary" />
                  Voice & Personality
                </h3>
                <p className="text-muted-foreground mb-4">
                  K'ah speaks with a young, feminine American accent—friendly and confident. Her voice was generated using AI text-to-speech, trained to deliver marketing messages with the right blend of authority and approachability.
                </p>
                <p className="text-muted-foreground">
                  Her catchphrase "End the marketing tool parade" anchors every appearance.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="bg-card border border-border rounded-2xl p-8"
              >
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Video className="w-5 h-5 text-primary" />
                  Content Creation
                </h3>
                <p className="text-muted-foreground mb-4">
                  K'ah's videos combine her static image with AI-generated voiceover. Scripts are written using our Brand Brain context, ensuring every video reinforces our core messaging.
                </p>
                <p className="text-muted-foreground">
                  The result? Professional marketing videos created in minutes, not days.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* K'ah's Traits */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                What Makes K'ah <span className="gradient-text">Effective</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                The traits that make K'ah a successful AI influencer—and how you can replicate them
              </p>
            </motion.div>
            
            <div className="grid sm:grid-cols-2 gap-6">
              {kahTraits.map((item, index) => (
                <motion.div
                  key={item.trait}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-4 p-6 bg-card border border-border rounded-xl"
                >
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">{item.trait}</h3>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Create Your Own Section */}
      <section className="py-24 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Create Your Own <span className="gradient-text">AI Influencer</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Follow the same process we used to create K'ah and build your brand's digital ambassador
              </p>
            </motion.div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {creationSteps.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative"
                >
                  <div className="bg-card border border-border rounded-2xl p-6 h-full">
                    <div className="text-primary/30 text-5xl font-bold mb-4">{step.step}</div>
                    <step.icon className="w-8 h-8 text-primary mb-4" />
                    <h3 className="text-lg font-bold mb-3">{step.title}</h3>
                    <p className="text-muted-foreground text-sm">{step.description}</p>
                  </div>
                  {index < creationSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                      <ArrowRight className="w-6 h-6 text-primary/30" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Why AI Influencers <span className="gradient-text">Work</span>
              </h2>
            </motion.div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Always Available</h3>
                <p className="text-muted-foreground">
                  Your AI influencer never takes sick days, never has scheduling conflicts, and can create content 24/7.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Perfectly On-Brand</h3>
                <p className="text-muted-foreground">
                  Every piece of content aligns with your Brand Brain. No more off-brand posts or inconsistent messaging.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Infinitely Scalable</h3>
                <p className="text-muted-foreground">
                  Create unlimited content variations. Test different messages. Scale your presence without scaling costs.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-b from-background to-primary/5">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Ready to Create Your<br />
              <span className="gradient-text">AI Influencer?</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              Start with your Brand Brain. Define your voice. Generate your influencer.
              Join the future of brand marketing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href={isAuthenticated ? "/influencer-studio" : getLoginUrl()}>
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg h-14 px-8 rounded-full teal-glow">
                  Start Creating
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </a>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/5 text-lg h-14 px-8 rounded-full">
                  View Pricing
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Free tier available. No credit card required.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">Matango.ai</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Matango.ai. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
