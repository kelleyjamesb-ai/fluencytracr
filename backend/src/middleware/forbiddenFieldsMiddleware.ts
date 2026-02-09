import { Request, Response, NextFunction } from "express";
import { findForbiddenField } from "../validation/forbiddenFields";

export const forbiddenFieldsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const match = findForbiddenField(req.body);
  if (match) {
    return res.status(400).json({
      error: "Forbidden field",
      field_path: match.path,
      rule: "no_raw_content_or_direct_identifiers"
    });
  }
  return next();
};
