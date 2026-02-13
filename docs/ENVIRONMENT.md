# Matango.ai Environment Configuration

This document describes all environment variables required to run Matango.ai.

## Core Application

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Environment mode: `development`, `test`, or `production` |
| `PORT` | No | Server port (default: 3000) |

## Database

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | MySQL/TiDB connection string |

## Authentication (Manus OAuth)

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Session cookie signing secret (min 32 chars) |
| `VITE_APP_ID` | Yes | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | Yes | Manus OAuth backend base URL |
| `VITE_OAUTH_PORTAL_URL` | Yes | Manus login portal URL (frontend) |
| `OWNER_OPEN_ID` | Yes | Owner's Manus OpenID |
| `OWNER_NAME` | No | Owner's display name |

## Manus Built-in APIs (Forge)

| Variable | Required | Description |
|----------|----------|-------------|
| `BUILT_IN_FORGE_API_URL` | Yes | Manus Forge API endpoint |
| `BUILT_IN_FORGE_API_KEY` | Yes | Server-side Forge API key |
| `VITE_FRONTEND_FORGE_API_URL` | Yes | Frontend Forge API endpoint |
| `VITE_FRONTEND_FORGE_API_KEY` | Yes | Frontend Forge API key |

## Email Service (Mailgun)

| Variable | Required | Description |
|----------|----------|-------------|
| `MAILGUN_API_KEY` | Yes | Mailgun API key |
| `MAILGUN_DOMAIN` | Yes | Mailgun sending domain |
| `SALES_NOTIFICATION_EMAIL` | No | Email for sales notifications |

## Payment Processing (Stripe)

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key (frontend) |

## Social Media Integrations

| Variable | Required | Description |
|----------|----------|-------------|
| `INSTAGRAM_CLIENT_ID` | No | Instagram OAuth client ID |
| `INSTAGRAM_CLIENT_SECRET` | No | Instagram OAuth client secret |
| `TIKTOK_CLIENT_KEY` | No | TikTok OAuth client key |
| `TIKTOK_CLIENT_SECRET` | No | TikTok OAuth client secret |
| `YOUTUBE_CLIENT_ID` | No | YouTube OAuth client ID |
| `YOUTUBE_CLIENT_SECRET` | No | YouTube OAuth client secret |
| `LINKEDIN_CLIENT_ID` | No | LinkedIn OAuth client ID |
| `LINKEDIN_CLIENT_SECRET` | No | LinkedIn OAuth client secret |
| `FACEBOOK_CLIENT_ID` | No | Facebook OAuth client ID |
| `FACEBOOK_CLIENT_SECRET` | No | Facebook OAuth client secret |

## Analytics

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_ANALYTICS_WEBSITE_ID` | No | Analytics website ID |
| `VITE_ANALYTICS_ENDPOINT` | No | Analytics endpoint URL |

## Branding

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_APP_TITLE` | No | Application title |
| `VITE_APP_LOGO` | No | Application logo URL |

## Local Development

For local development, use the Management UI Settings panel to configure secrets, or contact the platform administrator for access to the required credentials.

All secrets are automatically injected into the environment when running on the Manus platform.
