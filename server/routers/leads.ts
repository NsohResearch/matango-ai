import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { leads } from "../../drizzle/schema";
import { eq, and, desc, like, or, count } from "drizzle-orm";

const stageEnum = z.enum(["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]);

export const leadsRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      stage: stageEnum.optional(),
      limit: z.number().min(1).max(100).optional(),
      offset: z.number().min(0).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { leads: [], total: 0 };

      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const orgId = ctx.user.id;

      // Build conditions
      const conditions: any[] = [eq(leads.organizationId, orgId)];

      if (input?.stage) {
        conditions.push(eq(leads.stage, input.stage));
      }

      if (input?.search) {
        const searchTerm = `%${input.search}%`;
        conditions.push(
          or(
            like(leads.email, searchTerm),
            like(leads.name, searchTerm),
            like(leads.company, searchTerm),
          )
        );
      }

      const rows = await db
        .select()
        .from(leads)
        .where(and(...conditions))
        .orderBy(desc(leads.createdAt))
        .limit(limit)
        .offset(offset);

      const [countResult] = await db
        .select({ total: count() })
        .from(leads)
        .where(and(...conditions));

      return {
        leads: rows,
        total: countResult?.total ?? 0,
      };
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { total: 0, new: 0, contacted: 0, qualified: 0, proposal: 0, negotiation: 0, won: 0, lost: 0, conversionRate: 0 };

    const orgId = ctx.user.id;

    const [totalResult] = await db
      .select({ total: count() })
      .from(leads)
      .where(eq(leads.organizationId, orgId));

    const stageResults = await db
      .select({ stage: leads.stage, cnt: count() })
      .from(leads)
      .where(eq(leads.organizationId, orgId))
      .groupBy(leads.stage);

    const stageMap: Record<string, number> = {};
    for (const r of stageResults) {
      stageMap[r.stage] = r.cnt;
    }

    const total = totalResult?.total ?? 0;
    const won = stageMap["won"] ?? 0;

    return {
      total,
      new: stageMap["new"] ?? 0,
      contacted: stageMap["contacted"] ?? 0,
      qualified: stageMap["qualified"] ?? 0,
      proposal: stageMap["proposal"] ?? 0,
      negotiation: stageMap["negotiation"] ?? 0,
      won,
      lost: stageMap["lost"] ?? 0,
      conversionRate: total > 0 ? Math.round((won / total) * 100) : 0,
    };
  }),

  create: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
      company: z.string().optional(),
      role: z.string().optional(),
      source: z.string().optional(),
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const orgId = ctx.user.id;

      const [result] = await db.insert(leads).values({
        organizationId: orgId,
        email: input.email,
        name: input.name ?? null,
        company: input.company ?? null,
        role: input.role ?? null,
        source: input.source ?? null,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
        notes: input.notes ?? null,
        stage: "new",
      });

      return { id: result.insertId, success: true };
    }),

  updateStage: protectedProcedure
    .input(z.object({
      id: z.number(),
      stage: stageEnum,
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const orgId = ctx.user.id;

      const [lead] = await db
        .select()
        .from(leads)
        .where(and(eq(leads.id, input.id), eq(leads.organizationId, orgId)));

      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }

      await db
        .update(leads)
        .set({ stage: input.stage, lastContactedAt: new Date() })
        .where(eq(leads.id, input.id));

      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      company: z.string().optional(),
      role: z.string().optional(),
      source: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const orgId = ctx.user.id;

      const [lead] = await db
        .select()
        .from(leads)
        .where(and(eq(leads.id, input.id), eq(leads.organizationId, orgId)));

      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }

      const { id, ...updateData } = input;
      const cleanData: Record<string, any> = {};
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          cleanData[key] = value;
        }
      }

      if (Object.keys(cleanData).length > 0) {
        await db
          .update(leads)
          .set(cleanData)
          .where(eq(leads.id, id));
      }

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const orgId = ctx.user.id;

      const [lead] = await db
        .select()
        .from(leads)
        .where(and(eq(leads.id, input.id), eq(leads.organizationId, orgId)));

      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }

      await db.delete(leads).where(eq(leads.id, input.id));

      return { success: true };
    }),
});
