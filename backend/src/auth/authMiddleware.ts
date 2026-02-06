import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "./jwt";
import { RoleSchema } from "@learnaire/shared";
import type { Role } from "@learnaire/shared";

// Augment Express Request with verified identity fields
declare global {
  namespace Express {
    interface Request {
      sub?: string;
      role?: Role;
    }
  }
}

// Exact-match allowlist: (method, path) tuples only.
// No prefix matching. No wildcards. No /auth/* broad patterns.
const UNAUTHENTICATED_ALLOWLIST: ReadonlyArray<Readonly<{ method: string; path: string }>> = [
  { method: "GET", path: "/health" },
  { method: "POST", path: "/auth/login" },
];

const normalizePath = (p: string): string => {
  if (p.length > 1 && p.endsWith("/")) {
    return p.slice(0, -1);
  }
  return p;
};

const isAllowlisted = (method: string, path: string): boolean => {
  const normalized = normalizePath(path);
  return UNAUTHENTICATED_ALLOWLIST.some(
    (entry) => entry.method === method && entry.path === normalized
  );
};

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  // Use req.path (not req.originalUrl) per specification
  if (isAllowlisted(req.method, req.path)) {
    return next();
  }

  const token = req.cookies?.token;
  if (!token || typeof token !== "string") {
    return res.status(401).json({ error: "Unauthorized", message: "Authentication required" });
  }

  try {
    const claims = await verifyJwt(token);

    // Invalid claim shape (including role not in enum) returns 401, not 400
    if (!claims.sub) {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid token claims" });
    }

    const roleResult = RoleSchema.safeParse(claims.role);
    if (!roleResult.success) {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid token claims" });
    }

    req.sub = claims.sub;
    req.role = roleResult.data;
    return next();
  } catch {
    // Expired, invalid signature, malformed — all 401
    return res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
  }
};
