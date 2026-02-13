import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { sql } from 'drizzle-orm';
import { getCircuitState } from './circuitBreaker';

/**
 * Health Check Endpoints
 * 
 * Provides /health and /ready endpoints for container orchestration
 * and load balancer health checks.
 */

export const healthRouter = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
}

interface ReadinessStatus {
  status: 'ready' | 'not_ready';
  timestamp: string;
  checks: {
    database: 'ok' | 'failed';
    circuits: {
      [key: string]: 'closed' | 'open' | 'half-open';
    };
  };
}

const startTime = Date.now();
const VERSION = process.env.npm_package_version || '1.0.0';

/**
 * GET /health
 * 
 * Basic health check - returns 200 if the service is running.
 * Used by load balancers for basic availability checks.
 */
healthRouter.get('/health', (req: Request, res: Response) => {
  const response: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: VERSION,
  };
  
  res.json(response);
});

/**
 * GET /ready
 * 
 * Readiness check - verifies all dependencies are available.
 * Used by Kubernetes/container orchestration for traffic routing.
 */
healthRouter.get('/ready', async (req: Request, res: Response) => {
  const checks: ReadinessStatus['checks'] = {
    database: 'failed',
    circuits: {},
  };
  
  let isReady = true;
  
  // Check database connection
  try {
    const db = await getDb();
    if (db) {
      await db.execute(sql`SELECT 1`);
      checks.database = 'ok';
    } else {
      checks.database = 'failed';
      isReady = false;
    }
  } catch (error) {
    checks.database = 'failed';
    isReady = false;
  }
  
  // Check circuit breaker states
  const circuitNames = [
    'forge-llm',
    'forge-image',
    'forge-video',
    'social-twitter',
    'social-linkedin',
  ];
  
  for (const name of circuitNames) {
    const state = getCircuitState(name);
    checks.circuits[name] = state.state;
    
    // Service is degraded if any circuit is open
    if (state.state === 'open') {
      // Don't fail readiness for open circuits, just report
    }
  }
  
  const response: ReadinessStatus = {
    status: isReady ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks,
  };
  
  res.status(isReady ? 200 : 503).json(response);
});

/**
 * GET /metrics
 * 
 * Basic metrics endpoint for monitoring.
 * In production, consider using Prometheus client.
 */
healthRouter.get('/metrics', (req: Request, res: Response) => {
  const metrics = {
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    memory_total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    circuits: {} as Record<string, any>,
  };
  
  // Add circuit breaker metrics
  const circuitNames = [
    'forge-llm',
    'forge-image',
    'forge-video',
    'social-twitter',
    'social-linkedin',
  ];
  
  for (const name of circuitNames) {
    const state = getCircuitState(name);
    metrics.circuits[name] = {
      state: state.state,
      failures: state.failures,
      successes: state.successes,
    };
  }
  
  res.json(metrics);
});
