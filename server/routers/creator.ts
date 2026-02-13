import { z } from "zod";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  creatorProjects,
  creatorFolders,
  creatorScenes,
  creatorSceneElements,
  creatorAvatars,
  creatorAssets,
  creatorTemplates,
  creatorVoices,
  creatorExportJobs,
  creatorUsage,
} from "../../drizzle/schema";

// ============================================
// Creator OS Router - Video Studio Pro
// ============================================

export const creatorRouter = router({
  // ============================================
  // PROJECTS
  // ============================================
  
  projects: router({
    list: protectedProcedure
      .input(z.object({
        folderId: z.number().optional(),
        status: z.enum(["draft", "editing", "rendering", "completed", "archived"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const conditions = [eq(creatorProjects.userId, ctx.user.id)];
        
        if (input?.folderId) {
          conditions.push(eq(creatorProjects.folderId, input.folderId));
        }
        if (input?.status) {
          conditions.push(eq(creatorProjects.status, input.status));
        }
        
        const projects = await db
          .select()
          .from(creatorProjects)
          .where(and(...conditions))
          .orderBy(desc(creatorProjects.updatedAt))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0);
        
        return projects;
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [project] = await db
          .select()
          .from(creatorProjects)
          .where(and(
            eq(creatorProjects.id, input.id),
            eq(creatorProjects.userId, ctx.user.id)
          ));
        
        if (!project) {
          throw new Error("Project not found");
        }
        
        // Get scenes for this project
        const scenes = await db
          .select()
          .from(creatorScenes)
          .where(eq(creatorScenes.projectId, input.id))
          .orderBy(asc(creatorScenes.order));
        
        return { ...project, scenes };
      }),
    
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        folderId: z.number().optional(),
        aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:5"]).default("16:9"),
        resolution: z.enum(["720p", "1080p", "4k"]).default("1080p"),
        frameRate: z.number().min(24).max(60).default(30),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [result] = await db.insert(creatorProjects).values({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
          folderId: input.folderId,
          aspectRatio: input.aspectRatio,
          resolution: input.resolution,
          frameRate: input.frameRate,
          status: "draft",
        });
        
        const projectId = result.insertId;
        
        // Create initial scene
        await db.insert(creatorScenes).values({
          projectId: Number(projectId),
          title: "Scene 1",
          order: 0,
          duration: 5000,
          backgroundType: "color",
          backgroundValue: "#1a1a2e",
          transitionType: "fade",
          transitionDuration: 500,
        });
        
        return { id: Number(projectId) };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        folderId: z.number().nullable().optional(),
        aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:5"]).optional(),
        resolution: z.enum(["720p", "1080p", "4k"]).optional(),
        frameRate: z.number().min(24).max(60).optional(),
        status: z.enum(["draft", "editing", "rendering", "completed", "archived"]).optional(),
        thumbnailUrl: z.string().optional(),
        totalDuration: z.number().optional(),
        tags: z.array(z.string()).optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { id, ...updateData } = input;
        
        await db
          .update(creatorProjects)
          .set(updateData)
          .where(and(
            eq(creatorProjects.id, id),
            eq(creatorProjects.userId, ctx.user.id)
          ));
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Delete all scenes and elements first
        const scenes = await db
          .select({ id: creatorScenes.id })
          .from(creatorScenes)
          .where(eq(creatorScenes.projectId, input.id));
        
        for (const scene of scenes) {
          await db.delete(creatorSceneElements).where(eq(creatorSceneElements.sceneId, scene.id));
        }
        
        await db.delete(creatorScenes).where(eq(creatorScenes.projectId, input.id));
        
        // Delete the project
        await db
          .delete(creatorProjects)
          .where(and(
            eq(creatorProjects.id, input.id),
            eq(creatorProjects.userId, ctx.user.id)
          ));
        
        return { success: true };
      }),
    
    duplicate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Get original project
        const [original] = await db
          .select()
          .from(creatorProjects)
          .where(and(
            eq(creatorProjects.id, input.id),
            eq(creatorProjects.userId, ctx.user.id)
          ));
        
        if (!original) {
          throw new Error("Project not found");
        }
        
        // Create new project
        const [result] = await db.insert(creatorProjects).values({
          userId: ctx.user.id,
          title: `${original.title} (Copy)`,
          description: original.description,
          folderId: original.folderId,
          aspectRatio: original.aspectRatio,
          resolution: original.resolution,
          frameRate: original.frameRate,
          totalDuration: original.totalDuration,
          status: "draft",
          tags: original.tags,
          metadata: original.metadata,
        });
        
        const newProjectId = Number(result.insertId);
        
        // Copy scenes
        const scenes = await db
          .select()
          .from(creatorScenes)
          .where(eq(creatorScenes.projectId, input.id))
          .orderBy(asc(creatorScenes.order));
        
        for (const scene of scenes) {
          const [sceneResult] = await db.insert(creatorScenes).values({
            projectId: newProjectId,
            title: scene.title,
            order: scene.order,
            duration: scene.duration,
            backgroundType: scene.backgroundType,
            backgroundValue: scene.backgroundValue,
            avatarId: scene.avatarId,
            avatarPosition: scene.avatarPosition,
            script: scene.script,
            voiceId: scene.voiceId,
            audioUrl: scene.audioUrl,
            transitionType: scene.transitionType,
            transitionDuration: scene.transitionDuration,
            animation: scene.animation,
          });
          
          const newSceneId = Number(sceneResult.insertId);
          
          // Copy elements
          const elements = await db
            .select()
            .from(creatorSceneElements)
            .where(eq(creatorSceneElements.sceneId, scene.id));
          
          for (const element of elements) {
            await db.insert(creatorSceneElements).values({
              sceneId: newSceneId,
              elementType: element.elementType,
              x: element.x,
              y: element.y,
              width: element.width,
              height: element.height,
              rotation: element.rotation,
              zIndex: element.zIndex,
              content: element.content,
              style: element.style,
              animation: element.animation,
              startTime: element.startTime,
              endTime: element.endTime,
            });
          }
        }
        
        return { id: newProjectId };
      }),
  }),
  
  // ============================================
  // FOLDERS
  // ============================================
  
  folders: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const folders = await db
          .select()
          .from(creatorFolders)
          .where(eq(creatorFolders.userId, ctx.user.id))
          .orderBy(asc(creatorFolders.name));
        
        return folders;
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        parentId: z.number().optional(),
        color: z.string().max(7).optional(),
        icon: z.string().max(50).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [result] = await db.insert(creatorFolders).values({
          userId: ctx.user.id,
          name: input.name,
          parentId: input.parentId,
          color: input.color,
          icon: input.icon,
        });
        
        return { id: Number(result.insertId) };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        parentId: z.number().nullable().optional(),
        color: z.string().max(7).optional(),
        icon: z.string().max(50).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { id, ...updateData } = input;
        
        await db
          .update(creatorFolders)
          .set(updateData)
          .where(and(
            eq(creatorFolders.id, id),
            eq(creatorFolders.userId, ctx.user.id)
          ));
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Move projects in this folder to root
        await db
          .update(creatorProjects)
          .set({ folderId: null })
          .where(and(
            eq(creatorProjects.folderId, input.id),
            eq(creatorProjects.userId, ctx.user.id)
          ));
        
        // Delete the folder
        await db
          .delete(creatorFolders)
          .where(and(
            eq(creatorFolders.id, input.id),
            eq(creatorFolders.userId, ctx.user.id)
          ));
        
        return { success: true };
      }),
  }),
  
  // ============================================
  // SCENES
  // ============================================
  
  scenes: router({
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [scene] = await db
          .select()
          .from(creatorScenes)
          .where(eq(creatorScenes.id, input.id));
        
        if (!scene) {
          throw new Error("Scene not found");
        }
        
        // Verify ownership through project
        const [project] = await db
          .select()
          .from(creatorProjects)
          .where(and(
            eq(creatorProjects.id, scene.projectId),
            eq(creatorProjects.userId, ctx.user.id)
          ));
        
        if (!project) {
          throw new Error("Scene not found");
        }
        
        // Get elements for this scene
        const elements = await db
          .select()
          .from(creatorSceneElements)
          .where(eq(creatorSceneElements.sceneId, input.id))
          .orderBy(asc(creatorSceneElements.zIndex));
        
        return { ...scene, elements };
      }),
    
    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        title: z.string().max(255).optional(),
        duration: z.number().min(1000).max(300000).default(5000),
        backgroundType: z.enum(["color", "image", "video", "gradient"]).default("color"),
        backgroundValue: z.string().optional(),
        avatarId: z.number().optional(),
        avatarPosition: z.object({
          x: z.number(),
          y: z.number(),
          scale: z.number(),
        }).optional(),
        script: z.string().optional(),
        voiceId: z.number().optional(),
        transitionType: z.enum(["none", "fade", "dissolve", "slide_left", "slide_right", "zoom"]).default("fade"),
        transitionDuration: z.number().min(0).max(2000).default(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Verify project ownership
        const [project] = await db
          .select()
          .from(creatorProjects)
          .where(and(
            eq(creatorProjects.id, input.projectId),
            eq(creatorProjects.userId, ctx.user.id)
          ));
        
        if (!project) {
          throw new Error("Project not found");
        }
        
        // Get next order
        const [maxOrder] = await db
          .select({ maxOrder: sql<number>`MAX(\`order\`)` })
          .from(creatorScenes)
          .where(eq(creatorScenes.projectId, input.projectId));
        
        const nextOrder = (maxOrder?.maxOrder ?? -1) + 1;
        
        const [result] = await db.insert(creatorScenes).values({
          projectId: input.projectId,
          title: input.title || `Scene ${nextOrder + 1}`,
          order: nextOrder,
          duration: input.duration,
          backgroundType: input.backgroundType,
          backgroundValue: input.backgroundValue || "#1a1a2e",
          avatarId: input.avatarId,
          avatarPosition: input.avatarPosition,
          script: input.script,
          voiceId: input.voiceId,
          transitionType: input.transitionType,
          transitionDuration: input.transitionDuration,
        });
        
        // Update project total duration
        const scenes = await db
          .select({ duration: creatorScenes.duration })
          .from(creatorScenes)
          .where(eq(creatorScenes.projectId, input.projectId));
        
        const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
        await db
          .update(creatorProjects)
          .set({ totalDuration })
          .where(eq(creatorProjects.id, input.projectId));
        
        return { id: Number(result.insertId) };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().max(255).optional(),
        duration: z.number().min(1000).max(300000).optional(),
        backgroundType: z.enum(["color", "image", "video", "gradient"]).optional(),
        backgroundValue: z.string().optional(),
        avatarId: z.number().nullable().optional(),
        avatarPosition: z.object({
          x: z.number(),
          y: z.number(),
          scale: z.number(),
        }).nullable().optional(),
        script: z.string().optional(),
        voiceId: z.number().nullable().optional(),
        audioUrl: z.string().optional(),
        transitionType: z.enum(["none", "fade", "dissolve", "slide_left", "slide_right", "zoom"]).optional(),
        transitionDuration: z.number().min(0).max(2000).optional(),
        animation: z.object({
          entrance: z.string().optional(),
          exit: z.string().optional(),
          entranceDuration: z.number().optional(),
          exitDuration: z.number().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { id, ...updateData } = input;
        
        // Get scene and verify ownership
        const [scene] = await db
          .select()
          .from(creatorScenes)
          .where(eq(creatorScenes.id, id));
        
        if (!scene) {
          throw new Error("Scene not found");
        }
        
        const [project] = await db
          .select()
          .from(creatorProjects)
          .where(and(
            eq(creatorProjects.id, scene.projectId),
            eq(creatorProjects.userId, ctx.user.id)
          ));
        
        if (!project) {
          throw new Error("Scene not found");
        }
        
        await db
          .update(creatorScenes)
          .set(updateData)
          .where(eq(creatorScenes.id, id));
        
        // Update project total duration if duration changed
        if (input.duration) {
          const scenes = await db
            .select({ duration: creatorScenes.duration })
            .from(creatorScenes)
            .where(eq(creatorScenes.projectId, scene.projectId));
          
          const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
          await db
            .update(creatorProjects)
            .set({ totalDuration })
            .where(eq(creatorProjects.id, scene.projectId));
        }
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Get scene and verify ownership
        const [scene] = await db
          .select()
          .from(creatorScenes)
          .where(eq(creatorScenes.id, input.id));
        
        if (!scene) {
          throw new Error("Scene not found");
        }
        
        const [project] = await db
          .select()
          .from(creatorProjects)
          .where(and(
            eq(creatorProjects.id, scene.projectId),
            eq(creatorProjects.userId, ctx.user.id)
          ));
        
        if (!project) {
          throw new Error("Scene not found");
        }
        
        // Delete elements first
        await db.delete(creatorSceneElements).where(eq(creatorSceneElements.sceneId, input.id));
        
        // Delete scene
        await db.delete(creatorScenes).where(eq(creatorScenes.id, input.id));
        
        // Reorder remaining scenes
        const remainingScenes = await db
          .select()
          .from(creatorScenes)
          .where(eq(creatorScenes.projectId, scene.projectId))
          .orderBy(asc(creatorScenes.order));
        
        for (let i = 0; i < remainingScenes.length; i++) {
          await db
            .update(creatorScenes)
            .set({ order: i })
            .where(eq(creatorScenes.id, remainingScenes[i].id));
        }
        
        // Update project total duration
        const totalDuration = remainingScenes.reduce((sum, s) => sum + s.duration, 0);
        await db
          .update(creatorProjects)
          .set({ totalDuration })
          .where(eq(creatorProjects.id, scene.projectId));
        
        return { success: true };
      }),
    
    reorder: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        sceneIds: z.array(z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Verify project ownership
        const [project] = await db
          .select()
          .from(creatorProjects)
          .where(and(
            eq(creatorProjects.id, input.projectId),
            eq(creatorProjects.userId, ctx.user.id)
          ));
        
        if (!project) {
          throw new Error("Project not found");
        }
        
        // Update order for each scene
        for (let i = 0; i < input.sceneIds.length; i++) {
          await db
            .update(creatorScenes)
            .set({ order: i })
            .where(and(
              eq(creatorScenes.id, input.sceneIds[i]),
              eq(creatorScenes.projectId, input.projectId)
            ));
        }
        
        return { success: true };
      }),
  }),
  
  // ============================================
  // SCENE ELEMENTS
  // ============================================
  
  elements: router({
    get: protectedProcedure
      .input(z.object({ sceneId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Verify ownership through scene -> project
        const [scene] = await db
          .select()
          .from(creatorScenes)
          .where(eq(creatorScenes.id, input.sceneId));
        
        if (!scene) {
          throw new Error("Scene not found");
        }
        
        const [project] = await db
          .select()
          .from(creatorProjects)
          .where(and(
            eq(creatorProjects.id, scene.projectId),
            eq(creatorProjects.userId, ctx.user.id)
          ));
        
        if (!project) {
          throw new Error("Scene not found");
        }
        
        const elements = await db
          .select()
          .from(creatorSceneElements)
          .where(eq(creatorSceneElements.sceneId, input.sceneId))
          .orderBy(asc(creatorSceneElements.zIndex));
        
        return elements;
      }),
    
    create: protectedProcedure
      .input(z.object({
        sceneId: z.number(),
        elementType: z.enum(["text", "image", "shape", "video", "audio", "sticker"]),
        x: z.number().default(0),
        y: z.number().default(0),
        width: z.number().default(100),
        height: z.number().default(100),
        rotation: z.number().default(0),
        zIndex: z.number().default(0),
        content: z.string().optional(),
        style: z.object({
          fontFamily: z.string().optional(),
          fontSize: z.number().optional(),
          fontWeight: z.string().optional(),
          color: z.string().optional(),
          backgroundColor: z.string().optional(),
          borderRadius: z.number().optional(),
          borderWidth: z.number().optional(),
          borderColor: z.string().optional(),
          opacity: z.number().optional(),
          shadow: z.string().optional(),
          textAlign: z.string().optional(),
        }).optional(),
        animation: z.object({
          type: z.string().optional(),
          delay: z.number().optional(),
          duration: z.number().optional(),
          easing: z.string().optional(),
        }).optional(),
        startTime: z.number().default(0),
        endTime: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Verify ownership
        const [scene] = await db
          .select()
          .from(creatorScenes)
          .where(eq(creatorScenes.id, input.sceneId));
        
        if (!scene) {
          throw new Error("Scene not found");
        }
        
        const [project] = await db
          .select()
          .from(creatorProjects)
          .where(and(
            eq(creatorProjects.id, scene.projectId),
            eq(creatorProjects.userId, ctx.user.id)
          ));
        
        if (!project) {
          throw new Error("Scene not found");
        }
        
        const [result] = await db.insert(creatorSceneElements).values({
          sceneId: input.sceneId,
          elementType: input.elementType,
          x: input.x,
          y: input.y,
          width: input.width,
          height: input.height,
          rotation: input.rotation,
          zIndex: input.zIndex,
          content: input.content,
          style: input.style,
          animation: input.animation,
          startTime: input.startTime,
          endTime: input.endTime,
        });
        
        return { id: Number(result.insertId) };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        x: z.number().optional(),
        y: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        rotation: z.number().optional(),
        zIndex: z.number().optional(),
        content: z.string().optional(),
        style: z.object({
          fontFamily: z.string().optional(),
          fontSize: z.number().optional(),
          fontWeight: z.string().optional(),
          color: z.string().optional(),
          backgroundColor: z.string().optional(),
          borderRadius: z.number().optional(),
          borderWidth: z.number().optional(),
          borderColor: z.string().optional(),
          opacity: z.number().optional(),
          shadow: z.string().optional(),
          textAlign: z.string().optional(),
        }).optional(),
        animation: z.object({
          type: z.string().optional(),
          delay: z.number().optional(),
          duration: z.number().optional(),
          easing: z.string().optional(),
        }).optional(),
        startTime: z.number().optional(),
        endTime: z.number().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { id, ...updateData } = input;
        
        // Get element and verify ownership
        const [element] = await db
          .select()
          .from(creatorSceneElements)
          .where(eq(creatorSceneElements.id, id));
        
        if (!element) {
          throw new Error("Element not found");
        }
        
        const [scene] = await db
          .select()
          .from(creatorScenes)
          .where(eq(creatorScenes.id, element.sceneId));
        
        if (!scene) {
          throw new Error("Element not found");
        }
        
        const [project] = await db
          .select()
          .from(creatorProjects)
          .where(and(
            eq(creatorProjects.id, scene.projectId),
            eq(creatorProjects.userId, ctx.user.id)
          ));
        
        if (!project) {
          throw new Error("Element not found");
        }
        
        await db
          .update(creatorSceneElements)
          .set(updateData)
          .where(eq(creatorSceneElements.id, id));
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Get element and verify ownership
        const [element] = await db
          .select()
          .from(creatorSceneElements)
          .where(eq(creatorSceneElements.id, input.id));
        
        if (!element) {
          throw new Error("Element not found");
        }
        
        const [scene] = await db
          .select()
          .from(creatorScenes)
          .where(eq(creatorScenes.id, element.sceneId));
        
        if (!scene) {
          throw new Error("Element not found");
        }
        
        const [project] = await db
          .select()
          .from(creatorProjects)
          .where(and(
            eq(creatorProjects.id, scene.projectId),
            eq(creatorProjects.userId, ctx.user.id)
          ));
        
        if (!project) {
          throw new Error("Element not found");
        }
        
        await db.delete(creatorSceneElements).where(eq(creatorSceneElements.id, input.id));
        
        return { success: true };
      }),
  }),
  
  // ============================================
  // AVATARS
  // ============================================
  
  avatars: router({
    list: protectedProcedure
      .input(z.object({
        style: z.enum(["realistic", "cartoon", "anime", "3d", "illustrated"]).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const conditions = [eq(creatorAvatars.userId, ctx.user.id)];
        
        if (input?.style) {
          conditions.push(eq(creatorAvatars.style, input.style));
        }
        
        const avatars = await db
          .select()
          .from(creatorAvatars)
          .where(and(...conditions))
          .orderBy(desc(creatorAvatars.updatedAt));
        
        return avatars;
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        avatarType: z.enum(["ai_generated", "uploaded", "stock", "custom"]).default("ai_generated"),
        imageUrl: z.string(),
        thumbnailUrl: z.string().optional(),
        videoUrl: z.string().optional(),
        style: z.enum(["realistic", "cartoon", "anime", "3d", "illustrated"]).default("realistic"),
        gender: z.enum(["male", "female", "neutral"]).optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [result] = await db.insert(creatorAvatars).values({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          avatarType: input.avatarType,
          imageUrl: input.imageUrl,
          thumbnailUrl: input.thumbnailUrl,
          videoUrl: input.videoUrl,
          style: input.style,
          gender: input.gender,
          tags: input.tags,
        });
        
        return { id: Number(result.insertId) };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        videoUrl: z.string().optional(),
        style: z.enum(["realistic", "cartoon", "anime", "3d", "illustrated"]).optional(),
        gender: z.enum(["male", "female", "neutral"]).optional(),
        tags: z.array(z.string()).optional(),
        isFavorite: z.boolean().optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { id, ...updateData } = input;
        
        // If setting as default, unset other defaults
        if (input.isDefault) {
          await db
            .update(creatorAvatars)
            .set({ isDefault: false })
            .where(eq(creatorAvatars.userId, ctx.user.id));
        }
        
        await db
          .update(creatorAvatars)
          .set(updateData)
          .where(and(
            eq(creatorAvatars.id, id),
            eq(creatorAvatars.userId, ctx.user.id)
          ));
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db
          .delete(creatorAvatars)
          .where(and(
            eq(creatorAvatars.id, input.id),
            eq(creatorAvatars.userId, ctx.user.id)
          ));
        
        return { success: true };
      }),
  }),
  
  // ============================================
  // ASSETS
  // ============================================
  
  assets: router({
    list: protectedProcedure
      .input(z.object({
        assetType: z.enum(["image", "video", "audio", "font", "template"]).optional(),
        category: z.string().optional(),
        isFavorite: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const conditions = [eq(creatorAssets.userId, ctx.user.id)];
        
        if (input?.assetType) {
          conditions.push(eq(creatorAssets.assetType, input.assetType));
        }
        if (input?.category) {
          conditions.push(eq(creatorAssets.category, input.category));
        }
        if (input?.isFavorite !== undefined) {
          conditions.push(eq(creatorAssets.isFavorite, input.isFavorite));
        }
        
        const assets = await db
          .select()
          .from(creatorAssets)
          .where(and(...conditions))
          .orderBy(desc(creatorAssets.updatedAt))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0);
        
        return assets;
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        assetType: z.enum(["image", "video", "audio", "font", "template"]),
        url: z.string(),
        thumbnailUrl: z.string().optional(),
        fileSize: z.number().optional(),
        mimeType: z.string().optional(),
        duration: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [result] = await db.insert(creatorAssets).values({
          userId: ctx.user.id,
          name: input.name,
          assetType: input.assetType,
          url: input.url,
          thumbnailUrl: input.thumbnailUrl,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          duration: input.duration,
          width: input.width,
          height: input.height,
          category: input.category,
          tags: input.tags,
        });
        
        return { id: Number(result.insertId) };
      }),
    
    toggleFavorite: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [asset] = await db
          .select()
          .from(creatorAssets)
          .where(and(
            eq(creatorAssets.id, input.id),
            eq(creatorAssets.userId, ctx.user.id)
          ));
        
        if (!asset) {
          throw new Error("Asset not found");
        }
        
        await db
          .update(creatorAssets)
          .set({ isFavorite: !asset.isFavorite })
          .where(eq(creatorAssets.id, input.id));
        
        return { isFavorite: !asset.isFavorite };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db
          .delete(creatorAssets)
          .where(and(
            eq(creatorAssets.id, input.id),
            eq(creatorAssets.userId, ctx.user.id)
          ));
        
        return { success: true };
      }),
  }),
  
  // ============================================
  // TEMPLATES
  // ============================================
  
  templates: router({
    list: protectedProcedure
      .input(z.object({
        category: z.enum(["product_demo", "social_ad", "explainer", "testimonial", "tutorial", "announcement", "promo", "story", "custom"]).optional(),
        includeSystem: z.boolean().default(true),
      }).optional())
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Get user templates
        const userConditions = [eq(creatorTemplates.userId, ctx.user.id)];
        if (input?.category) {
          userConditions.push(eq(creatorTemplates.category, input.category));
        }
        
        const userTemplates = await db
          .select()
          .from(creatorTemplates)
          .where(and(...userConditions))
          .orderBy(desc(creatorTemplates.updatedAt));
        
        // Get system templates if requested
        let systemTemplates: typeof userTemplates = [];
        if (input?.includeSystem !== false) {
          const systemConditions = [
            eq(creatorTemplates.isSystem, true),
            eq(creatorTemplates.isActive, true),
          ];
          if (input?.category) {
            systemConditions.push(eq(creatorTemplates.category, input.category));
          }
          
          systemTemplates = await db
            .select()
            .from(creatorTemplates)
            .where(and(...systemConditions))
            .orderBy(desc(creatorTemplates.usageCount));
        }
        
        return { userTemplates, systemTemplates };
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        category: z.enum(["product_demo", "social_ad", "explainer", "testimonial", "tutorial", "announcement", "promo", "story", "custom"]).default("custom"),
        templateData: z.object({
          aspectRatio: z.string(),
          resolution: z.string(),
          scenes: z.array(z.object({
            title: z.string().optional(),
            duration: z.number(),
            backgroundType: z.string(),
            backgroundValue: z.string().optional(),
            script: z.string().optional(),
            elements: z.array(z.object({
              elementType: z.string(),
              x: z.number(),
              y: z.number(),
              width: z.number(),
              height: z.number(),
              content: z.string().optional(),
              style: z.record(z.string(), z.any()).optional(),
            })).optional(),
          })),
        }),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const sceneCount = input.templateData.scenes.length;
        const duration = input.templateData.scenes.reduce((sum, s) => sum + s.duration, 0);
        
        const [result] = await db.insert(creatorTemplates).values({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          thumbnailUrl: input.thumbnailUrl,
          category: input.category,
          templateData: input.templateData,
          sceneCount,
          duration,
          tags: input.tags,
          isSystem: false,
        });
        
        return { id: Number(result.insertId) };
      }),
    
    createFromTemplate: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        title: z.string().min(1).max(255),
        folderId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Get template
        const [template] = await db
          .select()
          .from(creatorTemplates)
          .where(eq(creatorTemplates.id, input.templateId));
        
        if (!template) {
          throw new Error("Template not found");
        }
        
        // Increment usage count
        await db
          .update(creatorTemplates)
          .set({ usageCount: (template.usageCount || 0) + 1 })
          .where(eq(creatorTemplates.id, input.templateId));
        
        const templateData = template.templateData as {
          aspectRatio: string;
          resolution: string;
          scenes: Array<{
            title?: string;
            duration: number;
            backgroundType: string;
            backgroundValue?: string;
            script?: string;
            elements?: Array<{
              elementType: string;
              x: number;
              y: number;
              width: number;
              height: number;
              content?: string;
              style?: Record<string, unknown>;
            }>;
          }>;
        };
        
        // Create project from template
        const [projectResult] = await db.insert(creatorProjects).values({
          userId: ctx.user.id,
          title: input.title,
          folderId: input.folderId,
          aspectRatio: (templateData?.aspectRatio as "16:9" | "9:16" | "1:1" | "4:5") || "16:9",
          resolution: (templateData?.resolution as "720p" | "1080p" | "4k") || "1080p",
          frameRate: 30,
          totalDuration: template.duration || 0,
          status: "draft",
        });
        
        const projectId = Number(projectResult.insertId);
        
        // Create scenes from template
        if (templateData?.scenes) {
          for (let i = 0; i < templateData.scenes.length; i++) {
            const sceneData = templateData.scenes[i];
            const [sceneResult] = await db.insert(creatorScenes).values({
              projectId,
              title: sceneData.title || `Scene ${i + 1}`,
              order: i,
              duration: sceneData.duration,
              backgroundType: (sceneData.backgroundType as "color" | "image" | "video" | "gradient") || "color",
              backgroundValue: sceneData.backgroundValue || "#1a1a2e",
              script: sceneData.script,
              transitionType: "fade",
              transitionDuration: 500,
            });
            
            const sceneId = Number(sceneResult.insertId);
            
            // Create elements from template
            if (sceneData.elements) {
              for (const elementData of sceneData.elements) {
                await db.insert(creatorSceneElements).values({
                  sceneId,
                  elementType: elementData.elementType as "text" | "image" | "shape" | "video" | "audio" | "sticker",
                  x: elementData.x,
                  y: elementData.y,
                  width: elementData.width,
                  height: elementData.height,
                  content: elementData.content,
                  style: elementData.style,
                  startTime: 0,
                });
              }
            }
          }
        }
        
        return { id: projectId };
      }),
  }),
  
  // ============================================
  // VOICES
  // ============================================
  
  voices: router({
    list: protectedProcedure
      .input(z.object({
        gender: z.enum(["male", "female", "neutral"]).optional(),
        language: z.string().optional(),
        includeSystem: z.boolean().default(true),
      }).optional())
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Get user voices
        const userConditions = [eq(creatorVoices.userId, ctx.user.id)];
        if (input?.gender) {
          userConditions.push(eq(creatorVoices.gender, input.gender));
        }
        if (input?.language) {
          userConditions.push(eq(creatorVoices.language, input.language));
        }
        
        const userVoices = await db
          .select()
          .from(creatorVoices)
          .where(and(...userConditions));
        
        // Get system voices if requested
        let systemVoices: typeof userVoices = [];
        if (input?.includeSystem !== false) {
          const systemConditions = [
            eq(creatorVoices.isSystem, true),
            eq(creatorVoices.isActive, true),
          ];
          if (input?.gender) {
            systemConditions.push(eq(creatorVoices.gender, input.gender));
          }
          if (input?.language) {
            systemConditions.push(eq(creatorVoices.language, input.language));
          }
          
          systemVoices = await db
            .select()
            .from(creatorVoices)
            .where(and(...systemConditions));
        }
        
        return { userVoices, systemVoices };
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        provider: z.enum(["elevenlabs", "openai", "azure", "google", "custom"]).default("elevenlabs"),
        providerId: z.string(),
        gender: z.enum(["male", "female", "neutral"]).default("neutral"),
        language: z.string().default("en"),
        accent: z.string().optional(),
        style: z.enum(["professional", "casual", "energetic", "calm", "narrative", "conversational"]).default("professional"),
        previewUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [result] = await db.insert(creatorVoices).values({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          provider: input.provider,
          providerId: input.providerId,
          gender: input.gender,
          language: input.language,
          accent: input.accent,
          style: input.style,
          previewUrl: input.previewUrl,
          isSystem: false,
        });
        
        return { id: Number(result.insertId) };
      }),
  }),
  
  // ============================================
  // EXPORT JOBS
  // ============================================
  
  exports: router({
    list: protectedProcedure
      .input(z.object({
        projectId: z.number().optional(),
        status: z.enum(["queued", "processing", "completed", "failed", "cancelled"]).optional(),
        limit: z.number().min(1).max(50).default(20),
      }).optional())
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const conditions = [eq(creatorExportJobs.userId, ctx.user.id)];
        
        if (input?.projectId) {
          conditions.push(eq(creatorExportJobs.projectId, input.projectId));
        }
        if (input?.status) {
          conditions.push(eq(creatorExportJobs.status, input.status));
        }
        
        const jobs = await db
          .select()
          .from(creatorExportJobs)
          .where(and(...conditions))
          .orderBy(desc(creatorExportJobs.createdAt))
          .limit(input?.limit ?? 20);
        
        return jobs;
      }),
    
    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        format: z.enum(["mp4", "webm", "mov", "gif"]).default("mp4"),
        resolution: z.enum(["720p", "1080p", "4k"]).default("1080p"),
        quality: z.enum(["draft", "standard", "high", "ultra"]).default("standard"),
        frameRate: z.number().min(24).max(60).default(30),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Verify project ownership
        const [project] = await db
          .select()
          .from(creatorProjects)
          .where(and(
            eq(creatorProjects.id, input.projectId),
            eq(creatorProjects.userId, ctx.user.id)
          ));
        
        if (!project) {
          throw new Error("Project not found");
        }
        
        const [result] = await db.insert(creatorExportJobs).values({
          userId: ctx.user.id,
          projectId: input.projectId,
          format: input.format,
          resolution: input.resolution,
          quality: input.quality,
          frameRate: input.frameRate,
          status: "queued",
          progress: 0,
        });
        
        return { id: Number(result.insertId) };
      }),
    
    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db
          .update(creatorExportJobs)
          .set({ status: "cancelled" })
          .where(and(
            eq(creatorExportJobs.id, input.id),
            eq(creatorExportJobs.userId, ctx.user.id)
          ));
        
        return { success: true };
      }),
  }),
  
  // ============================================
  // USAGE STATS
  // ============================================
  
  usage: router({
    getStats: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const currentMonth = new Date().toISOString().slice(0, 7);
        
        // Get or create usage record for current month
        let [usage] = await db
          .select()
          .from(creatorUsage)
          .where(and(
            eq(creatorUsage.userId, ctx.user.id),
            eq(creatorUsage.periodMonth, currentMonth)
          ));
        
        if (!usage) {
          const [result] = await db.insert(creatorUsage).values({
            userId: ctx.user.id,
            periodMonth: currentMonth,
          });
          
          [usage] = await db
            .select()
            .from(creatorUsage)
            .where(eq(creatorUsage.id, Number(result.insertId)));
        }
        
        // Get total counts
        const [projectCount] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(creatorProjects)
          .where(eq(creatorProjects.userId, ctx.user.id));
        
        const [avatarCount] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(creatorAvatars)
          .where(eq(creatorAvatars.userId, ctx.user.id));
        
        const [assetCount] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(creatorAssets)
          .where(eq(creatorAssets.userId, ctx.user.id));
        
        return {
          currentMonth: usage,
          totals: {
            projects: projectCount?.count ?? 0,
            avatars: avatarCount?.count ?? 0,
            assets: assetCount?.count ?? 0,
          },
        };
      }),
  }),
});

export type CreatorRouter = typeof creatorRouter;
