/**
 * OnboardingGate
 * 
 * Wraps protected pages and redirects new users to the onboarding flow
 * if they haven't completed Step 1 (Plan Selection).
 * 
 * Also handles post-checkout reconciliation by detecting Stripe success
 * redirects and advancing the onboarding step.
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import PlanSelectionDrawer from "@/components/PlanSelectionDrawer";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface OnboardingGateProps {
  children: React.ReactNode;
  /** If true, the gate will not block rendering even if onboarding is incomplete */
  soft?: boolean;
}

export default function OnboardingGate({ children, soft = false }: OnboardingGateProps) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [showPlanDrawer, setShowPlanDrawer] = useState(false);
  const [reconciled, setReconciled] = useState(false);

  const { data: onboardingState, isLoading: stateLoading } = trpc.onboarding.getState.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const advanceStep = trpc.onboarding.advanceStep.useMutation({
    onSuccess: () => {
      trpc.useUtils().onboarding.getState.invalidate();
      trpc.useUtils().auth.me.invalidate();
    },
  });

  // Post-checkout reconciliation: detect ?checkout=success in URL
  useEffect(() => {
    if (reconciled || !user) return;

    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");

    if (checkoutStatus === "success") {
      setReconciled(true);
      // Remove the query param from URL
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.toString());

      toast.success("Payment successful! Your plan has been activated.");

      // Advance onboarding to Step 2 if still on Step 1
      if (onboardingState?.currentStep === 1) {
        advanceStep.mutate({ targetStep: 2 });
      }
    } else if (checkoutStatus === "cancel") {
      setReconciled(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      window.history.replaceState({}, "", url.toString());
      toast.info("Checkout cancelled. You can select a plan anytime.");
    }
  }, [user, onboardingState, reconciled]);

  // Show plan selection for new users who haven't selected a plan
  useEffect(() => {
    if (soft || authLoading || stateLoading || !user) return;

    if (
      onboardingState?.currentStep === 1 &&
      user.plan === "free" &&
      onboardingState?.user?.planStatus === "none"
    ) {
      // Delay to let the page render first
      const timer = setTimeout(() => setShowPlanDrawer(true), 800);
      return () => clearTimeout(timer);
    }
  }, [onboardingState, user, authLoading, stateLoading, soft]);

  // Loading state
  if (authLoading || (isAuthenticated && stateLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {children}
      <PlanSelectionDrawer
        open={showPlanDrawer}
        onOpenChange={setShowPlanDrawer}
        origin="onboarding"
        onPlanSelected={(planId) => {
          if (planId === "free") {
            // Free plan selected, advance to step 2
            advanceStep.mutate({ targetStep: 2 });
          }
          setShowPlanDrawer(false);
        }}
      />
    </>
  );
}
