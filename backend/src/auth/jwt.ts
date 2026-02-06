import { SignJWT, jwtVerify } from "jose";

export type TokenClaims = {
  sub: string;
  role: string;
};

let cachedSecret: Uint8Array | null = null;

const getSecret = (): Uint8Array => {
  if (cachedSecret) return cachedSecret;
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "[AUTH] JWT_SECRET must be explicitly set. " +
      "Application cannot start without a signing key."
    );
  }
  cachedSecret = new TextEncoder().encode(secret);
  return cachedSecret;
};

export const assertJwtSecret = (): void => {
  getSecret();
};

export const signJwt = async (claims: TokenClaims): Promise<string> => {
  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getSecret());
};

export const verifyJwt = async (token: string): Promise<TokenClaims> => {
  const { payload } = await jwtVerify(token, getSecret());
  if (typeof payload.sub !== "string" || typeof payload.role !== "string") {
    throw new Error("Invalid token claims shape");
  }
  return { sub: payload.sub, role: payload.role };
};
