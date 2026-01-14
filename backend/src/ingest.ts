import { Request, Response, NextFunction } from "express";
import {
  containsForbiddenFields,
  containsPersonIdentifiers,
  FORBIDDEN_FIELDS,
  PERSON_IDENTIFIER_FIELDS
} from "@learnaire/shared";

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
