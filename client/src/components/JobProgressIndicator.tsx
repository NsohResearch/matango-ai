/**
 * JobProgressIndicator Component
 * 
 * Displays real-time progress for generation jobs with visual feedback.
 */

import { useSingleJobStatus, JobStatus } from "@/hooks/useJobStatus";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface JobProgressIndicatorProps {
  jobId: number;
  onComplete?: (job: JobStatus) => void;
  onFailed?: (job: JobStatus) => void;
  showDetails?: boolean;
  className?: string;
}

export function JobProgressIndicator({
  jobId,
  onComplete,
  onFailed,
  showDetails = true,
  className,
}: JobProgressIndicatorProps) {
  const { status, isConnected } = useSingleJobStatus(jobId, {
    onComplete,
    onFailed,
  });

  if (!status) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Connecting...</span>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (status.status) {
      case "queued":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "running":
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case "succeeded":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
      case "dead_letter":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "canceled":
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const getStatusLabel = () => {
    switch (status.status) {
      case "queued":
        return "Queued";
      case "running":
        return "Processing";
      case "succeeded":
        return "Complete";
      case "failed":
        return "Failed";
      case "dead_letter":
        return "Failed (Retries Exhausted)";
      case "canceled":
        return "Canceled";
      default:
        return status.status;
    }
  };

  const getStatusColor = (): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.status) {
      case "succeeded":
        return "default";
      case "failed":
      case "dead_letter":
        return "destructive";
      case "running":
        return "secondary";
      default:
        return "outline";
    }
  };

  const isInProgress = status.status === "queued" || status.status === "running";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <Badge variant={getStatusColor()}>{getStatusLabel()}</Badge>
          {!isConnected && (
            <span className="text-xs text-muted-foreground">(Reconnecting...)</span>
          )}
        </div>
        {showDetails && isInProgress && (
          <span className="text-sm text-muted-foreground">
            {status.progress}%
          </span>
        )}
      </div>

      {isInProgress && (
        <Progress value={status.progress} className="h-2" />
      )}

      {status.error && (
        <p className="text-sm text-red-500">{status.error}</p>
      )}

      {showDetails && status.kind && (
        <p className="text-xs text-muted-foreground">
          Type: {status.kind}
        </p>
      )}
    </div>
  );
}

/**
 * Compact progress indicator for lists
 */
export function JobProgressBadge({
  jobId,
  className,
}: {
  jobId: number;
  className?: string;
}) {
  const { status } = useSingleJobStatus(jobId);

  if (!status) {
    return <Badge variant="outline" className={className}>Loading...</Badge>;
  }

  const getVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.status) {
      case "succeeded":
        return "default";
      case "failed":
      case "dead_letter":
        return "destructive";
      case "running":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getLabel = () => {
    if (status.status === "running") {
      return `${status.progress}%`;
    }
    return status.status;
  };

  return (
    <Badge variant={getVariant()} className={className}>
      {status.status === "running" && (
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      )}
      {getLabel()}
    </Badge>
  );
}

export default JobProgressIndicator;
