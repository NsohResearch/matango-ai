// Stripe Product Configuration for Matango.ai
// Define all products and pricing here for centralized management

export const PRODUCTS = {
  FREE: {
    id: "free",
    name: "Free",
    description: "Get started with Matango.ai",
    features: [
      "1 AI Influencer",
      "3 Image generations/month",
      "7 days trial",
      "Basic templates",
      "Community support",
      "Matango watermark",
    ],
    excludedFeatures: [
      "Brand Brain",
      "Video generation",
      "Team collaboration",
      "Analytics dashboard",
      "API access",
    ],
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: "usd",
    credits: 3,
    maxInfluencers: 1,
    maxVideoGenerations: 0,
    maxTeamMembers: 1,
    maxCustomDomains: 0,
    maxCustomersBrands: 0,
    hasBrandBrain: false,
    hasAnalytics: false,
    hasApiAccess: false,
    hasWatermark: true,
    trialDays: 7,
    stripePriceId: null,
    stripeYearlyPriceId: null,
  },
  BASIC: {
    id: "basic",
    name: "Basic",
    description: "For solopreneurs and creators",
    features: [
      "5 AI Influencers",
      "100 Image generations/month",
      "3 Custom Domains",
      "3 Unlimited customers/brands",
      "All templates",
      "Email support",
      "No watermark",
      "Brand Brain",
      "10 Video generations/month",
      "Basic analytics",
    ],
    excludedFeatures: [
      "Team collaboration",
      "API access",
    ],
    monthlyPrice: 19900, // $199.00 in cents
    yearlyPrice: 199000, // $1,990.00 in cents (approx 2 months free)
    currency: "usd",
    credits: 100,
    maxInfluencers: 5,
    maxVideoGenerations: 10,
    maxTeamMembers: 1,
    maxCustomDomains: 3,
    maxCustomersBrands: 3,
    hasBrandBrain: true,
    hasAnalytics: true,
    hasApiAccess: false,
    hasWatermark: false,
    stripePriceId: "price_1SnOLtDcq9WDEzjkBLXJlmkL",
    stripeYearlyPriceId: "price_1SnOXfDcq9WDEzjki5WvL3uN",
  },
  AGENCY: {
    id: "agency",
    name: "Agency",
    description: "For teams and agencies",
    features: [
      "Unlimited AI Influencers",
      "500 Image generations/month",
      "All templates + custom",
      "Priority support",
      "White-label option",
      "20 Custom Domains",
      "20 customers/brands",
      "Advanced Brand Brain",
      "50 Video generations/month",
      "Full analytics + AI insights",
      "5 Team members",
      "API access",
    ],
    excludedFeatures: [],
    monthlyPrice: 39900, // $399.00 in cents
    yearlyPrice: 399000, // $3,990.00 in cents (approx 2 months free)
    currency: "usd",
    credits: 500,
    maxInfluencers: -1, // unlimited
    maxVideoGenerations: 50,
    maxTeamMembers: 5,
    maxCustomDomains: 20,
    maxCustomersBrands: 20,
    hasBrandBrain: true,
    hasAnalytics: true,
    hasApiAccess: true,
    hasWatermark: false,
    isPopular: true,
    stripePriceId: "price_1SnOMTDcq9WDEzjky0Ru4H1U",
    stripeYearlyPriceId: "price_1SnOZ2Dcq9WDEzjkjw8CELRW",
  },
  AGENCY_PLUS: {
    id: "agency_plus",
    name: "Agency++",
    description: "Everything in Agency, unlimited scale",
    features: [
      "Everything in Agency",
      "Unlimited Image generations/month",
      "All templates + custom",
      "Priority support",
      "White-label option",
      "Unlimited Custom Domains",
      "Unlimited customers/brands",
      "Advanced Brand Brain",
      "200 Video generations/month",
    ],
    excludedFeatures: [],
    monthlyPrice: -1, // Contact sales
    yearlyPrice: -1, // Contact sales
    currency: "usd",
    credits: -1, // unlimited
    maxInfluencers: -1, // unlimited
    maxVideoGenerations: 200,
    maxTeamMembers: -1, // unlimited
    maxCustomDomains: -1, // unlimited
    maxCustomersBrands: -1, // unlimited
    hasBrandBrain: true,
    hasAnalytics: true,
    hasApiAccess: true,
    hasWatermark: false,
    isEnterprise: true,
    stripePriceId: null, // Contact sales
    stripeYearlyPriceId: null,
  },
} as const;

export type ProductId = keyof typeof PRODUCTS;
export type Product = typeof PRODUCTS[ProductId];

// Helper function to get price based on billing cycle
export function getPrice(productId: ProductId, billingCycle: "monthly" | "yearly"): number {
  const product = PRODUCTS[productId];
  return billingCycle === "monthly" ? product.monthlyPrice : product.yearlyPrice;
}

// Helper function to get Stripe price ID
export function getStripePriceId(productId: ProductId, billingCycle: "monthly" | "yearly"): string | null {
  const product = PRODUCTS[productId];
  return billingCycle === "monthly" ? product.stripePriceId : product.stripeYearlyPriceId;
}

// Helper function to check if user has access to a feature
export function hasFeatureAccess(
  userPlan: ProductId,
  feature: "brandBrain" | "analytics" | "apiAccess" | "videoGeneration"
): boolean {
  const product = PRODUCTS[userPlan];
  switch (feature) {
    case "brandBrain":
      return product.hasBrandBrain;
    case "analytics":
      return product.hasAnalytics;
    case "apiAccess":
      return product.hasApiAccess;
    case "videoGeneration":
      return product.maxVideoGenerations > 0;
    default:
      return false;
  }
}
