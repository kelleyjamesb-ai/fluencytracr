/**
 * Input sanitization utilities for security hardening.
 * Provides protection against common injection attacks.
 */

/**
 * Sanitize string input for potential path traversal attacks.
 * Removes directory traversal patterns and dangerous characters.
 */
export const sanitizePath = (input: string): string => {
  return input
    .replace(/\.\./g, "") // Remove directory traversal
    .replace(/[<>:"|?*]/g, "") // Remove dangerous filesystem characters
    .replace(/\\/g, "/") // Normalize path separators
    .replace(/\/+/g, "/"); // Collapse multiple slashes
};

/**
 * Sanitize string input for potential XSS attacks.
 * Escapes HTML special characters.
 */
export const sanitizeForXSS = (input: string): string => {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * Check if a string contains potential SQL injection patterns.
 * Note: This is a defense-in-depth measure. Primary SQL injection
 * prevention should use parameterized queries.
 */
export const containsSQLInjectionPatterns = (input: string): boolean => {
  const patterns = [
    /--/, // SQL comment
    /;.*(?:DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE)/i, // Dangerous SQL keywords after semicolon
    /'\s*OR\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i, // OR '1'='1' pattern
    /'\s*OR\s+['"]?\w+['"]?\s*=\s*['"]?\w+/i, // OR 'a'='a' pattern
    /UNION\s+(?:ALL\s+)?SELECT/i, // UNION SELECT injection
    /\/\*.*\*\//s, // SQL block comments
    /xp_/i // SQL Server extended procedures
  ];
  return patterns.some((pattern) => pattern.test(input));
};

/**
 * Sanitize an object recursively, applying XSS sanitization to all string values.
 * Returns a new object with sanitized values.
 */
export const sanitizeObject = <T extends Record<string, unknown>>(obj: T): T => {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitizeForXSS(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "string"
          ? sanitizeForXSS(item)
          : item && typeof item === "object"
            ? sanitizeObject(item as Record<string, unknown>)
            : item
      );
    } else if (value && typeof value === "object") {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result as T;
};

/**
 * Validate that a string is a safe identifier (alphanumeric, hyphens, underscores).
 * Useful for validating IDs, group keys, etc.
 */
export const isSafeIdentifier = (input: string): boolean => {
  return /^[a-zA-Z0-9_-]+$/.test(input);
};

/**
 * Sanitize a string to be a safe identifier.
 * Removes any characters that are not alphanumeric, hyphens, or underscores.
 */
export const toSafeIdentifier = (input: string): string => {
  return input.replace(/[^a-zA-Z0-9_-]/g, "");
};
