/**
 * GrowthLoopCard
 * 
 * 5-step growth loop visualization with dynamic status badges.
 * Step 1: PLAN → Choose/upgrade plan
 * Step 2: BRAND → Set up Brand Brain + create influencer
 * Step 3: CAMPAIGN → Create content (Video Scripts, Video Lab, Campaign Factory)
 * Step 4: PUBLISH → Schedule and publish to social channels
 * Step 5: OPTIMIZE → Analyze performance and run A/B tests
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PlanSelectionDrawer from "@/components/PlanSelectionDrawer";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  RefreshCw,
  CreditCard,
  Brain,
  Layers,
  Target,
  TrendingUp,
  CheckCircle2,
  Zap,
  Lock,
  ArrowRight,
  Crown,
} from "lucide-react";

interface GrowthLoopCardProps {
  isBrandBrainConfigured?: boolean;
  connectedPlatforms?: number;
  runningTests?: number;
  brandBrainName?: string;
}

export default function GrowthLoopCard({
  isBrandBrainConfigured = false,
  connectedPlatforms = 0,
  runningTests = 0,
  brandBrainName,
}: GrowthLoopCardProps) {
  const { user } = useAuth();
  const [showPlanDrawer, setShowPlanDrawer] = useState(false);

  const { data: onboardingState } = trpc.onboarding.getState.useQuery(undefined, {
    enabled: !!user,
  });

  const advanceStep = trpc.onboarding.advanceStep.useMutation({
    onSuccess: () => {
      // Invalidate onboarding state
      trpc.useUtils().onboarding.getState.invalidate();
    },
  });

  const currentStep = onboardingState?.currentStep || 1;
  const isPaid = user?.plan !== "free" && onboardingState?.user?.planStatus !== "none";

  // 5-step growth loop with dynamic status
  const loopSteps = [
    {
      step: 1,
      label: "01",
      title: "Choose Plan",
      description: isPaid ? `${user?.plan?.charAt(0).toUpperCase()}${user?.plan?.slice(1)} Plan` : "Select your plan",
      icon: CreditCard,
      verb: "Plan",
      status: isPaid ? "complete" as const : "action-needed" as const,
      badge: isPaid ? `${user?.plan?.charAt(0).toUpperCase()}${user?.plan?.slice(1)}` : "Start Here",
      onClick: () => setShowPlanDrawer(true),
    },
    {
      step: 2,
      label: "02",
      title: "Brand Brain",
      description: isBrandBrainConfigured ? (brandBrainName || "Configured") : "Define your brand",
      icon: Brain,
      href: "/brand-brain",
      verb: "Build",
      status: isBrandBrainConfigured
        ? "complete" as const
        : isPaid
          ? "action-needed" as const
          : "locked" as const,
      badge: isBrandBrainConfigured ? "Configured" : isPaid ? "Set Up Now" : "Needs Plan",
    },
    {
      step: 3,
      label: "03",
      title: "Create Content",
      description: "Influencers, scripts, videos",
      icon: Layers,
      href: "/influencer-studio",
      verb: "Create",
      status: isBrandBrainConfigured
        ? "ready" as const
        : "locked" as const,
      badge: isBrandBrainConfigured ? "Ready" : "Needs Brand Brain",
    },
    {
      step: 4,
      label: "04",
      title: "Publish",
      description: "Schedule everywhere",
      icon: Target,
      href: "/social-connections",
      verb: "Execute",
      status: connectedPlatforms > 0
        ? "active" as const
        : isBrandBrainConfigured
          ? "ready" as const
          : "locked" as const,
      badge: connectedPlatforms > 0 ? `${connectedPlatforms} connected` : "Connect accounts",
    },
    {
      step: 5,
      label: "05",
      title: "Optimize",
      description: "AI insights & A/B tests",
      icon: TrendingUp,
      href: "/analytics-hub",
      verb: "Learn",
      status: runningTests > 0
        ? "active" as const
        : "ready" as const,
      badge: runningTests > 0 ? `${runningTests} tests running` : undefined,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete":
        return "bg-green-500/20 text-green-400";
      case "action-needed":
        return "bg-amber-500/20 text-amber-400 animate-pulse";
      case "active":
        return "bg-primary/20 text-primary";
      case "ready":
        return "bg-primary/10 text-primary";
      case "locked":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="w-3 h-3 mr-1" />;
      case "action-needed":
        return <Zap className="w-3 h-3 mr-1" />;
      case "locked":
        return <Lock className="w-3 h-3 mr-1" />;
      default:
        return null;
    }
  };

  return (
    <>
      <Card className="bg-card border-border mb-8 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" />
                Your Growth Loop
              </CardTitle>
              <CardDescription>
                5 steps to always-on marketing. Complete each step to unlock the next.
              </CardDescription>
            </div>
            {isPaid && (
              <Button
                variant="outline"
                size="sm"
                className="border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => setShowPlanDrawer(true)}
              >
                <Crown className="w-4 h-4 mr-1" />
                {user?.plan?.charAt(0).toUpperCase()}{user?.plan?.slice(1)}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {loopSteps.map((step, index) => {
              const StepWrapper = step.href && step.status !== "locked"
                ? ({ children }: { children: React.ReactNode }) => (
                    <Link href={step.href!}>{children}</Link>
                  )
                : ({ children }: { children: React.ReactNode }) => (
                    <div
                      onClick={step.onClick}
                      className={step.onClick ? "cursor-pointer" : ""}
                    >
                      {children}
                    </div>
                  );

              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                >
                  <StepWrapper>
                    <div className={`relative p-3 rounded-xl border transition-all group ${
                      step.status === "locked"
                        ? "bg-muted/20 border-border opacity-60"
                        : step.status === "action-needed"
                          ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50"
                          : step.status === "complete"
                            ? "bg-green-500/5 border-green-500/30"
                            : "bg-secondary/30 border-border hover:border-primary/50"
                    } ${step.onClick || step.href ? "cursor-pointer" : ""}`}>
                      {/* Connecting arrow */}
                      {index < 4 && (
                        <div className="hidden md:block absolute top-1/2 -right-2 w-4 text-primary/40 z-10">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                      {/* Loop-back arrow on last step */}
                      {index === 4 && (
                        <div className="hidden md:block absolute top-1/2 -right-2 w-4 text-primary/40 z-10">
                          <RefreshCw className="w-3 h-3" />
                        </div>
                      )}

                      <div className="text-[10px] font-mono text-primary mb-1.5">{step.label}</div>
                      <div className="mb-1.5 p-1.5 rounded-lg bg-primary/10 w-fit group-hover:bg-primary/20 transition-colors">
                        <step.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-[10px] font-medium text-accent mb-0.5">{step.verb}</div>
                      <h3 className="font-bold text-xs mb-0.5">{step.title}</h3>
                      <p className="text-[10px] text-muted-foreground leading-tight">{step.description}</p>
                      {step.badge && (
                        <Badge
                          variant="secondary"
                          className={`mt-1.5 text-[10px] border-none ${getStatusColor(step.status)}`}
                        >
                          {getStatusIcon(step.status)}
                          {step.badge}
                        </Badge>
                      )}
                    </div>
                  </StepWrapper>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Plan Selection Drawer */}
      <PlanSelectionDrawer
        open={showPlanDrawer}
        onOpenChange={setShowPlanDrawer}
        origin={isPaid ? "upgrade" : "onboarding"}
        onPlanSelected={() => {
          trpc.useUtils().onboarding.getState.invalidate();
        }}
      />
    </>
  );
}
