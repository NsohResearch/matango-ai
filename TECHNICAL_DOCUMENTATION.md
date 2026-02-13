# Matango.ai Technical Documentation

**Version:** 1.0  
**Last Updated:** January 8, 2026  
**Author:** Manus AI

---

## Executive Summary

Matango.ai is a comprehensive AI-powered marketing automation platform that enables businesses to create, manage, and optimize their marketing content across multiple channels. The platform is built on a modern full-stack architecture featuring React 19 on the frontend, Express.js with tRPC on the backend, and MySQL with Drizzle ORM for data persistence. The system integrates AI capabilities for content generation, image creation, and video production, while providing robust analytics and multi-channel publishing features.

---

## Table of Contents

1. [Tech Stack Overview](#tech-stack-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Implemented Features](#implemented-features)
5. [API Endpoints](#api-endpoints)
6. [Third-Party Integrations](#third-party-integrations)
7. [Security Considerations](#security-considerations)
8. [Production Readiness Assessment](#production-readiness-assessment)

---

## Tech Stack Overview

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.1 | UI framework with latest concurrent features |
| TypeScript | 5.9.3 | Type-safe JavaScript |
| Vite | 7.1.7 | Build tool and dev server |
| TailwindCSS | 4.1.14 | Utility-first CSS framework |
| Framer Motion | 12.23.22 | Animation library |
| Wouter | 3.3.5 | Lightweight routing |
| TanStack Query | 5.90.2 | Server state management |
| Radix UI | Various | Accessible component primitives |
| Recharts | 2.15.2 | Data visualization |
| Sonner | 2.0.7 | Toast notifications |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 22.13.0 | Runtime environment |
| Express | 4.21.2 | HTTP server framework |
| tRPC | 11.6.0 | End-to-end typesafe APIs |
| Drizzle ORM | 0.44.5 | TypeScript-first ORM |
| MySQL2 | 3.15.0 | Database driver |
| Jose | 6.1.0 | JWT handling |
| Zod | 4.1.12 | Schema validation |
| Stripe | 20.1.2 | Payment processing |

### Infrastructure

| Service | Purpose |
|---------|---------|
| AWS S3 | File storage (images, videos, assets) |
| MySQL | Primary database |
| Manus OAuth | Authentication provider |
| Stripe | Payment processing |

### Development Tools

| Tool | Purpose |
|------|---------|
| Vitest | Unit testing framework |
| Prettier | Code formatting |
| ESBuild | Production bundling |
| Drizzle Kit | Database migrations |

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    React 19 + Vite                       │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │    │
│  │  │  Pages   │  │Components│  │  Hooks   │  │   Lib    │ │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │    │
│  │                      │                                   │    │
│  │              ┌───────▼───────┐                          │    │
│  │              │  tRPC Client  │                          │    │
│  └──────────────┴───────────────┴──────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Server (Express.js)                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                     tRPC Router                          │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │    │
│  │  │ BrandBrain│  │ Campaign │  │Influencer│  │Analytics │ │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │    │
│  │  │  Social  │  │ A/B Test │  │WhiteLabel│  │  Leads   │ │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │                     Core Services                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │  │
│  │  │   Auth   │  │   LLM    │  │  Image   │  │  Storage │   │  │
│  │  │ (OAuth)  │  │ (Forge)  │  │ (Forge)  │  │  (S3)    │   │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         MySQL Database                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  35+ Tables: users, influencers, campaigns, leads, etc.  │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
/home/ubuntu/influencer-saas/
├── client/                    # Frontend React application
│   └── src/
│       ├── _core/            # Core utilities (auth, hooks)
│       ├── components/       # Reusable UI components
│       │   └── ui/          # Shadcn/Radix primitives
│       ├── lib/             # Utilities (trpc client)
│       └── pages/           # 26 page components
├── server/                   # Backend Express application
│   ├── _core/               # Core services
│   │   ├── auth.ts         # Authentication middleware
│   │   ├── llm.ts          # LLM integration (Forge API)
│   │   ├── image.ts        # Image generation (Forge API)
│   │   ├── storage.ts      # S3 storage helpers
│   │   └── oauth.ts        # OAuth configuration
│   ├── db.ts               # Database queries
│   └── routers.ts          # tRPC router definitions
├── drizzle/                 # Database layer
│   └── schema.ts           # 35+ table definitions
└── package.json            # Dependencies and scripts
```

---

## Database Schema

The database consists of 35+ tables organized into logical domains. Below is a summary of the key tables:

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | id, openId, name, email, role, plan, credits |
| `organizations` | Multi-tenant workspaces | id, ownerId, name, slug, plan, assetsLimit |
| `memberships` | Organization RBAC | organizationId, userId, role |

### AI Influencer System

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `influencers` | User-created AI personas | userId, name, personality, avatarUrl, stats |
| `influencer_content` | Generated images/posts | influencerId, imageUrl, prompt, contentType |
| `influencer_settings` | Generation settings | characterWeight, keepOutfit, defaultStyle |
| `influencer_personas` | Persona voice/style | styleGuide, vocabulary, hookPatterns |
| `system_influencers` | Official Matango personas | name, personaDescription, cameraRules |

### Brand Brain System

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `business_dna` | Core brand memory | productName, icpPersonas, keyOutcomes, brandTone |

### Campaign System

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `unified_campaigns` | Campaign entities | name, angle, status, impressions, clicks |
| `campaign_assets` | Multi-channel content | assetType, content, status, utmTracking |
| `campaigns` | Legacy story campaigns | influencerId, totalScenes, status |
| `campaign_scenes` | Campaign content pieces | prompt, caption, imageUrl, scheduledFor |

### Social & Publishing

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `social_connections` | OAuth connections | platform, accessToken, platformUsername |
| `social_posts` | Published content | platformPostId, status, metrics |
| `scheduled_posts` | Content calendar | scheduledFor, platform, status |

### Analytics & Optimization

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `analytics_data` | Influencer metrics | followers, likes, views, engagementRate |
| `analytics_events` | Event tracking | eventType, source, platform |
| `auto_insights` | AI recommendations | insightType, title, confidence |
| `ab_tests` | Experiments | testType, status, targetMetric |
| `ab_test_variants` | Test variations | content, impressions, conversionRate |

### CRM & Leads

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `leads` | Captured prospects | email, company, stage, utmSource |
| `landing_pages` | Hosted pages | headline, slug, views, conversions |
| `email_sequences` | Nurture campaigns | sequenceType, isActive |
| `email_sequence_steps` | Email content | subject, body, sent, opened |

### White-Label & Agency

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `white_label_settings` | Custom branding | brandName, logoUrl, customDomain |
| `custom_email_templates` | Branded emails | templateType, htmlContent |
| `client_workspaces` | Agency clients | clientName, accessToken |

### Video & Scripts

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `video_scripts` | Script content | scriptType, scenes, deliveryNotes |
| `character_training_jobs` | Model training | trainingImages, status, modelId |

---

## Implemented Features

### Phase 1: Core Platform

The foundation includes user authentication via Manus OAuth, a responsive homepage with the "End the Marketing Tool Parade" messaging, influencer discovery grid, pricing page with tiered plans, and Stripe payment integration. The cyber-noir design theme with Deep Teal, Midnight Blue, and Electric Lime creates a distinctive visual identity.

### Phase 2: AI Influencer Features

Users can create AI influencers with customizable personalities, generate AI-powered images using the Forge API, and engage in conversations with their influencers through a chat interface. The system maintains conversation history and generates contextually appropriate responses based on each influencer's defined personality traits.

### Phase 3: Content Management

The scheduling system enables users to plan content across Instagram, TikTok, Twitter, and YouTube with a calendar view. Analytics dashboards track engagement metrics including followers, likes, views, and engagement rates with trend visualization using Recharts.

### Phase 4: Advanced Features

The notification system sends email alerts for published posts and follower milestones. Content templates provide pre-built prompts across categories like product, lifestyle, fashion, and fitness. Team collaboration features allow inviting members with role-based permissions (owner, editor, viewer). Character consistency controls include a weight slider and outfit preservation toggle.

### Phase 5: Brand Brain System

The Brand Brain is the core differentiator of Matango.ai, serving as persistent brand memory. It captures product information, ICP personas with pains/goals/objections, value propositions, claims with proof mapping, and brand voice rules including forbidden phrases. The auto-enrich feature analyzes websites to extract brand information, and LinkedIn import pulls company data automatically.

### Phase 6: Multi-Channel Publishing

Social media API integrations connect to Instagram, Facebook, YouTube, TikTok, and LinkedIn via OAuth. The system supports auto-posting from scheduled content with status tracking. A/B testing enables campaign variants with traffic splitting, statistical significance calculation, and auto-optimization. White-label customization for agencies includes custom domains, branding, and client workspaces.

### Phase 7: Campaign Factory

The Campaign Factory generates multi-channel assets from a single campaign angle. Supported asset types include LinkedIn posts and carousels, X/Twitter threads, TikTok and Instagram Reel scripts, landing page copy, welcome and nurture emails, and Meta/LinkedIn/Google ads. Each campaign tracks impressions, clicks, conversions, and leads with UTM attribution.

### Phase 8: Video Scripts & AI Influencer

The official Matango AI influencer persona is defined with specific behavioral constraints and camera rules. Video scripts include a master 75-90 second version and short-form variants for TikTok (20-30s), YouTube Shorts (45s), and Agency demos (60s). The Video Script Generator page allows viewing system scripts and generating custom AI-powered scripts.

---

## API Endpoints

The backend exposes a tRPC router with the following namespaces:

| Router | Key Procedures |
|--------|----------------|
| `user` | getMe, updateProfile, getCredits |
| `influencer` | create, list, get, update, delete, generateImage |
| `chat` | sendMessage, getHistory |
| `schedule` | create, list, update, delete, publish |
| `analytics` | getDashboard, getInfluencerStats, trackEvent |
| `notifications` | list, markRead, unreadCount, updatePreferences |
| `templates` | list, create, use |
| `collaborators` | invite, list, updateRole, remove |
| `campaigns` | create, list, get, generateAssets |
| `brandBrain` | save, get, enrichFromWebsite, importFromLinkedIn |
| `socialConnections` | list, connect, disconnect, refresh |
| `abTests` | create, list, get, updateVariant, declareWinner |
| `whiteLabel` | get, update, verifyDomain |
| `leads` | create, list, update, updateStage |
| `videoScripts` | listSystem, get, generate |

---

## Third-Party Integrations

### Manus Forge API

The platform uses Manus Forge for AI capabilities:

- **LLM Integration**: Text generation for chat, content creation, and script writing via `invokeLLM()` function
- **Image Generation**: AI image creation for influencer avatars and content via `generateImage()` function
- **Video Generation**: Lip-sync and motion-sync video creation

### Stripe

Payment processing handles three subscription tiers:

| Plan | Price | Features |
|------|-------|----------|
| Free | $0 | 1 workspace, 20 assets/month |
| Basic | $29/month | 3 Brand Brains, 300 assets/month |
| Agency | $99/month | Unlimited workspaces, white-label |

Webhook handling processes `checkout.session.completed` and `customer.subscription.updated` events.

### AWS S3

File storage for:
- Influencer avatars and generated images
- Video content
- Training images for character models
- Campaign assets

### Social Media APIs

OAuth integrations for publishing:
- Meta Graph API (Instagram, Facebook)
- YouTube Data API
- TikTok API
- LinkedIn API

---

## Security Considerations

### Authentication

The platform uses Manus OAuth for authentication with JWT tokens stored in HTTP-only cookies. Session management includes automatic token refresh and secure logout.

### Authorization

Role-based access control operates at two levels:

1. **User Roles**: `user` and `admin`
2. **Organization Roles**: `owner`, `admin`, `marketer`, `viewer`

### Data Protection

- All API endpoints require authentication via `protectedProcedure`
- User data is scoped by `userId` in all queries
- Organization data is scoped by membership verification
- Sensitive tokens (OAuth, API keys) are stored encrypted

### Input Validation

Zod schemas validate all API inputs with strict type checking. The frontend uses react-hook-form with Zod resolvers for client-side validation.

---

## Production Readiness Assessment

### Current Status: Beta

The platform is feature-complete for the defined scope but requires additional hardening for production deployment.

### Completed

| Area | Status |
|------|--------|
| Core Features | All 8 phases implemented |
| Database Schema | 35+ tables defined and migrated |
| API Layer | Full tRPC implementation |
| Authentication | Manus OAuth integrated |
| Payment Processing | Stripe integration complete |
| File Storage | S3 integration complete |
| Unit Tests | 73 tests passing |
| TypeScript | No compilation errors |

### Recommended Before Production

| Priority | Item | Description |
|----------|------|-------------|
| **Critical** | Rate Limiting | Implement API rate limiting to prevent abuse |
| **Critical** | Error Monitoring | Add Sentry or similar for error tracking |
| **Critical** | Database Indexes | Add indexes for frequently queried columns |
| **Critical** | Input Sanitization | Audit all user inputs for XSS/injection |
| **High** | Load Testing | Verify performance under expected load |
| **High** | Backup Strategy | Implement automated database backups |
| **High** | Logging | Add structured logging with log aggregation |
| **High** | Health Checks | Add `/health` endpoint for monitoring |
| **Medium** | CDN | Configure CDN for static assets |
| **Medium** | Caching | Implement Redis for session/query caching |
| **Medium** | API Documentation | Generate OpenAPI spec from tRPC |
| **Low** | E2E Tests | Add Playwright tests for critical flows |

---

## Appendix: Environment Variables

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | JWT signing key |
| `OAUTH_SERVER_URL` | Manus OAuth server |
| `BUILT_IN_FORGE_API_KEY` | Forge API authentication |
| `BUILT_IN_FORGE_API_URL` | Forge API endpoint |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `VITE_APP_TITLE` | Application title |
| `VITE_APP_LOGO` | Logo URL |
| `VITE_OAUTH_PORTAL_URL` | OAuth portal URL |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe public key |

---

*Document generated by Manus AI for Matango.ai production readiness review.*


---

## Detailed Feature Documentation by Module

### 1. Brand Brain Module

**Location:** `client/src/pages/BrandBrain.tsx`, `server/routers.ts` (brandBrain router)

The Brand Brain is the central intelligence hub of Matango.ai, functioning as persistent brand memory that powers all content generation. When a user completes their Brand Brain, the system stores comprehensive brand information that contextualizes every piece of content created.

**Data Captured:**

| Field | Description |
|-------|-------------|
| Product Name | The brand or product being marketed |
| Website URL | Primary website with auto-validation and favicon display |
| Category | Industry vertical (SaaS, E-commerce, Agency, etc.) |
| Tagline | Core brand message |
| Brand Tone | Voice style (professional, friendly, authoritative, playful) |
| ICP Personas | Ideal customer profiles with pains, goals, objections |
| Key Outcomes | Primary value propositions |
| Differentiators | Competitive advantages |
| Claims & Proof | Marketing claims with supporting evidence |
| Voice Rules | Guidelines for content creation |
| Forbidden Phrases | Words/phrases to avoid |

**Key Features:**

The URL validation system provides real-time feedback with a green checkmark for valid URLs and displays the website's favicon. The LinkedIn import feature allows users to paste a company LinkedIn URL and auto-fill brand information using AI extraction. Four pre-built templates (SaaS, E-commerce, Agency, Coaching) provide one-click starting points with industry-appropriate defaults.

The auto-enrich feature analyzes the provided website URL using AI to extract taglines, key outcomes, and differentiators automatically. A completion score (0-100%) guides users through filling out all sections.

Upon saving, a success modal presents three clear next steps: Create a Campaign, Create an AI Influencer, or Generate Video Scripts.

---

### 2. Campaign Factory Module

**Location:** `client/src/pages/CampaignFactory.tsx`, `client/src/pages/Campaigns.tsx`

The Campaign Factory transforms brand strategy into executable multi-channel content. Users define a campaign angle, and the system generates platform-specific assets automatically.

**Supported Asset Types:**

| Platform | Asset Types |
|----------|-------------|
| LinkedIn | Posts, Carousels |
| X/Twitter | Threads, Single Posts |
| TikTok | Video Scripts |
| Instagram | Reel Scripts |
| Web | Landing Pages |
| Email | Welcome Sequences, Nurture Campaigns |
| Ads | Meta, LinkedIn, Google |

**Campaign Workflow:**

1. **Define Angle**: User specifies the campaign hook and target ICP
2. **Generate Assets**: AI creates content for selected channels using Brand Brain context
3. **Review & Edit**: User reviews generated content in a unified interface
4. **Schedule**: Content is scheduled across connected platforms
5. **Publish**: Auto-posting to connected social accounts
6. **Analyze**: Performance tracking with UTM attribution

**Campaign Statuses:** draft → generating → review → approved → scheduled → live → completed

---

### 3. AI Influencer Studio Module

**Location:** `client/src/pages/InfluencerStudio.tsx`, `client/src/pages/CreateInfluencer.tsx`

The Influencer Studio enables creation and management of AI-powered virtual brand ambassadors. Each influencer has a distinct personality, visual identity, and content style.

**Influencer Attributes:**

| Attribute | Description |
|-----------|-------------|
| Name | Display name |
| Age | Apparent age for persona |
| Bio | Background story |
| Personality | Character traits affecting content tone |
| Avatar | AI-generated or uploaded image |
| Tags | Categorization labels |
| Stats | Simulated follower/engagement metrics |

**Generation Features:**

The character consistency system uses a weight slider (0-100%) to control how closely generated images match the reference avatar. The "Keep Outfit" toggle preserves clothing across generations. Style presets include realistic, anime, artistic, and 3D rendering options.

**Persona Types:**

| Type | Description |
|------|-------------|
| Founder | Authoritative thought leader voice |
| Practitioner | Hands-on expert sharing tactics |
| Analyst | Data-driven insights focus |
| Custom | User-defined personality |

---

### 4. Video Studio Module

**Location:** `client/src/pages/VideoStudio.tsx`, `client/src/pages/VideoScripts.tsx`

The Video Studio provides AI-powered video creation capabilities including lip-sync, motion-sync, and video upscaling.

**Video Features:**

| Feature | Description |
|---------|-------------|
| Lip-Sync | Sync avatar mouth movements to audio |
| Motion-Sync | Add body movement animations |
| Video Upscale | Enhance video resolution |
| Chat-to-Edit | Natural language video editing |

**Video Script Generator:**

The system includes pre-built scripts for the official Matango AI influencer:

| Script Type | Duration | Purpose |
|-------------|----------|---------|
| Master Launch | 75-90s | Full product introduction |
| TikTok | 20-30s | Quick hook for viral reach |
| YouTube Shorts | 45s | Platform-optimized format |
| Agency Demo | 60s | B2B sales presentations |

Users can also generate custom scripts using AI, which creates scene-by-scene breakdowns with dialogue, visual notes, and on-screen text suggestions.

---

### 5. Social Connections Module

**Location:** `client/src/pages/SocialConnections.tsx`

The Social Connections module manages OAuth integrations with major social platforms for automated publishing.

**Supported Platforms:**

| Platform | API | Capabilities |
|----------|-----|--------------|
| Instagram | Meta Graph API | Posts, Stories, Reels |
| Facebook | Meta Graph API | Posts, Pages |
| YouTube | Google API | Videos, Shorts |
| TikTok | TikTok API | Videos |
| LinkedIn | LinkedIn API | Posts, Articles |

**Connection Flow:**

1. User initiates OAuth flow for desired platform
2. Platform authorization grants access tokens
3. Tokens stored encrypted in `social_connections` table
4. Automatic token refresh before expiration
5. Connection status displayed with sync timestamp

**Publishing Features:**

Scheduled posts automatically publish to connected accounts at the specified time. The system tracks post status (pending → publishing → published/failed) and captures platform-specific metrics (likes, comments, shares, views).

---

### 6. A/B Testing Module

**Location:** `client/src/pages/ABTesting.tsx`

The A/B Testing module enables data-driven optimization of marketing content through controlled experiments.

**Test Types:**

| Type | What's Tested |
|------|---------------|
| Caption | Different text variations |
| Image | Visual content alternatives |
| CTA | Call-to-action wording |
| Timing | Posting schedule optimization |
| Audience | Targeting variations |

**Test Configuration:**

| Setting | Description |
|---------|-------------|
| Traffic Split | Percentage allocation per variant |
| Target Metric | engagement, clicks, conversions, reach |
| Confidence Level | 90%, 95%, or 99% |
| Min Sample Size | Minimum impressions before declaring winner |
| Auto-Optimize | Automatically shift traffic to winner |

**Statistical Analysis:**

The system calculates conversion rates and engagement rates for each variant, determines statistical significance based on the configured confidence level, and can automatically declare a winner and shift 100% of traffic to the winning variant.

---

### 7. Analytics Hub Module

**Location:** `client/src/pages/AnalyticsHub.tsx`, `client/src/pages/Analytics.tsx`

The Analytics Hub provides unified performance tracking across all channels and campaigns.

**Dashboard Metrics:**

| Metric | Description |
|--------|-------------|
| Total Reach | Aggregate impressions across platforms |
| Engagement Rate | Interactions / Impressions |
| Follower Growth | Net new followers over time |
| Content Performance | Per-post metrics |
| Campaign ROI | Leads and conversions by campaign |

**Auto-Insights:**

The AI generates actionable recommendations based on performance data:

| Insight Type | Example |
|--------------|---------|
| Winning Angle | "Campaign X outperforming by 40% for ICP Y" |
| Underperforming Persona | "Analyst persona engagement down 20%" |
| Channel Recommendation | "LinkedIn driving 3x more leads than Twitter" |
| Hook Refresh | "Opening hooks showing fatigue, suggest refresh" |
| Next Best Action | "Schedule follow-up campaign for engaged leads" |

---

### 8. Leads CRM Module

**Location:** `client/src/pages/Leads.tsx`

The Leads module provides basic CRM functionality for managing prospects captured through campaigns.

**Lead Attributes:**

| Field | Description |
|-------|-------------|
| Email | Primary contact |
| Name | Lead name |
| Company | Organization |
| Role | Job title |
| Source | Acquisition channel |
| UTM Parameters | Campaign attribution |
| Stage | Pipeline position |
| Notes | Activity log |

**Pipeline Stages:**

new → contacted → qualified → proposal → negotiation → won/lost

**Attribution Tracking:**

Every lead captures UTM parameters (source, medium, campaign, content) for accurate attribution back to specific campaigns and assets.

---

### 9. White-Label Module

**Location:** `client/src/pages/WhiteLabel.tsx`

The White-Label module enables Agency tier users to rebrand the platform for their clients.

**Customization Options:**

| Setting | Description |
|---------|-------------|
| Brand Name | Custom platform name |
| Logo | Custom logo upload |
| Favicon | Browser tab icon |
| Primary Color | Main brand color |
| Secondary Color | Supporting color |
| Accent Color | Highlight color |
| Custom Domain | yourplatform.com |
| Hide Matango Branding | Remove "Powered by" |
| Custom Footer | Agency-specific text |
| Support Email | Custom support address |
| Terms/Privacy URLs | Custom legal pages |

**Client Workspaces:**

Agencies can create separate workspaces for each client with isolated data, custom branding per client, and access tokens for client login.

---

### 10. Team Collaboration Module

**Location:** `client/src/pages/Team.tsx`

The Team module enables multi-user collaboration on influencer management.

**Role Permissions:**

| Role | Capabilities |
|------|--------------|
| Owner | Full access, can delete, manage billing |
| Editor | Create/edit content, cannot delete |
| Viewer | Read-only access |

**Invitation Flow:**

1. Owner sends email invitation with unique token
2. Invitee clicks link and authenticates
3. Membership created with specified role
4. Invitee gains access to shared influencers

---

### 11. Notifications Module

**Location:** `client/src/pages/Notifications.tsx`

The Notifications module keeps users informed of important events.

**Notification Types:**

| Type | Trigger |
|------|---------|
| Post Published | Scheduled content goes live |
| Milestone | Follower count reaches threshold |
| Team Invite | New collaboration invitation |
| Weekly Report | Performance summary |

**Delivery Channels:**

Notifications appear in-app with unread count badge and can optionally trigger email delivery based on user preferences.

---

### 12. Content Templates Module

**Location:** `client/src/pages/Templates.tsx`

The Templates module provides reusable content generation prompts.

**Template Categories:**

| Category | Example Use Case |
|----------|------------------|
| Product | Product photography prompts |
| Lifestyle | Day-in-the-life content |
| Fashion | Outfit and style posts |
| Fitness | Workout and wellness content |
| Travel | Location-based content |
| Food | Recipe and dining posts |
| Beauty | Makeup and skincare |
| Tech | Product reviews and demos |
| Custom | User-created templates |

**Template Attributes:**

Each template includes a name, description, prompt template with variables, style preset, character weight, and usage count for popularity tracking.

---

## Test Coverage

The project includes 73 unit tests across 5 test files:

| Test File | Tests | Coverage Area |
|-----------|-------|---------------|
| `routers.test.ts` | 32 | Core API endpoints |
| `brandBrain.test.ts` | 12 | Brand Brain CRUD operations |
| `videoScripts.test.ts` | 13 | Video script generation |
| `phase6.test.ts` | 15 | Social connections, A/B testing |
| `auth.logout.test.ts` | 1 | Authentication logout |

All tests pass with the current codebase.

---

*End of Technical Documentation*
