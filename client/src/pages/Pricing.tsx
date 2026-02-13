import { useState } from "react";
import ContactSalesModal from "@/components/ContactSalesModal";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Check, 
  Zap, 
  Star, 
  ShieldCheck, 
  Loader2,
  Sparkles,
  Building2,
  User,
  Crown,
  ArrowRight,
  Gift,
  Clock,
  Users,
  Rocket,
  Brain,
  Video,
  BarChart3,
  Palette,
  MessageSquare
} from "lucide-react";
import { motion } from "framer-motion";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

export default function Pricing() {
  const { user, isAuthenticated } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [showContactModal, setShowContactModal] = useState(false);

  const handleCheckout = async (planId: string) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to purchase");
      window.location.href = getLoginUrl();
      return;
    }

    setLoadingPlan(planId);
    
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          userId: user?.id,
          userEmail: user?.email,
          userName: user?.name,
          billingCycle,
        }),
      });

      const data = await response.json();

      if (data.url) {
        toast.info("Redirecting to checkout...");
        window.open(data.url, "_blank");
      } else {
        toast.error(data.error || "Failed to create checkout session");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      id: "FREE",
      name: "Free",
      icon: <User className="w-6 h-6" />,
      description: "Perfect for exploring AAO capabilities",
      monthlyPrice: 0,
      yearlyPrice: 0,
      popular: false,
      cta: "Get Started Free",
      features: [
        { text: "1 AAO (AI-Amplified Operation)", included: true },
        { text: "3 Image generations/month", included: true },
        { text: "7 days trial", included: true },
        { text: "Basic templates", included: true },
        { text: "Community support", included: true },
        { text: "Matango watermark", included: true },
        { text: "Brand Brain", included: false },
        { text: "Video generation", included: false },
        { text: "Team collaboration", included: false },
        { text: "Analytics dashboard", included: false },
        { text: "API access", included: false },
      ],
    },
    {
      id: "BASIC",
      name: "Basic",
      icon: <Zap className="w-6 h-6" />,
      description: "For solopreneurs and creators",
      monthlyPrice: 199,
      yearlyPrice: 1990,
      popular: false,
      cta: "Start Basic",
      features: [
        { text: "5 AI Influencers", included: true },
        { text: "100 Image generations/month", included: true },
        { text: "3 Custom Domains", included: true },
        { text: "3 Unlimited customers/brands", included: true },
        { text: "All templates", included: true },
        { text: "Email support", included: true },
        { text: "No watermark", included: true },
        { text: "Brand Brain", included: true },
        { text: "10 Video generations/month", included: true },
        { text: "Basic analytics", included: true },
        { text: "Team collaboration", included: false },
        { text: "API access", included: false },
      ],
    },
    {
      id: "AGENCY",
      name: "Agency",
      icon: <Building2 className="w-6 h-6" />,
      description: "For teams and agencies",
      monthlyPrice: 399,
      yearlyPrice: 3990,
      popular: true,
      cta: "Go Agency",
      features: [
        { text: "Unlimited AI Influencers", included: true },
        { text: "500 Image generations/month", included: true },
        { text: "All templates + custom", included: true },
        { text: "Priority support", included: true },
        { text: "White-label option", included: true },
        { text: "20 Custom Domains", included: true },
        { text: "20 customers/brands", included: true },
        { text: "Advanced Brand Brain", included: true },
        { text: "50 Video generations/month", included: true },
        { text: "Full analytics + AI insights", included: true },
        { text: "5 Team members", included: true },
        { text: "API access", included: true },
      ],
    },
  ];

  const agencyPlusFeatures = [
    { icon: <Sparkles className="w-5 h-5" />, text: "Everything in Agency" },
    { icon: <Zap className="w-5 h-5" />, text: "Unlimited Image generations/month" },
    { icon: <Video className="w-5 h-5" />, text: "200 Video generations/month" },
    { icon: <Palette className="w-5 h-5" />, text: "All templates + custom" },
    { icon: <Users className="w-5 h-5" />, text: "Unlimited customers/brands" },
    { icon: <ShieldCheck className="w-5 h-5" />, text: "Unlimited Custom Domains" },
    { icon: <Brain className="w-5 h-5" />, text: "Advanced Brand Brain" },
    { icon: <MessageSquare className="w-5 h-5" />, text: "Priority support + White-label" },
  ];

  const testimonials = [
    {
      quote: "Matango.ai helped us scale our content production 10x while cutting costs by 60%.",
      author: "Sarah Chen",
      role: "Marketing Director",
      company: "TechFlow Inc",
    },
    {
      quote: "The AI influencers we created have better engagement than our human influencers!",
      author: "Marcus Johnson",
      role: "Founder",
      company: "Social Spark Agency",
    },
    {
      quote: "Brand Brain is a game-changer. It keeps all our content perfectly on-brand.",
      author: "Emily Rodriguez",
      role: "Creative Director",
      company: "Bloom Digital",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-32 pb-20">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-primary to-purple-500 text-white border-0">
            <Gift className="w-3 h-3 mr-1" />
            Launch Special - 2 Months Free on Yearly
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tighter">
            Scale Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">AI Marketing</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Choose the plan that fits your growth. Upgrade or downgrade anytime.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-4 p-1 rounded-full bg-white/5 border border-white/10">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === "monthly" 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                billingCycle === "yearly" 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">
                Save 17%
              </Badge>
            </button>
          </div>
        </div>
        
        {/* Pricing Cards */}
        <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-6 mb-16">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative ${plan.popular ? "lg:-mt-4 lg:mb-4" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-primary to-purple-500 text-white border-0 shadow-lg">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <Card className={`h-full ${
                plan.popular 
                  ? "bg-gradient-to-b from-primary/20 to-purple-500/20 border-primary/50 shadow-[0_0_40px_rgba(204,255,0,0.15)]" 
                  : "bg-white/5 border-white/10"
              }`}>
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${plan.popular ? "bg-primary/20" : "bg-white/10"}`}>
                      {plan.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">
                        ${billingCycle === "monthly" ? plan.monthlyPrice : Math.round(plan.yearlyPrice / 12)}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    {billingCycle === "yearly" && plan.yearlyPrice > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        ${plan.yearlyPrice} billed annually
                      </p>
                    )}
                  </div>

                  <Button
                    className={`w-full mb-6 ${
                      plan.popular 
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(204,255,0,0.3)]" 
                        : plan.id === "FREE" 
                          ? "bg-white/10 hover:bg-white/20" 
                          : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => plan.id === "FREE" ? window.location.href = getLoginUrl() : handleCheckout(plan.id)}
                    disabled={loadingPlan === plan.id}
                  >
                    {loadingPlan === plan.id ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                    ) : (
                      <>
                        {plan.cta}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>

                  <div className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <div 
                        key={i} 
                        className={`flex items-center gap-3 text-sm ${
                          feature.included ? "" : "text-muted-foreground"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          feature.included 
                            ? plan.popular ? "bg-primary/20" : "bg-white/10" 
                            : "bg-white/5"
                        }`}>
                          {feature.included ? (
                            <Check className={`w-3 h-3 ${plan.popular ? "text-primary" : ""}`} />
                          ) : (
                            <span className="w-1.5 h-0.5 bg-muted-foreground rounded" />
                          )}
                        </div>
                        <span>{feature.text}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Agency++ Section */}
        <Card className="max-w-6xl mx-auto bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 border-purple-500/30 mb-16">
          <CardContent className="p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <Badge className="mb-4 bg-purple-500/20 text-purple-400 border-purple-500/30">
                  <Crown className="w-3 h-3 mr-1" />
                  Agency++
                </Badge>
                <h2 className="text-3xl font-bold mb-4">Need Unlimited Power?</h2>
                <p className="text-muted-foreground mb-6">
                  Custom solutions for large agencies and enterprises. Get unlimited everything, 
                  priority support, and white-label options.
                </p>
                <Button 
                  size="lg" 
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                  onClick={() => setShowContactModal(true)}
                >
                  Talk to Sales
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {agencyPlusFeatures.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <div className="text-purple-400">{feature.icon}</div>
                    <span className="text-sm">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Comparison */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Compare All Features</h2>
          <Card className="bg-white/5 border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 font-medium">Feature</th>
                    <th className="text-center p-4 font-medium">Free</th>
                    <th className="text-center p-4 font-medium">Basic</th>
                    <th className="text-center p-4 font-medium bg-primary/10">Agency</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: "AI Influencers", free: "1", basic: "5", agency: "Unlimited" },
                    { feature: "Image Generations", free: "3/mo", basic: "100/mo", agency: "500/mo" },
                    { feature: "Video Generations", free: "—", basic: "10/mo", agency: "50/mo" },
                    { feature: "Custom Domains", free: "—", basic: "3", agency: "20" },
                    { feature: "Customers/Brands", free: "—", basic: "3", agency: "20" },
                    { feature: "Brand Brain", free: "—", basic: "✓", agency: "Advanced" },
                    { feature: "Analytics", free: "—", basic: "Basic", agency: "Full + AI Insights" },
                    { feature: "Team Members", free: "1", basic: "1", agency: "5" },
                    { feature: "API Access", free: "—", basic: "—", agency: "✓" },
                    { feature: "White-label", free: "—", basic: "—", agency: "✓" },
                    { feature: "Support", free: "Community", basic: "Email", agency: "Priority" },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="p-4 font-medium">{row.feature}</td>
                      <td className="p-4 text-center text-muted-foreground">{row.free}</td>
                      <td className="p-4 text-center">{row.basic}</td>
                      <td className="p-4 text-center bg-primary/5 text-primary font-medium">{row.agency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Testimonials */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Loved by Marketers</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <Card key={i} className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <p className="text-muted-foreground mb-4 italic">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-primary font-bold">
                        {testimonial.author.split(" ").map(n => n[0]).join("")}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}, {testimonial.company}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "Can I switch plans anytime?",
                a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate your billing."
              },
              {
                q: "What happens if I exceed my limits?",
                a: "We'll notify you when you're approaching your limits. You can upgrade your plan or purchase additional credits as needed."
              },
              {
                q: "Do you offer refunds?",
                a: "Yes, we offer a 14-day money-back guarantee. If you're not satisfied, contact us for a full refund."
              },
              {
                q: "Can I use the AI influencers commercially?",
                a: "Absolutely! All paid plans include full commercial usage rights for the content you create."
              },
            ].map((faq, i) => (
              <Card key={i} className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <h3 className="font-medium mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Trust Badges */}
        <div className="text-center">
          <div className="inline-flex items-center gap-6 text-muted-foreground mb-8 flex-wrap justify-center">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              <span>14-Day Money Back</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>Cancel Anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span>Instant Access</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Test card: 4242 4242 4242 4242 (any future date, any CVC)
          </p>
        </div>
      </div>

      {/* Contact Sales Modal */}
      <ContactSalesModal 
        open={showContactModal} 
        onOpenChange={setShowContactModal} 
      />
    </div>
  );
}
