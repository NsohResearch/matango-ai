/**
 * PlanSelectionDrawer
 * 
 * Slide-over drawer that shows plan options with embedded pricing.
 * Used as Step 1 of the onboarding growth loop and for upgrade flows.
 * Opens as a full-screen drawer from the right side.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Check,
  X,
  Zap,
  Crown,
  Building2,
  Sparkles,
  ArrowRight,
  Loader2,
  Star,
} from "lucide-react";

interface PlanSelectionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  origin?: "onboarding" | "upgrade" | "downgrade";
  onPlanSelected?: (planId: string) => void;
}

export default function PlanSelectionDrawer({
  open,
  onOpenChange,
  origin = "onboarding",
  onPlanSelected,
}: PlanSelectionDrawerProps) {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const { data: plans, isLoading } = trpc.onboarding.getPlans.useQuery();
  const savePlanIntent = trpc.onboarding.savePlanIntent.useMutation();

  const planIcons: Record<string, React.ReactNode> = {
    free: <Sparkles className="w-5 h-5" />,
    basic: <Zap className="w-5 h-5" />,
    agency: <Crown className="w-5 h-5" />,
    agency_plus: <Building2 className="w-5 h-5" />,
  };

  const handleSelectPlan = async (planId: string) => {
    setSelectedPlan(planId);

    if (planId === "free") {
      // Free plan — just advance onboarding
      onPlanSelected?.("free");
      onOpenChange(false);
      return;
    }

    // Save plan intent
    await savePlanIntent.mutateAsync({
      tier: planId,
      cycle: billingCycle,
      origin,
    });

    // Check if enterprise/contact sales
    const plan = plans?.find((p) => p.id === planId);
    if (plan?.isEnterprise) {
      toast.info("Our team will reach out to you shortly for Agency++ setup.");
      onPlanSelected?.(planId);
      onOpenChange(false);
      return;
    }

    // Redirect to Stripe checkout
    setIsCheckingOut(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          planId: planId.toUpperCase(),
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
        onPlanSelected?.(planId);
      } else {
        toast.error(data.error || "Failed to create checkout session");
      }
    } catch (error) {
      toast.error("Failed to initiate checkout. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const formatPrice = (priceInCents: number) => {
    if (priceInCents <= 0) return priceInCents === 0 ? "$0" : "Custom";
    return `$${(priceInCents / 100).toFixed(0)}`;
  };

  const getMonthlyEquivalent = (yearlyPrice: number) => {
    if (yearlyPrice <= 0) return "";
    return `$${(yearlyPrice / 100 / 12).toFixed(0)}/mo`;
  };

  const getSavingsPercent = (monthly: number, yearly: number) => {
    if (monthly <= 0 || yearly <= 0) return 0;
    const monthlyTotal = monthly * 12;
    return Math.round(((monthlyTotal - yearly) / monthlyTotal) * 100);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[900px] overflow-y-auto bg-background p-0">
        <div className="p-6 pb-0">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold">
              {origin === "onboarding" ? "Step 1: Choose Your Plan" : "Upgrade Your Plan"}
            </SheetTitle>
            <SheetDescription className="text-muted-foreground">
              {origin === "onboarding"
                ? "Select the plan that fits your needs. You can always upgrade later."
                : "Unlock more features and higher limits with a better plan."}
            </SheetDescription>
          </SheetHeader>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 mt-6 mb-2">
            <Label
              htmlFor="billing-toggle"
              className={`text-sm ${billingCycle === "monthly" ? "text-foreground font-medium" : "text-muted-foreground"}`}
            >
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={billingCycle === "yearly"}
              onCheckedChange={(checked) => setBillingCycle(checked ? "yearly" : "monthly")}
            />
            <Label
              htmlFor="billing-toggle"
              className={`text-sm ${billingCycle === "yearly" ? "text-foreground font-medium" : "text-muted-foreground"}`}
            >
              Yearly
            </Label>
            {billingCycle === "yearly" && (
              <Badge variant="secondary" className="bg-primary/20 text-primary border-none text-xs">
                Save up to 17%
              </Badge>
            )}
          </div>
        </div>

        {/* Plan Cards */}
        <div className="p-6 pt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans?.map((plan) => {
                const price = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
                const isCurrentPlan = user?.plan?.toLowerCase() === plan.id.toLowerCase();
                const savings = getSavingsPercent(plan.monthlyPrice, plan.yearlyPrice);

                return (
                  <Card
                    key={plan.id}
                    className={`relative transition-all cursor-pointer hover:border-primary/50 ${
                      selectedPlan === plan.id
                        ? "border-primary ring-2 ring-primary/20"
                        : isCurrentPlan
                          ? "border-primary/30 bg-primary/5"
                          : "border-border"
                    } ${plan.isPopular ? "md:scale-[1.02]" : ""}`}
                    onClick={() => !isCurrentPlan && handleSelectPlan(plan.id)}
                  >
                    {plan.isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground border-none">
                          <Star className="w-3 h-3 mr-1" /> Most Popular
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-primary/10">
                            {planIcons[plan.id] || <Zap className="w-5 h-5" />}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{plan.name}</CardTitle>
                            <CardDescription className="text-xs">{plan.description}</CardDescription>
                          </div>
                        </div>
                        {isCurrentPlan && (
                          <Badge variant="outline" className="text-xs border-primary text-primary">
                            Current
                          </Badge>
                        )}
                      </div>

                      {/* Price */}
                      <div className="mt-3">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold">{formatPrice(price)}</span>
                          {price > 0 && (
                            <span className="text-sm text-muted-foreground">
                              /{billingCycle === "yearly" ? "year" : "month"}
                            </span>
                          )}
                        </div>
                        {billingCycle === "yearly" && price > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {getMonthlyEquivalent(plan.yearlyPrice)} billed annually
                            </span>
                            {savings > 0 && (
                              <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400 border-none">
                                Save {savings}%
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      {/* Features */}
                      <div className="space-y-2 mb-4">
                        {plan.features.slice(0, 6).map((feature, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                        {plan.excludedFeatures.slice(0, 3).map((feature, i) => (
                          <div key={`ex-${i}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <X className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* Limits Summary */}
                      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                        <div className="bg-secondary/30 rounded-lg p-2 text-center">
                          <div className="font-bold text-foreground">
                            {plan.limits.influencers === -1 ? "∞" : plan.limits.influencers}
                          </div>
                          <div className="text-muted-foreground">Influencers</div>
                        </div>
                        <div className="bg-secondary/30 rounded-lg p-2 text-center">
                          <div className="font-bold text-foreground">
                            {plan.limits.imagesPerMonth === -1 ? "∞" : plan.limits.imagesPerMonth}
                          </div>
                          <div className="text-muted-foreground">Images/mo</div>
                        </div>
                        <div className="bg-secondary/30 rounded-lg p-2 text-center">
                          <div className="font-bold text-foreground">
                            {plan.limits.videosPerMonth === -1 ? "∞" : plan.limits.videosPerMonth}
                          </div>
                          <div className="text-muted-foreground">Videos/mo</div>
                        </div>
                        <div className="bg-secondary/30 rounded-lg p-2 text-center">
                          <div className="font-bold text-foreground">
                            {plan.limits.brands === -1 ? "∞" : plan.limits.brands}
                          </div>
                          <div className="text-muted-foreground">Brands</div>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <Button
                        className={`w-full ${
                          isCurrentPlan
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : plan.isPopular
                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                              : "bg-secondary text-foreground hover:bg-secondary/80"
                        }`}
                        disabled={isCurrentPlan || isCheckingOut}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isCurrentPlan) handleSelectPlan(plan.id);
                        }}
                      >
                        {isCheckingOut && selectedPlan === plan.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : isCurrentPlan ? (
                          "Current Plan"
                        ) : plan.isEnterprise ? (
                          "Contact Sales"
                        ) : plan.monthlyPrice === 0 ? (
                          "Get Started Free"
                        ) : (
                          <>
                            {origin === "onboarding" ? "Select Plan" : "Upgrade"}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Footer Note */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>All plans include 256-bit SSL encryption and GDPR compliance.</p>
            <p className="mt-1">
              Cancel anytime. No long-term contracts.{" "}
              {billingCycle === "yearly" && "Annual plans are billed upfront."}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
