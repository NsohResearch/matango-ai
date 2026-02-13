/**
 * Security Headers Middleware
 * 
 * Adds security-related HTTP headers to all responses.
 * Based on OWASP recommendations and modern browser security features.
 */

import type { Request, Response, NextFunction } from "express";

export interface SecurityHeadersOptions {
  /** Enable Content-Security-Policy header */
  contentSecurityPolicy?: boolean;
  /** Enable X-Frame-Options header */
  frameOptions?: boolean;
  /** Enable X-Content-Type-Options header */
  contentTypeOptions?: boolean;
  /** Enable X-XSS-Protection header */
  xssProtection?: boolean;
  /** Enable Referrer-Policy header */
  referrerPolicy?: boolean;
  /** Enable Strict-Transport-Security header */
  hsts?: boolean;
  /** Enable Permissions-Policy header */
  permissionsPolicy?: boolean;
}

const defaultOptions: SecurityHeadersOptions = {
  contentSecurityPolicy: true,
  frameOptions: true,
  contentTypeOptions: true,
  xssProtection: true,
  referrerPolicy: true,
  hsts: true,
  permissionsPolicy: true,
};

/**
 * Middleware to add security headers to responses
 */
export function securityHeadersMiddleware(
  options: SecurityHeadersOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    // Prevent MIME type sniffing
    if (opts.contentTypeOptions) {
      res.setHeader("X-Content-Type-Options", "nosniff");
    }

    // Prevent clickjacking
    if (opts.frameOptions) {
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
    }

    // Enable browser XSS filter (legacy, but still useful)
    if (opts.xssProtection) {
      res.setHeader("X-XSS-Protection", "1; mode=block");
    }

    // Control referrer information
    if (opts.referrerPolicy) {
      res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    }

    // Force HTTPS (only in production)
    if (opts.hsts && process.env.NODE_ENV === "production") {
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload"
      );
    }

    // Content Security Policy
    if (opts.contentSecurityPolicy) {
      const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https: http:",
        "media-src 'self' blob: https:",
        "connect-src 'self' https://api.stripe.com https://api.manus.im https://*.manus.space wss:",
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
        "upgrade-insecure-requests",
      ].join("; ");

      res.setHeader("Content-Security-Policy", csp);
    }

    // Permissions Policy (formerly Feature-Policy)
    if (opts.permissionsPolicy) {
      const permissions = [
        "accelerometer=()",
        "camera=()",
        "geolocation=()",
        "gyroscope=()",
        "magnetometer=()",
        "microphone=()",
        "payment=(self)",
        "usb=()",
      ].join(", ");

      res.setHeader("Permissions-Policy", permissions);
    }

    // Remove server identification
    res.removeHeader("X-Powered-By");

    next();
  };
}

/**
 * CORS configuration for API endpoints
 */
export function corsHeaders(
  allowedOrigins: string[] = []
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;

    // Check if origin is allowed
    if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS"
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Request-ID"
      );
      res.setHeader("Access-Control-Max-Age", "86400");
    }

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  };
}
