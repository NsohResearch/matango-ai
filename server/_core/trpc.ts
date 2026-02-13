import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Middleware to check tenant status - blocks suspended users
 */
const checkTenantStatus = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  // Check if user is suspended
  const tenantStatus = (ctx.user as any).tenantStatus;
  if (tenantStatus === "suspended") {
    throw new TRPCError({ 
      code: "FORBIDDEN", 
      message: "Your account has been suspended. Please contact support for assistance." 
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Middleware to check tenant status for write operations - blocks suspended and read_only users
 */
const checkTenantWriteAccess = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  const tenantStatus = (ctx.user as any).tenantStatus;
  
  if (tenantStatus === "suspended") {
    throw new TRPCError({ 
      code: "FORBIDDEN", 
      message: "Your account has been suspended. Please contact support for assistance." 
    });
  }

  if (tenantStatus === "read_only") {
    throw new TRPCError({ 
      code: "FORBIDDEN", 
      message: "Your account is in read-only mode. You cannot create or modify content." 
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser).use(checkTenantStatus);

/**
 * Protected procedure that also checks for write access (blocks read_only users)
 */
export const protectedWriteProcedure = t.procedure.use(requireUser).use(checkTenantWriteAccess);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || (ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin')) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/**
 * Super admin procedure - only for super_admin role
 */
export const superAdminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'super_admin') {
      throw new TRPCError({ 
        code: "FORBIDDEN", 
        message: "This action requires super admin privileges." 
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
