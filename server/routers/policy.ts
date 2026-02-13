import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { 
  workflowInfluencerProfiles, 
  workflowAuditLogs,
  type InsertWorkflowInfluencerProfile 
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Policy Router - Manage influencer profiles and enforce age-gating policies
 */
export const policyRouter = router({
  /**
   * Create or update an influencer profile
   */
  upsertInfluencerProfile: protectedProcedure
    .input(z.object({
      profileId: z.number().optional(), // If provided, update existing
      displayName: z.string().min(1).max(140),
      dateOfBirth: z.string().datetime().optional(),
      ageRange: z.enum([
        "unknown",
        "10_12",
        "13_15",
        "16_17",
        "18_24",
        "25_34",
        "35_44",
        "45_plus"
      ]).optional(),
      avatarUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      // Determine if under 10 based on age range
      const isUnder10 = input.ageRange === "10_12";

      if (input.profileId) {
        // Update existing profile
        const profiles = await db
          .select()
          .from(workflowInfluencerProfiles)
          .where(
            and(
              eq(workflowInfluencerProfiles.id, input.profileId),
              eq(workflowInfluencerProfiles.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!profiles.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
        }

        const updateData: Partial<InsertWorkflowInfluencerProfile> = {
          displayName: input.displayName,
          ageRange: input.ageRange,
          isUnder10,
        };

        if (input.dateOfBirth) {
          updateData.dateOfBirth = new Date(input.dateOfBirth);
        }
        if (input.avatarUrl) {
          updateData.avatarUrl = input.avatarUrl;
        }

        await db
          .update(workflowInfluencerProfiles)
          .set(updateData)
          .where(eq(workflowInfluencerProfiles.id, input.profileId));

        // Audit log
        await db.insert(workflowAuditLogs).values({
          userId: ctx.user.id,
          action: "policy.profile.update",
          entityType: "workflow_influencer_profile",
          entityId: input.profileId,
          details: { displayName: input.displayName, ageRange: input.ageRange, isUnder10 },
        });

        return { id: input.profileId, isUnder10 };
      } else {
        // Create new profile
        const profileData: InsertWorkflowInfluencerProfile = {
          userId: ctx.user.id,
          displayName: input.displayName,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
          ageRange: input.ageRange || "unknown",
          isUnder10,
          avatarUrl: input.avatarUrl,
          isActive: true,
        };

        const [result] = await db.insert(workflowInfluencerProfiles).values(profileData);
        const profileId = result.insertId;

        // Audit log
        await db.insert(workflowAuditLogs).values({
          userId: ctx.user.id,
          action: "policy.profile.create",
          entityType: "workflow_influencer_profile",
          entityId: profileId,
          details: { displayName: input.displayName, ageRange: input.ageRange, isUnder10 },
        });

        return { id: profileId, isUnder10 };
      }
    }),

  /**
   * Assert that an influencer profile is not under 10 (policy check)
   */
  assertNotUnder10: protectedProcedure
    .input(z.object({ profileId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const profiles = await db
        .select()
        .from(workflowInfluencerProfiles)
        .where(
          and(
            eq(workflowInfluencerProfiles.id, input.profileId),
            eq(workflowInfluencerProfiles.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!profiles.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      }

      const profile = profiles[0];

      if (profile.isUnder10) {
        // Log policy violation attempt
        await db.insert(workflowAuditLogs).values({
          userId: ctx.user.id,
          action: "policy.block_under_10",
          entityType: "workflow_influencer_profile",
          entityId: input.profileId,
          details: { 
            displayName: profile.displayName, 
            ageRange: profile.ageRange,
            stage: "api.assertion"
          },
        });

        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "Policy violation: Influencers under 10 years old are not allowed for video generation." 
        });
      }

      return { allowed: true, profileId: input.profileId };
    }),

  /**
   * Get an influencer profile
   */
  getProfile: protectedProcedure
    .input(z.object({ profileId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const profiles = await db
        .select()
        .from(workflowInfluencerProfiles)
        .where(
          and(
            eq(workflowInfluencerProfiles.id, input.profileId),
            eq(workflowInfluencerProfiles.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!profiles.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      }

      return profiles[0];
    }),

  /**
   * List all influencer profiles for the current user
   */
  listProfiles: protectedProcedure
    .input(z.object({
      includeInactive: z.boolean().default(false),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const includeInactive = input?.includeInactive ?? false;

      if (includeInactive) {
        return db
          .select()
          .from(workflowInfluencerProfiles)
          .where(eq(workflowInfluencerProfiles.userId, ctx.user.id));
      }

      return db
        .select()
        .from(workflowInfluencerProfiles)
        .where(
          and(
            eq(workflowInfluencerProfiles.userId, ctx.user.id),
            eq(workflowInfluencerProfiles.isActive, true)
          )
        );
    }),

  /**
   * Deactivate an influencer profile
   */
  deactivateProfile: protectedProcedure
    .input(z.object({ profileId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const profiles = await db
        .select()
        .from(workflowInfluencerProfiles)
        .where(
          and(
            eq(workflowInfluencerProfiles.id, input.profileId),
            eq(workflowInfluencerProfiles.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!profiles.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      }

      await db
        .update(workflowInfluencerProfiles)
        .set({ isActive: false })
        .where(eq(workflowInfluencerProfiles.id, input.profileId));

      // Audit log
      await db.insert(workflowAuditLogs).values({
        userId: ctx.user.id,
        action: "policy.profile.deactivate",
        entityType: "workflow_influencer_profile",
        entityId: input.profileId,
        details: { displayName: profiles[0].displayName },
      });

      return { success: true };
    }),
});
