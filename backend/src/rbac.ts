import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { Role, RoleSchema } from "@fluencytracr/shared";
import { isAuthLockdownRequired, resolveJwtSecret } from "./auth_secret";

declare global {
  namespace Express {
    interface Request {
      role?: Role;
      authWarning?: string;
      authSub?: string;
      authOrgId?: string;
    }
  }
}

export type RequestWithRole = Request & {
  role?: Role;
  authWarning?: string;
  authSub?: string;
  authOrgId?: string;
};

const ROLE_ORDER: Role[] = ["ADMIN", "GOV_OPERATOR", "EXEC_VIEWER", "ENABLEMENT_LEAD"];

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
};

const verifyHs256Jwt = (token: string, secret: string) => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  const signedContent = `${headerB64}.${payloadB64}`;
  const expectedSig = crypto.createHmac("sha256", secret).update(signedContent).digest();
  const providedSig = decodeBase64Url(signatureB64);
  if (expectedSig.length !== providedSig.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(expectedSig, providedSig)) {
    return null;
  }
  try {
    const payload = JSON.parse(decodeBase64Url(payloadB64).toString("utf8")) as Record<string, unknown>;
    const exp = typeof payload.exp === "number" ? payload.exp : null;
    if (exp !== null && Date.now() >= exp * 1000) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

export const authMiddleware = (req: RequestWithRole, res: Response, next: NextFunction) => {
  const isTestEnv = process.env.NODE_ENV === "test";
  const isDevHeaderAuthEnabled = process.env.DEV_HEADER_AUTH === "1" || process.env.DEV_HEADER_AUTH === "true";
  const authHeader = req.header("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

  if (bearer) {
    const { secret, isFallback } = resolveJwtSecret();
    if (!secret) {
      return res.status(500).json({ error: "Server auth misconfigured" });
    }
    if (isFallback) {
      console.warn("[AUTH] JWT_SECRET missing; using preview/test fallback secret");
    }
    const payload = verifyHs256Jwt(bearer, secret);
    if (!payload) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const roleParsed = RoleSchema.safeParse(payload.role);
    if (!roleParsed.success) {
      return res.status(401).json({ error: "Invalid token role" });
    }
    const orgId = typeof payload.org_id === "string" ? payload.org_id : null;
    if (!orgId) {
      return res.status(401).json({ error: "Invalid token org_id" });
    }
    req.role = roleParsed.data;
    if (typeof payload.sub === "string" && payload.sub.length > 0) {
      req.authSub = payload.sub;
    }
    req.authOrgId = orgId;
    return next();
  }

  if (isTestEnv || isDevHeaderAuthEnabled) {
    const rawRole = req.header("x-role");
    const rawOrgId = req.header("x-org-id");
    if (rawRole) {
      const parseResult = RoleSchema.safeParse(rawRole);
      if (parseResult.success && (isTestEnv || rawOrgId)) {
        req.role = parseResult.data;
        req.authSub = req.header("x-sub") ?? undefined;
        if (rawOrgId) {
          req.authOrgId = rawOrgId;
        }
        req.authWarning = isTestEnv ? "Test-only header auth" : "Dev-only header auth";
      }
      req.authWarning = isTestEnv ? "Test-only header auth" : "Dev-only header auth";
    }
    return next();
  }

  return res.status(401).json({ error: "Authentication required" });
};

const getRequestedOrgId = (req: RequestWithRole): string | null => {
  const fromParams = (req.params?.orgId ?? req.params?.org_id) as string | undefined;
  const fromQueryRaw = req.query?.org_id ?? req.query?.orgId;
  const fromQuery = typeof fromQueryRaw === "string" ? fromQueryRaw : undefined;
  const body = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : null;
  const fromBodyOrgId = body && typeof body.org_id === "string" ? body.org_id : undefined;
  const fromBodyOrgCamel = body && typeof body.orgId === "string" ? body.orgId : undefined;
  return fromParams ?? fromQuery ?? fromBodyOrgId ?? fromBodyOrgCamel ?? null;
};

export const orgScopeMiddleware = (req: RequestWithRole, res: Response, next: NextFunction) => {
  const isTestEnv = process.env.NODE_ENV === "test";
  if (isTestEnv && !req.authOrgId) {
    return next();
  }
  if (!isTestEnv && !isAuthLockdownRequired() && !req.authOrgId) {
    return next();
  }
  if (!req.authOrgId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const requestedOrgId = getRequestedOrgId(req);
  if (requestedOrgId && requestedOrgId !== req.authOrgId) {
    return res.status(403).json({ error: "Forbidden", message: "Token org scope does not match request org" });
  }
  return next();
};

export const rbacMiddleware = (allowed: Role[]) => {
  return (req: RequestWithRole, res: Response, next: NextFunction) => {
    const role = req.role;
    if (!role) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if ((role === "ADMIN" || role === "GOV_OPERATOR") && req.authWarning) {
      console.warn(
        `[SECURITY] Unverified privileged role claim (${role}) from IP: ${req.ip}, ` +
        `endpoint: ${req.method} ${req.path}, ` +
        `timestamp: ${new Date().toISOString()}`
      );
      req.authWarning = "Role claim is not verified - implement authentication";
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
