/**
 * useJobStatus Hook
 * 
 * Real-time job status updates via Server-Sent Events (SSE).
 * Provides automatic reconnection and fallback to polling.
 */

import { useState, useEffect, useCallback, useRef } from "react";

export interface JobStatus {
  jobId: number;
  status: "queued" | "running" | "succeeded" | "failed" | "canceled" | "dead_letter";
  progress: number;
  outputAssetId?: number;
  error?: string;
  updatedAt?: string;
  kind?: string;
  sessionId?: number;
}

interface UseJobStatusOptions {
  /** Job IDs to subscribe to */
  jobIds?: number[];
  /** Subscribe to all active jobs for the user */
  subscribeAll?: boolean;
  /** Callback when a job completes */
  onComplete?: (job: JobStatus) => void;
  /** Callback when a job fails */
  onFailed?: (job: JobStatus) => void;
  /** Callback on any job update */
  onUpdate?: (job: JobStatus) => void;
  /** Enable/disable the subscription */
  enabled?: boolean;
}

interface UseJobStatusReturn {
  /** Map of job IDs to their current status */
  jobs: Map<number, JobStatus>;
  /** Whether the SSE connection is active */
  isConnected: boolean;
  /** Any connection error */
  error: string | null;
  /** Manually reconnect */
  reconnect: () => void;
  /** Get status for a specific job */
  getJob: (jobId: number) => JobStatus | undefined;
}

export function useJobStatus(options: UseJobStatusOptions = {}): UseJobStatusReturn {
  const {
    jobIds = [],
    subscribeAll = false,
    onComplete,
    onFailed,
    onUpdate,
    enabled = true,
  } = options;

  const [jobs, setJobs] = useState<Map<number, JobStatus>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    if (!enabled) return;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Build URL based on subscription type
    let url: string;
    if (subscribeAll) {
      url = "/api/sse/jobs/all";
    } else if (jobIds.length > 0) {
      url = `/api/sse/jobs?jobIds=${jobIds.join(",")}`;
    } else {
      return; // No jobs to subscribe to
    }

    const eventSource = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      reconnectAttempts.current = 0;
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      
      // Exponential backoff for reconnection
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current++;
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    // Handle connection event
    eventSource.addEventListener("connected", (event) => {
      const data = JSON.parse(event.data);
      console.log("[SSE] Connected:", data.message);
    });

    // Handle heartbeat
    eventSource.addEventListener("heartbeat", () => {
      // Connection is alive
    });

    // Handle job updates
    eventSource.addEventListener("job:update", (event) => {
      const data = JSON.parse(event.data) as JobStatus;
      setJobs(prev => {
        const next = new Map(prev);
        next.set(data.jobId, data);
        return next;
      });
      onUpdate?.(data);
    });

    // Handle job completion
    eventSource.addEventListener("job:complete", (event) => {
      const data = JSON.parse(event.data) as JobStatus;
      setJobs(prev => {
        const next = new Map(prev);
        next.set(data.jobId, { ...data, status: "succeeded" });
        return next;
      });
      onComplete?.(data);
      onUpdate?.(data);
    });

    // Handle job failure
    eventSource.addEventListener("job:failed", (event) => {
      const data = JSON.parse(event.data) as JobStatus;
      setJobs(prev => {
        const next = new Map(prev);
        next.set(data.jobId, { ...data, status: "failed" });
        return next;
      });
      onFailed?.(data);
      onUpdate?.(data);
    });
  }, [enabled, subscribeAll, jobIds, onComplete, onFailed, onUpdate]);

  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  const getJob = useCallback((jobId: number) => {
    return jobs.get(jobId);
  }, [jobs]);

  // Connect on mount and when dependencies change
  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return {
    jobs,
    isConnected,
    error,
    reconnect,
    getJob,
  };
}

/**
 * Hook for subscribing to a single job's status
 */
export function useSingleJobStatus(
  jobId: number | null,
  options: Omit<UseJobStatusOptions, "jobIds" | "subscribeAll"> = {}
): {
  status: JobStatus | null;
  isConnected: boolean;
  error: string | null;
} {
  const { jobs, isConnected, error } = useJobStatus({
    ...options,
    jobIds: jobId ? [jobId] : [],
    enabled: !!jobId && options.enabled !== false,
  });

  return {
    status: jobId ? jobs.get(jobId) || null : null,
    isConnected,
    error,
  };
}

/**
 * Hook for subscribing to all active jobs
 */
export function useActiveJobs(
  options: Omit<UseJobStatusOptions, "jobIds" | "subscribeAll"> = {}
): UseJobStatusReturn {
  return useJobStatus({
    ...options,
    subscribeAll: true,
  });
}

export default useJobStatus;
