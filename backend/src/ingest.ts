import { Request, Response, NextFunction } from "express";
import {
  containsForbiddenFields,
  containsPersonIdentifiers,
  FORBIDDEN_FIELDS,
  PERSON_IDENTIFIER_FIELDS
} from "@fluencytracr/shared";
import { containsSQLInjectionPatterns } from "./sanitization";

/**
 * Check all string values in an object recursively for SQL injection patterns.
 */
const checkForSQLInjection = (obj: unknown): boolean => {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  const stack: unknown[] = [obj];
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;

    if (Array.isArray(current)) {
      stack.push(...current);
      continue;
    }

    for (const value of Object.values(current as Record<string, unknown>)) {
      if (typeof value === "string" && containsSQLInjectionPatterns(value)) {
        return true;
      }
      if (value && typeof value === "object") {
        stack.push(value);
      }
    }
  }
  return false;
};

export const rejectSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  if (checkForSQLInjection(req.body)) {
    console.warn(`[SECURITY] Potential SQL injection detected from ${req.ip}`);
    return res.status(400).json({
      error: "Invalid input",
      message: "Request contains potentially malicious content"
    });
  }
  return next();
};

export const rejectForbiddenFields = (req: Request, res: Response, next: NextFunction) => {
  if (containsForbiddenFields(req.body)) {
    return res.status(400).json({
      error: "Payload contains forbidden fields",
      forbiddenFields: FORBIDDEN_FIELDS
    });
  }
  return next();
};

export const rejectPersonIdentifiers = (req: Request, res: Response, next: NextFunction) => {
  if (containsPersonIdentifiers(req.body)) {
    return res.status(400).json({
      error: "Payload contains person identifiers",
      forbiddenFields: PERSON_IDENTIFIER_FIELDS
    });
  }
  return next();
};
