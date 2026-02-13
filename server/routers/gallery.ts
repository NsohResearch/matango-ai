import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { storagePut, storageGet } from "../storage";
import { 
  workflowMediaAssets, 
  workflowSessions,
  workflowAuditLogs,
  type InsertWorkflowMediaAsset 
} from "../../drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

/**
 * Gallery Router - Manage media assets within workflow sessions
 */
export const galleryRouter = router({
  /**
   * Upload a reference image
   */
  uploadReferenceImage: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      base64Data: z.string(),
      mimeType: z.string().regex(/^image\/(jpeg|png|webp|gif)$/),
      filename: z.string().max(255).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      // Verify session ownership
      const sessions = await db
        .select()
        .from(workflowSessions)
        .where(
          and(
            eq(workflowSessions.id, input.sessionId),
            eq(workflowSessions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!sessions.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      // Decode base64 and upload to S3
      const buffer = Buffer.from(input.base64Data, "base64");
      const extension = input.mimeType.split("/")[1];
      const filename = input.filename || `reference-${nanoid()}.${extension}`;
      const s3Key = `users/${ctx.user.id}/sessions/${input.sessionId}/references/${filename}`;

      const { url } = await storagePut(s3Key, buffer, input.mimeType);

      // Save asset record
      const assetData: InsertWorkflowMediaAsset = {
        userId: ctx.user.id,
        sessionId: input.sessionId,
        assetType: "reference_image",
        s3Key,
        url,
        mimeType: input.mimeType,
        sizeBytes: buffer.length,
        status: "ready",
      };

      const [result] = await db.insert(workflowMediaAssets).values(assetData);
      const assetId = result.insertId;

      // Audit log
      await db.insert(workflowAuditLogs).values({
        userId: ctx.user.id,
        action: "workflow.asset.upload",
        entityType: "workflow_media_asset",
        entityId: assetId,
        sessionId: input.sessionId,
        details: { assetType: "reference_image", mimeType: input.mimeType },
      });

      return { id: assetId, url };
    }),

  /**
   * List assets by session
   */
  listAssets: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      types: z.array(z.enum([
        "reference_image",
        "generated_image",
        "generated_video",
        "audio",
        "poster",
        "thumbnail"
      ])).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      // Verify session ownership
      const sessions = await db
        .select()
        .from(workflowSessions)
        .where(
          and(
            eq(workflowSessions.id, input.sessionId),
            eq(workflowSessions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!sessions.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      let query = db
        .select()
        .from(workflowMediaAssets)
        .where(eq(workflowMediaAssets.sessionId, input.sessionId))
        .orderBy(desc(workflowMediaAssets.createdAt));

      if (input.types && input.types.length > 0) {
        query = db
          .select()
          .from(workflowMediaAssets)
          .where(
            and(
              eq(workflowMediaAssets.sessionId, input.sessionId),
              inArray(workflowMediaAssets.assetType, input.types)
            )
          )
          .orderBy(desc(workflowMediaAssets.createdAt));
      }

      return query;
    }),

  /**
   * Get a signed URL for an asset
   */
  getSignedUrl: protectedProcedure
    .input(z.object({ assetId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const assets = await db
        .select()
        .from(workflowMediaAssets)
        .where(
          and(
            eq(workflowMediaAssets.id, input.assetId),
            eq(workflowMediaAssets.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!assets.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" });
      }

      const asset = assets[0];
      
      // If we already have a public URL, return it
      if (asset.url) {
        return { url: asset.url };
      }

      // Otherwise generate a signed URL
      const { url } = await storageGet(asset.s3Key);
      return { url };
    }),

  /**
   * Get asset by ID
   */
  getAsset: protectedProcedure
    .input(z.object({ assetId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const assets = await db
        .select()
        .from(workflowMediaAssets)
        .where(
          and(
            eq(workflowMediaAssets.id, input.assetId),
            eq(workflowMediaAssets.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!assets.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" });
      }

      return assets[0];
    }),

  /**
   * Delete an asset
   */
  deleteAsset: protectedProcedure
    .input(z.object({ assetId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const assets = await db
        .select()
        .from(workflowMediaAssets)
        .where(
          and(
            eq(workflowMediaAssets.id, input.assetId),
            eq(workflowMediaAssets.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!assets.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" });
      }

      const asset = assets[0];

      // Delete from database (S3 cleanup can be done via lifecycle policy)
      await db
        .delete(workflowMediaAssets)
        .where(eq(workflowMediaAssets.id, input.assetId));

      // Audit log
      await db.insert(workflowAuditLogs).values({
        userId: ctx.user.id,
        action: "workflow.asset.delete",
        entityType: "workflow_media_asset",
        entityId: input.assetId,
        sessionId: asset.sessionId,
        details: { assetType: asset.assetType, s3Key: asset.s3Key },
      });

      return { success: true };
    }),
});
