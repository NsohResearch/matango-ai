import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { getLoginUrl } from "@/const";
import { 
  Brain, Globe, Users, Target, MessageSquare, Shield, 
  Plus, X, Loader2, Sparkles, CheckCircle2, ArrowRight,
  Lightbulb, Zap, Linkedin, Building2, ShoppingCart, 
  Briefcase, GraduationCap, AlertCircle, ExternalLink
} from "lucide-react";

type IcpPersona = {
  name: string;
  role: string;
  pains: string[];
  goals: string[];
  objections: string[];
};

type ClaimProof = {
  claim: string;
  proof: string;
  proofType: "testimonial" | "metric" | "case_study" | "demo";
};

type ObjectionResponse = {
  objection: string;
  response: string;
};

// Brand Brain Templates - 12 Industry-Specific Templates
const BRAND_BRAIN_TEMPLATES = {
  saas: {
    name: "SaaS / Software",
    icon: Building2,
    description: "For software-as-a-service and tech products",
    data: {
      category: "SaaS / Software",
      brandTone: "professional",
      icpPersonas: [
        { 
          name: "Tech-Savvy Tim", 
          role: "CTO / Technical Decision Maker",
          pains: ["Integration complexity", "Scaling challenges", "Technical debt"],
          goals: ["Reduce development time", "Improve system reliability", "Scale efficiently"],
          objections: ["Security concerns", "Migration effort", "Vendor lock-in"]
        },
        {
          name: "Business-Minded Beth",
          role: "CEO / Founder",
          pains: ["High operational costs", "Slow time-to-market", "Team productivity"],
          goals: ["Increase revenue", "Reduce costs", "Competitive advantage"],
          objections: ["ROI unclear", "Team adoption", "Budget constraints"]
        }
      ],
      keyOutcomes: ["Save 10+ hours per week", "Reduce costs by 40%", "Launch 3x faster"],
      differentiators: ["AI-powered automation", "No-code interface", "Enterprise-grade security"],
      claimsProof: [
        { claim: "Reduce development time by 50%", proof: "Based on customer survey of 500+ teams", proofType: "metric" as const },
        { claim: "Enterprise-grade security", proof: "SOC 2 Type II certified, annual penetration testing", proofType: "case_study" as const }
      ],
      objectionHandling: [
        { objection: "We're worried about vendor lock-in", response: "Our platform uses open standards and provides full data export. Many customers run hybrid setups." },
        { objection: "How long does implementation take?", response: "Most teams are live within 2 weeks. We provide dedicated onboarding support." }
      ],
      voiceRules: ["Be clear and concise", "Use data to back claims", "Avoid jargon unless necessary"],
      forbiddenPhrases: ["Revolutionary", "Game-changing", "Synergy", "Best-in-class"]
    }
  },
  ecommerce: {
    name: "E-commerce",
    icon: ShoppingCart,
    description: "For online stores and retail businesses",
    data: {
      category: "E-commerce / Retail",
      brandTone: "friendly",
      icpPersonas: [
        {
          name: "Busy Buyer Barbara",
          role: "Online Shopper",
          pains: ["Finding quality products", "Slow shipping", "Poor customer service"],
          goals: ["Save time shopping", "Get best value", "Hassle-free returns"],
          objections: ["Product quality concerns", "Shipping costs", "Trust issues"]
        },
        {
          name: "Deal-Hunter Dan",
          role: "Price-Conscious Consumer",
          pains: ["Overpaying for products", "Missing deals", "Comparison shopping fatigue"],
          goals: ["Find best prices", "Get exclusive deals", "Smart purchasing"],
          objections: ["Is this the best price?", "Hidden fees", "Return policy"]
        }
      ],
      keyOutcomes: ["Free shipping over $50", "30-day hassle-free returns", "24/7 customer support"],
      differentiators: ["Curated product selection", "Sustainable packaging", "Loyalty rewards program"],
      claimsProof: [
        { claim: "4.9/5 customer satisfaction rating", proof: "Based on 10,000+ verified reviews", proofType: "metric" as const },
        { claim: "Same-day shipping on most orders", proof: "Orders placed before 2pm ship same day, tracked delivery", proofType: "testimonial" as const }
      ],
      objectionHandling: [
        { objection: "What if I don't like the product?", response: "No problem! We offer 30-day hassle-free returns with free return shipping." },
        { objection: "Is this authentic/quality?", response: "We source directly from manufacturers and every product is quality-checked before shipping." }
      ],
      voiceRules: ["Be warm and approachable", "Highlight value, not just price", "Create urgency without pressure"],
      forbiddenPhrases: ["Cheap", "Discount bin", "Limited time only (overused)", "Act now"]
    }
  },
  agency: {
    name: "Agency / Services",
    icon: Briefcase,
    description: "For marketing, design, and consulting agencies",
    data: {
      category: "Professional Services / Agency",
      brandTone: "authoritative",
      icpPersonas: [
        {
          name: "Growth-Focused Gary",
          role: "VP Marketing / CMO",
          pains: ["Inconsistent results", "Agency churn", "Lack of transparency"],
          goals: ["Predictable growth", "Clear ROI", "Strategic partnership"],
          objections: ["Past agency failures", "Cost vs in-house", "Communication concerns"]
        },
        {
          name: "Startup Sarah",
          role: "Founder / CEO",
          pains: ["Limited budget", "No marketing expertise", "Wearing too many hats"],
          goals: ["Focus on product", "Efficient marketing spend", "Quick wins"],
          objections: ["Can't afford agency", "Need hands-on control", "Trust issues"]
        }
      ],
      keyOutcomes: ["2-3x ROI on ad spend", "Dedicated account manager", "Monthly strategy reviews"],
      differentiators: ["Industry specialization", "Transparent reporting", "Performance guarantees"],
      claimsProof: [
        { claim: "Average 2.8x ROI for clients", proof: "Verified across 50+ client campaigns in 2024", proofType: "metric" as const },
        { claim: "95% client retention rate", proof: "Most clients stay 2+ years, case studies available", proofType: "case_study" as const }
      ],
      objectionHandling: [
        { objection: "We've been burned by agencies before", response: "We understand. That's why we offer month-to-month contracts and full transparency dashboards." },
        { objection: "Can't we just do this in-house?", response: "You could, but it typically takes 6+ months to build the expertise. We get you results from day one." }
      ],
      voiceRules: ["Speak with authority", "Use case studies", "Be consultative, not salesy"],
      forbiddenPhrases: ["We're different", "Full-service", "One-stop-shop", "Cutting-edge"]
    }
  },
  coaching: {
    name: "Coaching / Education",
    icon: GraduationCap,
    description: "For coaches, course creators, and educators",
    data: {
      category: "Coaching / Education",
      brandTone: "friendly",
      icpPersonas: [
        {
          name: "Aspiring Amy",
          role: "Career Changer / Learner",
          pains: ["Stuck in current situation", "Lack of direction", "Information overload"],
          goals: ["Clear transformation path", "Accountability", "Proven results"],
          objections: ["Tried courses before", "Time commitment", "Will this work for me?"]
        },
        {
          name: "Professional Pete",
          role: "Mid-Career Professional",
          pains: ["Career plateau", "Skill gaps", "Work-life balance"],
          goals: ["Level up skills", "Increase income", "Career advancement"],
          objections: ["Too busy", "Expensive", "Can learn on my own"]
        }
      ],
      keyOutcomes: ["Land dream job in 90 days", "Double your income", "Join 10,000+ successful graduates"],
      differentiators: ["Personalized coaching", "Community support", "Lifetime access"],
      claimsProof: [
        { claim: "87% of graduates achieve their goal within 6 months", proof: "Based on 2024 graduate survey (n=1,200)", proofType: "metric" as const },
        { claim: "Average salary increase of $35K", proof: "Verified LinkedIn profile updates from program alumni", proofType: "testimonial" as const }
      ],
      objectionHandling: [
        { objection: "I've tried courses before and they didn't work", response: "Our program is different because of 1:1 coaching and accountability. 87% success rate speaks for itself." },
        { objection: "I don't have time for this", response: "The program is designed for busy professionals. Just 5 hours/week, and you can go at your own pace." }
      ],
      voiceRules: ["Be encouraging but realistic", "Share transformation stories", "Create emotional connection"],
      forbiddenPhrases: ["Get rich quick", "Guaranteed results", "Secret formula", "Hack"]
    }
  },
  cybersecurity: {
    name: "Cybersecurity (Enterprise)",
    icon: Shield,
    description: "For CISOs, security vendors, MSSPs, GRC platforms",
    data: {
      category: "Cybersecurity / Security",
      brandTone: "authoritative",
      icpPersonas: [
        {
          name: "Security-First Sam",
          role: "CISO / Head of Security",
          pains: ["Breach anxiety", "Board pressure", "Talent shortage", "Tool sprawl"],
          goals: ["Reduce risk exposure", "Demonstrate compliance", "Build security culture"],
          objections: ["Integration with existing stack", "False positive fatigue", "Vendor trust"]
        },
        {
          name: "Compliance-Driven Chris",
          role: "Risk Officer / GRC Lead",
          pains: ["Audit preparation", "Regulatory changes", "Documentation burden"],
          goals: ["Streamline compliance", "Automate reporting", "Reduce audit findings"],
          objections: ["Framework coverage", "Evidence collection effort", "Cost justification"]
        }
      ],
      keyOutcomes: ["Reduce mean time to detect by 60%", "Achieve SOC 2 in 90 days", "Consolidate 5+ tools into one"],
      differentiators: ["NIST/ISO aligned", "Zero-trust architecture", "24/7 SOC support"],
      claimsProof: [
        { claim: "Reduce MTTD by 60%", proof: "Measured across 200+ enterprise deployments", proofType: "metric" as const },
        { claim: "SOC 2 Type II certified", proof: "Annual third-party audits, reports available under NDA", proofType: "case_study" as const }
      ],
      objectionHandling: [
        { objection: "How does this integrate with our existing SIEM?", response: "We have native integrations with Splunk, Sentinel, and QRadar. Most deployments take under 2 weeks." },
        { objection: "What about false positives?", response: "Our ML models are tuned to your environment. Customers report 80% reduction in alert fatigue." }
      ],
      voiceRules: ["Be authoritative but calm", "Lead with risk reduction", "Use frameworks as proof", "Never fear-monger"],
      forbiddenPhrases: ["Hack-proof", "100% secure", "Military-grade", "Unbreakable", "Cyber attack"]
    }
  },
  itservices: {
    name: "IT Services / MSP",
    icon: Building2,
    description: "For managed service providers, IT consultants, cloud services",
    data: {
      category: "IT Services / MSP",
      brandTone: "professional",
      icpPersonas: [
        {
          name: "Overwhelmed Owner Oliver",
          role: "SMB Owner / CEO",
          pains: ["IT distractions from core business", "Unexpected downtime", "Security concerns"],
          goals: ["Focus on business growth", "Predictable IT costs", "Peace of mind"],
          objections: ["Cost vs in-house", "Response time concerns", "Data control"]
        },
        {
          name: "IT Manager Ian",
          role: "IT Manager / Director",
          pains: ["Resource constraints", "24/7 coverage gaps", "Vendor management"],
          goals: ["Augment team capacity", "Improve SLAs", "Reduce ticket volume"],
          objections: ["Quality of support", "Knowledge transfer", "Escalation process"]
        }
      ],
      keyOutcomes: ["99.9% uptime guarantee", "15-minute response SLA", "Reduce IT costs by 30%"],
      differentiators: ["Local + remote support", "Fixed monthly pricing", "Proactive monitoring"],
      claimsProof: [
        { claim: "99.9% uptime across all clients", proof: "Verified uptime monitoring data, published monthly", proofType: "metric" as const },
        { claim: "Average 12-minute response time", proof: "Based on 50,000+ tickets in 2024", proofType: "metric" as const }
      ],
      objectionHandling: [
        { objection: "What happens if something breaks at 2am?", response: "Our NOC operates 24/7/365. Critical issues get immediate response, guaranteed." },
        { objection: "How do you handle our specific software?", response: "We support 500+ business applications. If we don't know it, we'll learn it during onboarding." }
      ],
      voiceRules: ["Emphasize reliability", "Lead with uptime and response time", "Be consultative"],
      forbiddenPhrases: ["Break-fix", "We're different", "One-size-fits-all", "Cheap"]
    }
  },
  cloud: {
    name: "Cloud / DevOps",
    icon: Globe,
    description: "For cloud platforms, DevOps tools, infrastructure providers",
    data: {
      category: "Cloud / Infrastructure",
      brandTone: "professional",
      icpPersonas: [
        {
          name: "Architect Alex",
          role: "Cloud Architect / Platform Engineer",
          pains: ["Multi-cloud complexity", "Cost overruns", "Scaling bottlenecks"],
          goals: ["Simplify infrastructure", "Optimize cloud spend", "Enable developer velocity"],
          objections: ["Migration effort", "Vendor lock-in", "Learning curve"]
        },
        {
          name: "DevOps Dana",
          role: "DevOps Engineer / SRE",
          pains: ["Manual deployments", "Incident fatigue", "Observability gaps"],
          goals: ["Automate everything", "Reduce MTTR", "Improve reliability"],
          objections: ["Integration with CI/CD", "Alert noise", "Documentation quality"]
        }
      ],
      keyOutcomes: ["Deploy 10x faster", "Reduce cloud costs by 40%", "99.99% availability"],
      differentiators: ["Multi-cloud native", "GitOps-first", "Built-in cost optimization"],
      claimsProof: [
        { claim: "40% average cloud cost reduction", proof: "Based on FinOps analysis of 100+ production workloads", proofType: "metric" as const },
        { claim: "10x deployment velocity", proof: "Measured CI/CD pipeline metrics before/after implementation", proofType: "case_study" as const }
      ],
      objectionHandling: [
        { objection: "We're already invested in AWS/Azure/GCP", response: "We're cloud-agnostic and integrate with your existing provider. No rip-and-replace required." },
        { objection: "Our team doesn't have time to learn a new tool", response: "Most teams are productive within a week. We provide hands-on onboarding and 24/7 support." }
      ],
      voiceRules: ["Be technical but concise", "Use diagrams and benchmarks", "Show architecture examples"],
      forbiddenPhrases: ["Cloud magic", "Serverless everything", "Revolutionary", "Disruptive"]
    }
  },
  founder: {
    name: "Founder / Executive Brand",
    icon: Users,
    description: "For technical founders, CISOs, executives building authority",
    data: {
      category: "Personal Brand / Thought Leadership",
      brandTone: "authoritative",
      icpPersonas: [
        {
          name: "Peer Paula",
          role: "Fellow Executive / Founder",
          pains: ["Information overload", "Finding trusted voices", "Strategic blind spots"],
          goals: ["Learn from peers", "Validate decisions", "Expand network"],
          objections: ["Time to consume content", "Is this person credible?", "Relevance to my situation"]
        },
        {
          name: "Aspiring Adam",
          role: "Rising Professional / Future Leader",
          pains: ["Career growth uncertainty", "Lack of mentorship", "Skill gaps"],
          goals: ["Learn from successful leaders", "Build own brand", "Advance career"],
          objections: ["Can I apply this?", "Is this just self-promotion?", "Actionable takeaways"]
        }
      ],
      keyOutcomes: ["Build industry authority", "Attract speaking opportunities", "Generate inbound leads"],
      differentiators: ["Real operational experience", "Contrarian perspectives", "Frameworks from the trenches"],
      claimsProof: [
        { claim: "20+ years of operational experience", proof: "LinkedIn profile, company history, public record", proofType: "case_study" as const },
        { claim: "Keynote speaker at major conferences", proof: "RSA, Black Hat, AWS re:Invent speaking history", proofType: "testimonial" as const }
      ],
      objectionHandling: [
        { objection: "Why should I listen to you?", response: "I've built and scaled teams from 0 to 100+. I share what actually worked, not theory." },
        { objection: "This seems like self-promotion", response: "I share frameworks and lessons learned. If it helps you avoid my mistakes, that's the goal." }
      ],
      voiceRules: ["Share lessons learned", "Be vulnerable about failures", "Provide frameworks not fluff", "Build narrative arcs"],
      forbiddenPhrases: ["Guru", "Thought leader", "Influencer", "Hustle", "Grind"]
    }
  },
  healthcare: {
    name: "Healthcare / HealthTech",
    icon: Target,
    description: "For providers, digital health, compliance-driven platforms",
    data: {
      category: "Healthcare / HealthTech",
      brandTone: "professional",
      icpPersonas: [
        {
          name: "Clinical Carol",
          role: "Clinician / Healthcare Provider",
          pains: ["Administrative burden", "EHR fatigue", "Patient communication gaps"],
          goals: ["More time with patients", "Better outcomes", "Reduced burnout"],
          objections: ["HIPAA compliance", "Workflow disruption", "Training time"]
        },
        {
          name: "Administrator Andy",
          role: "Healthcare Administrator / CIO",
          pains: ["Regulatory compliance", "Cost pressures", "Staff retention"],
          goals: ["Operational efficiency", "Patient satisfaction", "Risk reduction"],
          objections: ["Integration with existing systems", "Implementation timeline", "ROI proof"]
        }
      ],
      keyOutcomes: ["HIPAA compliant from day one", "Reduce admin time by 50%", "Improve patient satisfaction scores"],
      differentiators: ["Built for healthcare workflows", "SOC 2 + HIPAA certified", "Clinician-designed"],
      claimsProof: [
        { claim: "HIPAA compliant and SOC 2 certified", proof: "Third-party audit reports available, BAA provided", proofType: "case_study" as const },
        { claim: "50% reduction in administrative burden", proof: "Time-motion study across 15 healthcare systems", proofType: "metric" as const }
      ],
      objectionHandling: [
        { objection: "How do you handle PHI?", response: "All data is encrypted at rest and in transit. We sign BAAs and undergo annual HIPAA audits." },
        { objection: "Our EHR is already integrated with other tools", response: "We have certified integrations with Epic, Cerner, and Allscripts. Setup takes days, not months." }
      ],
      voiceRules: ["Prioritize patient outcomes", "Lead with compliance", "Be empathetic to provider burnout"],
      forbiddenPhrases: ["Disrupt healthcare", "Uber for health", "AI doctor", "Replace clinicians"]
    }
  },
  fintech: {
    name: "FinTech",
    icon: Building2,
    description: "For payments, banking, financial services platforms",
    data: {
      category: "FinTech / Financial Services",
      brandTone: "professional",
      icpPersonas: [
        {
          name: "CFO Frank",
          role: "CFO / Finance Director",
          pains: ["Cash flow visibility", "Manual reconciliation", "Fraud risk"],
          goals: ["Real-time financial insights", "Automate finance ops", "Reduce fraud losses"],
          objections: ["Security concerns", "Regulatory compliance", "Integration complexity"]
        },
        {
          name: "Compliance Officer Carla",
          role: "Compliance / Risk Manager",
          pains: ["Regulatory changes", "Audit preparation", "AML/KYC burden"],
          goals: ["Stay compliant", "Automate reporting", "Reduce manual reviews"],
          objections: ["Audit trail quality", "Regulatory approval", "Data residency"]
        }
      ],
      keyOutcomes: ["PCI DSS Level 1 certified", "Reduce reconciliation time by 80%", "Real-time fraud detection"],
      differentiators: ["Bank-grade security", "Multi-currency support", "Regulatory-first design"],
      claimsProof: [
        { claim: "PCI DSS Level 1 certified", proof: "Annual QSA audit, AOC available on request", proofType: "case_study" as const },
        { claim: "Process $10B+ annually", proof: "Published transaction volume, audited financials", proofType: "metric" as const }
      ],
      objectionHandling: [
        { objection: "What about regulatory approval?", response: "We're licensed in 50+ jurisdictions. Our compliance team handles the paperwork." },
        { objection: "How secure is your platform?", response: "Bank-grade encryption, SOC 2 Type II, and we've never had a breach. Security is our foundation." }
      ],
      voiceRules: ["Lead with stability and trust", "Emphasize compliance", "Use ROI and efficiency metrics"],
      forbiddenPhrases: ["Disrupt banking", "Crypto revolution", "Get rich", "Guaranteed returns"]
    }
  },
  creator: {
    name: "Content Creator (Pro)",
    icon: MessageSquare,
    description: "For serious creators building sustainable businesses",
    data: {
      category: "Creator / Media",
      brandTone: "friendly",
      icpPersonas: [
        {
          name: "Engaged Emma",
          role: "Core Audience Member",
          pains: ["Information overload", "Finding quality content", "Applying knowledge"],
          goals: ["Learn efficiently", "Stay updated", "Connect with community"],
          objections: ["Too much content already", "Is this worth my time?", "Can I trust this?"]
        },
        {
          name: "Sponsor Steve",
          role: "Brand Partner / Sponsor",
          pains: ["Finding authentic creators", "Measuring ROI", "Brand safety"],
          goals: ["Reach engaged audience", "Authentic integration", "Measurable results"],
          objections: ["Audience fit", "Engagement authenticity", "Pricing"]
        }
      ],
      keyOutcomes: ["Build loyal community", "Sustainable revenue streams", "Industry recognition"],
      differentiators: ["Unique perspective", "Consistent quality", "Engaged community"],
      claimsProof: [
        { claim: "50K+ engaged subscribers", proof: "Verified platform analytics, open rate metrics", proofType: "metric" as const },
        { claim: "Featured in industry publications", proof: "Links to press coverage and guest appearances", proofType: "testimonial" as const }
      ],
      objectionHandling: [
        { objection: "Why should I follow you vs others?", response: "I focus on depth over breadth. Every piece is researched and actionable, not clickbait." },
        { objection: "Is this just another newsletter?", response: "It's a curated learning experience. Subscribers report saving 5+ hours/week on research." }
      ],
      voiceRules: ["Be authentic and consistent", "Prioritize retention over virality", "Build series, not one-offs"],
      forbiddenPhrases: ["Like and subscribe", "Smash that button", "Algorithm hack", "Viral secret"]
    }
  },
  government: {
    name: "Government / Public Sector",
    icon: Building2,
    description: "For contractors, civic tech, government-facing platforms",
    data: {
      category: "Government / Public Sector",
      brandTone: "professional",
      icpPersonas: [
        {
          name: "Procurement Pat",
          role: "Procurement Officer / Contracting",
          pains: ["Compliance requirements", "Budget constraints", "Vendor evaluation burden"],
          goals: ["Find compliant solutions", "Justify purchases", "Meet mission needs"],
          objections: ["FedRAMP/StateRAMP status", "Contract vehicle availability", "Past performance"]
        },
        {
          name: "Program Manager Paula",
          role: "Program Manager / Director",
          pains: ["Legacy system constraints", "Stakeholder alignment", "Budget cycles"],
          goals: ["Modernize operations", "Improve citizen services", "Demonstrate value"],
          objections: ["Implementation risk", "Change management", "Long-term support"]
        }
      ],
      keyOutcomes: ["FedRAMP authorized", "On GSA Schedule", "Proven government deployments"],
      differentiators: ["Government-specific compliance", "Cleared personnel available", "Mission-focused approach"],
      claimsProof: [
        { claim: "FedRAMP Authorized", proof: "Listed on FedRAMP Marketplace, authorization package available", proofType: "case_study" as const },
        { claim: "Deployed at 50+ federal agencies", proof: "Past performance references available, CPARS ratings", proofType: "metric" as const }
      ],
      objectionHandling: [
        { objection: "Are you on our contract vehicle?", response: "We're on GSA Schedule, NASA SEWP, and multiple agency-specific BPAs. We can also go direct." },
        { objection: "What's your FedRAMP status?", response: "We're FedRAMP Moderate authorized. Our authorization package is available for review." }
      ],
      voiceRules: ["Emphasize reliability and precedent", "Reference compliance frameworks", "Be formal but accessible"],
      forbiddenPhrases: ["Disrupt government", "Move fast", "Agile everything", "Revolutionary"]
    }
  }
};

