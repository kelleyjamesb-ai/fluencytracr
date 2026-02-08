import bcrypt from "bcryptjs";
import { RoleSchema } from "@learnaire/shared";
import type { Role } from "@learnaire/shared";

export type SeedUser = {
  username: string;
  passwordHash: string;
  role: Role;
};

let users: ReadonlyArray<SeedUser> | null = null;

const loadUsers = (): ReadonlyArray<SeedUser> => {
  if (users) return users;

  const raw = process.env.AUTH_SEED_USERS;
  if (!raw) {
    throw new Error(
      "[AUTH] AUTH_SEED_USERS must be set. " +
      "Format: username:bcrypt_hash:ROLE,..."
    );
  }

  users = Object.freeze(
    raw.split(",").map((entry, index) => {
      const trimmed = entry.trim();
      if (!trimmed) {
        throw new Error(`[AUTH] Empty seed user entry at index ${index}`);
      }

      // Format: username:bcrypt_hash:ROLE
      // bcrypt hashes use $ not :, so split on : is safe
      const firstColon = trimmed.indexOf(":");
      const lastColon = trimmed.lastIndexOf(":");
      if (firstColon === -1 || lastColon === firstColon) {
        throw new Error(`[AUTH] Invalid seed user format at index ${index}`);
      }

      const username = trimmed.slice(0, firstColon);
      const passwordHash = trimmed.slice(firstColon + 1, lastColon);
      const roleStr = trimmed.slice(lastColon + 1);

      if (!username || !passwordHash || !roleStr) {
        throw new Error(`[AUTH] Missing field in seed user at index ${index}`);
      }

      const roleResult = RoleSchema.safeParse(roleStr);
      if (!roleResult.success) {
        throw new Error(`[AUTH] Invalid role "${roleStr}" for user "${username}"`);
      }

      return Object.freeze({ username, passwordHash, role: roleResult.data });
    })
  );

  return users;
};

export const findUser = (username: string): SeedUser | undefined => {
  return loadUsers().find((u) => u.username === username);
};

export const verifyPassword = (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/** @internal Test-only: reset cached users to force reload from env on next call. */
export const _resetUsersForTesting = (): void => {
  users = null;
};
