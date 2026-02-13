import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  projectCollaborators,
  projectPresence,
  creatorProjects,
  users,
} from "../../drizzle/schema";
import { eq, desc, and, sql, gt } from "drizzle-orm";

// Generate a random cursor color
function generateCursorColor(): string {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export const collaborationRouter = router({
  // ============================================
  // Collaborators Management
  // ============================================

  // List collaborators for a project
  listCollaborators: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      // Verify user has access to the project
      const [project] = await db
        .select()
        .from(creatorProjects)
        .where(eq(creatorProjects.id, input.projectId));
      
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      
      // Check if user is owner or collaborator
      const isOwner = project.userId === ctx.user.id;
      if (!isOwner) {
        const [collab] = await db
          .select()
          .from(projectCollaborators)
          .where(
            and(
              eq(projectCollaborators.projectId, input.projectId),
              eq(projectCollaborators.userId, ctx.user.id),
              eq(projectCollaborators.status, "accepted")
            )
          );
        if (!collab) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
      }
      
      const collaborators = await db
        .select({
          id: projectCollaborators.id,
          userId: projectCollaborators.userId,
          role: projectCollaborators.role,
          canEdit: projectCollaborators.canEdit,
          canDelete: projectCollaborators.canDelete,
          canInvite: projectCollaborators.canInvite,
          canExport: projectCollaborators.canExport,
          status: projectCollaborators.status,
          invitedAt: projectCollaborators.invitedAt,
          acceptedAt: projectCollaborators.acceptedAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(projectCollaborators)
        .leftJoin(users, eq(projectCollaborators.userId, users.id))
        .where(eq(projectCollaborators.projectId, input.projectId))
        .orderBy(desc(projectCollaborators.createdAt));
      
      return {
        collaborators,
        isOwner,
        ownerId: project.userId,
      };
    }),

  // Invite a collaborator
  invite: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        email: z.string().email(),
        role: z.enum(["editor", "viewer"]).default("viewer"),
        canEdit: z.boolean().default(false),
        canDelete: z.boolean().default(false),
        canInvite: z.boolean().default(false),
        canExport: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      // Verify user owns the project or has invite permission
      const [project] = await db
        .select()
        .from(creatorProjects)
        .where(eq(creatorProjects.id, input.projectId));
      
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      
      const isOwner = project.userId === ctx.user.id;
      if (!isOwner) {
        const [collab] = await db
          .select()
          .from(projectCollaborators)
          .where(
            and(
              eq(projectCollaborators.projectId, input.projectId),
              eq(projectCollaborators.userId, ctx.user.id),
              eq(projectCollaborators.canInvite, true)
            )
          );
        if (!collab) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to invite" });
        }
      }
      
      // Find user by email
      const [invitee] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email));
      
      if (!invitee) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found with that email" });
      }
      
      if (invitee.id === project.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot invite the project owner" });
      }
      
      // Check if already invited
      const [existing] = await db
        .select()
        .from(projectCollaborators)
        .where(
          and(
            eq(projectCollaborators.projectId, input.projectId),
            eq(projectCollaborators.userId, invitee.id)
          )
        );
      
      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "User is already a collaborator" });
      }
      
      await db.insert(projectCollaborators).values({
        projectId: input.projectId,
        userId: invitee.id,
        role: input.role,
        canEdit: input.role === "editor" || input.canEdit,
        canDelete: input.canDelete,
        canInvite: input.canInvite,
        canExport: input.canExport,
        invitedBy: ctx.user.id,
        invitedAt: new Date(),
        status: "pending",
      });
      
      return { success: true, message: "Invitation sent" };
    }),

  // Accept/decline invitation
  respondToInvite: protectedProcedure
    .input(
      z.object({
        collaboratorId: z.number(),
        accept: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      const [collab] = await db
        .select()
        .from(projectCollaborators)
        .where(
          and(
            eq(projectCollaborators.id, input.collaboratorId),
            eq(projectCollaborators.userId, ctx.user.id),
            eq(projectCollaborators.status, "pending")
          )
        );
      
      if (!collab) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" });
      }
      
      await db
        .update(projectCollaborators)
        .set({
          status: input.accept ? "accepted" : "declined",
          acceptedAt: input.accept ? new Date() : null,
        })
        .where(eq(projectCollaborators.id, input.collaboratorId));
      
      return { success: true };
    }),

  // Remove a collaborator
  remove: protectedProcedure
    .input(z.object({ collaboratorId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      const [collab] = await db
        .select()
        .from(projectCollaborators)
        .where(eq(projectCollaborators.id, input.collaboratorId));
      
      if (!collab) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Collaborator not found" });
      }
      
      // Verify user owns the project
      const [project] = await db
        .select()
        .from(creatorProjects)
        .where(eq(creatorProjects.id, collab.projectId));
      
      if (!project || project.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the owner can remove collaborators" });
      }
      
      await db
        .update(projectCollaborators)
        .set({ status: "removed" })
        .where(eq(projectCollaborators.id, input.collaboratorId));
      
      return { success: true };
    }),

  // Get pending invitations for current user
  myInvitations: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    
    const invitations = await db
      .select({
        id: projectCollaborators.id,
        projectId: projectCollaborators.projectId,
        role: projectCollaborators.role,
        invitedAt: projectCollaborators.invitedAt,
        projectName: creatorProjects.title,
        inviterName: users.name,
      })
      .from(projectCollaborators)
      .leftJoin(creatorProjects, eq(projectCollaborators.projectId, creatorProjects.id))
      .leftJoin(users, eq(projectCollaborators.invitedBy, users.id))
      .where(
        and(
          eq(projectCollaborators.userId, ctx.user.id),
          eq(projectCollaborators.status, "pending")
        )
      )
      .orderBy(desc(projectCollaborators.invitedAt));
    
    return invitations;
  }),

  // ============================================
  // Real-time Presence
  // ============================================

  // Join a project session (update presence)
  joinSession: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        sceneId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      // Check if presence record exists
      const [existing] = await db
        .select()
        .from(projectPresence)
        .where(
          and(
            eq(projectPresence.projectId, input.projectId),
            eq(projectPresence.userId, ctx.user.id)
          )
        );
      
      if (existing) {
        // Update existing presence
        await db
          .update(projectPresence)
          .set({
            isOnline: true,
            currentSceneId: input.sceneId,
            lastActiveAt: new Date(),
          })
          .where(eq(projectPresence.id, existing.id));
        
        return { presenceId: existing.id };
      }
      
      // Create new presence
      const [result] = await db.insert(projectPresence).values({
        projectId: input.projectId,
        userId: ctx.user.id,
        isOnline: true,
        currentSceneId: input.sceneId,
        displayName: ctx.user.name || "Anonymous",
        cursorColor: generateCursorColor(),
        lastActiveAt: new Date(),
        sessionStartedAt: new Date(),
      });
      
      return { presenceId: result.insertId };
    }),

  // Leave a project session
  leaveSession: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      await db
        .update(projectPresence)
        .set({ isOnline: false })
        .where(
          and(
            eq(projectPresence.projectId, input.projectId),
            eq(projectPresence.userId, ctx.user.id)
          )
        );
      
      return { success: true };
    }),

  // Update cursor position
  updateCursor: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        x: z.number(),
        y: z.number(),
        sceneId: z.number().optional(),
        selectedElementId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      await db
        .update(projectPresence)
        .set({
          cursorPosition: { x: input.x, y: input.y },
          currentSceneId: input.sceneId,
          selectedElementId: input.selectedElementId,
          lastActiveAt: new Date(),
        })
        .where(
          and(
            eq(projectPresence.projectId, input.projectId),
            eq(projectPresence.userId, ctx.user.id)
          )
        );
      
      return { success: true };
    }),

  // Get active users in a project
  getActiveUsers: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      // Get users active in the last 30 seconds
      const thirtySecondsAgo = new Date(Date.now() - 30000);
      
      const activeUsers = await db
        .select({
          id: projectPresence.id,
          userId: projectPresence.userId,
          displayName: projectPresence.displayName,
          avatarUrl: projectPresence.avatarUrl,
          cursorColor: projectPresence.cursorColor,
          cursorPosition: projectPresence.cursorPosition,
          currentSceneId: projectPresence.currentSceneId,
          selectedElementId: projectPresence.selectedElementId,
          lastActiveAt: projectPresence.lastActiveAt,
        })
        .from(projectPresence)
        .where(
          and(
            eq(projectPresence.projectId, input.projectId),
            eq(projectPresence.isOnline, true),
            gt(projectPresence.lastActiveAt, thirtySecondsAgo)
          )
        );
      
      return activeUsers.filter((u) => u.userId !== ctx.user.id);
    }),

  // Heartbeat to keep presence alive
  heartbeat: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      await db
        .update(projectPresence)
        .set({ lastActiveAt: new Date() })
        .where(
          and(
            eq(projectPresence.projectId, input.projectId),
            eq(projectPresence.userId, ctx.user.id)
          )
        );
      
      return { success: true };
    }),
});