export default function BrandBrain() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("basics");
  const [isSaving, setIsSaving] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isImportingLinkedIn, setIsImportingLinkedIn] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // AI Suggestion states
  const [isSuggestingBasics, setIsSuggestingBasics] = useState(false);
  const [isSuggestingICP, setIsSuggestingICP] = useState(false);
  const [isSuggestingValueProp, setIsSuggestingValueProp] = useState(false);
  const [isSuggestingClaims, setIsSuggestingClaims] = useState(false);
  const [isSuggestingVoice, setIsSuggestingVoice] = useState(false);
  const [showSuggestionPreview, setShowSuggestionPreview] = useState<string | null>(null);
  const [suggestionData, setSuggestionData] = useState<any>(null);
  
  // URL validation state
  const [urlValidationState, setUrlValidationState] = useState<"idle" | "validating" | "valid" | "invalid">("idle");
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  
  // Form state
  const [productName, setProductName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [category, setCategory] = useState("");
  const [tagline, setTagline] = useState("");
  const [brandTone, setBrandTone] = useState<string>("professional");
  
  // ICP Personas
  const [icpPersonas, setIcpPersonas] = useState<IcpPersona[]>([
    { name: "", role: "", pains: [""], goals: [""], objections: [""] }
  ]);
  
  // Value Proposition
  const [keyOutcomes, setKeyOutcomes] = useState<string[]>([""]);
  const [differentiators, setDifferentiators] = useState<string[]>([""]);
  
  // Claims & Proof
  const [claimsProof, setClaimsProof] = useState<ClaimProof[]>([
    { claim: "", proof: "", proofType: "testimonial" }
  ]);
  
  // Objection Handling
  const [objections, setObjections] = useState<ObjectionResponse[]>([
    { objection: "", response: "" }
  ]);
  
  // Voice Rules
  const [voiceRules, setVoiceRules] = useState<string[]>([""]);
  const [forbiddenPhrases, setForbiddenPhrases] = useState<string[]>([""]);
  
  // URL validation effect
  useEffect(() => {
    if (!websiteUrl.trim()) {
      setUrlValidationState("idle");
      setFaviconUrl(null);
      return;
    }
    
    const validateUrl = async () => {
      setUrlValidationState("validating");
      
      // Normalize URL
      let normalizedUrl = websiteUrl.trim();
      if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
        normalizedUrl = "https://" + normalizedUrl;
      }
      
      try {
        const urlObj = new URL(normalizedUrl);
        // Try to get favicon
        const faviconUrls = [
          `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`,
          `${urlObj.origin}/favicon.ico`
        ];
        
        setFaviconUrl(faviconUrls[0]);
        setUrlValidationState("valid");
      } catch {
        setUrlValidationState("invalid");
        setFaviconUrl(null);
      }
    };
    
    const debounceTimer = setTimeout(validateUrl, 500);
    return () => clearTimeout(debounceTimer);
  }, [websiteUrl]);
  
  // tRPC mutations
  const saveBrandBrain = trpc.brandBrain.save.useMutation({
    onSuccess: () => {
      toast.success("Brand Brain saved successfully!");
      setIsSaving(false);
      setShowSuccessModal(true);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save Brand Brain");
      setIsSaving(false);
    }
  });
  
  const enrichFromWebsite = trpc.brandBrain.enrichFromWebsite.useMutation({
    onSuccess: (data) => {
      if (data.tagline) setTagline(data.tagline);
      if (data.keyOutcomes) setKeyOutcomes([...data.keyOutcomes, ""]);
      if (data.differentiators) setDifferentiators([...data.differentiators, ""]);
      toast.success("Website analyzed! Review the auto-filled fields.");
      setIsEnriching(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to analyze website");
      setIsEnriching(false);
    }
  });
  
  const importFromLinkedIn = trpc.brandBrain.importFromLinkedIn.useMutation({
    onSuccess: (data) => {
      if (data.productName) setProductName(data.productName);
      if (data.tagline) setTagline(data.tagline);
      if (data.category) setCategory(data.category);
      if (data.websiteUrl) setWebsiteUrl(data.websiteUrl);
      toast.success("LinkedIn company info imported! Review the auto-filled fields.");
      setIsImportingLinkedIn(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to import from LinkedIn");
      setIsImportingLinkedIn(false);
    }
  });

  // AI Suggestion mutations
  const suggestBasics = trpc.brandBrain.suggestBasics.useMutation({
    onSuccess: (data) => {
      setSuggestionData(data);
      setShowSuggestionPreview("basics");
      setIsSuggestingBasics(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate suggestions");
      setIsSuggestingBasics(false);
    }
  });

  const suggestICP = trpc.brandBrain.suggestICPPersonas.useMutation({
    onSuccess: (data) => {
      setSuggestionData(data);
      setShowSuggestionPreview("icp");
      setIsSuggestingICP(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate ICP personas");
      setIsSuggestingICP(false);
    }
  });

  const suggestValueProp = trpc.brandBrain.suggestValueProp.useMutation({
    onSuccess: (data) => {
      setSuggestionData(data);
      setShowSuggestionPreview("valueprop");
      setIsSuggestingValueProp(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate value proposition");
      setIsSuggestingValueProp(false);
    }
  });

  const suggestClaims = trpc.brandBrain.suggestClaimsProof.useMutation({
    onSuccess: (data) => {
      setSuggestionData(data);
      setShowSuggestionPreview("claims");
      setIsSuggestingClaims(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate claims");
      setIsSuggestingClaims(false);
    }
  });

  const suggestVoice = trpc.brandBrain.suggestBrandVoice.useMutation({
    onSuccess: (data) => {
      setSuggestionData(data);
      setShowSuggestionPreview("voice");
      setIsSuggestingVoice(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate brand voice");
      setIsSuggestingVoice(false);
    }
  });

  // AI Suggestion handlers
  const handleSuggestBasics = () => {
    setIsSuggestingBasics(true);
    suggestBasics.mutate({ productName, websiteUrl, category });
  };

  const handleSuggestICP = () => {
    if (!productName.trim()) {
      toast.error("Please enter a product name first");
      return;
    }
    setIsSuggestingICP(true);
    suggestICP.mutate({
      productName,
      category,
      tagline,
      existingPersonas: icpPersonas.filter(p => p.name).map(p => ({ name: p.name, role: p.role }))
    });
  };

  const handleSuggestValueProp = () => {
    if (!productName.trim()) {
      toast.error("Please enter a product name first");
      return;
    }
    setIsSuggestingValueProp(true);
    suggestValueProp.mutate({
      productName,
      category,
      icpPersonas: icpPersonas.filter(p => p.name).map(p => ({
        name: p.name,
        pains: p.pains.filter(pain => pain.trim()),
        goals: p.goals.filter(goal => goal.trim())
      }))
    });
  };

  const handleSuggestClaims = () => {
    if (!productName.trim()) {
      toast.error("Please enter a product name first");
      return;
    }
    setIsSuggestingClaims(true);
    suggestClaims.mutate({
      productName,
      keyOutcomes: keyOutcomes.filter(o => o.trim()),
      differentiators: differentiators.filter(d => d.trim())
    });
  };

  const handleSuggestVoice = () => {
    if (!productName.trim()) {
      toast.error("Please enter a product name first");
      return;
    }
    setIsSuggestingVoice(true);
    suggestVoice.mutate({
      productName,
      category,
      brandTone,
      icpPersonas: icpPersonas.filter(p => p.name).map(p => ({ name: p.name, role: p.role }))
    });
  };

  // Apply suggestions handlers
  const applySuggestion = (type: string) => {
    if (!suggestionData) return;
    
    switch (type) {
      case "basics":
        if (suggestionData.productName) setProductName(suggestionData.productName);
        if (suggestionData.category) setCategory(suggestionData.category);
        if (suggestionData.tagline) setTagline(suggestionData.tagline);
        toast.success("Basics suggestions applied!");
        break;
      case "icp":
        if (suggestionData.personas?.length) {
          setIcpPersonas([...icpPersonas.filter(p => p.name), ...suggestionData.personas]);
          toast.success(`${suggestionData.personas.length} ICP personas added!`);
        }
        break;
      case "valueprop":
        if (suggestionData.keyOutcomes?.length) {
          setKeyOutcomes([...keyOutcomes.filter(o => o.trim()), ...suggestionData.keyOutcomes, ""]);
        }
        if (suggestionData.differentiators?.length) {
          setDifferentiators([...differentiators.filter(d => d.trim()), ...suggestionData.differentiators, ""]);
        }
        toast.success("Value proposition suggestions applied!");
        break;
      case "claims":
        if (suggestionData.claimsProofMapping?.length) {
          setClaimsProof([...claimsProof.filter(c => c.claim), ...suggestionData.claimsProofMapping]);
          toast.success(`${suggestionData.claimsProofMapping.length} claims added!`);
        }
        break;
      case "voice":
        if (suggestionData.voiceRules?.length) {
          setVoiceRules([...voiceRules.filter(r => r.trim()), ...suggestionData.voiceRules, ""]);
        }
        if (suggestionData.forbiddenPhrases?.length) {
          setForbiddenPhrases([...forbiddenPhrases.filter(p => p.trim()), ...suggestionData.forbiddenPhrases, ""]);
        }
        if (suggestionData.recommendedTone) {
          setBrandTone(suggestionData.recommendedTone);
        }
        toast.success("Brand voice suggestions applied!");
        break;
    }
    setShowSuggestionPreview(null);
    setSuggestionData(null);
  };
  
  // Load existing Brand Brain
  const { data: existingBrandBrain, isLoading } = trpc.brandBrain.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  useEffect(() => {
    if (existingBrandBrain) {
      setProductName(existingBrandBrain.productName || "");
      setWebsiteUrl(existingBrandBrain.websiteUrl || "");
      setCategory(existingBrandBrain.category || "");
      setTagline(existingBrandBrain.tagline || "");
      setBrandTone(existingBrandBrain.brandTone || "professional");
      if (existingBrandBrain.icpPersonas?.length) setIcpPersonas(existingBrandBrain.icpPersonas);
      if (existingBrandBrain.keyOutcomes?.length) setKeyOutcomes([...existingBrandBrain.keyOutcomes, ""]);
      if (existingBrandBrain.differentiators?.length) setDifferentiators([...existingBrandBrain.differentiators, ""]);
      if (existingBrandBrain.claimsProofMapping?.length) setClaimsProof(existingBrandBrain.claimsProofMapping);
      if (existingBrandBrain.objectionHandling?.length) setObjections(existingBrandBrain.objectionHandling);
      if (existingBrandBrain.voiceRules?.length) setVoiceRules([...existingBrandBrain.voiceRules, ""]);
      if (existingBrandBrain.forbiddenPhrases?.length) setForbiddenPhrases([...existingBrandBrain.forbiddenPhrases, ""]);
    }
  }, [existingBrandBrain]);
  
  // Calculate completion score
  const completionScore = useMemo(() => {
    let score = 0;
    if (productName) score += 10;
    if (websiteUrl) score += 5;
    if (tagline) score += 10;
    if (icpPersonas.some(p => p.name && p.role)) score += 20;
    if (keyOutcomes.some(o => o.trim())) score += 15;
    if (differentiators.some(d => d.trim())) score += 10;
    if (claimsProof.some(c => c.claim && c.proof)) score += 15;
    if (voiceRules.some(r => r.trim())) score += 10;
    if (forbiddenPhrases.some(p => p.trim())) score += 5;
    return Math.min(score, 100);
  }, [productName, websiteUrl, tagline, icpPersonas, keyOutcomes, differentiators, claimsProof, voiceRules, forbiddenPhrases]);
  
  const handleSave = () => {
    if (!productName.trim()) {
      toast.error("Product name is required");
      return;
    }
    
    setIsSaving(true);
    saveBrandBrain.mutate({
      productName,
      websiteUrl: websiteUrl || undefined,
      category: category || undefined,
      tagline: tagline || undefined,
      brandTone: brandTone as any,
      icpPersonas: icpPersonas.filter(p => p.name || p.role),
      keyOutcomes: keyOutcomes.filter(o => o.trim()),
      differentiators: differentiators.filter(d => d.trim()),
      claimsProofMapping: claimsProof.filter(c => c.claim || c.proof),
      objectionHandling: objections.filter(o => o.objection || o.response),
      voiceRules: voiceRules.filter(r => r.trim()),
      forbiddenPhrases: forbiddenPhrases.filter(p => p.trim()),
    });
  };
  
  const handleEnrichFromWebsite = () => {
    if (!websiteUrl.trim()) {
      toast.error("Please enter a website URL first");
      return;
    }
    setIsEnriching(true);
    enrichFromWebsite.mutate({ websiteUrl });
  };
  
  const handleImportFromLinkedIn = () => {
    if (!linkedInUrl.trim()) {
      toast.error("Please enter a LinkedIn company page URL");
      return;
    }
    setIsImportingLinkedIn(true);
    importFromLinkedIn.mutate({ linkedInUrl });
  };
  
  const applyTemplate = (templateKey: keyof typeof BRAND_BRAIN_TEMPLATES) => {
    const template = BRAND_BRAIN_TEMPLATES[templateKey];
    // Apply all template fields for full AI auto-enrichment
    setCategory(template.data.category);
    setBrandTone(template.data.brandTone);
    setIcpPersonas(template.data.icpPersonas);
    setKeyOutcomes([...template.data.keyOutcomes, ""]);
    setDifferentiators([...template.data.differentiators, ""]);
    // Apply claims & proof if available
    if (template.data.claimsProof) {
      setClaimsProof(template.data.claimsProof);
    }
    // Apply objection handling if available
    if (template.data.objectionHandling) {
      setObjections(template.data.objectionHandling);
    }
    setVoiceRules([...template.data.voiceRules, ""]);
    setForbiddenPhrases([...template.data.forbiddenPhrases, ""]);
    setShowTemplateDialog(false);
    toast.success(`${template.name} template applied! All fields auto-enriched. Customize for your brand.`);
  };
  
  // Helper functions for array fields
  const addArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, ""]);
  };
  
  const updateArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter(prev => prev.map((item, i) => i === index ? value : item));
  };
  
  const removeArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };
  
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 pt-32 text-center">
          <Brain className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Brand Brain</h1>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Define your business DNA once. Your ICP, voice, claims, and proof live in one place and power everything.
          </p>
          <a href={getLoginUrl()}>
            <Button size="lg" className="bg-primary text-primary-foreground">
              Login to Get Started
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
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Brain className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">Brand Brain</h1>
            </div>
            <p className="text-muted-foreground">
              Your business DNA. Define once, power everything.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Completion</p>
              <div className="flex items-center gap-2">
                <Progress value={completionScore} className="w-24 h-2" />
                <span className="text-sm font-medium">{completionScore}%</span>
              </div>
            </div>
            
            {/* Template Button */}
            <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-white/10">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Use Template
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-background border-white/10 max-w-3xl max-h-[80vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Choose a Brand Brain Template</DialogTitle>
                  <DialogDescription>
                    Select an industry template to auto-fill all fields with AI-powered defaults. You can customize everything after.
                  </DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto max-h-[60vh] pr-2 space-y-6 mt-4">
                  {/* Core Templates */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Core Templates</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {['saas', 'ecommerce', 'agency', 'coaching'].map((key) => {
                        const template = BRAND_BRAIN_TEMPLATES[key as keyof typeof BRAND_BRAIN_TEMPLATES];
                        const Icon = template.icon;
                        return (
                          <Card 
                            key={key}
                            className="bg-white/5 border-white/10 cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => applyTemplate(key as keyof typeof BRAND_BRAIN_TEMPLATES)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-primary/20">
                                  <Icon className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-sm">{template.name}</h3>
                                  <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* IT & Security Templates */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      IT, Cybersecurity & Infrastructure
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {['cybersecurity', 'itservices', 'cloud'].map((key) => {
                        const template = BRAND_BRAIN_TEMPLATES[key as keyof typeof BRAND_BRAIN_TEMPLATES];
                        const Icon = template.icon;
                        return (
                          <Card 
                            key={key}
                            className="bg-white/5 border-white/10 cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => applyTemplate(key as keyof typeof BRAND_BRAIN_TEMPLATES)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/20">
                                  <Icon className="w-4 h-4 text-blue-400" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-sm">{template.name}</h3>
                                  <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Regulated Industries */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Regulated & Trust-Heavy Industries
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {['healthcare', 'fintech', 'government'].map((key) => {
                        const template = BRAND_BRAIN_TEMPLATES[key as keyof typeof BRAND_BRAIN_TEMPLATES];
                        const Icon = template.icon;
                        return (
                          <Card 
                            key={key}
                            className="bg-white/5 border-white/10 cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => applyTemplate(key as keyof typeof BRAND_BRAIN_TEMPLATES)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-amber-500/20">
                                  <Icon className="w-4 h-4 text-amber-400" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-sm">{template.name}</h3>
                                  <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Personal Brand & Creator */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Founder & Creator
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {['founder', 'creator'].map((key) => {
                        const template = BRAND_BRAIN_TEMPLATES[key as keyof typeof BRAND_BRAIN_TEMPLATES];
                        const Icon = template.icon;
                        return (
                          <Card 
                            key={key}
                            className="bg-white/5 border-white/10 cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => applyTemplate(key as keyof typeof BRAND_BRAIN_TEMPLATES)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/20">
                                  <Icon className="w-4 h-4 text-purple-400" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-sm">{template.name}</h3>
                                  <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="bg-primary text-primary-foreground"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Brand Brain
            </Button>
          </div>
        </div>
        
        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 p-1">
            <TabsTrigger value="basics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Globe className="w-4 h-4 mr-2" />
              Basics
            </TabsTrigger>
            <TabsTrigger value="icp" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 mr-2" />
              ICP Personas
            </TabsTrigger>
            <TabsTrigger value="value" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Target className="w-4 h-4 mr-2" />
              Value Prop
            </TabsTrigger>
            <TabsTrigger value="claims" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shield className="w-4 h-4 mr-2" />
              Claims & Proof
            </TabsTrigger>
            <TabsTrigger value="voice" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MessageSquare className="w-4 h-4 mr-2" />
              Brand Voice
            </TabsTrigger>
          </TabsList>
          
          {/* Basics Tab */}
          <TabsContent value="basics" className="space-y-6">
            {/* LinkedIn Import Card */}
            <Card className="bg-gradient-to-r from-[#0077B5]/10 to-transparent border-[#0077B5]/30">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-[#0077B5]/20">
                      <Linkedin className="w-5 h-5 text-[#0077B5]" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Import from LinkedIn</h3>
                      <p className="text-sm text-muted-foreground">Auto-fill your company info from your LinkedIn page</p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <Input
                      value={linkedInUrl}
                      onChange={(e) => setLinkedInUrl(e.target.value)}
                      placeholder="https://linkedin.com/company/..."
                      className="bg-white/5 border-white/10 flex-1 md:w-64"
                    />
                    <Button 
                      onClick={handleImportFromLinkedIn}
                      disabled={isImportingLinkedIn || !linkedInUrl}
                      className="bg-[#0077B5] hover:bg-[#0077B5]/90 text-white"
                    >
                      {isImportingLinkedIn ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Import
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>Product Information</CardTitle>
                <CardDescription>Basic information about your product or service</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="productName">Product Name *</Label>
                    <Input
                      id="productName"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="e.g., Matango.ai"
                      className="bg-white/5 border-white/10"
                    />
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-primary" />
                        AI Suggestions (African-inspired)
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { name: "Yamurai", meaning: "Shona — strength & resilience" },
                          { name: "Shuri", meaning: "Swahili — thankfulness & innovation" },
                          { name: "Batie", meaning: "West African — bold & enduring" },
                          { name: "Na'ah", meaning: "Pan-African — wisdom & purpose" },
                        ].map((suggestion) => (
                          <button
                            key={suggestion.name}
                            type="button"
                            onClick={() => setProductName(suggestion.name)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 hover:border-primary/50 transition-colors cursor-pointer"
                            title={suggestion.meaning}
                          >
                            {suggestion.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g., AI Marketing Platform"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      {/* Favicon preview */}
                      {faviconUrl && urlValidationState === "valid" && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
                          <img 
                            src={faviconUrl} 
                            alt="Site favicon" 
                            className="w-4 h-4 rounded-sm"
                            onError={() => setFaviconUrl(null)}
                          />
                        </div>
                      )}
                      <Input
                        id="websiteUrl"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="yourproduct.com"
                        className={`bg-white/5 border-white/10 ${faviconUrl && urlValidationState === "valid" ? "pl-10" : ""} ${
                          urlValidationState === "valid" ? "border-green-500/50 pr-10" : 
                          urlValidationState === "invalid" ? "border-red-500/50 pr-10" : ""
                        }`}
                      />
                      {/* Validation indicator */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {urlValidationState === "validating" && (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        )}
                        {urlValidationState === "valid" && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                        {urlValidationState === "invalid" && (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleEnrichFromWebsite}
                      disabled={isEnriching || urlValidationState !== "valid"}
                      className="border-white/10"
                    >
                      {isEnriching ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Auto-Enrich
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    {urlValidationState === "valid" && (
                      <p className="text-xs text-green-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        URL is valid
                      </p>
                    )}
                    {urlValidationState === "invalid" && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Please enter a valid URL
                      </p>
                    )}
                    {urlValidationState === "idle" && (
                      <p className="text-xs text-muted-foreground">
                        We'll analyze your website to auto-fill some fields
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Textarea
                    id="tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g., One loop. One brand brain. Always-on growth."
                    className="bg-white/5 border-white/10"
                    rows={2}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="brandTone">Brand Tone</Label>
                  <Select value={brandTone} onValueChange={setBrandTone}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="authoritative">Authoritative</SelectItem>
                      <SelectItem value="playful">Playful</SelectItem>
                      <SelectItem value="contrarian">Contrarian</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* AI Suggestion Button */}
                <div className="pt-4 border-t border-white/10">
                  <Button
                    variant="outline"
                    onClick={handleSuggestBasics}
                    disabled={isSuggestingBasics}
                    className="border-primary/50 text-primary hover:bg-primary/10"
                  >
                    {isSuggestingBasics ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    AI Suggest Improvements
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Get AI-powered suggestions for your brand name, category, and tagline
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* ICP Personas Tab */}
          <TabsContent value="icp" className="space-y-6">
            {icpPersonas.map((persona, personaIndex) => (
              <Card key={personaIndex} className="bg-white/5 border-white/10">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>ICP Persona {personaIndex + 1}</CardTitle>
                    <CardDescription>Define your ideal customer profile</CardDescription>
                  </div>
                  {icpPersonas.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIcpPersonas(prev => prev.filter((_, i) => i !== personaIndex))}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Persona Name</Label>
                      <Input
                        value={persona.name}
                        onChange={(e) => {
                          const updated = [...icpPersonas];
                          updated[personaIndex].name = e.target.value;
                          setIcpPersonas(updated);
                        }}
                        placeholder="e.g., Startup Steve"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role/Title</Label>
                      <Input
                        value={persona.role}
                        onChange={(e) => {
                          const updated = [...icpPersonas];
                          updated[personaIndex].role = e.target.value;
                          setIcpPersonas(updated);
                        }}
                        placeholder="e.g., Founder, CEO, Marketing Director"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                  
                  {/* Pains */}
                  <div className="space-y-2">
                    <Label>Pain Points</Label>
                    {persona.pains.map((pain, painIndex) => (
                      <div key={painIndex} className="flex gap-2">
                        <Input
                          value={pain}
                          onChange={(e) => {
                            const updated = [...icpPersonas];
                            updated[personaIndex].pains[painIndex] = e.target.value;
                            setIcpPersonas(updated);
                          }}
                          placeholder="What keeps them up at night?"
                          className="bg-white/5 border-white/10"
                        />
                        {persona.pains.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updated = [...icpPersonas];
                              updated[personaIndex].pains = persona.pains.filter((_, i) => i !== painIndex);
                              setIcpPersonas(updated);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const updated = [...icpPersonas];
                        updated[personaIndex].pains.push("");
                        setIcpPersonas(updated);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Pain Point
                    </Button>
                  </div>
                  
                  {/* Goals */}
                  <div className="space-y-2">
                    <Label>Goals</Label>
                    {persona.goals.map((goal, goalIndex) => (
                      <div key={goalIndex} className="flex gap-2">
                        <Input
                          value={goal}
                          onChange={(e) => {
                            const updated = [...icpPersonas];
                            updated[personaIndex].goals[goalIndex] = e.target.value;
                            setIcpPersonas(updated);
                          }}
                          placeholder="What are they trying to achieve?"
                          className="bg-white/5 border-white/10"
                        />
                        {persona.goals.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updated = [...icpPersonas];
                              updated[personaIndex].goals = persona.goals.filter((_, i) => i !== goalIndex);
                              setIcpPersonas(updated);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const updated = [...icpPersonas];
                        updated[personaIndex].goals.push("");
                        setIcpPersonas(updated);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Goal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setIcpPersonas(prev => [...prev, { name: "", role: "", pains: [""], goals: [""], objections: [""] }])}
                className="border-white/10 flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Persona
              </Button>
              <Button
                variant="outline"
                onClick={handleSuggestICP}
                disabled={isSuggestingICP}
                className="border-primary/50 text-primary hover:bg-primary/10"
              >
                {isSuggestingICP ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                AI Generate Personas
              </Button>
            </div>
          </TabsContent>
          
          {/* Value Prop Tab */}
          <TabsContent value="value" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>Key Outcomes</CardTitle>
                <CardDescription>What specific results do you deliver?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {keyOutcomes.map((outcome, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={outcome}
                      onChange={(e) => updateArrayItem(setKeyOutcomes, index, e.target.value)}
                      placeholder="e.g., Save 10+ hours per week on content creation"
                      className="bg-white/5 border-white/10"
                    />
                    {keyOutcomes.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeArrayItem(setKeyOutcomes, index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addArrayItem(setKeyOutcomes)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Outcome
                </Button>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>Differentiators</CardTitle>
                <CardDescription>What makes you different from alternatives?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {differentiators.map((diff, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={diff}
                      onChange={(e) => updateArrayItem(setDifferentiators, index, e.target.value)}
                      placeholder="e.g., Only platform with AI-powered brand memory"
                      className="bg-white/5 border-white/10"
                    />
                    {differentiators.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeArrayItem(setDifferentiators, index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addArrayItem(setDifferentiators)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Differentiator
                </Button>
              </CardContent>
            </Card>
            
            {/* AI Suggestion Button */}
            <Button
              variant="outline"
              onClick={handleSuggestValueProp}
              disabled={isSuggestingValueProp}
              className="border-primary/50 text-primary hover:bg-primary/10 w-full"
            >
              {isSuggestingValueProp ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              AI Generate Value Proposition
            </Button>
          </TabsContent>
          
          {/* Claims & Proof Tab */}
          <TabsContent value="claims" className="space-y-6">
            {claimsProof.map((item, index) => (
              <Card key={index} className="bg-white/5 border-white/10">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Claim {index + 1}</CardTitle>
                    <CardDescription>What do you claim, and how do you prove it?</CardDescription>
                  </div>
                  {claimsProof.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setClaimsProof(prev => prev.filter((_, i) => i !== index))}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Claim</Label>
                    <Input
                      value={item.claim}
                      onChange={(e) => {
                        const updated = [...claimsProof];
                        updated[index].claim = e.target.value;
                        setClaimsProof(updated);
                      }}
                      placeholder="e.g., Increase content output by 5x"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Proof Type</Label>
                      <Select 
                        value={item.proofType} 
                        onValueChange={(value: any) => {
                          const updated = [...claimsProof];
                          updated[index].proofType = value;
                          setClaimsProof(updated);
                        }}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="testimonial">Testimonial</SelectItem>
                          <SelectItem value="metric">Metric / Data</SelectItem>
                          <SelectItem value="case_study">Case Study</SelectItem>
                          <SelectItem value="demo">Demo / Example</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Proof</Label>
                      <Input
                        value={item.proof}
                        onChange={(e) => {
                          const updated = [...claimsProof];
                          updated[index].proof = e.target.value;
                          setClaimsProof(updated);
                        }}
                        placeholder="e.g., 500+ customers achieved this result"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setClaimsProof(prev => [...prev, { claim: "", proof: "", proofType: "testimonial" }])}
                className="border-white/10 flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Claim
              </Button>
              <Button
                variant="outline"
                onClick={handleSuggestClaims}
                disabled={isSuggestingClaims}
                className="border-primary/50 text-primary hover:bg-primary/10"
              >
                {isSuggestingClaims ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                AI Generate Claims
              </Button>
            </div>
          </TabsContent>
          
          {/* Brand Voice Tab */}
          <TabsContent value="voice" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>Voice Rules</CardTitle>
                <CardDescription>How should your brand communicate?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {voiceRules.map((rule, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={rule}
                      onChange={(e) => updateArrayItem(setVoiceRules, index, e.target.value)}
                      placeholder="e.g., Always be direct and actionable"
                      className="bg-white/5 border-white/10"
                    />
                    {voiceRules.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeArrayItem(setVoiceRules, index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addArrayItem(setVoiceRules)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Voice Rule
                </Button>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-400" />
                  Forbidden Phrases
                </CardTitle>
                <CardDescription>Words or phrases your brand should never use</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {forbiddenPhrases.map((phrase, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={phrase}
                      onChange={(e) => updateArrayItem(setForbiddenPhrases, index, e.target.value)}
                      placeholder="e.g., Revolutionary, Game-changing"
                      className="bg-white/5 border-white/10"
                    />
                    {forbiddenPhrases.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeArrayItem(setForbiddenPhrases, index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addArrayItem(setForbiddenPhrases)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Forbidden Phrase
                </Button>
              </CardContent>
            </Card>
            
            {/* AI Suggestion Button */}
            <Button
              variant="outline"
              onClick={handleSuggestVoice}
              disabled={isSuggestingVoice}
              className="border-primary/50 text-primary hover:bg-primary/10 w-full"
            >
              {isSuggestingVoice ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              AI Generate Brand Voice
            </Button>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Success Modal with Next Steps */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-lg bg-background border-border">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-full bg-primary/20">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl">Brand Brain Saved!</DialogTitle>
                <DialogDescription className="text-base">
                  Your brand memory is now ready to power your marketing.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              What's Next?
            </h4>
            
            <div className="space-y-3">
              <a 
                href="/campaign-factory" 
                className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Create a Campaign</div>
                  <div className="text-sm text-muted-foreground">Generate multi-channel content using your brand context</div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
              
              <a 
                href="/create" 
                className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Create an AI Influencer</div>
                  <div className="text-sm text-muted-foreground">Build a virtual brand ambassador</div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
              
              <a 
                href="/video-scripts" 
                className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Generate Video Scripts</div>
                  <div className="text-sm text-muted-foreground">Create compelling scripts for your content</div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
            </div>
            
            <div className="pt-4 border-t border-border">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setShowSuccessModal(false)}
              >
                Continue Editing Brand Brain
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* AI Suggestion Preview Dialog */}
      <Dialog open={!!showSuggestionPreview} onOpenChange={() => { setShowSuggestionPreview(null); setSuggestionData(null); }}>
        <DialogContent className="sm:max-w-2xl bg-background border-border max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Suggestions
            </DialogTitle>
            <DialogDescription>
              Review the AI-generated suggestions and apply them to your Brand Brain.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {showSuggestionPreview === "basics" && suggestionData && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <Label className="text-sm text-muted-foreground">Suggested Product Name</Label>
                  <p className="font-medium mt-1">{suggestionData.productName}</p>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <Label className="text-sm text-muted-foreground">Suggested Category</Label>
                  <p className="font-medium mt-1">{suggestionData.category}</p>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <Label className="text-sm text-muted-foreground">Suggested Tagline</Label>
                  <p className="font-medium mt-1">{suggestionData.tagline}</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <Label className="text-sm text-primary">Reasoning</Label>
                  <p className="text-sm mt-1 text-muted-foreground">{suggestionData.reasoning}</p>
                </div>
              </div>
            )}
            
            {showSuggestionPreview === "icp" && suggestionData?.personas && (
              <div className="space-y-4">
                {suggestionData.personas.map((persona: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span className="font-semibold">{persona.name}</span>
                      <Badge variant="secondary">{persona.role}</Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Pain Points</Label>
                      <ul className="list-disc list-inside text-sm mt-1">
                        {persona.pains.map((pain: string, i: number) => <li key={i}>{pain}</li>)}
                      </ul>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Goals</Label>
                      <ul className="list-disc list-inside text-sm mt-1">
                        {persona.goals.map((goal: string, i: number) => <li key={i}>{goal}</li>)}
                      </ul>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Objections</Label>
                      <ul className="list-disc list-inside text-sm mt-1">
                        {persona.objections.map((obj: string, i: number) => <li key={i}>{obj}</li>)}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {showSuggestionPreview === "valueprop" && suggestionData && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <Label className="text-sm text-muted-foreground">Key Outcomes</Label>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {suggestionData.keyOutcomes?.map((outcome: string, i: number) => (
                      <li key={i} className="text-sm">{outcome}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <Label className="text-sm text-muted-foreground">Differentiators</Label>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {suggestionData.differentiators?.map((diff: string, i: number) => (
                      <li key={i} className="text-sm">{diff}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {showSuggestionPreview === "claims" && suggestionData?.claimsProofMapping && (
              <div className="space-y-4">
                {suggestionData.claimsProofMapping.map((item: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Claim</Label>
                      <p className="font-medium">{item.claim}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{item.proofType}</Badge>
                      <span className="text-sm text-muted-foreground">{item.proof}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {showSuggestionPreview === "voice" && suggestionData && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <Label className="text-sm text-muted-foreground">Recommended Tone</Label>
                  <Badge className="mt-2">{suggestionData.recommendedTone}</Badge>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <Label className="text-sm text-muted-foreground">Voice Rules</Label>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {suggestionData.voiceRules?.map((rule: string, i: number) => (
                      <li key={i} className="text-sm">{rule}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                  <Label className="text-sm text-red-400">Forbidden Phrases</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {suggestionData.forbiddenPhrases?.map((phrase: string, i: number) => (
                      <Badge key={i} variant="destructive" className="bg-red-500/20 text-red-400">{phrase}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setShowSuggestionPreview(null); setSuggestionData(null); }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-primary text-primary-foreground"
              onClick={() => showSuggestionPreview && applySuggestion(showSuggestionPreview)}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Apply Suggestions
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
