import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminRouter } from "./adminRouter";
import { gdprRouter } from "./gdprRouter";
import { kahRouter } from "./kahRouter";
import { creatorRouter } from "./routers/creator";
import { marketplaceRouter } from "./routers/marketplace";
import { collaborationRouter } from "./routers/collaboration";
import { aaoActivityRouter } from "./routers/aaoActivity";
import { accountLifecycleRouter } from "./routers/accountLifecycle";
import { workflowRouter } from "./routers/workflow";
import { scriptsRouter } from "./routers/scripts";
import { galleryRouter } from "./routers/gallery";
import { jobsRouter } from "./routers/jobs";
import { policyRouter } from "./routers/policy";
import { aaoRouter } from "./routers/aao";
import { kahChatRouter } from "./routers/kahChat";
import { aiProvidersRouter } from "./routers/aiProviders";
import { onboardingRouter } from "./routers/onboarding";
import { influencerStudioV2Router } from "./routers/influencerStudioV2";
import { videoStudioV2Router } from "./routers/videoStudioV2";
import { leadsRouter } from "./routers/leads";
import { assetLibraryRouter } from "./routers/assetLibrary";
import { studioEnhancementsRouter } from "./routers/studioEnhancements";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { generateImage } from "./_core/imageGeneration";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { generateAuthUrl, exchangeCodeForTokens, refreshAccessToken, getUserProfile, isPlatformConfigured } from "./_core/socialOAuth";
import { findKahResponse, getKahSystemPrompt } from "./seedKahQA";

// Helper function to generate AI response using real LLM
async function generateAIResponse(
  influencerName: string,
  personality: string,
  userMessage: string,
  chatHistory: { role: string; content: string }[]
): Promise<string> {
  // Check if this is K'ah and we have a pre-defined response
  if (influencerName.toLowerCase() === "k'ah" || influencerName.toLowerCase() === "kah") {
    const kahResponse = findKahResponse(userMessage);
    if (kahResponse) {
      return kahResponse;
    }
    // Use K'ah's special system prompt for LLM fallback
    const kahSystemPrompt = getKahSystemPrompt();
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: kahSystemPrompt },
    ];
    const recentHistory = chatHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }
    messages.push({ role: "user", content: userMessage });
    try {
      const result = await invokeLLM({ messages });
      if (result.choices && result.choices[0]?.message?.content) {
        const content = result.choices[0].message.content;
        return typeof content === "string" ? content : JSON.stringify(content);
      }
      throw new Error("No response from LLM");
    } catch (error) {
      console.error("LLM error for K'ah:", error);
      return "Hey there! I'm K'ah, your marketing guide. I'm here to help you understand marketing and get the most out of Matango.ai. What would you like to know?";
    }
  }

  const systemPrompt = `You are ${influencerName}, an AI influencer with the following personality: ${personality || "friendly, engaging, and authentic"}.

Key traits:
- You are a social media influencer who connects with your audience
- You speak naturally and authentically, using casual language
- You're supportive, positive, and encouraging
- You occasionally use emojis but don't overdo it
- You share relatable experiences and give genuine advice
- You maintain your unique personality throughout conversations
- Keep responses concise (2-4 sentences typically) unless asked for more detail

Remember: You ARE ${influencerName}. Stay in character and engage naturally with your fan.`;

  // Build conversation history for context
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
  ];

  // Add recent chat history (last 10 messages for context)
  const recentHistory = chatHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    });
  }

  // Add the current user message
  messages.push({ role: "user", content: userMessage });

  try {
    const result = await invokeLLM({ messages });
    
    if (result.choices && result.choices[0]?.message?.content) {
      const content = result.choices[0].message.content;
      return typeof content === "string" ? content : JSON.stringify(content);
    }
    
    throw new Error("No response from LLM");
  } catch (error) {
    console.error("LLM error:", error);
    // Fallback response if LLM fails
    return `Hey! Thanks for reaching out! 💕 I'm ${influencerName} and I'm so happy to chat with you. What's on your mind?`;
  }
}

