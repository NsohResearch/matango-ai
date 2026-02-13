/**
 * GDPR Compliance Router
 * 
 * Provides API endpoints for GDPR data export and deletion requests.
 */

import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  createGdprRequest,
  getGdprRequests,
  getPendingGdprRequests,
  processGdprExport,
  processGdprDelete,
} from "./gdprService";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const gdprRouter = router({
  // ============================================================================
  // User-facing endpoints
  // ============================================================================

  /**
   * Request a data export (user can request their own data)
   */
  requestExport: protectedProcedure.mutation(async ({ ctx }) => {
    // Check if there's already a pending request
    const existingRequests = await getGdprRequests(ctx.user.id);
    const pendingExport = existingRequests.find(
      (r: any) => r.requestType === "export" && r.status === "pending"
    );

    if (pendingExport) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You already have a pending export request. Please wait for it to complete.",
      });
    }

    const request = await createGdprRequest(ctx.user.id, "export");

    // Process immediately for small accounts
    // In production, this would be queued for background processing
    const result = await processGdprExport(request.id, ctx.user.id);

    return {
      requestId: request.id,
      status: result.success ? "completed" : "failed",
      downloadUrl: result.downloadUrl,
      expiresAt: result.expiresAt,
      error: result.error,
    };
  }),

  /**
   * Request account deletion (user can request their own deletion)
   */
  requestDeletion: protectedProcedure
    .input(
      z.object({
        confirmEmail: z.string().email(),
        confirmPhrase: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify email matches
      if (input.confirmEmail !== ctx.user.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email confirmation does not match your account email.",
        });
      }

      // Verify confirmation phrase
      if (input.confirmPhrase !== "DELETE MY ACCOUNT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please type 'DELETE MY ACCOUNT' to confirm.",
        });
      }

      // Check if there's already a pending deletion request
      const existingRequests = await getGdprRequests(ctx.user.id);
      const pendingDelete = existingRequests.find(
        (r: any) => r.requestType === "delete" && r.status === "pending"
      );

      if (pendingDelete) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already have a pending deletion request.",
        });
      }

      // Create the deletion request (requires admin approval)
      const request = await createGdprRequest(ctx.user.id, "delete");

      return {
        requestId: request.id,
        status: "pending",
        message:
          "Your deletion request has been submitted. An administrator will review and process it within 30 days as required by GDPR.",
      };
    }),

  /**
   * Get user's own GDPR requests
   */
  myRequests: protectedProcedure.query(async ({ ctx }) => {
    return await getGdprRequests(ctx.user.id);
  }),

  /**
   * Cancel a pending request
   */
  cancelRequest: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify ownership and status
      const result = await db.execute(
        sql`SELECT * FROM data_export_requests WHERE id = ${input.requestId} AND userId = ${ctx.user.id}`
      );
      const request = (result as any)[0]?.[0];

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Request not found.",
        });
      }

      if (request.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending requests can be cancelled.",
        });
      }

      // Cancel the request
      await db.execute(
        sql`UPDATE data_export_requests SET status = 'failed' WHERE id = ${input.requestId}`
      );

      return { success: true };
    }),

  // ============================================================================
  // Admin endpoints
  // ============================================================================

  /**
   * List all pending GDPR requests (admin only)
   */
  listPending: adminProcedure.query(async () => {
    return await getPendingGdprRequests();
  }),

  /**
   * List all GDPR requests with filters (admin only)
   */
  listAll: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
        requestType: z.enum(["export", "delete"]).optional(),
        userId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { requests: [], total: 0 };

      const offset = (input.page - 1) * input.limit;

      let whereClause = "1=1";
      if (input.status) {
        whereClause += ` AND der.status = '${input.status}'`;
      }
      if (input.requestType) {
        whereClause += ` AND der.requestType = '${input.requestType}'`;
      }
      if (input.userId) {
        whereClause += ` AND der.userId = ${input.userId}`;
      }

      const countResult = await db.execute(
        sql.raw(`SELECT COUNT(*) as total FROM data_export_requests der WHERE ${whereClause}`)
      );
      const total = (countResult as any)[0]?.[0]?.total || 0;

      const result = await db.execute(
        sql.raw(`
          SELECT der.*, u.name as userName, u.email as userEmail
          FROM data_export_requests der
          JOIN users u ON der.userId = u.id
          WHERE ${whereClause}
          ORDER BY der.createdAt DESC
          LIMIT ${input.limit} OFFSET ${offset}
        `)
      );

      return {
        requests: (result as any)[0] || [],
        total,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(total / input.limit),
      };
    }),

  /**
   * Process an export request (admin only)
   */
  processExport: adminProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the request
      const result = await db.execute(
        sql`SELECT * FROM data_export_requests WHERE id = ${input.requestId}`
      );
      const request = (result as any)[0]?.[0];

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Request not found.",
        });
      }

      if (request.requestType !== "export") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This is not an export request.",
        });
      }

      if (request.status === "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This request has already been processed.",
        });
      }

      const exportResult = await processGdprExport(
        input.requestId,
        request.userId,
        ctx.user.id
      );

      return exportResult;
    }),

  /**
   * Process a deletion request (admin only)
   */
  processDeletion: adminProcedure
    .input(
      z.object({
        requestId: z.number(),
        confirmDeletion: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.confirmDeletion) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You must confirm the deletion.",
        });
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the request
      const result = await db.execute(
        sql`SELECT * FROM data_export_requests WHERE id = ${input.requestId}`
      );
      const request = (result as any)[0]?.[0];

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Request not found.",
        });
      }

      if (request.requestType !== "delete") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This is not a deletion request.",
        });
      }

      if (request.status === "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This request has already been processed.",
        });
      }

      const deleteResult = await processGdprDelete(
        input.requestId,
        request.userId,
        ctx.user.id
      );

      return deleteResult;
    }),

  /**
   * Reject a deletion request (admin only)
   */
  rejectDeletion: adminProcedure
    .input(
      z.object({
        requestId: z.number(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the request
      const result = await db.execute(
        sql`SELECT * FROM data_export_requests WHERE id = ${input.requestId}`
      );
      const request = (result as any)[0]?.[0];

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Request not found.",
        });
      }

      if (request.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending requests can be rejected.",
        });
      }

      // Update status to failed with reason
      await db.execute(
        sql`UPDATE data_export_requests SET 
            status = 'failed',
            processedBy = ${ctx.user.id},
            processedAt = NOW()
            WHERE id = ${input.requestId}`
      );

      return { success: true, reason: input.reason };
    }),
});
