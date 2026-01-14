import { Request, Response, NextFunction } from "express";
import { Role, RoleSchema } from "@learnaire/shared";

export type RequestWithRole = Request & { role?: Role };

const ROLE_ORDER: Role[] = ["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"];

export const rbacMiddleware = (allowed: Role[]) => {
  return (req: RequestWithRole, res: Response, next: NextFunction) => {
    const rawRole = req.header("x-role") ?? "EXEC_VIEWER";
    const parseResult = RoleSchema.safeParse(rawRole);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid role", message: `Role must be one of: ${allowed.join(", ")}` });
    }
    const role = parseResult.data;
    if (!allowed.includes(role)) {
      return res.status(403).json({ error: "Forbidden", message: "Insufficient permissions for this endpoint" });
    }
    req.role = role;
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