// Helper function to generate content caption using LLM
async function generateCaption(
  influencerName: string,
  personality: string,
  platform: string,
  contentDescription?: string
): Promise<string> {
  const systemPrompt = `You are ${influencerName}, an AI influencer. Generate a ${platform} caption.

Personality: ${personality || "friendly and engaging"}

Guidelines:
- Write in first person as ${influencerName}
- Match the platform's style (${platform})
- Include 2-5 relevant hashtags
- Keep it authentic and engaging
- ${platform === "twitter" ? "Keep under 280 characters" : "Can be longer for engagement"}`;

  const userPrompt = contentDescription 
    ? `Write a caption for this content: ${contentDescription}`
    : `Write an engaging caption for a lifestyle/fashion post`;

  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    
    if (result.choices && result.choices[0]?.message?.content) {
      const content = result.choices[0].message.content;
      return typeof content === "string" ? content : JSON.stringify(content);
    }
    
    return "Living my best life ✨ #influencer #lifestyle";
  } catch (error) {
    console.error("Caption generation error:", error);
    return "Living my best life ✨ #influencer #lifestyle";
  }
}

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,
  gdpr: gdprRouter,
  kah: kahRouter,
  creator: creatorRouter,
  marketplace: marketplaceRouter,
  collaboration: collaborationRouter,
  aaoActivity: aaoActivityRouter,
  accountLifecycle: accountLifecycleRouter,
  workflow: workflowRouter,
  scripts: scriptsRouter,
  gallery: galleryRouter,
  jobs: jobsRouter,
  policy: policyRouter,
  aao: aaoRouter,
  kahChat: kahChatRouter,
  aiProviders: aiProvidersRouter,
  onboarding: onboardingRouter,
  influencerStudioV2: influencerStudioV2Router,
  videoStudioV2: videoStudioV2Router,
  leads: leadsRouter,
  assetLibrary: assetLibraryRouter,
  studioEnhancements: studioEnhancementsRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
      await db.completeUserOnboarding(ctx.user.id);
      return { success: true };
    }),
  }),

  influencer: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getInfluencersByUserId(ctx.user.id);
    }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const influencer = await db.getInfluencerById(input.id);
        if (!influencer) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Influencer not found" });
        }
        return influencer;
      }),

    getPublic: publicProcedure.query(async () => {
      return db.getPublicInfluencers();
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1, "Name is required").max(100, "Name too long"),
        age: z.number().min(18, "Must be at least 18").max(100).optional(),
        bio: z.string().max(500, "Bio too long").optional(),
        personality: z.string().max(1000, "Personality description too long").optional(),
        tags: z.array(z.string().max(50)).max(10).optional(),
        isPublic: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createInfluencer({
          userId: ctx.user.id,
          name: input.name,
          age: input.age,
          bio: input.bio,
          personality: input.personality,
          tags: input.tags || [],
          isPublic: input.isPublic || false,
        });
        
        // Initialize analytics for new influencer
        await db.addAnalyticsData({
          influencerId: id,
          date: new Date(),
          followers: 0,
          followersGain: 0,
          likes: 0,
          views: 0,
          engagementRate: 0,
          postsCount: 0,
        });
        
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        age: z.number().min(18).max(100).optional(),
        bio: z.string().max(500).optional(),
        personality: z.string().max(1000).optional(),
        tags: z.array(z.string()).optional(),
        isPublic: z.boolean().optional(),
        avatarUrl: z.string().url().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const influencer = await db.getInfluencerById(input.id);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Influencer not found or access denied" });
        }
        
        const { id, ...updateData } = input;
        await db.updateInfluencer(id, updateData);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const influencer = await db.getInfluencerById(input.id);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Influencer not found or access denied" });
        }
        
        await db.deleteInfluencer(input.id);
        return { success: true };
      }),
  }),

  ai: router({
    generateAvatar: protectedProcedure
      .input(z.object({
        influencerId: z.number(),
        prompt: z.string().min(10, "Prompt too short").max(1000, "Prompt too long"),
        style: z.enum(["realistic", "anime", "artistic"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const influencer = await db.getInfluencerById(input.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Influencer not found or access denied" });
        }

        const stylePrompts: Record<string, string> = {
          realistic: "hyper-realistic portrait photo, professional photography, studio lighting, 8k resolution, detailed skin texture, natural lighting",
          anime: "anime style portrait, vibrant colors, detailed illustration, high quality anime art, studio ghibli inspired",
          artistic: "artistic portrait, creative lighting, dramatic composition, fine art photography, cinematic quality",
        };

        const fullPrompt = `${input.prompt}. ${stylePrompts[input.style || "realistic"]}. Beautiful influencer portrait, social media ready, high quality, professional headshot.`;

        try {
          const result = await generateImage({ prompt: fullPrompt });
          
          if (!result.url) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate image" });
          }

          // Download and upload to S3 for permanent storage
          const response = await fetch(result.url);
          if (!response.ok) {
            throw new Error("Failed to download generated image");
          }
          
          const buffer = Buffer.from(await response.arrayBuffer());
          const fileKey = `influencers/${ctx.user.id}/${input.influencerId}/avatar-${nanoid()}.png`;
          
          const { url: s3Url } = await storagePut(fileKey, buffer, "image/png");

          // Update the influencer's avatar
          await db.updateInfluencer(input.influencerId, { avatarUrl: s3Url });

          // Save to content history
          await db.addInfluencerContent({
            influencerId: input.influencerId,
            imageUrl: s3Url,
            prompt: input.prompt,
            contentType: "avatar",
          });

          return { url: s3Url };
        } catch (error) {
          console.error("Image generation error:", error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate avatar. Please try again." });
        }
      }),

    generateContent: protectedProcedure
      .input(z.object({
        influencerId: z.number(),
        prompt: z.string().min(10, "Prompt too short").max(1000, "Prompt too long"),
        contentType: z.enum(["post", "story"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const influencer = await db.getInfluencerById(input.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Influencer not found or access denied" });
        }

        const fullPrompt = `${input.prompt}. Professional social media content, high quality, engaging composition, influencer style photography, lifestyle content.`;

        try {
          const result = await generateImage({ prompt: fullPrompt });
          
          if (!result.url) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate image" });
          }

          const response = await fetch(result.url);
          if (!response.ok) {
            throw new Error("Failed to download generated image");
          }
          
          const buffer = Buffer.from(await response.arrayBuffer());
          const fileKey = `influencers/${ctx.user.id}/${input.influencerId}/content-${nanoid()}.png`;
          
          const { url: s3Url } = await storagePut(fileKey, buffer, "image/png");

          await db.addInfluencerContent({
            influencerId: input.influencerId,
            imageUrl: s3Url,
            prompt: input.prompt,
            contentType: input.contentType || "post",
          });

          // Update influencer stats
          const currentStats = influencer.stats || { followers: 0, likes: 0, posts: 0 };
          await db.updateInfluencer(input.influencerId, {
            stats: {
              ...currentStats,
              posts: (currentStats.posts || 0) + 1,
            },
          });

          return { url: s3Url };
        } catch (error) {
          console.error("Content generation error:", error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate content. Please try again." });
        }
      }),

    getContent: protectedProcedure
      .input(z.object({ influencerId: z.number() }))
      .query(async ({ ctx, input }) => {
        const influencer = await db.getInfluencerById(input.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Influencer not found or access denied" });
        }
        
        return db.getInfluencerContent(input.influencerId);
      }),

    // Generic image generation for CreateInfluencer page
    generateImage: protectedProcedure
      .input(z.object({
        prompt: z.string().min(10, "Prompt too short").max(1000, "Prompt too long"),
        style: z.enum(["realistic", "anime", "artistic", "3d"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const stylePrompts: Record<string, string> = {
          realistic: "hyper-realistic portrait photo, professional photography, studio lighting, 8k resolution, detailed skin texture, natural lighting",
          anime: "anime style portrait, vibrant colors, detailed illustration, high quality anime art, studio ghibli inspired",
          artistic: "artistic portrait, creative lighting, dramatic composition, fine art photography, cinematic quality",
          "3d": "3D rendered character portrait, Pixar style, high quality 3D model, professional lighting, detailed textures",
        };

        const fullPrompt = `${input.prompt}. ${stylePrompts[input.style || "realistic"]}. Beautiful influencer portrait, social media ready, high quality, professional headshot.`;

        try {
          const result = await generateImage({ prompt: fullPrompt });
          
          if (!result.url) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate image" });
          }

          // Download and upload to S3 for permanent storage
          const response = await fetch(result.url);
          if (!response.ok) {
            throw new Error("Failed to download generated image");
          }
          
          const buffer = Buffer.from(await response.arrayBuffer());
          const fileKey = `temp/${ctx.user.id}/avatar-${nanoid()}.png`;
          
          const { url: s3Url } = await storagePut(fileKey, buffer, "image/png");

          return { url: s3Url };
        } catch (error) {
          console.error("Image generation error:", error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate image. Please try again." });
        }
      }),
  }),

  chat: router({
    getMessages: protectedProcedure
      .input(z.object({ influencerId: z.number(), limit: z.number().min(1).max(100).optional() }))
      .query(async ({ ctx, input }) => {
        const influencer = await db.getInfluencerById(input.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Influencer not found or access denied" });
        }
        
        const messages = await db.getChatMessages(input.influencerId, ctx.user.id, input.limit || 50);
        return messages.reverse(); // Return in chronological order
      }),

    sendMessage: protectedProcedure
      .input(z.object({
        influencerId: z.number(),
        message: z.string().min(1, "Message cannot be empty").max(2000, "Message too long"),
      }))
      .mutation(async ({ ctx, input }) => {
        const influencer = await db.getInfluencerById(input.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Influencer not found or access denied" });
        }

        // Save user message
        await db.addChatMessage({
          influencerId: input.influencerId,
          userId: ctx.user.id,
          role: "user",
          content: input.message,
        });

        // Get chat history for context
        const chatHistory = await db.getChatMessages(input.influencerId, ctx.user.id, 20);
        const historyForLLM = chatHistory.reverse().map(m => ({
          role: m.role,
          content: m.content,
        }));

        // Generate AI response using real LLM
        const aiResponse = await generateAIResponse(
          influencer.name,
          influencer.personality || "friendly and engaging",
          input.message,
          historyForLLM
        );

        // Save AI response
        await db.addChatMessage({
          influencerId: input.influencerId,
          userId: ctx.user.id,
          role: "assistant",
          content: aiResponse,
        });

        return { response: aiResponse };
      }),

    clearHistory: protectedProcedure
      .input(z.object({ influencerId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const influencer = await db.getInfluencerById(input.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Influencer not found or access denied" });
        }
        
        // Note: In production, you might want to soft-delete or archive instead
        // For now, we'll just return success (implement actual deletion if needed)
        return { success: true };
      }),
  }),

  schedule: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getScheduledPosts(ctx.user.id);
    }),

    listByInfluencer: protectedProcedure
      .input(z.object({ influencerId: z.number() }))
      .query(async ({ ctx, input }) => {
        const influencer = await db.getInfluencerById(input.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Influencer not found or access denied" });
        }
        return db.getScheduledPostsByInfluencer(input.influencerId);
      }),

    create: protectedProcedure
      .input(z.object({
        influencerId: z.number(),
        platform: z.enum(["instagram", "tiktok", "twitter", "youtube"]),
        contentUrl: z.string().url().optional(),
        caption: z.string().max(2200).optional(),
        scheduledFor: z.string().refine((val) => !isNaN(Date.parse(val)), {
          message: "Invalid date format",
        }),
        autoGenerateCaption: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const influencer = await db.getInfluencerById(input.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Influencer not found or access denied" });
        }

        // Validate scheduled time is in the future
        const scheduledDate = new Date(input.scheduledFor);
        if (scheduledDate <= new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Scheduled time must be in the future" });
        }

        // Auto-generate caption if requested
        let caption = input.caption;
        if (input.autoGenerateCaption && !caption) {
          caption = await generateCaption(
            influencer.name,
            influencer.personality || "friendly and engaging",
            input.platform
          );
        }

        const id = await db.createScheduledPost({
          influencerId: input.influencerId,
          userId: ctx.user.id,
          platform: input.platform,
          contentUrl: input.contentUrl,
          caption: caption,
          scheduledFor: scheduledDate,
        });

        return { id, caption };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        platform: z.enum(["instagram", "tiktok", "twitter", "youtube"]).optional(),
        contentUrl: z.string().url().optional(),
        caption: z.string().max(2200).optional(),
        scheduledFor: z.string().optional(),
        status: z.enum(["scheduled", "published", "failed", "cancelled"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const post = await db.getScheduledPostById(input.id);
        if (!post || post.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Post not found or access denied" });
        }

        // Validate scheduled time if being updated
        if (input.scheduledFor) {
          const scheduledDate = new Date(input.scheduledFor);
          if (scheduledDate <= new Date()) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Scheduled time must be in the future" });
          }
        }

        const { id, scheduledFor, ...rest } = input;
        await db.updateScheduledPost(id, {
          ...rest,
          ...(scheduledFor ? { scheduledFor: new Date(scheduledFor) } : {}),
        });

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const post = await db.getScheduledPostById(input.id);
        if (!post || post.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Post not found or access denied" });
        }

        await db.deleteScheduledPost(input.id);
        return { success: true };
      }),

    generateCaption: protectedProcedure
      .input(z.object({
        influencerId: z.number(),
        platform: z.enum(["instagram", "tiktok", "twitter", "youtube"]),
        contentDescription: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const influencer = await db.getInfluencerById(input.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Influencer not found or access denied" });
        }

        const caption = await generateCaption(
          influencer.name,
          influencer.personality || "friendly and engaging",
          input.platform,
          input.contentDescription
        );

        return { caption };
      }),
  }),

  analytics: router({
    getOverview: protectedProcedure
      .input(z.object({ influencerId: z.number() }))
      .query(async ({ ctx, input }) => {
        const influencer = await db.getInfluencerById(input.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Influencer not found or access denied" });
        }

        const latest = await db.getLatestAnalytics(input.influencerId);
        const stats = influencer.stats || { followers: 0, likes: 0, posts: 0 };
        
        if (!latest) {
          return {
            followers: stats.followers || 0,
            followersGain: 0,
            likes: stats.likes || 0,
            views: 0,
            engagementRate: 0,
            postsCount: stats.posts || 0,
          };
        }

        return {
          followers: latest.followers,
          followersGain: latest.followersGain,
          likes: latest.likes,
          views: latest.views,
          engagementRate: latest.engagementRate / 100,
          postsCount: latest.postsCount,
        };
      }),

    getHistory: protectedProcedure
      .input(z.object({
        influencerId: z.number(),
        days: z.number().min(7).max(90).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const influencer = await db.getInfluencerById(input.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Influencer not found or access denied" });
        }

        const days = input.days || 30;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const data = await db.getAnalyticsData(input.influencerId, startDate, endDate);
        
        // If no real data exists, return empty array (no mock data in production)
        if (data.length === 0) {
          // Generate initial data points for new influencers
          const stats = influencer.stats || { followers: 0, likes: 0, posts: 0 };
          const initialData = [];
          let currentFollowers = stats.followers || 0;
          
          for (let i = days; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            initialData.push({
              date: date.toISOString(),
              followers: currentFollowers,
              followersGain: 0,
              likes: 0,
              views: 0,
              engagementRate: "0.00",
              postsCount: 0,
            });
          }
          
          return initialData;
        }

        return data.map(d => ({
          date: d.date.toISOString(),
          followers: d.followers,
          followersGain: d.followersGain,
          likes: d.likes,
          views: d.views,
          engagementRate: (d.engagementRate / 100).toFixed(2),
          postsCount: d.postsCount,
        }));
      }),

    getDashboard: protectedProcedure.query(async ({ ctx }) => {
      const influencers = await db.getInfluencersByUserId(ctx.user.id);
      
      let totalFollowers = 0;
      let totalLikes = 0;
      let totalPosts = 0;
      let totalEngagement = 0;

      for (const inf of influencers) {
        const stats = inf.stats || { followers: 0, likes: 0, posts: 0 };
        totalFollowers += stats.followers || 0;
        totalLikes += stats.likes || 0;
        totalPosts += stats.posts || 0;
        
        // Calculate engagement from latest analytics
        const latest = await db.getLatestAnalytics(inf.id);
        if (latest) {
          totalEngagement += latest.engagementRate;
        }
      }

      const avgEngagementRate = influencers.length > 0 
        ? (totalEngagement / influencers.length / 100).toFixed(2) 
        : "0.00";

      return {
        totalInfluencers: influencers.length,
        totalFollowers,
        totalLikes,
        totalPosts,
        avgEngagementRate,
      };
    }),

    recordMetrics: protectedProcedure
      .input(z.object({
        influencerId: z.number(),
        followers: z.number().min(0),
        followersGain: z.number(),
        likes: z.number().min(0),
        views: z.number().min(0),
        engagementRate: z.number().min(0).max(100),
        postsCount: z.number().min(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const influencer = await db.getInfluencerById(input.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Influencer not found or access denied" });
        }

        await db.addAnalyticsData({
          influencerId: input.influencerId,
          date: new Date(),
          followers: input.followers,
          followersGain: input.followersGain,
          likes: input.likes,
          views: input.views,
          engagementRate: Math.round(input.engagementRate * 100), // Store as integer
          postsCount: input.postsCount,
        });

        // Update influencer stats
        await db.updateInfluencer(input.influencerId, {
          stats: {
            followers: input.followers,
            likes: input.likes,
            posts: input.postsCount,
          },
        });

        return { success: true };
      }),
  }),

  // ============================================
  // Notifications
  // ============================================
  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(50).optional() }))
      .query(async ({ ctx, input }) => {
        return db.getNotifications(ctx.user.id, input.limit || 20);
      }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return db.getUnreadNotificationCount(ctx.user.id);
    }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationRead(input.id);
        return { success: true };
      }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),

    getPreferences: protectedProcedure.query(async ({ ctx }) => {
      const prefs = await db.getNotificationPreferences(ctx.user.id);
      return prefs || {
        emailEnabled: true,
        scheduledPostPublished: true,
        followerMilestones: true,
        weeklyReport: true,
        teamInvitations: true,
      };
    }),

    updatePreferences: protectedProcedure
      .input(z.object({
        emailEnabled: z.boolean().optional(),
        scheduledPostPublished: z.boolean().optional(),
        followerMilestones: z.boolean().optional(),
        weeklyReport: z.boolean().optional(),
        teamInvitations: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertNotificationPreferences(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // ============================================
  // Content Templates
  // ============================================
  templates: router({
    list: protectedProcedure
      .input(z.object({ category: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const templates = await db.getContentTemplates(ctx.user.id);
        if (input?.category) {
          return templates.filter(t => t.category === input.category);
        }
        return templates;
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const template = await db.getContentTemplateById(input.id);
        if (!template) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
        }
        return template;
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        category: z.enum(["product", "lifestyle", "fashion", "fitness", "travel", "food", "beauty", "tech", "custom"]),
        promptTemplate: z.string().min(10).max(2000),
        stylePreset: z.enum(["realistic", "anime", "artistic", "3d"]).optional(),
        characterWeight: z.number().min(0).max(100).optional(),
        keepOutfit: z.boolean().optional(),
        isPublic: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createContentTemplate({
          userId: ctx.user.id,
          ...input,
        });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        promptTemplate: z.string().min(10).max(2000).optional(),
        stylePreset: z.enum(["realistic", "anime", "artistic", "3d"]).optional(),
        characterWeight: z.number().min(0).max(100).optional(),
        keepOutfit: z.boolean().optional(),
        isPublic: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const template = await db.getContentTemplateById(input.id);
        if (!template || (template.userId !== null && template.userId !== ctx.user.id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Template not found or access denied" });
        }
        const { id, ...updateData } = input;
        await db.updateContentTemplate(id, updateData);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const template = await db.getContentTemplateById(input.id);
        if (!template || (template.userId !== null && template.userId !== ctx.user.id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Template not found or access denied" });
        }
        await db.deleteContentTemplate(input.id);
        return { success: true };
      }),

    use: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.incrementTemplateUsage(input.id);
        return { success: true };
      }),
  }),

  // ============================================
  // Collaborators
  // ============================================
  collaborators: router({
    list: protectedProcedure
      .input(z.object({ influencerId: z.number() }))
      .query(async ({ ctx, input }) => {
        const influencer = await db.getInfluencerById(input.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Influencer not found or access denied" });
        }
        return db.getCollaboratorsByInfluencer(input.influencerId);
      }),

    invite: protectedProcedure
      .input(z.object({
        influencerId: z.number(),
        email: z.string().email(),
        role: z.enum(["editor", "viewer"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const influencer = await db.getInfluencerById(input.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Influencer not found or access denied" });
        }

        // Check if user exists with this email
        const invitedUser = await db.getUserByEmail(input.email);
        
        const inviteToken = nanoid(32);
        const id = await db.createCollaborator({
          influencerId: input.influencerId,
          userId: invitedUser?.id || 0, // 0 for pending users
          invitedByUserId: ctx.user.id,
          role: input.role,
          status: "pending",
          inviteEmail: input.email,
          inviteToken,
        });

        // Create notification for the invited user if they exist
        if (invitedUser) {
          await db.createNotification({
            userId: invitedUser.id,
            type: "team_invite",
            title: "Team Invitation",
            message: `You've been invited to collaborate on ${influencer.name}`,
            metadata: { influencerId: input.influencerId, inviteToken },
          });
        }

        return { id, inviteToken };
      }),

    acceptInvite: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const collab = await db.getCollaboratorByToken(input.token);
        if (!collab) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" });
        }
        if (collab.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation already processed" });
        }

        await db.updateCollaborator(collab.id, {
          userId: ctx.user.id,
          status: "accepted",
          acceptedAt: new Date(),
        });

        return { success: true };
      }),

    updateRole: protectedProcedure
      .input(z.object({
        id: z.number(),
        role: z.enum(["editor", "viewer"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const collab = await db.getCollaboratorById(input.id);
        if (!collab) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Collaborator not found" });
        }

        const influencer = await db.getInfluencerById(collab.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.updateCollaborator(input.id, { role: input.role });
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const collab = await db.getCollaboratorById(input.id);
        if (!collab) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Collaborator not found" });
        }

        const influencer = await db.getInfluencerById(collab.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.deleteCollaborator(input.id);
        return { success: true };
      }),

    getSharedInfluencers: protectedProcedure.query(async ({ ctx }) => {
      return db.getSharedInfluencers(ctx.user.id);
    }),
  }),

  // ============================================
  // Campaigns (Story Mode)
  // ============================================
  campaigns: router({
    list: protectedProcedure
      .input(z.object({ influencerId: z.number() }))
      .query(async ({ ctx, input }) => {
        const influencer = await db.getInfluencerById(input.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Influencer not found or access denied" });
        }
        return db.getCampaignsByInfluencer(input.influencerId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const campaign = await db.getCampaignById(input.id);
        if (!campaign) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
        }

        const influencer = await db.getInfluencerById(campaign.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const scenes = await db.getCampaignScenes(campaign.id);
        return { ...campaign, scenes };
      }),

    create: protectedProcedure
      .input(z.object({
        influencerId: z.number(),
        name: z.string().min(1).max(100),
        description: z.string().max(2000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const influencer = await db.getInfluencerById(input.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Influencer not found or access denied" });
        }

        const id = await db.createCampaign({
          influencerId: input.influencerId,
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
        });

        return { id };
      }),

    generateScenes: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        storyDescription: z.string().min(20).max(2000),
        sceneCount: z.number().min(3).max(10).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const campaign = await db.getCampaignById(input.campaignId);
        if (!campaign) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
        }

        const influencer = await db.getInfluencerById(campaign.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const sceneCount = input.sceneCount || 5;

        // Use LLM to generate scene prompts
        const systemPrompt = `You are a creative director for ${influencer.name}, an AI influencer.
Personality: ${influencer.personality || "friendly and engaging"}

Generate exactly ${sceneCount} scene prompts for a social media content campaign.
Each scene should be a detailed image generation prompt.

Return ONLY a JSON array with this exact structure:
[
  {
    "sceneOrder": 1,
    "prompt": "detailed image prompt for scene 1",
    "caption": "social media caption for this scene",
    "platform": "instagram"
  }
]

Platforms can be: instagram, tiktok, twitter, youtube`;

        try {
          const result = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Create a ${sceneCount}-scene campaign based on this story: ${input.storyDescription}` },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "campaign_scenes",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    scenes: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          sceneOrder: { type: "integer" },
                          prompt: { type: "string" },
                          caption: { type: "string" },
                          platform: { type: "string" },
                        },
                        required: ["sceneOrder", "prompt", "caption", "platform"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["scenes"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = result.choices?.[0]?.message?.content;
          if (!content) {
            throw new Error("No response from LLM");
          }

          const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
          const scenes = parsed.scenes || [];

          // Create scenes in database
          for (const scene of scenes) {
            await db.createCampaignScene({
              campaignId: input.campaignId,
              sceneOrder: scene.sceneOrder,
              prompt: scene.prompt,
              caption: scene.caption,
              platform: scene.platform as "instagram" | "tiktok" | "twitter" | "youtube",
            });
          }

          // Update campaign status
          await db.updateCampaign(input.campaignId, {
            status: "preview",
            totalScenes: scenes.length,
          });

          return { scenes };
        } catch (error) {
          console.error("Scene generation error:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate scenes" });
        }
      }),

    updateScene: protectedProcedure
      .input(z.object({
        sceneId: z.number(),
        prompt: z.string().min(10).max(1000).optional(),
        caption: z.string().max(2200).optional(),
        platform: z.enum(["instagram", "tiktok", "twitter", "youtube"]).optional(),
        scheduledFor: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const scene = await db.getCampaignSceneById(input.sceneId);
        if (!scene) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
        }

        const campaign = await db.getCampaignById(scene.campaignId);
        if (!campaign) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
        }

        const influencer = await db.getInfluencerById(campaign.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const { sceneId, scheduledFor, ...rest } = input;
        await db.updateCampaignScene(sceneId, {
          ...rest,
          ...(scheduledFor ? { scheduledFor: new Date(scheduledFor) } : {}),
        });

        return { success: true };
      }),

    generateSceneImage: protectedProcedure
      .input(z.object({ sceneId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const scene = await db.getCampaignSceneById(input.sceneId);
        if (!scene) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
        }

        const campaign = await db.getCampaignById(scene.campaignId);
        if (!campaign) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
        }

        const influencer = await db.getInfluencerById(campaign.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        // Get influencer settings for consistency
        const settings = await db.getInfluencerSettings(influencer.id);
        const characterWeight = settings?.characterWeight || 80;
        const keepOutfit = settings?.keepOutfit || false;

        // Build prompt with consistency settings
        let fullPrompt = scene.prompt;
        if (characterWeight > 50) {
          fullPrompt += `. Maintain strong character consistency with ${influencer.name}.`;
        }
        if (keepOutfit && influencer.avatarUrl) {
          fullPrompt += " Keep the same outfit and style as the reference image.";
        }

        try {
          await db.updateCampaignScene(input.sceneId, { status: "generating" });

          const result = await generateImage({ 
            prompt: fullPrompt,
            originalImages: influencer.avatarUrl ? [{ url: influencer.avatarUrl, mimeType: "image/png" }] : undefined,
          });

          if (!result.url) {
            throw new Error("Failed to generate image");
          }

          // Download and upload to S3
          const response = await fetch(result.url);
          const buffer = Buffer.from(await response.arrayBuffer());
          const fileKey = `campaigns/${campaign.id}/scene-${scene.sceneOrder}-${nanoid()}.png`;
          const { url: s3Url } = await storagePut(fileKey, buffer, "image/png");

          await db.updateCampaignScene(input.sceneId, {
            imageUrl: s3Url,
            status: "completed",
          });

          // Update campaign progress
          const scenes = await db.getCampaignScenes(campaign.id);
          const completedCount = scenes.filter(s => s.status === "completed").length;
          await db.updateCampaign(campaign.id, {
            completedScenes: completedCount,
            status: completedCount === scenes.length ? "completed" : "generating",
          });

          return { url: s3Url };
        } catch (error) {
          console.error("Scene image generation error:", error);
          await db.updateCampaignScene(input.sceneId, { status: "pending" });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate scene image" });
        }
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const campaign = await db.getCampaignById(input.id);
        if (!campaign) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
        }

        const influencer = await db.getInfluencerById(campaign.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.deleteCampaign(input.id);
        return { success: true };
      }),
  }),

  // ============================================
  // Influencer Settings (Character Consistency)
  // ============================================
  // ============================================
  // Brand Brain (Business DNA)
  // ============================================
  brandBrain: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getBusinessDna(ctx.user.id);
    }),

    save: protectedProcedure
      .input(z.object({
        productName: z.string().min(1).max(200),
        websiteUrl: z.string().optional().transform(val => {
          if (!val || val.trim() === '') return undefined;
          // Add https:// if no protocol specified
          if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
            return 'https://' + val;
          }
          return val;
        }),
        category: z.string().max(100).optional(),
        tagline: z.string().max(500).optional(),
        brandTone: z.enum(["authoritative", "playful", "contrarian", "friendly", "professional", "casual"]).optional(),
        icpPersonas: z.array(z.object({
          name: z.string(),
          role: z.string(),
          pains: z.array(z.string()),
          goals: z.array(z.string()),
          objections: z.array(z.string()).optional(),
        })).optional(),
        keyOutcomes: z.array(z.string()).optional(),
        differentiators: z.array(z.string()).optional(),
        claimsProofMapping: z.array(z.object({
          claim: z.string(),
          proof: z.string(),
          proofType: z.enum(["testimonial", "metric", "case_study", "demo"]),
        })).optional(),
        objectionHandling: z.array(z.object({
          objection: z.string(),
          response: z.string(),
        })).optional(),
        voiceRules: z.array(z.string()).optional(),
        forbiddenPhrases: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Calculate completion score
        let score = 0;
        if (input.productName) score += 10;
        if (input.websiteUrl) score += 5;
        if (input.tagline) score += 10;
        if (input.icpPersonas?.length) score += 20;
        if (input.keyOutcomes?.length) score += 15;
        if (input.differentiators?.length) score += 10;
        if (input.claimsProofMapping?.length) score += 15;
        if (input.voiceRules?.length) score += 10;
        if (input.forbiddenPhrases?.length) score += 5;
        const completionScore = Math.min(score, 100);

        await db.upsertBusinessDna(ctx.user.id, {
          ...input,
          isComplete: completionScore >= 50,
          completionScore,
        });

        return { success: true, completionScore };
      }),

    enrichFromWebsite: protectedProcedure
      .input(z.object({ websiteUrl: z.string().transform(val => {
          // Add https:// if no protocol specified
          if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
            return 'https://' + val;
          }
          return val;
        }) }))
      .mutation(async ({ ctx, input }) => {
        try {
          // Use LLM to analyze website and extract key information
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "You are a marketing analyst. Analyze the website URL and extract key business information. Return a JSON object with tagline, keyOutcomes (array of 3-5 outcomes), and differentiators (array of 3-5 unique selling points)."
              },
              {
                role: "user",
                content: `Analyze this website and extract marketing information: ${input.websiteUrl}. Return JSON with tagline, keyOutcomes array, and differentiators array.`
              }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "website_analysis",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    tagline: { type: "string", description: "A compelling tagline for the product" },
                    keyOutcomes: { type: "array", items: { type: "string" }, description: "Key outcomes customers achieve" },
                    differentiators: { type: "array", items: { type: "string" }, description: "What makes this product unique" },
                  },
                  required: ["tagline", "keyOutcomes", "differentiators"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = result.choices?.[0]?.message?.content;
          if (!content) {
            throw new Error("No response from LLM");
          }

          const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
          return {
            tagline: parsed.tagline || null,
            keyOutcomes: parsed.keyOutcomes || [],
            differentiators: parsed.differentiators || [],
          };
        } catch (error) {
          console.error("Website enrichment error:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to analyze website" });
        }
      }),

    importFromLinkedIn: protectedProcedure
      .input(z.object({ linkedInUrl: z.string() }))
      .mutation(async ({ ctx, input }) => {
        try {
          // Use LLM to analyze LinkedIn company page and extract key information
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "You are a business analyst. Given a LinkedIn company page URL, extract key company information. Return a JSON object with productName (company name), tagline (company headline/description), category (industry), and websiteUrl (company website if available). Make reasonable inferences based on the URL structure if needed."
              },
              {
                role: "user",
                content: `Extract company information from this LinkedIn page: ${input.linkedInUrl}. Return JSON with productName, tagline, category, and websiteUrl fields.`
              }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "linkedin_company_info",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    productName: { type: "string", description: "Company or product name" },
                    tagline: { type: "string", description: "Company headline or description" },
                    category: { type: "string", description: "Industry or business category" },
                    websiteUrl: { type: "string", description: "Company website URL" },
                  },
                  required: ["productName", "tagline", "category", "websiteUrl"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = result.choices?.[0]?.message?.content;
          if (!content) {
            throw new Error("No response from LLM");
          }

          const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
          return {
            productName: parsed.productName || null,
            tagline: parsed.tagline || null,
            category: parsed.category || null,
            websiteUrl: parsed.websiteUrl || null,
          };
        } catch (error) {
          console.error("LinkedIn import error:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to import from LinkedIn" });
        }
      }),

    // Multi-Brand APIs
    listBrands: protectedProcedure.query(async ({ ctx }) => {
      const org = await db.getOrganizationByUserId(ctx.user.id);
      if (!org) {
        // Create default org for user
        const newOrg = await db.createOrganizationForUser(ctx.user.id, "My Organization");
        return { brands: [], organization: { id: newOrg.id, plan: 'free', maxBrands: 1 } };
      }
      const brands = await db.listBrandsByOrg(org.id);
      return { brands, organization: { id: org.id, plan: org.plan, maxBrands: org.maxBrands, activeBrandId: org.activeBrandId } };
    }),

    getActiveBrand: protectedProcedure.query(async ({ ctx }) => {
      const org = await db.getOrganizationByUserId(ctx.user.id);
      if (!org) return null;
      return db.getActiveBrand(org.id);
    }),

    createBrand: protectedProcedure
      .input(z.object({
        productName: z.string().min(1).max(200),
        brandName: z.string().max(200).optional(),
        websiteUrl: z.string().optional(),
        category: z.string().max(100).optional(),
        tagline: z.string().max(500).optional(),
        brandTone: z.enum(["authoritative", "playful", "contrarian", "friendly", "professional", "casual"]).optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        let org = await db.getOrganizationByUserId(ctx.user.id);
        if (!org) {
          const newOrg = await db.createOrganizationForUser(ctx.user.id, "My Organization");
          org = await db.getOrganizationById(newOrg.id);
        }
        if (!org) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create organization" });

        // Check brand limit
        const brandCount = await db.getBrandCount(org.id);
        const maxBrands = org.maxBrands || 1;
        if (maxBrands !== -1 && brandCount >= maxBrands) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: `Brand limit reached. Your ${org.plan} plan allows ${maxBrands} brand(s). Upgrade to add more brands.` 
          });
        }

        const result = await db.createBrand({
          organizationId: org.id,
          userId: ctx.user.id,
          ...input,
        });

        // Set as active if first brand
        if (brandCount === 0) {
          await db.setActiveBrand(org.id, result.id);
        }

        return { id: result.id, success: true };
      }),

    setActiveBrand: protectedProcedure
      .input(z.object({ brandId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const org = await db.getOrganizationByUserId(ctx.user.id);
        if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });

        // Verify brand belongs to org
        const brand = await db.getBrandById(input.brandId, org.id);
        if (!brand) throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found" });

        await db.setActiveBrand(org.id, input.brandId);
        return { success: true };
      }),

    archiveBrand: protectedProcedure
      .input(z.object({ brandId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const org = await db.getOrganizationByUserId(ctx.user.id);
        if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });

        await db.archiveBrand(input.brandId, org.id);
        return { success: true };
      }),

    duplicateBrand: protectedProcedure
      .input(z.object({ brandId: z.number(), newBrandName: z.string().min(1).max(200) }))
      .mutation(async ({ ctx, input }) => {
        const org = await db.getOrganizationByUserId(ctx.user.id);
        if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });

        // Check brand limit
        const brandCount = await db.getBrandCount(org.id);
        const maxBrands = org.maxBrands || 1;
        if (maxBrands !== -1 && brandCount >= maxBrands) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: `Brand limit reached. Your ${org.plan} plan allows ${maxBrands} brand(s). Upgrade to add more brands.` 
          });
        }

        const result = await db.duplicateBrand(input.brandId, org.id, ctx.user.id, input.newBrandName);
        return { id: result.id, success: true };
      }),

    getBrand: protectedProcedure
      .input(z.object({ brandId: z.number() }))
      .query(async ({ ctx, input }) => {
        const org = await db.getOrganizationByUserId(ctx.user.id);
        if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
        return db.getBrandById(input.brandId, org.id);
      }),

    // AI Suggestion Routes
    suggestBasics: protectedProcedure
      .input(z.object({
        productName: z.string().optional(),
        websiteUrl: z.string().optional(),
        category: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a brand strategist with deep knowledge of global naming conventions, including African-inspired brand names. Based on the provided information, suggest improvements for the brand basics. When suggesting product names, consider culturally rich options including African-inspired names (e.g., Yamurai meaning strength in Shona, Shuri meaning thankfulness in Swahili, Batie meaning bold in West African traditions, Na'ah meaning wisdom in Pan-African context). Return a JSON object with suggested productName (if it can be improved), category (industry/niche), and tagline (compelling 5-10 word tagline).`
              },
              {
                role: "user",
                content: `Suggest brand basics improvements for:\nProduct Name: ${input.productName || 'Not provided'}\nWebsite: ${input.websiteUrl || 'Not provided'}\nCategory: ${input.category || 'Not provided'}\n\nProvide suggestions to make the brand more compelling and memorable.`
              }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "basics_suggestions",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    productName: { type: "string", description: "Suggested product/brand name" },
                    category: { type: "string", description: "Industry or niche category" },
                    tagline: { type: "string", description: "Compelling tagline (5-10 words)" },
                    reasoning: { type: "string", description: "Brief explanation of suggestions" },
                  },
                  required: ["productName", "category", "tagline", "reasoning"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = result.choices?.[0]?.message?.content;
          if (!content) throw new Error("No response from LLM");
          return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
        } catch (error) {
          console.error("Basics suggestion error:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate suggestions" });
        }
      }),

    suggestICPPersonas: protectedProcedure
      .input(z.object({
        productName: z.string(),
        category: z.string().optional(),
        tagline: z.string().optional(),
        existingPersonas: z.array(z.object({
          name: z.string(),
          role: z.string(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a marketing strategist specializing in ideal customer profiles. Generate 2-3 detailed ICP personas for the given product. Each persona should have a memorable name, specific job role, 3 key pain points, 3 goals they want to achieve, and 2-3 common objections they might have.`
              },
              {
                role: "user",
                content: `Generate ICP personas for:\nProduct: ${input.productName}\nCategory: ${input.category || 'Not specified'}\nTagline: ${input.tagline || 'Not specified'}\n${input.existingPersonas?.length ? `\nExisting personas to avoid duplicating: ${input.existingPersonas.map(p => p.name).join(', ')}` : ''}`
              }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "icp_personas",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    personas: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string", description: "Memorable persona name (e.g., 'Startup Steve')" },
                          role: { type: "string", description: "Job title or role" },
                          pains: { type: "array", items: { type: "string" }, description: "3 key pain points" },
                          goals: { type: "array", items: { type: "string" }, description: "3 goals they want to achieve" },
                          objections: { type: "array", items: { type: "string" }, description: "2-3 common objections" },
                        },
                        required: ["name", "role", "pains", "goals", "objections"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["personas"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = result.choices?.[0]?.message?.content;
          if (!content) throw new Error("No response from LLM");
          return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
        } catch (error) {
          console.error("ICP suggestion error:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate ICP personas" });
        }
      }),

    suggestValueProp: protectedProcedure
      .input(z.object({
        productName: z.string(),
        category: z.string().optional(),
        icpPersonas: z.array(z.object({
          name: z.string(),
          pains: z.array(z.string()),
          goals: z.array(z.string()),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a value proposition expert. Generate compelling key outcomes (benefits customers achieve) and differentiators (what makes this product unique) based on the product and target audience.`
              },
              {
                role: "user",
                content: `Generate value proposition elements for:\nProduct: ${input.productName}\nCategory: ${input.category || 'Not specified'}\n${input.icpPersonas?.length ? `\nTarget personas:\n${input.icpPersonas.map(p => `- ${p.name}: Pains: ${p.pains.join(', ')}. Goals: ${p.goals.join(', ')}`).join('\n')}` : ''}`
              }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "value_prop",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    keyOutcomes: { type: "array", items: { type: "string" }, description: "4-6 key outcomes/benefits" },
                    differentiators: { type: "array", items: { type: "string" }, description: "3-5 unique differentiators" },
                  },
                  required: ["keyOutcomes", "differentiators"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = result.choices?.[0]?.message?.content;
          if (!content) throw new Error("No response from LLM");
          return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
        } catch (error) {
          console.error("Value prop suggestion error:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate value proposition" });
        }
      }),

    suggestClaimsProof: protectedProcedure
      .input(z.object({
        productName: z.string(),
        keyOutcomes: z.array(z.string()).optional(),
        differentiators: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a marketing claims expert. Generate compelling marketing claims paired with specific proof points. Each claim should be bold but believable, and each proof should be concrete and verifiable. Proof types: testimonial (customer quote), metric (specific number/stat), case_study (customer success story), demo (product demonstration).`
              },
              {
                role: "user",
                content: `Generate claims and proof for:\nProduct: ${input.productName}\n${input.keyOutcomes?.length ? `Key Outcomes: ${input.keyOutcomes.join(', ')}` : ''}\n${input.differentiators?.length ? `Differentiators: ${input.differentiators.join(', ')}` : ''}`
              }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "claims_proof",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    claimsProofMapping: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          claim: { type: "string", description: "Bold marketing claim" },
                          proof: { type: "string", description: "Specific proof point" },
                          proofType: { type: "string", enum: ["testimonial", "metric", "case_study", "demo"], description: "Type of proof" },
                        },
                        required: ["claim", "proof", "proofType"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["claimsProofMapping"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = result.choices?.[0]?.message?.content;
          if (!content) throw new Error("No response from LLM");
          return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
        } catch (error) {
          console.error("Claims proof suggestion error:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate claims and proof" });
        }
      }),

    suggestBrandVoice: protectedProcedure
      .input(z.object({
        productName: z.string(),
        category: z.string().optional(),
        brandTone: z.string().optional(),
        icpPersonas: z.array(z.object({
          name: z.string(),
          role: z.string(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a brand voice expert. Generate voice rules (guidelines for how the brand should communicate) and forbidden phrases (words/phrases to avoid). Voice rules should be actionable and specific. Forbidden phrases should include clichés, competitor terms, and off-brand language.`
              },
              {
                role: "user",
                content: `Generate brand voice guidelines for:\nProduct: ${input.productName}\nCategory: ${input.category || 'Not specified'}\nDesired Tone: ${input.brandTone || 'Not specified'}\n${input.icpPersonas?.length ? `Target audience: ${input.icpPersonas.map(p => `${p.name} (${p.role})`).join(', ')}` : ''}`
              }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "brand_voice",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    voiceRules: { type: "array", items: { type: "string" }, description: "5-7 voice guidelines" },
                    forbiddenPhrases: { type: "array", items: { type: "string" }, description: "8-12 phrases to avoid" },
                    recommendedTone: { type: "string", enum: ["authoritative", "playful", "contrarian", "friendly", "professional", "casual"], description: "Recommended brand tone" },
                  },
                  required: ["voiceRules", "forbiddenPhrases", "recommendedTone"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = result.choices?.[0]?.message?.content;
          if (!content) throw new Error("No response from LLM");
          return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
        } catch (error) {
          console.error("Brand voice suggestion error:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate brand voice" });
        }
      }),
  }),

  influencerSettings: router({
    get: protectedProcedure
      .input(z.object({ influencerId: z.number() }))
      .query(async ({ ctx, input }) => {
        const influencer = await db.getInfluencerById(input.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Influencer not found or access denied" });
        }

        const settings = await db.getInfluencerSettings(input.influencerId);
        return settings || {
          characterWeight: 80,
          keepOutfit: false,
          defaultStyle: "realistic",
          referenceImages: [],
        };
      }),

    update: protectedProcedure
      .input(z.object({
        influencerId: z.number(),
        characterWeight: z.number().min(0).max(100).optional(),
        keepOutfit: z.boolean().optional(),
        defaultStyle: z.enum(["realistic", "anime", "artistic", "3d"]).optional(),
        referenceImages: z.array(z.string().url()).max(5).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const influencer = await db.getInfluencerById(input.influencerId);
        if (!influencer || influencer.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Influencer not found or access denied" });
        }

        const { influencerId, ...settings } = input;
        await db.upsertInfluencerSettings(influencerId, settings);
        return { success: true };
      }),
   }),

  // ============================================
  // Phase 6 - Social Connections
  // ============================================
  socialConnections: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getSocialConnectionsByUser(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const connection = await db.getSocialConnectionById(input.id, ctx.user.id);
        if (!connection) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Connection not found" });
        }
        return connection;
      }),

    create: protectedProcedure
      .input(z.object({
        platform: z.enum(["instagram", "facebook", "youtube", "tiktok", "linkedin"]),
        platformUserId: z.string().optional(),
        platformUsername: z.string().optional(),
        accessToken: z.string().optional(),
        refreshToken: z.string().optional(),
        profilePictureUrl: z.string().url().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createSocialConnection({
          userId: ctx.user.id,
          ...input,
        });
        return result;
      }),

    disconnect: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteSocialConnection(input.id, ctx.user.id);
        return { success: true };
      }),

    getOAuthUrl: protectedProcedure
      .input(z.object({
        platform: z.enum(["instagram", "facebook", "youtube", "tiktok", "linkedin"]),
      }))
      .query(async ({ ctx, input }) => {
        // Generate a state token for CSRF protection
        const state = Buffer.from(JSON.stringify({
          userId: ctx.user.id,
          platform: input.platform,
          timestamp: Date.now(),
        })).toString('base64');
        
        const url = generateAuthUrl(input.platform, state);
        const configured = isPlatformConfigured(input.platform);
        
        return { 
          url: url || "", 
          configured,
          message: configured ? undefined : `${input.platform} OAuth is not configured. Add API credentials in Settings → Secrets.`
        };
      }),

    // Handle OAuth callback
    handleCallback: protectedProcedure
      .input(z.object({
        platform: z.enum(["instagram", "facebook", "youtube", "tiktok", "linkedin"]),
        code: z.string(),
        state: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify state token
        if (input.state) {
          try {
            const stateData = JSON.parse(Buffer.from(input.state, 'base64').toString());
            if (stateData.userId !== ctx.user.id) {
              throw new TRPCError({ code: "FORBIDDEN", message: "Invalid state token" });
            }
          } catch {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid state token" });
          }
        }
        
        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(input.platform, input.code);
        if (!tokens) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to exchange authorization code" });
        }
        
        // Get user profile from platform
        const profile = await getUserProfile(input.platform, tokens.accessToken);
        if (!profile) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to get user profile" });
        }
        
        // Check if connection already exists
        const existingConnections = await db.getSocialConnectionsByUser(ctx.user.id);
        const existing = existingConnections.find(
          (c: any) => c.platform === input.platform && c.platformUserId === profile.id
        );
        
        if (existing) {
          // Update existing connection
          await db.updateSocialConnection(existing.id, ctx.user.id, {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiresAt: tokens.expiresAt,
            platformUsername: profile.username,
            profilePictureUrl: profile.avatarUrl,
            isActive: true,
          });
          return { id: existing.id, updated: true };
        }
        
        // Create new connection
        const result = await db.createSocialConnection({
          userId: ctx.user.id,
          platform: input.platform,
          platformUserId: profile.id,
          platformUsername: profile.username,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
          profilePictureUrl: profile.avatarUrl,
        });
        
        return { id: result?.id || 0, created: true };
      }),

    // Refresh tokens for a connection
    refreshTokens: protectedProcedure
      .input(z.object({ connectionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const connection = await db.getSocialConnectionById(input.connectionId, ctx.user.id);
        if (!connection) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Connection not found" });
        }
        
        if (!connection.refreshToken) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No refresh token available" });
        }
        
        const tokens = await refreshAccessToken(connection.platform, connection.refreshToken);
        if (!tokens) {
          // Mark connection as needing reauthorization
          await db.updateSocialConnection(input.connectionId, ctx.user.id, {
            isActive: false,
          });
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Token refresh failed. Please reconnect your account." });
        }
        
        await db.updateSocialConnection(input.connectionId, ctx.user.id, {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || connection.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
          isActive: true,
        });
        
        return { success: true };
      }),

    // Get configured platforms status
    getPlatformStatus: protectedProcedure.query(async () => {
      const platforms = ['instagram', 'facebook', 'youtube', 'tiktok', 'linkedin'];
      return platforms.map(platform => ({
        platform,
        configured: isPlatformConfigured(platform),
      }));
    }),
  }),

  // ============================================
  // Phase 6 - Social Posts
  // ============================================
  socialPosts: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).optional() }))
      .query(async ({ ctx, input }) => {
        return db.getSocialPostsByUser(ctx.user.id, input.limit || 50);
      }),

    create: protectedProcedure
      .input(z.object({
        socialConnectionId: z.number(),
        influencerId: z.number().optional(),
        scheduledPostId: z.number().optional(),
        platform: z.enum(["instagram", "facebook", "youtube", "tiktok", "linkedin"]),
        postType: z.enum(["image", "video", "carousel", "story", "reel", "short"]).optional(),
        caption: z.string().max(2200).optional(),
        mediaUrls: z.array(z.string().url()).max(10).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify connection belongs to user
        const connection = await db.getSocialConnectionById(input.socialConnectionId, ctx.user.id);
        if (!connection) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Connection not found" });
        }

        const result = await db.createSocialPost({
          ...input,
          userId: ctx.user.id,
        });
        return result;
      }),

    publish: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // In production, this would call the actual social media API
        // For now, we simulate the publishing process
        await db.updateSocialPostStatus(input.id, "publishing");
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mark as published with a mock platform post ID
        const platformPostId = `post_${nanoid()}`;
        await db.updateSocialPostStatus(input.id, "published", platformPostId);
        
        return { success: true, platformPostId };
      }),
  }),

  // ============================================
  // Phase 6 - A/B Testing
  // ============================================
  abTests: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getAbTestsByUser(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const test = await db.getAbTestById(input.id, ctx.user.id);
        if (!test) {
          throw new TRPCError({ code: "NOT_FOUND", message: "A/B test not found" });
        }
        const variants = await db.getAbTestVariants(input.id);
        return { ...test, variants };
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        influencerId: z.number().optional(),
        campaignId: z.number().optional(),
        testType: z.enum(["caption", "image", "cta", "timing", "audience"]),
        targetMetric: z.enum(["engagement", "clicks", "conversions", "reach", "impressions"]).optional(),
        confidenceLevel: z.number().min(80).max(99).optional(),
        minSampleSize: z.number().min(50).max(10000).optional(),
        autoOptimize: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createAbTest({
          userId: ctx.user.id,
          ...input,
        });
        return result;
      }),

    addVariant: protectedProcedure
      .input(z.object({
        abTestId: z.number(),
        name: z.string().min(1).max(50),
        isControl: z.boolean().optional(),
        content: z.object({
          caption: z.string().optional(),
          imageUrl: z.string().url().optional(),
          cta: z.string().optional(),
          scheduledTime: z.string().optional(),
        }).optional(),
        trafficPercentage: z.number().min(1).max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify test belongs to user
        const test = await db.getAbTestById(input.abTestId, ctx.user.id);
        if (!test) {
          throw new TRPCError({ code: "FORBIDDEN", message: "A/B test not found" });
        }

        const result = await db.createAbTestVariant(input);
        return result;
      }),

    start: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const test = await db.getAbTestById(input.id, ctx.user.id);
        if (!test) {
          throw new TRPCError({ code: "NOT_FOUND", message: "A/B test not found" });
        }

        const variants = await db.getAbTestVariants(input.id);
        if (variants.length < 2) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Need at least 2 variants to start test" });
        }

        await db.updateAbTestStatus(input.id, ctx.user.id, "running");
        return { success: true };
      }),

    pause: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateAbTestStatus(input.id, ctx.user.id, "paused");
        return { success: true };
      }),

    declareWinner: protectedProcedure
      .input(z.object({
        testId: z.number(),
        variantId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const test = await db.getAbTestById(input.testId, ctx.user.id);
        if (!test) {
          throw new TRPCError({ code: "NOT_FOUND", message: "A/B test not found" });
        }

        await db.setAbTestWinner(input.testId, input.variantId, ctx.user.id);
        return { success: true };
      }),

    recordMetrics: protectedProcedure
      .input(z.object({
        variantId: z.number(),
        impressions: z.number().min(0).optional(),
        clicks: z.number().min(0).optional(),
        conversions: z.number().min(0).optional(),
        engagements: z.number().min(0).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { variantId, ...metrics } = input;
        await db.updateAbTestVariantMetrics(variantId, metrics);
        return { success: true };
      }),

    getInsights: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const test = await db.getAbTestById(input.id, ctx.user.id);
        if (!test) {
          throw new TRPCError({ code: "NOT_FOUND", message: "A/B test not found" });
        }

        const variants = await db.getAbTestVariants(input.id);
        
        // Calculate statistical significance and insights
        const insights: string[] = [];
        let leadingVariant = variants[0];
        let maxEngagement = 0;

        for (const variant of variants) {
          const engagementRate = variant.impressions > 0 
            ? (variant.engagements / variant.impressions) * 100 
            : 0;
          
          if (engagementRate > maxEngagement) {
            maxEngagement = engagementRate;
            leadingVariant = variant;
          }
        }

        if (leadingVariant && maxEngagement > 0) {
          insights.push(`"${leadingVariant.name}" is currently leading with ${maxEngagement.toFixed(2)}% engagement rate`);
        }

        const totalImpressions = variants.reduce((sum: number, v: any) => sum + (v.impressions || 0), 0);
        if (totalImpressions < (test.minSampleSize || 100)) {
          insights.push(`Need ${(test.minSampleSize || 100) - totalImpressions} more impressions for statistical significance`);
        } else {
          insights.push("Sufficient data collected for statistical analysis");
        }

        return {
          leadingVariant: leadingVariant?.name,
          totalImpressions,
          insights,
          isStatisticallySignificant: totalImpressions >= (test.minSampleSize || 100),
        };
      }),
  }),

  // ============================================
  // Phase 6 - White Label Settings
  // ============================================
  whiteLabel: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getWhiteLabelSettingsByUser(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        brandName: z.string().min(1).max(100),
        logoUrl: z.string().url().optional(),
        faviconUrl: z.string().url().optional(),
        primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        customDomain: z.string().optional(),
        hideMatangoBranding: z.boolean().optional(),
        customFooterText: z.string().max(500).optional(),
        customSupportEmail: z.string().email().optional(),
        emailFromName: z.string().max(100).optional(),
        emailReplyTo: z.string().email().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user has Agency tier (in production, verify subscription)
        const result = await db.createWhiteLabelSettings({
          organizationId: 1, // Default org for now
          userId: ctx.user.id,
          ...input,
        });
        return result;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        brandName: z.string().min(1).max(100).optional(),
        logoUrl: z.string().url().optional(),
        faviconUrl: z.string().url().optional(),
        primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        customDomain: z.string().optional(),
        hideMatangoBranding: z.boolean().optional(),
        customFooterText: z.string().max(500).optional(),
        customSupportEmail: z.string().email().optional(),
        customTermsUrl: z.string().url().optional(),
        customPrivacyUrl: z.string().url().optional(),
        emailFromName: z.string().max(100).optional(),
        emailReplyTo: z.string().email().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await db.updateWhiteLabelSettings(id, ctx.user.id, updates);
        return { success: true };
      }),

    // Client Workspaces for Agency tier
    listClients: protectedProcedure
      .input(z.object({ whiteLabelId: z.number() }))
      .query(async ({ ctx, input }) => {
        const settings = await db.getWhiteLabelSettingsByUser(ctx.user.id);
        if (!settings || settings.id !== input.whiteLabelId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        return db.getClientWorkspacesByWhiteLabel(input.whiteLabelId);
      }),

    createClient: protectedProcedure
      .input(z.object({
        whiteLabelId: z.number(),
        clientName: z.string().min(1).max(100),
        clientEmail: z.string().email().optional(),
        clientLogoUrl: z.string().url().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const settings = await db.getWhiteLabelSettingsByUser(ctx.user.id);
        if (!settings || settings.id !== input.whiteLabelId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const result = await db.createClientWorkspace({
          whiteLabelId: input.whiteLabelId,
          organizationId: 1, // Default org
          clientName: input.clientName,
          clientEmail: input.clientEmail,
          clientLogoUrl: input.clientLogoUrl,
        });
        return result;
      }),

    updateClient: protectedProcedure
      .input(z.object({
        id: z.number(),
        whiteLabelId: z.number(),
        clientName: z.string().min(1).max(100).optional(),
        clientEmail: z.string().email().optional(),
        clientLogoUrl: z.string().url().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const settings = await db.getWhiteLabelSettingsByUser(ctx.user.id);
        if (!settings || settings.id !== input.whiteLabelId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const { id, whiteLabelId, ...updates } = input;
        await db.updateClientWorkspace(id, whiteLabelId, updates);
        return { success: true };
      }),
  }),

  // ============================================
  // Phase 8 - Video Scripts & System Influencers
  // ============================================
  videoScripts: router({
    // Get all system video scripts (public)
    listSystem: publicProcedure.query(async () => {
      return db.getVideoScripts();
    }),

    // Get user's custom scripts
    listMine: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserVideoScripts(ctx.user.id);
    }),

    // Get a specific script by slug
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return db.getVideoScriptBySlug(input.slug);
      }),

    // Get a specific script by ID
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getVideoScriptById(input.id);
      }),

    // Create a custom script
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(200),
        scriptType: z.enum(["master", "tiktok", "youtube_shorts", "instagram_reels", "agency", "custom"]),
        durationSeconds: z.number().min(5).max(600).optional(),
        scenes: z.array(z.object({
          sceneNumber: z.number(),
          title: z.string(),
          dialogue: z.string(),
          visualNotes: z.string().optional(),
          onScreenText: z.string().optional(),
          durationHint: z.string().optional(),
        })).optional(),
        fullScript: z.string().optional(),
        deliveryNotes: z.object({
          pacing: z.string().optional(),
          emphasis: z.array(z.string()).optional(),
          pauses: z.array(z.string()).optional(),
          tone: z.string().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createVideoScript({
          userId: ctx.user.id,
          ...input,
          isPublished: true,
          isSystemScript: false,
        });
        return result;
      }),

    // Update a custom script
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(200).optional(),
        durationSeconds: z.number().min(5).max(600).optional(),
        scenes: z.array(z.object({
          sceneNumber: z.number(),
          title: z.string(),
          dialogue: z.string(),
          visualNotes: z.string().optional(),
          onScreenText: z.string().optional(),
          durationHint: z.string().optional(),
        })).optional(),
        fullScript: z.string().optional(),
        deliveryNotes: z.object({
          pacing: z.string().optional(),
          emphasis: z.array(z.string()).optional(),
          pauses: z.array(z.string()).optional(),
          tone: z.string().optional(),
        }).optional(),
        isPublished: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await db.updateVideoScript(id, ctx.user.id, updates);
        return { success: true };
      }),

    // Generate a custom script based on brand brain
    generate: protectedProcedure
      .input(z.object({
        scriptType: z.enum(["master", "tiktok", "youtube_shorts", "instagram_reels", "agency", "custom"]),
        topic: z.string().min(1).max(500),
        targetAudience: z.string().optional(),
        keyMessage: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get user's brand brain for context
        const brandBrain = await db.getBusinessDna(ctx.user.id);
        
        const durationGuide: Record<string, string> = {
          master: "75-90 seconds",
          tiktok: "20-30 seconds",
          youtube_shorts: "45 seconds",
          instagram_reels: "30-45 seconds",
          agency: "60 seconds",
          custom: "60-90 seconds",
        };

        const systemPrompt = `You are an expert video script writer for Matango.ai. Create compelling video scripts that follow the Matango brand philosophy:

- NEVER list features
- NEVER sound like a SaaS ad
- Focus on the "system vs tools" narrative
- Use short, declarative sentences
- Include strategic pauses
- Speak with calm authority and inevitability
- Reinforce: "One loop. One brand brain. Always-on growth."

${brandBrain ? `Brand Context:
- Product: ${brandBrain.productName}
- Tagline: ${brandBrain.tagline || ""}
- Key Outcomes: ${(brandBrain.keyOutcomes || []).join(", ")}
- Differentiators: ${(brandBrain.differentiators || []).join(", ")}
- Brand Tone: ${brandBrain.brandTone || "professional"}` : ""}

Generate a ${durationGuide[input.scriptType]} video script.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Create a ${input.scriptType} video script about: ${input.topic}${input.targetAudience ? `\nTarget audience: ${input.targetAudience}` : ""}${input.keyMessage ? `\nKey message: ${input.keyMessage}` : ""}\n\nRespond with a JSON object containing:\n- name: script title\n- durationSeconds: estimated duration\n- scenes: array of {sceneNumber, title, dialogue, visualNotes, onScreenText, durationHint}\n- fullScript: concatenated dialogue\n- deliveryNotes: {pacing, emphasis[], pauses[], tone}` },
          ],
        });

        try {
          const rawContent = response.choices[0]?.message?.content;
          const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent) || "{}";
          const jsonMatch = content.match(/\{[\s\S]*\}/)
          const scriptData = JSON.parse(jsonMatch ? jsonMatch[0] : content);
          
          // Save the generated script
          const result = await db.createVideoScript({
            userId: ctx.user.id,
            name: scriptData.name || `${input.scriptType} Script - ${input.topic}`,
            scriptType: input.scriptType,
            durationSeconds: scriptData.durationSeconds,
            scenes: scriptData.scenes,
            fullScript: scriptData.fullScript,
            deliveryNotes: scriptData.deliveryNotes,
            isPublished: true,
            isSystemScript: false,
          });

          return { ...result, script: scriptData };
        } catch (e) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate script" });
        }
      }),
  }),

  // System Influencers (official Matango personas)
  systemInfluencers: router({
    list: publicProcedure.query(async () => {
      return db.getSystemInfluencers();
    }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return db.getSystemInfluencerBySlug(input.slug);
      }),
  }),
});
export type AppRouter = typeof appRouter;
