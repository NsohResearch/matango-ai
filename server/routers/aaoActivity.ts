import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  aaoActivityLog,
  aaoDailyStats,
  influencers,
} from "../../drizzle/schema";
import { eq, desc, and, sql, gte, lte, between } from "drizzle-orm";

export const aaoActivityRouter = router({
  // ============================================
  // Activity Logging
  // ============================================

  // Log an AAO activity
  logActivity: protectedProcedure
    .input(
      z.object({
        influencerId: z.number().optional(),
        activityType: z.enum([
          "content_generation",
          "content_publishing",
          "engagement_response",
          "analytics_processing",
          "lead_capture",
          "campaign_optimization",
          "brand_brain_update",
          "video_rendering",
          "image_generation",
          "scheduling",
          "other",
        ]),
        title: z.string().max(255),
        description: z.string().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
        status: z.enum(["started", "in_progress", "completed", "failed"]).default("started"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      const [result] = await db.insert(aaoActivityLog).values({
        userId: ctx.user.id,
        influencerId: input.influencerId,
        activityType: input.activityType,
        title: input.title,
        description: input.description,
        metadata: input.metadata,
        status: input.status,
        startedAt: new Date(),
      });
      
      return { id: result.insertId };
    }),

  // Update activity status
  updateActivity: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["started", "in_progress", "completed", "failed"]),
        errorMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      const [activity] = await db
        .select()
        .from(aaoActivityLog)
        .where(
          and(
            eq(aaoActivityLog.id, input.id),
            eq(aaoActivityLog.userId, ctx.user.id)
          )
        );
      
      if (!activity) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Activity not found" });
      }
      
      const updateData: any = { status: input.status };
      
      if (input.status === "completed" || input.status === "failed") {
        updateData.completedAt = new Date();
        updateData.durationMs = Date.now() - activity.startedAt.getTime();
      }
      
      if (input.errorMessage) {
        updateData.errorMessage = input.errorMessage;
      }
      
      await db
        .update(aaoActivityLog)
        .set(updateData)
        .where(eq(aaoActivityLog.id, input.id));
      
      // Update daily stats if completed
      if (input.status === "completed") {
        await updateDailyStats(db, ctx.user.id, activity.activityType);
      }
      
      return { success: true };
    }),

  // ============================================
  // Activity Feed
  // ============================================

  // Get recent activities
  getRecentActivities: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
        activityType: z.string().optional(),
        status: z.enum(["started", "in_progress", "completed", "failed"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      const conditions = [eq(aaoActivityLog.userId, ctx.user.id)];
      
      if (input.activityType) {
        conditions.push(eq(aaoActivityLog.activityType, input.activityType as any));
      }
      
      if (input.status) {
        conditions.push(eq(aaoActivityLog.status, input.status));
      }
      
      const activities = await db
        .select({
          id: aaoActivityLog.id,
          influencerId: aaoActivityLog.influencerId,
          activityType: aaoActivityLog.activityType,
          title: aaoActivityLog.title,
          description: aaoActivityLog.description,
          status: aaoActivityLog.status,
          startedAt: aaoActivityLog.startedAt,
          completedAt: aaoActivityLog.completedAt,
          durationMs: aaoActivityLog.durationMs,
          influencerName: influencers.name,
        })
        .from(aaoActivityLog)
        .leftJoin(influencers, eq(aaoActivityLog.influencerId, influencers.id))
        .where(and(...conditions))
        .orderBy(desc(aaoActivityLog.startedAt))
        .limit(input.limit)
        .offset(input.offset);
      
      return activities;
    }),

  // Get currently running activities
  getActiveActivities: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    
    const activities = await db
      .select({
        id: aaoActivityLog.id,
        influencerId: aaoActivityLog.influencerId,
        activityType: aaoActivityLog.activityType,
        title: aaoActivityLog.title,
        description: aaoActivityLog.description,
        status: aaoActivityLog.status,
        startedAt: aaoActivityLog.startedAt,
        influencerName: influencers.name,
      })
      .from(aaoActivityLog)
      .leftJoin(influencers, eq(aaoActivityLog.influencerId, influencers.id))
      .where(
        and(
          eq(aaoActivityLog.userId, ctx.user.id),
          sql`${aaoActivityLog.status} IN ('started', 'in_progress')`
        )
      )
      .orderBy(desc(aaoActivityLog.startedAt))
      .limit(10);
    
    return activities;
  }),

  // ============================================
  // Statistics
  // ============================================

  // Get today's stats
  getTodayStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [stats] = await db
      .select()
      .from(aaoDailyStats)
      .where(
        and(
          eq(aaoDailyStats.userId, ctx.user.id),
          gte(aaoDailyStats.date, today)
        )
      );
    
    if (!stats) {
      return {
        contentGenerated: 0,
        contentPublished: 0,
        engagementsHandled: 0,
        leadsCapture: 0,
        analyticsProcessed: 0,
        videosRendered: 0,
        imagesGenerated: 0,
        totalActiveMinutes: 0,
      };
    }
    
    return stats;
  }),

  // Get stats for a date range
  getStatsRange: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      const stats = await db
        .select()
        .from(aaoDailyStats)
        .where(
          and(
            eq(aaoDailyStats.userId, ctx.user.id),
            between(aaoDailyStats.date, startDate, endDate)
          )
        )
        .orderBy(aaoDailyStats.date);
      
      return stats;
    }),

  // Get weekly summary
  getWeeklySummary: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    
    const [summary] = await db
      .select({
        totalContentGenerated: sql<number>`SUM(contentGenerated)`,
        totalContentPublished: sql<number>`SUM(contentPublished)`,
        totalEngagements: sql<number>`SUM(engagementsHandled)`,
        totalLeads: sql<number>`SUM(leadsCapture)`,
        totalVideos: sql<number>`SUM(videosRendered)`,
        totalImages: sql<number>`SUM(imagesGenerated)`,
        totalActiveMinutes: sql<number>`SUM(totalActiveMinutes)`,
        daysActive: sql<number>`COUNT(DISTINCT DATE(date))`,
      })
      .from(aaoDailyStats)
      .where(
        and(
          eq(aaoDailyStats.userId, ctx.user.id),
          gte(aaoDailyStats.date, weekAgo)
        )
      );
    
    return {
      totalContentGenerated: summary?.totalContentGenerated || 0,
      totalContentPublished: summary?.totalContentPublished || 0,
      totalEngagements: summary?.totalEngagements || 0,
      totalLeads: summary?.totalLeads || 0,
      totalVideos: summary?.totalVideos || 0,
      totalImages: summary?.totalImages || 0,
      totalActiveMinutes: summary?.totalActiveMinutes || 0,
      daysActive: summary?.daysActive || 0,
    };
  }),

  // Get activity breakdown by type
  getActivityBreakdown: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(7),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);
      startDate.setHours(0, 0, 0, 0);
      
      const breakdown = await db
        .select({
          activityType: aaoActivityLog.activityType,
          count: sql<number>`COUNT(*)`,
          completed: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
          failed: sql<number>`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)`,
          avgDurationMs: sql<number>`AVG(durationMs)`,
        })
        .from(aaoActivityLog)
        .where(
          and(
            eq(aaoActivityLog.userId, ctx.user.id),
            gte(aaoActivityLog.startedAt, startDate)
          )
        )
        .groupBy(aaoActivityLog.activityType);
      
      return breakdown;
    }),
});

