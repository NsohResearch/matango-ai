/**
 * Express Type Extensions
 * 
 * Consolidated type declarations for Express Request extensions.
 * This file should be the single source of truth for Express type augmentation.
 */

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

export {};
