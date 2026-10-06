import { SignJWT, jwtVerify } from "jose";
import type { AdminSessionPayload } from "@/types/auth";

const DEFAULT_COOKIE_NAME = "church_admin_session";
const DEFAULT_SESSION_DAYS = 7;

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET 환경변수가 없거나 너무 짧습니다.");
  }
  return new TextEncoder().encode(secret);
}

export function getSessionCookieName(): string {
  return process.env.AUTH_COOKIE_NAME || DEFAULT_COOKIE_NAME;
}

export function getSessionDays(): number {
  const raw = process.env.AUTH_SESSION_DAYS;
  const parsed = raw ? Number(raw) : DEFAULT_SESSION_DAYS;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SESSION_DAYS;
}

export async function createSessionToken(
  payload: AdminSessionPayload,
): Promise<string> {
  const expiresIn = `${getSessionDays()}d`;

  return new SignJWT({
    loginId: payload.loginId,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.sub))
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getAuthSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    const sub = payload.sub ? Number(payload.sub) : NaN;
    const loginId = payload.loginId;
    const name = payload.name;
    const role = payload.role;

    if (
      !Number.isFinite(sub) ||
      typeof loginId !== "string" ||
      typeof name !== "string" ||
      (role !== "ADMIN" && role !== "EDITOR")
    ) {
      return null;
    }

    return { sub, loginId, name, role };
  } catch {
    return null;
  }
}
