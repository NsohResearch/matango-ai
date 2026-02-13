import { Loader2, CheckCircle, AlertCircle, RefreshCw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusType = 'idle' | 'loading' | 'success' | 'error' | 'retrying' | 'pending';

interface StatusIndicatorProps {
  status: StatusType;
  message?: string;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'text-xs gap-1',
  md: 'text-sm gap-2',
  lg: 'text-base gap-2',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

/**
 * StatusIndicator - Shows current operation status with appropriate icon and color
 */
export function StatusIndicator({
  status,
  message,
  className,
  showIcon = true,
  size = 'md',
}: StatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return {
          icon: Loader2,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          animate: 'animate-spin',
          defaultMessage: 'Processing...',
        };
      case 'success':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          animate: '',
          defaultMessage: 'Completed',
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          animate: '',
          defaultMessage: 'Failed',
        };
      case 'retrying':
        return {
          icon: RefreshCw,
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          animate: 'animate-spin',
          defaultMessage: 'Retrying...',
        };
      case 'pending':
        return {
          icon: Clock,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10',
          animate: '',
          defaultMessage: 'Pending',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  const Icon = config.icon;
  const displayMessage = message || config.defaultMessage;

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2 py-1',
        config.bgColor,
        config.color,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(iconSizes[size], config.animate)} />
      )}
      <span>{displayMessage}</span>
    </div>
  );
}

/**
 * OperationStatus - Full-width status bar for major operations
 */
interface OperationStatusProps {
  status: StatusType;
  title: string;
  description?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function OperationStatus({
  status,
  title,
  description,
  onRetry,
  onDismiss,
}: OperationStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return {
          icon: Loader2,
          bgColor: 'bg-blue-500/10 border-blue-500/20',
          textColor: 'text-blue-400',
          animate: 'animate-spin',
        };
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-500/10 border-green-500/20',
          textColor: 'text-green-400',
          animate: '',
        };
      case 'error':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-500/10 border-red-500/20',
          textColor: 'text-red-400',
          animate: '',
        };
      case 'retrying':
        return {
          icon: RefreshCw,
          bgColor: 'bg-amber-500/10 border-amber-500/20',
          textColor: 'text-amber-400',
          animate: 'animate-spin',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border p-4',
        config.bgColor
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn('h-5 w-5', config.textColor, config.animate)} />
        <div>
          <p className={cn('font-medium', config.textColor)}>{title}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        {status === 'error' && onRetry && (
          <button
            onClick={onRetry}
            className="text-sm text-red-400 hover:text-red-300 underline"
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * ProgressStatus - Shows progress for multi-step operations
 */
interface ProgressStatusProps {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  status: StatusType;
}

export function ProgressStatus({
  currentStep,
  totalSteps,
  stepName,
  status,
}: ProgressStatusProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Step {currentStep} of {totalSteps}: {stepName}
        </span>
        <StatusIndicator status={status} size="sm" />
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full transition-all duration-300',
            status === 'error' ? 'bg-red-500' :
            status === 'success' ? 'bg-green-500' :
            'bg-primary'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * PlanLimitWarning - Shows when user is approaching or has hit plan limits
 */
interface PlanLimitWarningProps {
  limitType: string;
  current: number;
  limit: number;
  onUpgrade?: () => void;
}

export function PlanLimitWarning({
  limitType,
  current,
  limit,
  onUpgrade,
}: PlanLimitWarningProps) {
  const percentage = (current / limit) * 100;
  const isAtLimit = current >= limit;
  const isNearLimit = percentage >= 80;

  if (!isNearLimit) return null;

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        isAtLimit
          ? 'bg-red-500/10 border-red-500/20'
          : 'bg-amber-500/10 border-amber-500/20'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle
            className={cn(
              'h-5 w-5',
              isAtLimit ? 'text-red-400' : 'text-amber-400'
            )}
          />
          <div>
            <p className={cn(
              'font-medium',
              isAtLimit ? 'text-red-400' : 'text-amber-400'
            )}>
              {isAtLimit
                ? `${limitType} limit reached`
                : `Approaching ${limitType} limit`}
            </p>
            <p className="text-sm text-muted-foreground">
              {current} of {limit} used ({Math.round(percentage)}%)
            </p>
          </div>
        </div>
        {onUpgrade && (
          <button
            onClick={onUpgrade}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium',
              isAtLimit
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-amber-500 text-white hover:bg-amber-600'
            )}
          >
            Upgrade Plan
          </button>
        )}
      </div>
    </div>
  );
}
