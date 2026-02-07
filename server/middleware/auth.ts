import { Request, Response, NextFunction, RequestHandler } from "express";
import { storage } from "../storage";

export const USER_ID_COOKIE_NAME = "ubos_user_id";

export interface AuthenticatedRequest extends Request {
  user?: {
    claims: {
      sub: string;
    };
  };
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const result: Record<string, string> = {};

  for (const part of header.split(";")) {
    const [rawKey, ...rawValueParts] = part.trim().split("=");
    if (!rawKey) continue;
    result[rawKey] = decodeURIComponent(rawValueParts.join("=") ?? "");
  }

  return result;
}

export function getUserIdFromRequest(req: Request): string | undefined {
  // SECURITY: Header-based authentication is for development/testing ONLY
  // THREAT_MODEL.md: T1.2 (Authentication Header Forgery)
  // In production, this authentication method MUST be disabled
  const isProduction = process.env.NODE_ENV === "production";
  
  // AI-NOTE: Environment-based auth strategy - header auth in dev only; MUST block header auth in production to prevent impersonation
  if (!isProduction) {
    // Allow non-browser callers to impersonate a user via header (DEV ONLY).
    // This keeps development + automation simple without an external auth provider.
    const headerUserId = req.header("x-user-id") || req.header("x-user");
    if (headerUserId) {
      // console.warn(`[DEV] Header-based auth used for user: ${headerUserId}`); // Reduce noise
      return headerUserId as string;
    }
  } else {
    // PRODUCTION: Explicitly reject header-based authentication
    const headerUserId = req.header("x-user-id") || req.header("x-user");
    if (headerUserId) {
      console.error(
        `[SECURITY] Attempted header-based auth in production rejected. ` +
        `IP: ${req.ip}, User-Agent: ${req.get('user-agent')}`
      );
      // Don't use header value in production - fall through to cookie auth
    }
  }

  // Browser path: our `/api/login` endpoint stores the user id in an HttpOnly cookie.
  const cookies = parseCookies(req.header("cookie"));
  return cookies[USER_ID_COOKIE_NAME];
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  // Standardize where handlers read the authenticated user.
  // We mimic a minimal “claims.sub” shape to ease upgrades to a real auth provider later.
  (req as AuthenticatedRequest).user = { claims: { sub: userId } };
  next();
};

export async function getOrCreateOrg(userId: string): Promise<string> {
  // Ensure every user has an organization; most API handlers assume `orgId` exists.
  // This keeps first-run UX simple: sign in once → data is immediately writable.
  let org = await storage.getUserOrganization(userId);
  if (!org) {
    org = await storage.createOrganization(
      { name: "My Organization", slug: `org-${userId.slice(0, 8)}` },
      userId,
    );
  }
  return org.id;
}
