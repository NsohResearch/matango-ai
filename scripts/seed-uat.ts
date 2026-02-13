/**
 * Matango.ai UAT Database Seed Script
 * 
 * Creates deterministic test users and sample data for UAT testing.
 * 
 * Usage:
 *   pnpm seed:uat
 *   # or
 *   npx tsx scripts/seed-uat.ts
 */

import { getDb } from "../server/db";
import { users, influencers, brandBrain, creatorProjects, creatorScenes } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// UAT Test Users
const UAT_USERS = [
  {
    openId: "oid_uat_superadmin",
    name: "Matango Super Admin",
    email: "superadmin@matango.local",
    role: "super_admin" as const,
    plan: "agency_plus" as const,
    tenantStatus: "active" as const,
    onboardingCompleted: true,
  },
  {
    openId: "oid_uat_admin",
    name: "Matango Admin",
    email: "admin@matango.local",
    role: "admin" as const,
    plan: "agency" as const,
    tenantStatus: "active" as const,
    onboardingCompleted: true,
  },
  {
    openId: "oid_uat_pro_user",
    name: "Pro Test User",
    email: "pro@matango.local",
    role: "user" as const,
    plan: "pro" as const,
    tenantStatus: "active" as const,
    onboardingCompleted: true,
  },
  {
    openId: "oid_uat_free_user",
    name: "Free Test User",
    email: "free@matango.local",
    role: "user" as const,
    plan: "free" as const,
    tenantStatus: "active" as const,
    onboardingCompleted: false,
  },
  {
    openId: "oid_uat_suspended_user",
    name: "Suspended Test User",
    email: "suspended@matango.local",
    role: "user" as const,
    plan: "pro" as const,
    tenantStatus: "suspended" as const,
    suspensionReason: "UAT test account - suspended state",
    onboardingCompleted: true,
  },
];

async function seedUsers(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  console.log("Seeding UAT users...");
  
  for (const user of UAT_USERS) {
    // Check if user already exists
    const existing = await db.select().from(users).where(eq(users.openId, user.openId));
    
    if (existing.length === 0) {
      await db.insert(users).values(user);
      console.log(`  Created user: ${user.email}`);
    } else {
      console.log(`  User already exists: ${user.email}`);
    }
  }
}

async function seedInfluencers(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  console.log("Seeding UAT influencers...");
  
  // Get the pro user
  const proUser = await db.select().from(users).where(eq(users.openId, "oid_uat_pro_user"));
  if (proUser.length === 0) return;
  
  const userId = proUser[0]!.id;
  
  // Check if influencer already exists
  const existing = await db.select().from(influencers).where(eq(influencers.userId, userId));
  if (existing.length > 0) {
    console.log("  Influencers already seeded");
    return;
  }
  
  await db.insert(influencers).values([
    {
      userId,
      name: "K'ah",
      age: 25,
      bio: "Your AI-Amplified Operator assistant for marketing excellence",
      personality: "Friendly, knowledgeable, proactive",
      tags: ["marketing", "AI", "assistant"],
      stats: { followers: 10000, likes: 50000, posts: 100 },
      isPublic: true,
    },
    {
      userId,
      name: "Luna Digital",
      age: 28,
      bio: "Tech influencer specializing in AI and automation",
      personality: "Professional, innovative, inspiring",
      tags: ["tech", "AI", "innovation"],
      stats: { followers: 25000, likes: 120000, posts: 250 },
      isPublic: true,
    },
  ]);
  
  console.log("  Created 2 test influencers");
}

async function seedBrandBrain(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  console.log("Seeding UAT Brand Brain...");
  
  // Get the pro user
  const proUser = await db.select().from(users).where(eq(users.openId, "oid_uat_pro_user"));
  if (proUser.length === 0) return;
  
  const userId = proUser[0]!.id;
  
  // Check if brand brain already exists
  const existing = await db.select().from(brandBrain).where(eq(brandBrain.userId, userId));
  if (existing.length > 0) {
    console.log("  Brand Brain already seeded");
    return;
  }
  
  await db.insert(brandBrain).values({
    userId,
    brandName: "Matango Test Brand",
    tagline: "AI-Powered Marketing Excellence",
    mission: "To democratize AI marketing for creators and businesses of all sizes",
    values: "Innovation, Authenticity, Accessibility, Results-Driven",
    voiceTone: "Professional yet approachable, confident but not arrogant",
    targetAudience: "Small business owners, content creators, marketing professionals",
    visualStyle: "Modern, clean, tech-forward with organic elements",
    colorPalette: ["#CCFF00", "#1A1A2E", "#FFFFFF", "#6B7280"],
    competitors: ["Buffer", "Hootsuite", "Later"],
    uniqueSellingPoints: ["AI-first approach", "AAO technology", "Integrated video studio"],
  });
  
  console.log("  Created Brand Brain for pro user");
}

async function seedCreatorProjects(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  console.log("Seeding UAT Creator OS projects...");
  
  // Get the pro user
  const proUser = await db.select().from(users).where(eq(users.openId, "oid_uat_pro_user"));
  if (proUser.length === 0) return;
  
  const userId = proUser[0]!.id;
  
  // Check if projects already exist
  const existing = await db.select().from(creatorProjects).where(eq(creatorProjects.userId, userId));
  if (existing.length > 0) {
    console.log("  Creator projects already seeded");
    return;
  }
  
  // Create a sample project
  const projectResult = await db.insert(creatorProjects).values({
    userId,
    title: "Product Launch Video",
    aspectRatio: "16:9",
    status: "draft",
  });
  
  const projectId = Number((projectResult as any)[0]?.insertId ?? 0);
  
  if (projectId > 0) {
    // Add sample scenes
    await db.insert(creatorScenes).values([
      {
        projectId,
        title: "Intro",
        orderIndex: 0,
        duration: 5,
        script: "Welcome to Matango.ai - where AI meets marketing excellence.",
        backgroundType: "color",
        backgroundValue: "#1A1A2E",
        transition: "fade",
        transitionDuration: 500,
      },
      {
        projectId,
        title: "Features Overview",
        orderIndex: 1,
        duration: 10,
        script: "Discover our AI-Amplified Operators that work 24/7 to grow your brand.",
        backgroundType: "color",
        backgroundValue: "#CCFF00",
        transition: "slide",
        transitionDuration: 300,
      },
      {
        projectId,
        title: "Call to Action",
        orderIndex: 2,
        duration: 5,
        script: "Start your free trial today and experience the future of marketing.",
        backgroundType: "color",
        backgroundValue: "#1A1A2E",
        transition: "fade",
        transitionDuration: 500,
      },
    ]);
    
    console.log("  Created sample project with 3 scenes");
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("Matango.ai UAT Database Seed");
  console.log("=".repeat(60));
  console.log();
  
  const db = await getDb();
  if (!db) {
    console.error("Failed to connect to database");
    process.exit(1);
  }
  
  try {
    await seedUsers(db);
    await seedInfluencers(db);
    await seedBrandBrain(db);
    await seedCreatorProjects(db);
    
    console.log();
    console.log("=".repeat(60));
    console.log("UAT seed complete!");
    console.log("=".repeat(60));
    console.log();
    console.log("Test accounts created:");
    console.log("  - superadmin@matango.local (super_admin, agency_plus)");
    console.log("  - admin@matango.local (admin, agency)");
    console.log("  - pro@matango.local (user, pro) - with sample data");
    console.log("  - free@matango.local (user, free)");
    console.log("  - suspended@matango.local (user, pro, suspended)");
    console.log();
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
