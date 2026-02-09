export const SCHEMA_VERSION_HEADER = "X-FluencyTracr-Schema-Version";
export const SCHEMA_VERSION = "0.1";

export const withSchemaVersion = (headers: Record<string, string> = {}) => ({
  ...headers,
  [SCHEMA_VERSION_HEADER]: SCHEMA_VERSION
});
