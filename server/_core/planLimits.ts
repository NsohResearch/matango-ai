/**
 * Plan Limits Enforcement
 * 
 * Enforces usage limits based on subscription plan.
 */

import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { logger } from './logger';

/**
 * Plan limit definitions
 */
export interface PlanLimits {
  assetsPerMonth: number;
  campaignsPerMonth: number;
  videoMinutesPerMonth: number;
  socialConnections: number;
  influencers: number;
  teamMembers: number;
  abTestsPerCampaign: number;
}

/**
 * Plan configurations
 * -1 means unlimited
 */
export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    assetsPerMonth: 20,
    campaignsPerMonth: 3,
    videoMinutesPerMonth: 5,
    socialConnections: 2,
    influencers: 1,
    teamMembers: 1,
    abTestsPerCampaign: 2,
  },
  starter: {
    assetsPerMonth: 300,
    campaignsPerMonth: 30,
    videoMinutesPerMonth: 60,
    socialConnections: 5,
    influencers: 3,
    teamMembers: 3,
    abTestsPerCampaign: 5,
  },
  pro: {
    assetsPerMonth: 1000,
    campaignsPerMonth: 100,
    videoMinutesPerMonth: 300,
    socialConnections: 20,
    influencers: 10,
    teamMembers: 10,
    abTestsPerCampaign: 10,
  },
  agency: {
    assetsPerMonth: 5000,
    campaignsPerMonth: 500,
    videoMinutesPerMonth: 1000,
    socialConnections: 100,
    influencers: 50,
    teamMembers: 50,
    abTestsPerCampaign: 20,
  },
  lifetime: {
    assetsPerMonth: -1,
    campaignsPerMonth: -1,
    videoMinutesPerMonth: -1,
    socialConnections: -1,
    influencers: -1,
    teamMembers: -1,
    abTestsPerCampaign: -1,
  },
};

/**
 * Get limits for a plan
 */
export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan.toLowerCase()] || PLAN_LIMITS.free;
}

/**
 * Check if a limit allows the action
 */
export function isWithinLimit(limit: number, currentUsage: number): boolean {
  if (limit === -1) return true; // Unlimited
  return currentUsage < limit;
}

/**
 * Get current usage for a user/org
 */
export async function getCurrentUsage(
  userId: number,
  organizationId?: number
): Promise<Record<keyof PlanLimits, number>> {
  const db = await getDb();
  
  const usage: Record<keyof PlanLimits, number> = {
    assetsPerMonth: 0,
    campaignsPerMonth: 0,
    videoMinutesPerMonth: 0,
    socialConnections: 0,
    influencers: 0,
    teamMembers: 0,
    abTestsPerCampaign: 0,
  };
  
  if (!db) return usage;
  
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  try {
    // Count assets this month
    const assetsResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM campaign_assets 
            WHERE userId = ? AND createdAt >= ?`,
      args: [userId, startOfMonth],
    } as any);
    usage.assetsPerMonth = (assetsResult as any)[0]?.count || 0;
    
    // Count campaigns this month
    const campaignsResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM unified_campaigns 
            WHERE userId = ? AND createdAt >= ?`,
      args: [userId, startOfMonth],
    } as any);
    usage.campaignsPerMonth = (campaignsResult as any)[0]?.count || 0;
    
    // Count social connections
    const socialResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM social_connections WHERE userId = ?`,
      args: [userId],
    } as any);
    usage.socialConnections = (socialResult as any)[0]?.count || 0;
    
    // Count influencers
    const influencersResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM influencers WHERE userId = ?`,
      args: [userId],
    } as any);
    usage.influencers = (influencersResult as any)[0]?.count || 0;
    
    // Count team members (if org exists)
    if (organizationId) {
      const teamResult = await db.execute({
        sql: `SELECT COUNT(*) as count FROM collaborators WHERE organizationId = ?`,
        args: [organizationId],
      } as any);
      usage.teamMembers = (teamResult as any)[0]?.count || 0;
    }
  } catch (error) {
    logger.error('Failed to get usage', { error: (error as Error).message, userId });
  }
  
  return usage;
}

/**
 * Enforce a plan limit - throws if exceeded
 */
export async function enforcePlanLimit(
  userId: number,
  plan: string,
  limitType: keyof PlanLimits,
  organizationId?: number
): Promise<void> {
  const limits = getPlanLimits(plan);
  const limit = limits[limitType];
  
  // Unlimited
  if (limit === -1) return;
  
  const usage = await getCurrentUsage(userId, organizationId);
  const currentUsage = usage[limitType];
  
  if (currentUsage >= limit) {
    logger.warn('Plan limit exceeded', {
      userId,
      plan,
      limitType,
      limit,
      currentUsage,
    });
    
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `You've reached your ${formatLimitName(limitType)} limit (${limit}). Upgrade your plan to continue.`,
    });
  }
}

/**
 * Format limit name for user-friendly display
 */
function formatLimitName(limitType: keyof PlanLimits): string {
  const names: Record<keyof PlanLimits, string> = {
    assetsPerMonth: 'monthly asset generation',
    campaignsPerMonth: 'monthly campaign',
    videoMinutesPerMonth: 'monthly video minutes',
    socialConnections: 'social connection',
    influencers: 'AI influencer',
    teamMembers: 'team member',
    abTestsPerCampaign: 'A/B test',
  };
  return names[limitType];
}

/**
 * Get usage summary for display
 */
export async function getUsageSummary(
  userId: number,
  plan: string,
  organizationId?: number
): Promise<{
  limits: PlanLimits;
  usage: Record<keyof PlanLimits, number>;
  percentages: Record<keyof PlanLimits, number>;
}> {
  const limits = getPlanLimits(plan);
  const usage = await getCurrentUsage(userId, organizationId);
  
  const percentages: Record<keyof PlanLimits, number> = {} as any;
  
  for (const key of Object.keys(limits) as (keyof PlanLimits)[]) {
    if (limits[key] === -1) {
      percentages[key] = 0; // Unlimited shows as 0%
    } else {
      percentages[key] = Math.round((usage[key] / limits[key]) * 100);
    }
  }
  
  return { limits, usage, percentages };
}
