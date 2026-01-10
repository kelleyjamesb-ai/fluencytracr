import { Request, Response, NextFunction } from "express";
import { containsForbiddenFields, FORBIDDEN_FIELDS } from "@learnaire/shared";

export const rejectForbiddenFields = (req: Request, res: Response, next: NextFunction) => {
  if (containsForbiddenFields(req.body)) {
    return res.status(400).json({
      error: "Payload contains forbidden fields",
      forbiddenFields: FORBIDDEN_FIELDS
    });
  }
  return next();
};
