import { Request, Response, NextFunction } from "express";

const ACCEPTED_VERSIONS = ["0.1"];
const VERSION_HEADER = "X-FluencyTracr-Schema-Version";

export const schemaVersionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const version = req.header(VERSION_HEADER);
  if (!version || !ACCEPTED_VERSIONS.includes(version)) {
    return res.status(400).json({
      error: "Invalid schema version",
      expected: ACCEPTED_VERSIONS
    });
  }
  return next();
};
