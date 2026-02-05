import { Request, Response, NextFunction } from "express";
import { findAmbiguitySignal } from "../validation/ambiguity";
import { assertGovernanceEnforcement } from "../config/enforcement";

assertGovernanceEnforcement();

export const ambiguityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const match = findAmbiguitySignal(req.body);
  if (match) {
    return res.status(400).json({
      error: "Ambiguous input rejected",
      field_path: match.path
    });
  }
  return next();
};
