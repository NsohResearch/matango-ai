import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  templateMarketplaceListings,
  templatePurchases,
  templateReviews,
  creatorTemplates,
  users,
} from "../../drizzle/schema";
import { eq, desc, and, like, or, sql, inArray } from "drizzle-orm";

export const marketplaceRouter = router({
  // ============================================
  // Marketplace Listings
  // ============================================

  // List marketplace templates with filtering
  list: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        pricingType: z.enum(["free", "paid", "subscription"]).optional(),
        search: z.string().optional(),
        sortBy: z.enum(["newest", "popular", "rating", "price_low", "price_high"]).default("popular"),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      const conditions = [eq(templateMarketplaceListings.status, "approved")];
      
      if (input.category && input.category !== "all") {
        conditions.push(eq(templateMarketplaceListings.category, input.category as any));
      }
      
      if (input.pricingType) {
        conditions.push(eq(templateMarketplaceListings.pricingType, input.pricingType));
      }
      
      if (input.search) {
        conditions.push(
          or(
            like(templateMarketplaceListings.title, `%${input.search}%`),
            like(templateMarketplaceListings.description, `%${input.search}%`)
          )!
        );
      }
      
      let orderBy;
      switch (input.sortBy) {
        case "newest":
          orderBy = desc(templateMarketplaceListings.createdAt);
          break;
        case "popular":
          orderBy = desc(templateMarketplaceListings.downloads);
          break;
        case "rating":
          orderBy = desc(templateMarketplaceListings.rating);
          break;
        case "price_low":
          orderBy = templateMarketplaceListings.price;
          break;
        case "price_high":
          orderBy = desc(templateMarketplaceListings.price);
          break;
        default:
          orderBy = desc(templateMarketplaceListings.downloads);
      }
      
      const listings = await db
        .select({
          id: templateMarketplaceListings.id,
          templateId: templateMarketplaceListings.templateId,
          sellerId: templateMarketplaceListings.sellerId,
          title: templateMarketplaceListings.title,
          description: templateMarketplaceListings.description,
          thumbnailUrl: templateMarketplaceListings.thumbnailUrl,
          previewVideoUrl: templateMarketplaceListings.previewVideoUrl,
          pricingType: templateMarketplaceListings.pricingType,
          price: templateMarketplaceListings.price,
          category: templateMarketplaceListings.category,
          tags: templateMarketplaceListings.tags,
          downloads: templateMarketplaceListings.downloads,
          rating: templateMarketplaceListings.rating,
          reviewCount: templateMarketplaceListings.reviewCount,
          isFeatured: templateMarketplaceListings.isFeatured,
          isVerified: templateMarketplaceListings.isVerified,
          createdAt: templateMarketplaceListings.createdAt,
          sellerName: users.name,
        })
        .from(templateMarketplaceListings)
        .leftJoin(users, eq(templateMarketplaceListings.sellerId, users.id))
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset);
      
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(templateMarketplaceListings)
        .where(and(...conditions));
      
      return {
        listings,
        total: countResult?.count || 0,
        hasMore: input.offset + listings.length < (countResult?.count || 0),
      };
    }),

  // Get featured templates
  featured: publicProcedure.query(async () => {
    const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    
    const listings = await db
      .select({
        id: templateMarketplaceListings.id,
        templateId: templateMarketplaceListings.templateId,
        sellerId: templateMarketplaceListings.sellerId,
        title: templateMarketplaceListings.title,
        description: templateMarketplaceListings.description,
        thumbnailUrl: templateMarketplaceListings.thumbnailUrl,
        previewVideoUrl: templateMarketplaceListings.previewVideoUrl,
        pricingType: templateMarketplaceListings.pricingType,
        price: templateMarketplaceListings.price,
        category: templateMarketplaceListings.category,
        downloads: templateMarketplaceListings.downloads,
        rating: templateMarketplaceListings.rating,
        reviewCount: templateMarketplaceListings.reviewCount,
        isFeatured: templateMarketplaceListings.isFeatured,
        sellerName: users.name,
      })
      .from(templateMarketplaceListings)
      .leftJoin(users, eq(templateMarketplaceListings.sellerId, users.id))
      .where(
        and(
          eq(templateMarketplaceListings.status, "approved"),
          eq(templateMarketplaceListings.isFeatured, true)
        )
      )
      .orderBy(desc(templateMarketplaceListings.downloads))
      .limit(8);
    
    return listings;
  }),

  // Get single listing details
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      const [listing] = await db
        .select({
          id: templateMarketplaceListings.id,
          templateId: templateMarketplaceListings.templateId,
          sellerId: templateMarketplaceListings.sellerId,
          title: templateMarketplaceListings.title,
          description: templateMarketplaceListings.description,
          longDescription: templateMarketplaceListings.longDescription,
          thumbnailUrl: templateMarketplaceListings.thumbnailUrl,
          previewVideoUrl: templateMarketplaceListings.previewVideoUrl,
          screenshots: templateMarketplaceListings.screenshots,
          pricingType: templateMarketplaceListings.pricingType,
          price: templateMarketplaceListings.price,
          currency: templateMarketplaceListings.currency,
          category: templateMarketplaceListings.category,
          tags: templateMarketplaceListings.tags,
          downloads: templateMarketplaceListings.downloads,
          rating: templateMarketplaceListings.rating,
          reviewCount: templateMarketplaceListings.reviewCount,
          isFeatured: templateMarketplaceListings.isFeatured,
          isVerified: templateMarketplaceListings.isVerified,
          status: templateMarketplaceListings.status,
          createdAt: templateMarketplaceListings.createdAt,
          sellerName: users.name,
        })
        .from(templateMarketplaceListings)
        .leftJoin(users, eq(templateMarketplaceListings.sellerId, users.id))
        .where(eq(templateMarketplaceListings.id, input.id));
      
      if (!listing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
      }
      
      return listing;
    }),

  // Create a new marketplace listing
  create: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        title: z.string().min(3).max(255),
        description: z.string().max(500).optional(),
        longDescription: z.string().max(5000).optional(),
        previewVideoUrl: z.string().url().optional(),
        thumbnailUrl: z.string().url().optional(),
        screenshots: z.array(z.string().url()).max(5).optional(),
        pricingType: z.enum(["free", "paid", "subscription"]),
        price: z.number().min(0).default(0),
        category: z.enum([
          "social_media",
          "youtube",
          "ads",
          "tutorials",
          "presentations",
          "explainers",
          "testimonials",
          "promos",
          "stories",
          "other",
        ]),
        tags: z.array(z.string()).max(10).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      // Verify the user owns the template
      const [template] = await db
        .select()
        .from(creatorTemplates)
        .where(
          and(
            eq(creatorTemplates.id, input.templateId),
            eq(creatorTemplates.userId, ctx.user.id)
          )
        );
      
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found or you don't have permission",
        });
      }
      
      const [result] = await db.insert(templateMarketplaceListings).values({
        templateId: input.templateId,
        sellerId: ctx.user.id,
        title: input.title,
        description: input.description,
        longDescription: input.longDescription,
        previewVideoUrl: input.previewVideoUrl,
        thumbnailUrl: input.thumbnailUrl || template.thumbnailUrl,
        screenshots: input.screenshots,
        pricingType: input.pricingType,
        price: input.pricingType === "free" ? 0 : input.price,
        category: input.category,
        tags: input.tags,
        status: "pending_review",
      });
      
      return { id: result.insertId, message: "Listing submitted for review" };
    }),

  // Update a listing
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(3).max(255).optional(),
        description: z.string().max(500).optional(),
        longDescription: z.string().max(5000).optional(),
        previewVideoUrl: z.string().url().optional(),
        thumbnailUrl: z.string().url().optional(),
        screenshots: z.array(z.string().url()).max(5).optional(),
        pricingType: z.enum(["free", "paid", "subscription"]).optional(),
        price: z.number().min(0).optional(),
        category: z.enum([
          "social_media",
          "youtube",
          "ads",
          "tutorials",
          "presentations",
          "explainers",
          "testimonials",
          "promos",
          "stories",
          "other",
        ]).optional(),
        tags: z.array(z.string()).max(10).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      const [listing] = await db
        .select()
        .from(templateMarketplaceListings)
        .where(
          and(
            eq(templateMarketplaceListings.id, input.id),
            eq(templateMarketplaceListings.sellerId, ctx.user.id)
          )
        );
      
      if (!listing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found or you don't have permission",
        });
      }
      
      const { id, ...updateData } = input;
      
      await db
        .update(templateMarketplaceListings)
        .set({
          ...updateData,
          status: "pending_review", // Re-submit for review on update
        })
        .where(eq(templateMarketplaceListings.id, id));
      
      return { success: true };
    }),

  // Delete a listing
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      const [listing] = await db
        .select()
        .from(templateMarketplaceListings)
        .where(
          and(
            eq(templateMarketplaceListings.id, input.id),
            eq(templateMarketplaceListings.sellerId, ctx.user.id)
          )
        );
      
      if (!listing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found or you don't have permission",
        });
      }
      
      await db
        .delete(templateMarketplaceListings)
        .where(eq(templateMarketplaceListings.id, input.id));
      
      return { success: true };
    }),

  // Get user's own listings
  myListings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    
    const listings = await db
      .select()
      .from(templateMarketplaceListings)
      .where(eq(templateMarketplaceListings.sellerId, ctx.user.id))
      .orderBy(desc(templateMarketplaceListings.createdAt));
    
    return listings;
  }),

  // ============================================
  // Purchases
  // ============================================

  // Purchase a template
  purchase: protectedProcedure
    .input(z.object({ listingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      const [listing] = await db
        .select()
        .from(templateMarketplaceListings)
        .where(
          and(
            eq(templateMarketplaceListings.id, input.listingId),
            eq(templateMarketplaceListings.status, "approved")
          )
        );
      
      if (!listing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
      }
      
      // Check if already purchased
      const [existingPurchase] = await db
        .select()
        .from(templatePurchases)
        .where(
          and(
            eq(templatePurchases.listingId, input.listingId),
            eq(templatePurchases.buyerId, ctx.user.id),
            eq(templatePurchases.status, "completed")
          )
        );
      
      if (existingPurchase) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already own this template",
        });
      }
      
      // For free templates, complete immediately
      if (listing.pricingType === "free") {
        await db.insert(templatePurchases).values({
          listingId: input.listingId,
          buyerId: ctx.user.id,
          sellerId: listing.sellerId,
          price: 0,
          status: "completed",
        });
        
        // Increment download count
        await db
          .update(templateMarketplaceListings)
          .set({ downloads: sql`downloads + 1` })
          .where(eq(templateMarketplaceListings.id, input.listingId));
        
        return { success: true, templateId: listing.templateId };
      }
      
      // For paid templates, create pending purchase and return checkout info
      const [result] = await db.insert(templatePurchases).values({
        listingId: input.listingId,
        buyerId: ctx.user.id,
        sellerId: listing.sellerId,
        price: listing.price,
        status: "pending",
      });
      
      return {
        success: true,
        purchaseId: result.insertId,
        requiresPayment: true,
        price: listing.price,
        currency: listing.currency,
      };
    }),

  // Get user's purchased templates
  myPurchases: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    
    const purchases = await db
      .select({
        id: templatePurchases.id,
        listingId: templatePurchases.listingId,
        price: templatePurchases.price,
        status: templatePurchases.status,
        createdAt: templatePurchases.createdAt,
        title: templateMarketplaceListings.title,
        thumbnailUrl: templateMarketplaceListings.thumbnailUrl,
        templateId: templateMarketplaceListings.templateId,
      })
      .from(templatePurchases)
      .leftJoin(
        templateMarketplaceListings,
        eq(templatePurchases.listingId, templateMarketplaceListings.id)
      )
      .where(
        and(
          eq(templatePurchases.buyerId, ctx.user.id),
          eq(templatePurchases.status, "completed")
        )
      )
      .orderBy(desc(templatePurchases.createdAt));
    
    return purchases;
  }),

  // Check if user owns a template
  checkOwnership: protectedProcedure
    .input(z.object({ listingId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      const [purchase] = await db
        .select()
        .from(templatePurchases)
        .where(
          and(
            eq(templatePurchases.listingId, input.listingId),
            eq(templatePurchases.buyerId, ctx.user.id),
            eq(templatePurchases.status, "completed")
          )
        );
      
      return { owned: !!purchase };
    }),

  // ============================================
  // Reviews
  // ============================================

  // Get reviews for a listing
  getReviews: publicProcedure
    .input(
      z.object({
        listingId: z.number(),
        limit: z.number().min(1).max(50).default(10),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      const reviews = await db
        .select({
          id: templateReviews.id,
          rating: templateReviews.rating,
          title: templateReviews.title,
          content: templateReviews.content,
          isVerifiedPurchase: templateReviews.isVerifiedPurchase,
          isHelpful: templateReviews.isHelpful,
          createdAt: templateReviews.createdAt,
          userName: users.name,
        })
        .from(templateReviews)
        .leftJoin(users, eq(templateReviews.userId, users.id))
        .where(eq(templateReviews.listingId, input.listingId))
        .orderBy(desc(templateReviews.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      
      return reviews;
    }),

  // Add a review
  addReview: protectedProcedure
    .input(
      z.object({
        listingId: z.number(),
        rating: z.number().min(1).max(5),
        title: z.string().max(255).optional(),
        content: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      // Check if user has purchased the template
      const [purchase] = await db
        .select()
        .from(templatePurchases)
        .where(
          and(
            eq(templatePurchases.listingId, input.listingId),
            eq(templatePurchases.buyerId, ctx.user.id),
            eq(templatePurchases.status, "completed")
          )
        );
      
      // Check if user already reviewed
      const [existingReview] = await db
        .select()
        .from(templateReviews)
        .where(
          and(
            eq(templateReviews.listingId, input.listingId),
            eq(templateReviews.userId, ctx.user.id)
          )
        );
      
      if (existingReview) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already reviewed this template",
        });
      }
      
      await db.insert(templateReviews).values({
        listingId: input.listingId,
        userId: ctx.user.id,
        rating: input.rating,
        title: input.title,
        content: input.content,
        isVerifiedPurchase: !!purchase,
      });
      
      // Update listing rating
      const [ratingResult] = await db
        .select({
          avgRating: sql<number>`AVG(rating) * 100`,
          count: sql<number>`COUNT(*)`,
        })
        .from(templateReviews)
        .where(eq(templateReviews.listingId, input.listingId));
      
      await db
        .update(templateMarketplaceListings)
        .set({
          rating: Math.round(ratingResult?.avgRating || 0),
          reviewCount: ratingResult?.count || 0,
        })
        .where(eq(templateMarketplaceListings.id, input.listingId));
      
      return { success: true };
    }),

  // ============================================
  // Categories
  // ============================================

  // Get category stats
  categories: publicProcedure.query(async () => {
    const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    
    const categories = await db
      .select({
        category: templateMarketplaceListings.category,
        count: sql<number>`COUNT(*)`,
      })
      .from(templateMarketplaceListings)
      .where(eq(templateMarketplaceListings.status, "approved"))
      .groupBy(templateMarketplaceListings.category);
    
    return categories;
  }),
});
