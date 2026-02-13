import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Brain, 
  Users, 
  Rocket,
  CheckCircle2,
  Zap,
  Target,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface AAOOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const WIZARD_STEPS = [
  {
    id: 1,
    title: "Welcome to Operatorware",
    subtitle: "You're not here for another tool. You're here for an operator.",
    icon: Sparkles,
    content: {
      headline: "Meet the AI-Amplified Operator",
      description: "Matango.ai doesn't give you dashboards to manage. It gives you AAOs—AI-Amplified Operators—that run your growth loop while you sleep.",
      features: [
        { icon: Zap, text: "Always-on execution, not just automation" },
        { icon: Target, text: "Brand-aware decisions, not generic outputs" },
        { icon: TrendingUp, text: "Continuous optimization, not one-time setup" },
      ],
      cta: "This is Operatorware. Let's deploy your first AAO.",
    },
  },
  {
    id: 2,
    title: "Build Your Brand Brain",
    subtitle: "Every AAO needs a foundation. Yours starts here.",
    icon: Brain,
    content: {
      headline: "Your Brand Brain Powers Everything",
      description: "Before you deploy an AAO, you need a Brand Brain—the central intelligence that stores your voice, values, audience, and goals.",
      features: [
        { icon: CheckCircle2, text: "Define your brand voice and personality" },
        { icon: CheckCircle2, text: "Map your target audience segments" },
        { icon: CheckCircle2, text: "Set your growth objectives and KPIs" },
      ],
      cta: "Your Brand Brain ensures every AAO speaks with one voice.",
    },
  },
  {
    id: 3,
    title: "Deploy Your First AAO",
    subtitle: "Choose your operator. Watch it work.",
    icon: Users,
    content: {
      headline: "Meet K'ah—Your Lead AAO",
      description: "K'ah is Matango's official AAO. She demonstrates what's possible: always-on engagement, brand-consistent content, and growth that compounds.",
      features: [
        { icon: CheckCircle2, text: "Create your own Influencer AAO" },
        { icon: CheckCircle2, text: "Or clone K'ah's proven growth loop" },
        { icon: CheckCircle2, text: "Customize voice, visuals, and strategy" },
      ],
      cta: "Your AAO will handle the grind. You handle the vision.",
    },
  },
  {
    id: 4,
    title: "Launch Your Growth Loop",
    subtitle: "One loop. One Brand Brain. Always-on growth.",
    icon: Rocket,
    content: {
      headline: "The Growth Loop Never Stops",
      description: "Once deployed, your AAO enters the Growth Loop: Create → Publish → Engage → Analyze → Optimize → Repeat. 24/7. No burnout. No breaks.",
      features: [
        { icon: CheckCircle2, text: "Automated content generation" },
        { icon: CheckCircle2, text: "Multi-channel publishing" },
        { icon: CheckCircle2, text: "Real-time engagement and lead capture" },
      ],
      cta: "Ready to end the marketing tool parade?",
    },
  },
];

export default function AAOOnboardingWizard({ isOpen, onClose, onComplete }: AAOOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setDirection(0);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = WIZARD_STEPS[currentStep];
  const StepIcon = step.icon;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / WIZARD_STEPS.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Content */}
            <div className="p-8 pt-12">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentStep}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {/* Step Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                      <StepIcon className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-primary font-medium">Step {step.id} of {WIZARD_STEPS.length}</p>
                      <h2 className="text-2xl font-bold text-foreground">{step.title}</h2>
                    </div>
                  </div>

                  {/* Subtitle */}
                  <p className="text-lg text-muted-foreground mb-8 italic">
                    "{step.subtitle}"
                  </p>

                  {/* Main Content */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-foreground">
                      {step.content.headline}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.content.description}
                    </p>

                    {/* Features List */}
                    <div className="space-y-3">
                      {step.content.features.map((feature, index) => {
                        const FeatureIcon = feature.icon;
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center gap-3"
                          >
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <FeatureIcon className="w-4 h-4 text-primary" />
                            </div>
                            <span className="text-foreground">{feature.text}</span>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* CTA Text */}
                    <p className="text-primary font-medium pt-4 border-t border-border">
                      {step.content.cta}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-muted/30 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentStep > 0 ? (
                  <Button
                    variant="ghost"
                    onClick={handlePrev}
                    className="gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    className="text-muted-foreground"
                  >
                    Skip Tour
                  </Button>
                )}
              </div>

              {/* Step Indicators */}
              <div className="flex items-center gap-2">
                {WIZARD_STEPS.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setDirection(index > currentStep ? 1 : -1);
                      setCurrentStep(index);
                    }}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      index === currentStep
                        ? "bg-primary"
                        : index < currentStep
                        ? "bg-primary/50"
                        : "bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>

              <div>
                {isLastStep ? (
                  <Link href="/brand-brain">
                    <Button
                      onClick={onComplete}
                      className="gap-2 bg-primary hover:bg-primary/90"
                    >
                      Start Building
                      <Rocket className="w-4 h-4" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    onClick={handleNext}
                    className="gap-2 bg-primary hover:bg-primary/90"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
