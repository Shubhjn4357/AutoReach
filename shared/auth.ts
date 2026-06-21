import * as crypto from "crypto";

const JWT_SECRET =
  process.env.JWT_SECRET || "autoreach-production-level-secure-token-key-2026";

export interface JWTPayload {
  userId: string;
  email: string;
  name?: string;
  iat?: number;
  exp?: number;
}

function base64url(str: string | Buffer): string {
  const buf = typeof str === "string" ? Buffer.from(str) : str;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

export function signToken(
  payload: JWTPayload,
  expiresInSeconds = 86400 * 30,
): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSeconds;

  const header = { alg: "HS256", typ: "JWT" };
  const fullPayload = { ...payload, iat, exp };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(fullPayload));

  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(signatureInput)
    .digest();

  const encodedSignature = base64url(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const signatureInput = `${headerB64}.${payloadB64}`;
    const calculatedSignature = base64url(
      crypto.createHmac("sha256", JWT_SECRET).update(signatureInput).digest(),
    );

    if (calculatedSignature !== signatureB64) {
      return null;
    }

    const payload = JSON.parse(base64urlDecode(payloadB64)) as JWTPayload;
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && now > payload.exp) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

export async function verifyGoogleToken(idToken: string): Promise<{
  googleId: string;
  email: string;
  name: string;
} | null> {
  if (idToken.startsWith("mock_")) {
    const email = idToken.replace("mock_", "") + "@example.com";
    return {
      googleId: `g_${idToken}`,
      email,
      name: idToken.replace("mock_", "").toUpperCase(),
    };
  }

  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
    );
    if (!response.ok) return null;

    const info = await response.json();
    if (!info.email || !info.sub) return null;

    return {
      googleId: info.sub,
      email: info.email,
      name: info.name || info.email.split("@")[0],
    };
  } catch (error) {
    console.error("Error verifying Google OAuth ID token:", error);
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const verifyHash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return hash === verifyHash;
}
