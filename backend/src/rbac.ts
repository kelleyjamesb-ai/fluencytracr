import { Request, Response, NextFunction } from "express";
import { Role, RoleSchema } from "@learnaire/shared";

export type RequestWithRole = Request & { role?: Role };

const ROLE_ORDER: Role[] = ["admin", "exec", "enablement_lead"];

export const rbacMiddleware = (allowed: Role[]) => {
  return (req: RequestWithRole, _res: Response, next: NextFunction) => {
    const rawRole = req.header("x-role") ?? "exec";
    const role = RoleSchema.parse(rawRole);
    if (!allowed.includes(role)) {
      const err = new Error("Forbidden");
      return next(err);
    }
    req.role = role;
    return next();
  };
};

export const enforceAggregation = (req: RequestWithRole, _res: Response, next: NextFunction) => {
  const aggregation = req.query.aggregation?.toString() ?? "org";
  if (!(["org", "team"] as const).includes(aggregation as "org" | "team")) {
    const err = new Error("Invalid aggregation");
    return next(err);
  }
  if (req.role === "exec" && aggregation === "team") {
    const err = new Error("Exec cannot access team-level aggregation");
    return next(err);
  }
  return next();
};

export const hasMinimumRole = (role: Role, minimum: Role) => {
  return ROLE_ORDER.indexOf(role) <= ROLE_ORDER.indexOf(minimum);
};
