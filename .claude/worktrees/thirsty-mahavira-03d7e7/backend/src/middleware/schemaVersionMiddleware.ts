import { Request, Response, NextFunction } from "express";

const DEFAULT_SCHEMA_VERSION = "0.1";
const VERSION_HEADER = "X-FluencyTracr-Schema-Version";
const DEPRECATION_HEADER = "X-FluencyTracr-Schema-Deprecated";

const parseCsvEnvVersions = (raw: string | undefined) =>
  (raw ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

const getAcceptedVersions = () => {
  const configured = parseCsvEnvVersions(process.env.SCHEMA_ACCEPTED_VERSIONS);
  if (configured.length > 0) {
    return configured;
  }
  return [DEFAULT_SCHEMA_VERSION];
};

const getDeprecatedVersions = () => new Set(parseCsvEnvVersions(process.env.SCHEMA_DEPRECATED_VERSIONS));

export const schemaVersionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const acceptedVersions = getAcceptedVersions();
  const version = req.header(VERSION_HEADER);
  if (!version || !acceptedVersions.includes(version)) {
    return res.status(400).json({
      error: "Invalid schema version",
      expected: acceptedVersions,
      received: version ?? null
    });
  }
  const deprecatedVersions = getDeprecatedVersions();
  if (deprecatedVersions.has(version)) {
    res.setHeader(DEPRECATION_HEADER, "true");
  }
  return next();
};
