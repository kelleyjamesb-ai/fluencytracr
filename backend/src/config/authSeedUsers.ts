/**
 * Auth Seed Users — boot-time assertion and user loading.
 *
 * AUTH_SEED_USERS must be a JSON array of {username, password} objects.
 * If missing, malformed, or empty the process must fail fast at startup.
 */

export interface SeedUser {
  username: string;
  password: string;
}

const ENV_KEY = "AUTH_SEED_USERS" as const;

const parseSeedUsers = (raw: string): SeedUser[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `[AUTH] ${ENV_KEY} is not valid JSON.`
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      `[AUTH] ${ENV_KEY} must be a JSON array.`
    );
  }

  if (parsed.length === 0) {
    throw new Error(
      `[AUTH] ${ENV_KEY} must contain at least one user.`
    );
  }

  for (let i = 0; i < parsed.length; i++) {
    const entry = parsed[i];
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as Record<string, unknown>).username !== "string" ||
      typeof (entry as Record<string, unknown>).password !== "string" ||
      !(entry as Record<string, unknown>).username ||
      !(entry as Record<string, unknown>).password
    ) {
      throw new Error(
        `[AUTH] ${ENV_KEY}[${i}] must have non-empty "username" and "password" strings.`
      );
    }
  }

  return parsed as SeedUser[];
};

/**
 * Fail-fast boot assertion. Throws if AUTH_SEED_USERS is missing, invalid
 * JSON, or yields zero valid users.
 */
export const assertAuthSeedUsersConfigured = (): SeedUser[] => {
  const raw = process.env[ENV_KEY];
  if (!raw) {
    throw new Error(
      `[AUTH] ${ENV_KEY} must be set to a JSON array of seed users.`
    );
  }
  return parseSeedUsers(raw);
};

/**
 * Runtime loader — reads and parses AUTH_SEED_USERS. May throw.
 */
export const loadUsers = (): SeedUser[] => {
  const raw = process.env[ENV_KEY];
  if (!raw) {
    throw new Error(`[AUTH] ${ENV_KEY} is not set.`);
  }
  return parseSeedUsers(raw);
};

/**
 * Look up a user by username and password. Returns the user or undefined.
 */
export const findUser = (
  username: string,
  password: string
): SeedUser | undefined => {
  const users = loadUsers();
  return users.find(
    (u) => u.username === username && u.password === password
  );
};