// Helper function to update daily stats
async function updateDailyStats(db: any, userId: number, activityType: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if stats exist for today
  const [existing] = await db
    .select()
    .from(aaoDailyStats)
    .where(
      and(
        eq(aaoDailyStats.userId, userId),
        gte(aaoDailyStats.date, today)
      )
    );
  
  const incrementField = getIncrementField(activityType);
  
  if (existing) {
    // Update existing stats
    await db
      .update(aaoDailyStats)
      .set({
        [incrementField]: sql`${aaoDailyStats[incrementField as keyof typeof aaoDailyStats]} + 1`,
      })
      .where(eq(aaoDailyStats.id, existing.id));
  } else {
    // Create new stats for today
    const newStats: any = {
      userId,
      date: today,
      [incrementField]: 1,
    };
    await db.insert(aaoDailyStats).values(newStats);
  }
}

function getIncrementField(activityType: string): string {
  const mapping: Record<string, string> = {
    content_generation: "contentGenerated",
    content_publishing: "contentPublished",
    engagement_response: "engagementsHandled",
    lead_capture: "leadsCapture",
    analytics_processing: "analyticsProcessed",
    video_rendering: "videosRendered",
    image_generation: "imagesGenerated",
  };
  return mapping[activityType] || "contentGenerated";
}
