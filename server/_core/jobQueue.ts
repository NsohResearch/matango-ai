/**
 * Background Job Queue System
 * 
 * Manages async tasks like asset generation, video rendering, and publishing.
 * Uses in-memory queue with persistence support for production.
 */

import { logger } from './logger';
import { withRetry, RetryPresets } from './retry';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead';

export interface Job<T = any> {
  id: string;
  type: string;
  payload: T;
  status: JobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
  userId?: number;
  organizationId?: number;
}

export interface JobHandler<T = any, R = any> {
  (payload: T, job: Job<T>): Promise<R>;
}

interface JobQueueConfig {
  maxConcurrent: number;
  pollInterval: number;
  defaultMaxAttempts: number;
}

const DEFAULT_CONFIG: JobQueueConfig = {
  maxConcurrent: 5,
  pollInterval: 1000,
  defaultMaxAttempts: 3,
};

class JobQueue {
  private jobs: Map<string, Job> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private processing: Set<string> = new Set();
  private config: JobQueueConfig;
  private pollTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(config: Partial<JobQueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a job handler for a specific job type
   */
  registerHandler<T, R>(type: string, handler: JobHandler<T, R>): void {
    this.handlers.set(type, handler as JobHandler);
    logger.info('Job handler registered', { type });
  }

  /**
   * Add a job to the queue
   */
  async enqueue<T>(
    type: string,
    payload: T,
    options: {
      priority?: number;
      maxAttempts?: number;
      userId?: number;
      organizationId?: number;
    } = {}
  ): Promise<Job<T>> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const job: Job<T> = {
      id,
      type,
      payload,
      status: 'pending',
      priority: options.priority || 0,
      attempts: 0,
      maxAttempts: options.maxAttempts || this.config.defaultMaxAttempts,
      createdAt: new Date(),
      userId: options.userId,
      organizationId: options.organizationId,
    };
    
    this.jobs.set(id, job);
    
    logger.info('Job enqueued', {
      jobId: id,
      type,
      userId: options.userId,
    });
    
    return job;
  }

  /**
   * Get a job by ID
   */
  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  /**
   * Get all jobs for a user
   */
  getJobsForUser(userId: number): Job[] {
    return Array.from(this.jobs.values())
      .filter(job => job.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get pending jobs count
   */
  getPendingCount(): number {
    return Array.from(this.jobs.values())
      .filter(job => job.status === 'pending').length;
  }

  /**
   * Start processing jobs
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.poll();
    
    logger.info('Job queue started');
  }

  /**
   * Stop processing jobs
   */
  stop(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    
    logger.info('Job queue stopped');
  }

  /**
   * Poll for pending jobs
   */
  private poll(): void {
    if (!this.isRunning) return;
    
    this.processNextJobs();
    
    this.pollTimer = setTimeout(() => this.poll(), this.config.pollInterval);
  }

  /**
   * Process next available jobs
   */
  private async processNextJobs(): Promise<void> {
    const availableSlots = this.config.maxConcurrent - this.processing.size;
    if (availableSlots <= 0) return;
    
    const pendingJobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'pending')
      .sort((a, b) => b.priority - a.priority || a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, availableSlots);
    
    for (const job of pendingJobs) {
      this.processJob(job);
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
    const handler = this.handlers.get(job.type);
    
    if (!handler) {
      logger.error('No handler for job type', { jobId: job.id, type: job.type });
      job.status = 'failed';
      job.error = `No handler registered for job type: ${job.type}`;
      return;
    }
    
    this.processing.add(job.id);
    job.status = 'processing';
    job.startedAt = new Date();
    job.attempts++;
    
    logger.info('Processing job', {
      jobId: job.id,
      type: job.type,
      attempt: job.attempts,
    });
    
    try {
      const result = await handler(job.payload, job);
      
      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;
      
      logger.info('Job completed', {
        jobId: job.id,
        type: job.type,
        durationMs: job.completedAt.getTime() - (job.startedAt?.getTime() || 0),
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      
      if (job.attempts >= job.maxAttempts) {
        job.status = 'dead';
        job.error = errorMessage;
        
        logger.error('Job moved to dead letter', {
          jobId: job.id,
          type: job.type,
          attempts: job.attempts,
          error: errorMessage,
        });
      } else {
        job.status = 'pending';
        job.error = errorMessage;
        
        logger.warn('Job failed, will retry', {
          jobId: job.id,
          type: job.type,
          attempt: job.attempts,
          error: errorMessage,
        });
      }
    } finally {
      this.processing.delete(job.id);
    }
  }

  /**
   * Retry a dead job
   */
  retryJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job || job.status !== 'dead') return false;
    
    job.status = 'pending';
    job.attempts = 0;
    job.error = undefined;
    
    logger.info('Job retry requested', { jobId: id });
    return true;
  }

  /**
   * Cancel a pending job
   */
  cancelJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job || job.status !== 'pending') return false;
    
    this.jobs.delete(id);
    logger.info('Job cancelled', { jobId: id });
    return true;
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    dead: number;
  } {
    const jobs = Array.from(this.jobs.values());
    return {
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      dead: jobs.filter(j => j.status === 'dead').length,
    };
  }

  /**
   * Clean up old completed jobs
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAge;
    const toDelete: string[] = [];
    
    this.jobs.forEach((job, id) => {
      if (
        (job.status === 'completed' || job.status === 'dead') &&
        job.createdAt.getTime() < cutoff
      ) {
        toDelete.push(id);
      }
    });
    
    toDelete.forEach(id => this.jobs.delete(id));
    
    if (toDelete.length > 0) {
      logger.info('Cleaned up old jobs', { count: toDelete.length });
    }
    
    return toDelete.length;
  }
}

// Create singleton instance
export const jobQueue = new JobQueue();

// Job type definitions for type safety
export const JobTypes = {
  GENERATE_ASSET: 'generate_asset',
  GENERATE_VIDEO: 'generate_video',
  GENERATE_IMAGE: 'generate_image',
  PUBLISH_CONTENT: 'publish_content',
  AGGREGATE_ANALYTICS: 'aggregate_analytics',
  SEND_NOTIFICATION: 'send_notification',
  PROCESS_WEBHOOK: 'process_webhook',
} as const;

// Start the queue when the module loads
if (process.env.NODE_ENV !== 'test') {
  jobQueue.start();
  
  // Cleanup old jobs every hour
  setInterval(() => jobQueue.cleanup(), 60 * 60 * 1000);
}
