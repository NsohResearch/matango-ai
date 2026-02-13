import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { sdk } from "./sdk";
import { serveStatic, setupVite } from "./vite";
import { handleStripeWebhook } from "../stripe-webhook";
import Stripe from "stripe";
import { PRODUCTS } from "../products";
import { requestLogger, errorLogger, logger } from "./logger";
import { userRateLimit } from "./rateLimit";
import { healthRouter } from "./health";
import { salesLeads } from "../../drizzle/schema";
import { getDb } from "../db";
import { sendSalesLeadNotification } from "../mailgun";
import sseRouter from "../routes/sse";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Stripe webhook must be registered BEFORE body parsers
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

  // Production middleware
  app.use(requestLogger);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Health check endpoints (before rate limiting)
  app.use(healthRouter);
  
  // Rate limiting for API routes
  app.use("/api", userRateLimit);

  // Stripe checkout endpoint
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2025-12-15.clover",
  });

  app.post("/api/stripe/checkout", async (req, res) => {
    try {
      const { planId, userId, userEmail, userName, billingCycle = "monthly" } = req.body;
      const product = PRODUCTS[planId as keyof typeof PRODUCTS];

      if (!product) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      // Get price based on billing cycle
      const price = billingCycle === "yearly" ? product.yearlyPrice : product.monthlyPrice;
      
      if (price <= 0) {
        return res.status(400).json({ error: "This plan requires contacting sales" });
      }

      const origin = req.headers.origin || "http://localhost:3000";
      const isSubscription = billingCycle === "yearly" || billingCycle === "monthly";

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: product.currency,
              product_data: {
                name: `${product.name} (${billingCycle === "yearly" ? "Annual" : "Monthly"})`,
                description: product.description,
              },
              unit_amount: price,
              recurring: billingCycle === "yearly" 
                ? { interval: "year" } 
                : { interval: "month" },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${origin}/dashboard?payment=success`,
        cancel_url: `${origin}/pricing?payment=cancelled`,
        customer_email: userEmail,
        client_reference_id: userId?.toString(),
        allow_promotion_codes: true,
        metadata: {
          user_id: userId?.toString() || "",
          customer_email: userEmail || "",
          customer_name: userName || "",
          plan: planId,
          billing_cycle: billingCycle,
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("[Stripe] Checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });
  // Contact Sales API for Agency++ leads
  app.post("/api/contact-sales", async (req, res) => {
    try {
      const { name, email, company, companySize, phone, message } = req.body;

      // Validate required fields
      if (!name || !email || !company) {
        return res.status(400).json({ error: "Name, email, and company are required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      const db = await getDb();
      if (!db) {
        console.error("Database not available");
        return res.status(503).json({ error: "Service temporarily unavailable" });
      }

      // Insert the lead into the database
      const result = await db
        .insert(salesLeads)
        .values({
          name,
          email,
          company,
          companySize: companySize || null,
          phone: phone || null,
          message: message || null,
          status: "new",
          source: "agency_plus_pricing",
        });

      console.log(`New sales lead received: ${name} from ${company} (${email})`);

      // Send email notification to sales team
      const emailResult = await sendSalesLeadNotification({
        name,
        email,
        company,
        companySize,
        phone,
        message,
      });

      if (!emailResult.success) {
        console.warn(`[Contact Sales] Failed to send notification email: ${emailResult.error}`);
      }

      res.json({
        success: true,
        message: "Thank you! Our team will contact you within 24 hours.",
        leadId: result[0].insertId,
      });
    } catch (error) {
      console.error("Error submitting sales lead:", error);
      res.status(500).json({ error: "Failed to submit. Please try again." });
    }
  });

  // Admin API for sales leads management
  app.get("/api/admin/leads", async (req, res) => {
    try {
      // TODO: Add proper admin authentication check
      const db = await getDb();
      if (!db) {
        return res.status(503).json({ error: "Database not available" });
      }

      const leads = await db.select().from(salesLeads).orderBy(salesLeads.createdAt);
      res.json({ leads });
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.patch("/api/admin/leads/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ["new", "contacted", "qualified", "converted", "closed"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const db = await getDb();
      if (!db) {
        return res.status(503).json({ error: "Database not available" });
      }

      const { eq } = await import("drizzle-orm");
      await db.update(salesLeads).set({ status }).where(eq(salesLeads.id, parseInt(id)));
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating lead status:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // SSE routes for real-time job updates
  app.use("/api/sse", async (req, res, next) => {
    // Extract user from session for SSE routes
    try {
      const user = await sdk.authenticateRequest(req);
      (req as any).user = user;
    } catch {
      (req as any).user = null;
    }
    next();
  }, sseRouter);

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
