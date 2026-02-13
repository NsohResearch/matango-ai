/**
 * Account Deletion Wizard - 4-Step Deletion Flow with Guardrails
 * 
 * Implements the alternatives-first approach to account deletion:
 * Step 1: Present alternatives (pause billing, downgrade, deactivate)
 * Step 2: Data export opportunity
 * Step 3: Confirmation with typed phrase and acknowledgements
 * Step 4: Re-authentication confirmation
 * 
 * Follows IAM-first security principles with comprehensive audit logging.
 */
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  AlertTriangle, 
  Download, 
  PauseCircle, 
  ArrowDownCircle, 
  Power, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Shield, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  Calendar,
  Database,
  FileText,
  Users,
  Image,
  Video,
  MessageSquare,
  BarChart3
} from "lucide-react";

interface AccountDeletionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userName: string;
  currentPlan: string;
}

type WizardStep = 1 | 2 | 3 | 4;

type AlternativeChoice = 
  | "none" 
  | "pause_billing_30d" 
  | "pause_billing_60d" 
  | "pause_billing_90d" 
  | "downgrade_plan" 
  | "deactivate_account";

export function AccountDeletionWizard({
  isOpen,
  onClose,
  userEmail,
  userName,
  currentPlan,
}: AccountDeletionWizardProps) {
  
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [selectedAlternative, setSelectedAlternative] = useState<AlternativeChoice>("none");
  const [deletionRequestId, setDeletionRequestId] = useState<number | null>(null);
  
  // Step 3 state
  const [typedPhrase, setTypedPhrase] = useState("");
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [acknowledgedConsequences, setAcknowledgedConsequences] = useState(false);
  const [acknowledged90DayRecovery, setAcknowledged90DayRecovery] = useState(false);
  const [acknowledged12MonthRetention, setAcknowledged12MonthRetention] = useState(false);
  
  // Step 4 state
  const [isConfirming, setIsConfirming] = useState(false);
  
  const CONFIRMATION_PHRASE = "DELETE MY ACCOUNT";
  
  // tRPC mutations
  const pauseBillingMutation = trpc.accountLifecycle.pauseBilling.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      onClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const downgradeMutation = trpc.accountLifecycle.downgrade.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      onClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const deactivateMutation = trpc.accountLifecycle.deactivate.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      onClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const requestDeleteMutation = trpc.accountLifecycle.requestDelete.useMutation({
    onSuccess: (data) => {
      setDeletionRequestId(data.requestId);
      setCurrentStep(3);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const confirmDeleteMutation = trpc.accountLifecycle.confirmDelete.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      onClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const cancelDeleteMutation = trpc.accountLifecycle.cancelDelete.useMutation({
    onSuccess: () => {
      toast.success("Your deletion request has been cancelled.");
      resetWizard();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  // GDPR export mutation
  const exportDataMutation = trpc.gdpr.requestExport.useMutation({
    onSuccess: (data) => {
      toast.success("Your data export has been initiated. You'll receive a download link when ready.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const resetWizard = () => {
    setCurrentStep(1);
    setSelectedAlternative("none");
    setDeletionRequestId(null);
    setTypedPhrase("");
    setEmailConfirmation("");
    setAcknowledgedConsequences(false);
    setAcknowledged90DayRecovery(false);
    setAcknowledged12MonthRetention(false);
    setIsConfirming(false);
  };
  
  useEffect(() => {
    if (!isOpen) {
      resetWizard();
    }
  }, [isOpen]);
  
  const handleAlternativeAction = () => {
    switch (selectedAlternative) {
      case "pause_billing_30d":
        pauseBillingMutation.mutate({ duration: "30d", reason: "User chose pause over deletion" });
        break;
      case "pause_billing_60d":
        pauseBillingMutation.mutate({ duration: "60d", reason: "User chose pause over deletion" });
        break;
      case "pause_billing_90d":
        pauseBillingMutation.mutate({ duration: "90d", reason: "User chose pause over deletion" });
        break;
      case "downgrade_plan":
        downgradeMutation.mutate({ reason: "User chose downgrade over deletion" });
        break;
      case "deactivate_account":
        deactivateMutation.mutate({ reason: "User chose deactivation over deletion" });
        break;
      default:
        // Proceed to deletion flow
        requestDeleteMutation.mutate({ reason: "User proceeded with deletion" });
    }
  };
  
  const handleExportData = () => {
    exportDataMutation.mutate();
  };
  
  const handleConfirmDeletion = () => {
    if (!deletionRequestId) return;
    
    setIsConfirming(true);
    confirmDeleteMutation.mutate({
      requestId: deletionRequestId,
      typedPhrase,
      emailConfirmation,
      acknowledgedConsequences,
      acknowledged90DayRecovery,
      acknowledged12MonthRetention,
    });
  };
  
  const handleCancelDeletion = () => {
    if (deletionRequestId) {
      cancelDeleteMutation.mutate({ requestId: deletionRequestId });
    } else {
      onClose();
    }
  };
  
  const isStep3Valid = 
    typedPhrase === CONFIRMATION_PHRASE &&
    emailConfirmation.toLowerCase() === userEmail.toLowerCase() &&
    acknowledgedConsequences &&
    acknowledged90DayRecovery &&
    acknowledged12MonthRetention;
  
  const getStepProgress = () => {
    return (currentStep / 4) * 100;
  };
  
  const renderStepIndicator = () => (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-muted-foreground">Step {currentStep} of 4</span>
        <span className="text-sm text-muted-foreground">{getStepProgress()}% Complete</span>
      </div>
      <Progress value={getStepProgress()} className="h-2" />
      <div className="flex justify-between mt-2">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${
              step === currentStep
                ? "bg-primary text-primary-foreground"
                : step < currentStep
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {step < currentStep ? <CheckCircle2 className="w-4 h-4" /> : step}
          </div>
        ))}
      </div>
    </div>
  );
  
  const renderStep1 = () => (
    <div className="space-y-6">
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-500">Before You Go</AlertTitle>
        <AlertDescription className="text-amber-500/80">
          We'd hate to see you leave! Consider these alternatives that might address your concerns.
        </AlertDescription>
      </Alert>
      
      <div className="grid gap-4">
        <Card 
          className={`cursor-pointer transition-all ${
            selectedAlternative.startsWith("pause_billing") 
              ? "border-primary ring-2 ring-primary/20" 
              : "hover:border-primary/50"
          }`}
          onClick={() => setSelectedAlternative("pause_billing_30d")}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <PauseCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base">Pause Billing</CardTitle>
                <CardDescription>Take a break without losing your data</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Pause your subscription for 30, 60, or 90 days. Your data, influencers, and settings remain intact.
            </p>
            {selectedAlternative.startsWith("pause_billing") && (
              <div className="flex gap-2 mt-2">
                {["30d", "60d", "90d"].map((duration) => (
                  <Button
                    key={duration}
                    size="sm"
                    variant={selectedAlternative === `pause_billing_${duration}` ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAlternative(`pause_billing_${duration}` as AlternativeChoice);
                    }}
                  >
                    {duration.replace("d", " days")}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {currentPlan !== "free" && (
          <Card 
            className={`cursor-pointer transition-all ${
              selectedAlternative === "downgrade_plan" 
                ? "border-primary ring-2 ring-primary/20" 
                : "hover:border-primary/50"
            }`}
            onClick={() => setSelectedAlternative("downgrade_plan")}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <ArrowDownCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Downgrade to Free</CardTitle>
                  <CardDescription>Keep access with limited features</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Switch to our free plan. You'll keep your account and data, just with fewer features.
              </p>
            </CardContent>
          </Card>
        )}
        
        <Card 
          className={`cursor-pointer transition-all ${
            selectedAlternative === "deactivate_account" 
              ? "border-primary ring-2 ring-primary/20" 
              : "hover:border-primary/50"
          }`}
          onClick={() => setSelectedAlternative("deactivate_account")}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Power className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-base">Deactivate Account</CardTitle>
                <CardDescription>Hide your profile, keep your data</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Temporarily deactivate your account. Your data is preserved and you can reactivate anytime by logging in.
            </p>
          </CardContent>
        </Card>
        
        <Separator className="my-2" />
        
        <Card 
          className={`cursor-pointer transition-all border-destructive/30 ${
            selectedAlternative === "none" 
              ? "border-destructive ring-2 ring-destructive/20" 
              : "hover:border-destructive/50"
          }`}
          onClick={() => setSelectedAlternative("none")}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-base text-destructive">Proceed with Deletion</CardTitle>
                <CardDescription>Permanently delete your account</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This will start the deletion process. You'll have 90 days to restore your account before data is permanently removed.
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleAlternativeAction}
          variant={selectedAlternative === "none" ? "destructive" : "default"}
          disabled={pauseBillingMutation.isPending || downgradeMutation.isPending || deactivateMutation.isPending || requestDeleteMutation.isPending}
        >
          {(pauseBillingMutation.isPending || downgradeMutation.isPending || deactivateMutation.isPending || requestDeleteMutation.isPending) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {selectedAlternative === "none" ? "Continue to Deletion" : "Apply Alternative"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
  
  const renderStep2 = () => (
    <div className="space-y-6">
      <Alert>
        <Download className="h-4 w-4" />
        <AlertTitle>Export Your Data</AlertTitle>
        <AlertDescription>
          Before proceeding, we recommend downloading a copy of your data. This is your last chance to export everything.
        </AlertDescription>
      </Alert>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What's Included in Your Export</CardTitle>
          <CardDescription>A complete archive of your Matango.ai data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>AI Influencer Profiles</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Image className="h-4 w-4 text-muted-foreground" />
              <span>Generated Images</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Video className="h-4 w-4 text-muted-foreground" />
              <span>Video Projects</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span>Chat Histories</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span>Analytics Data</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>Content & Scripts</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span>Brand Brain Data</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Campaign History</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex gap-4">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={handleExportData}
          disabled={exportDataMutation.isPending}
        >
          {exportDataMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export My Data
        </Button>
      </div>
      
      <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Important Notice</AlertTitle>
        <AlertDescription>
          After deletion, your data will be retained for 90 days (self-restore) and then 12 months (support restore) before permanent deletion.
        </AlertDescription>
      </Alert>
      
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setCurrentStep(1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button variant="destructive" onClick={() => setCurrentStep(3)}>
          Continue to Confirmation
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
  
  const renderStep3 = () => (
    <div className="space-y-6">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Final Confirmation Required</AlertTitle>
        <AlertDescription>
          Please complete all verification steps below to confirm account deletion.
        </AlertDescription>
      </Alert>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="typed-phrase">
            Type <Badge variant="outline" className="mx-1 font-mono">{CONFIRMATION_PHRASE}</Badge> to confirm
          </Label>
          <Input
            id="typed-phrase"
            value={typedPhrase}
            onChange={(e) => setTypedPhrase(e.target.value)}
            placeholder="Type the phrase exactly as shown"
            className={typedPhrase === CONFIRMATION_PHRASE ? "border-green-500" : ""}
          />
          {typedPhrase && typedPhrase !== CONFIRMATION_PHRASE && (
            <p className="text-xs text-destructive">Phrase doesn't match. Please type exactly: {CONFIRMATION_PHRASE}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email-confirm">Confirm your email address</Label>
          <Input
            id="email-confirm"
            type="email"
            value={emailConfirmation}
            onChange={(e) => setEmailConfirmation(e.target.value)}
            placeholder="Enter your account email"
            className={emailConfirmation.toLowerCase() === userEmail.toLowerCase() ? "border-green-500" : ""}
          />
          {emailConfirmation && emailConfirmation.toLowerCase() !== userEmail.toLowerCase() && (
            <p className="text-xs text-destructive">Email doesn't match your account email</p>
          )}
        </div>
        
        <Separator />
        
        <div className="space-y-3">
          <Label className="text-base font-semibold">Acknowledgements</Label>
          
          <div className="flex items-start space-x-3">
            <Checkbox
              id="ack-consequences"
              checked={acknowledgedConsequences}
              onCheckedChange={(checked) => setAcknowledgedConsequences(checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="ack-consequences"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I understand the consequences
              </label>
              <p className="text-xs text-muted-foreground">
                All my AI influencers, content, campaigns, and data will be deleted.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Checkbox
              id="ack-90day"
              checked={acknowledged90DayRecovery}
              onCheckedChange={(checked) => setAcknowledged90DayRecovery(checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="ack-90day"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I understand the 90-day recovery window
              </label>
              <p className="text-xs text-muted-foreground">
                I can restore my account within 90 days by logging in.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Checkbox
              id="ack-12month"
              checked={acknowledged12MonthRetention}
              onCheckedChange={(checked) => setAcknowledged12MonthRetention(checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="ack-12month"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I understand the 12-month retention policy
              </label>
              <p className="text-xs text-muted-foreground">
                After 90 days, support can restore my account for up to 12 months. After that, deletion is permanent.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">90-day self-restore</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">12-month support restore</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setCurrentStep(2)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          variant="destructive" 
          onClick={() => setCurrentStep(4)}
          disabled={!isStep3Valid}
        >
          Final Step
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
  
  const renderStep4 = () => (
    <div className="space-y-6">
      <Alert variant="destructive" className="border-destructive bg-destructive/10">
        <Trash2 className="h-4 w-4" />
        <AlertTitle>Point of No Return</AlertTitle>
        <AlertDescription>
          Click the button below to schedule your account for deletion. This action cannot be undone after the recovery period.
        </AlertDescription>
      </Alert>
      
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-lg">Deletion Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Account:</span>
              <p className="font-medium">{userName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>
              <p className="font-medium">{userEmail}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Current Plan:</span>
              <p className="font-medium capitalize">{currentPlan}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Request ID:</span>
              <p className="font-medium font-mono">#{deletionRequestId}</p>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h4 className="font-medium">Timeline</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Today: Account marked for deletion</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>+90 days: Self-restore window closes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span>+12 months: Support restore window closes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <span>After 12 months: Permanent deletion</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex flex-col gap-3">
        <Button 
          variant="destructive" 
          size="lg"
          className="w-full"
          onClick={handleConfirmDeletion}
          disabled={isConfirming || confirmDeleteMutation.isPending}
        >
          {(isConfirming || confirmDeleteMutation.isPending) ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Delete My Account
        </Button>
        
        <Button 
          variant="outline" 
          size="lg"
          className="w-full"
          onClick={handleCancelDeletion}
          disabled={cancelDeleteMutation.isPending}
        >
          {cancelDeleteMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Cancel and Keep My Account
        </Button>
      </div>
      
      <p className="text-xs text-center text-muted-foreground">
        By clicking "Delete My Account", you confirm that you have read and understood all the information provided in this wizard.
      </p>
    </div>
  );
  
  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Consider Alternatives";
      case 2:
        return "Export Your Data";
      case 3:
        return "Confirm Deletion";
      case 4:
        return "Final Confirmation";
    }
  };
  
  const getStepDescription = () => {
    switch (currentStep) {
      case 1:
        return "Before deleting, explore options that might address your concerns.";
      case 2:
        return "Download a copy of your data before proceeding.";
      case 3:
        return "Verify your identity and acknowledge the consequences.";
      case 4:
        return "Review and confirm your account deletion.";
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            {getStepTitle()}
          </DialogTitle>
          <DialogDescription>
            {getStepDescription()}
          </DialogDescription>
        </DialogHeader>
        
        {renderStepIndicator()}
        
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </DialogContent>
    </Dialog>
  );
}

export default AccountDeletionWizard;
