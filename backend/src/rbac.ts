import { Request, Response, NextFunction } from "express";
import type { Role } from "@learnaire/shared";

/**
 * Phase 6B-A: RBAC middleware.
 *
 * Role is read ONLY from req.role, which is set by the auth middleware
 * after verifying a signed JWT. The x-role header is ignored entirely.
 * Any request reaching this middleware without a verified role is rejected.
 */

export type RequestWithRole = Request & { role?: Role; sub?: string };

const ROLE_ORDER: Role[] = ["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"];

export const rbacMiddleware = (allowed: Role[]) => {
  return (req: RequestWithRole, res: Response, next: NextFunction) => {
    const role = req.role;

    // If auth middleware did not set a role, reject.
    // This should not happen if auth middleware is correctly registered.
    if (!role) {
      return res.status(401).json({ error: "Unauthorized", message: "No verified identity" });
    }

    if (!allowed.includes(role)) {
      return res.status(403).json({ error: "Forbidden", message: "Insufficient permissions for this endpoint" });
    }

    return next();
  };
};

export const enforceAggregation = (req: RequestWithRole, res: Response, next: NextFunction) => {
  const aggregation = req.query.aggregation?.toString() ?? "org";
  if (!(["org", "team"] as const).includes(aggregation as "org" | "team")) {
    return res.status(400).json({ error: "Invalid aggregation", message: "Aggregation must be 'org' or 'team'" });
  }
  if (req.role === "EXEC_VIEWER" && aggregation === "team") {
    return res.status(403).json({ error: "Forbidden", message: "Executive viewers cannot access team-level aggregation" });
  }
  return next();
};

export const hasMinimumRole = (role: Role, minimum: Role) => {
  return ROLE_ORDER.indexOf(role) <= ROLE_ORDER.indexOf(minimum);
};
