import { Request, Response } from "express";
import Stripe from "stripe";
import { getDb, resetTenantLimits } from "./db";
import { users } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { getPlanLimits, PlanId } from "./planLimits";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[Stripe Webhook] Missing STRIPE_WEBHOOK_SECRET");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[Stripe Webhook] Signature verification failed: ${message}`);
    return res.status(400).json({ error: `Webhook Error: ${message}` });
  }

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return res.json({
      verified: true,
    });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Stripe] Payment succeeded: ${paymentIntent.id}`);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        await handleSubscriptionUpdate(subscription, event.type);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case "customer.subscription.paused": {
        const subscription = event.data.object as any;
        await handleSubscriptionPaused(subscription);
        break;
      }
      case "customer.subscription.resumed": {
        const subscription = event.data.object as any;
        await handleSubscriptionResumed(subscription);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as any;
        console.log(`[Stripe] Invoice paid: ${invoice.id}, subscription: ${invoice.subscription}`);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        await handlePaymentFailed(invoice);
        break;
      }
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error processing event:", error);
    return res.status(500).json({ error: "Webhook handler failed" });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const plan = session.metadata?.plan as PlanId | undefined;

  if (!userId || !plan) {
    console.error("[Stripe] Missing user_id or plan in session metadata");
    return;
  }

  console.log(`[Stripe] Processing checkout for user ${userId}, plan: ${plan}`);

  const db = await getDb();
  if (!db) {
    console.error("[Stripe] Database not available");
    return;
  }

  // Get plan limits from centralized config
  const planLimits = getPlanLimits(plan);

  // Update user's plan and credits based on purchase
  const creditsToAdd: Record<string, number> = {
    starter: 50,
    pro: 200,
    lifetime: 500,
    basic: 100,
    agency: 500,
    agency_plus: 1000,
  };

  try {
    // Get current user
    const userResult = await db.select().from(users).where(eq(users.id, parseInt(userId))).limit(1);
    const currentUser = userResult[0];

    if (!currentUser) {
      console.error(`[Stripe] User ${userId} not found`);
      return;
    }

    // Update user plan and add credits
    await db.update(users).set({
      plan,
      credits: (currentUser.credits || 0) + (creditsToAdd[plan] || 0),
    }).where(eq(users.id, parseInt(userId)));

    // Update organization limits to match new plan
    await db.execute(
      sql`UPDATE organizations SET 
          plan = ${plan},
          maxBrands = ${planLimits.maxBrands},
          maxInfluencers = ${planLimits.maxInfluencers},
          maxVideoGenerations = ${planLimits.maxVideosPerMonth},
          updatedAt = NOW()
          WHERE ownerId = ${parseInt(userId)}`
    );

    // Sync tenant limits to match new plan
    await resetTenantLimits(parseInt(userId));

    console.log(`[Stripe] Updated user ${userId}: plan=${plan}, added ${creditsToAdd[plan] || 0} credits, synced organization limits`);
  } catch (error) {
    console.error("[Stripe] Error updating user:", error);
    throw error;
  }
}

/**
 * Handle subscription update events (created/updated)
 * Syncs Stripe subscription state to local user record
 */
async function handleSubscriptionUpdate(subscription: any, eventType: string) {
  const db = await getDb();
  if (!db) {
    console.error("[Stripe] Database not available for subscription update");
    return;
  }

  const customerId = subscription.customer;
  console.log(`[Stripe] Subscription ${eventType}: ${subscription.id}, customer: ${customerId}, status: ${subscription.status}`);

  // Find user by stripeCustomerId
  const userResult = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
  const user = userResult[0];
  if (!user) {
    console.warn(`[Stripe] No user found for customer ${customerId}`);
    return;
  }

  // Map Stripe status to local planStatus
  const statusMap: Record<string, string> = {
    active: "active",
    trialing: "trial",
    past_due: "past_due",
    canceled: "cancelled",
    unpaid: "past_due",
    incomplete: "none",
    incomplete_expired: "cancelled",
    paused: "active", // paused billing but still active
  };

  const localStatus = statusMap[subscription.status] || "none";

  await db.update(users).set({
    stripeSubscriptionId: subscription.id,
    planStatus: localStatus as any,
  }).where(eq(users.id, user.id));

  console.log(`[Stripe] Updated user ${user.id}: subscriptionId=${subscription.id}, planStatus=${localStatus}`);
}

/**
 * Handle subscription deleted (cancelled)
 */
async function handleSubscriptionDeleted(subscription: any) {
  const db = await getDb();
  if (!db) {
    console.error("[Stripe] Database not available for subscription deletion");
    return;
  }

  const customerId = subscription.customer;
  console.log(`[Stripe] Subscription deleted: ${subscription.id}, customer: ${customerId}`);

  const userResult = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
  const user = userResult[0];
  if (!user) {
    console.warn(`[Stripe] No user found for customer ${customerId}`);
    return;
  }

  // Downgrade to free plan
  await db.update(users).set({
    plan: "free",
    planStatus: "cancelled",
    stripeSubscriptionId: null,
  }).where(eq(users.id, user.id));

  // Reset tenant limits to free tier
  await resetTenantLimits(user.id);

  console.log(`[Stripe] Downgraded user ${user.id} to free plan after subscription deletion`);
}

/**
 * Handle subscription paused
 */
async function handleSubscriptionPaused(subscription: any) {
  const db = await getDb();
  if (!db) return;

  const customerId = subscription.customer;
  console.log(`[Stripe] Subscription paused: ${subscription.id}, customer: ${customerId}`);

  const userResult = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
  const user = userResult[0];
  if (!user) return;

  // Keep current plan but mark billing as paused
  await db.update(users).set({
    planStatus: "active", // Still active, just billing paused
  }).where(eq(users.id, user.id));

  console.log(`[Stripe] Marked user ${user.id} billing as paused`);
}

/**
 * Handle subscription resumed
 */
async function handleSubscriptionResumed(subscription: any) {
  const db = await getDb();
  if (!db) return;

  const customerId = subscription.customer;
  console.log(`[Stripe] Subscription resumed: ${subscription.id}, customer: ${customerId}`);

  const userResult = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
  const user = userResult[0];
  if (!user) return;

  await db.update(users).set({
    planStatus: "active",
  }).where(eq(users.id, user.id));

  console.log(`[Stripe] Resumed billing for user ${user.id}`);
}

/**
 * Handle failed invoice payment
 */
async function handlePaymentFailed(invoice: any) {
  const db = await getDb();
  if (!db) return;

  const customerId = invoice.customer;
  console.log(`[Stripe] Payment failed for invoice ${invoice.id}, customer: ${customerId}`);

  const userResult = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
  const user = userResult[0];
  if (!user) return;

  // Mark plan as past_due
  await db.update(users).set({
    planStatus: "past_due",
  }).where(eq(users.id, user.id));

  console.log(`[Stripe] Marked user ${user.id} as past_due after payment failure`);
}
