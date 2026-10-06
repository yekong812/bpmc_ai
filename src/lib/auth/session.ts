import { cookies } from "next/headers";
import {
  createSessionToken,
  getSessionCookieName,
  getSessionDays,
  verifySessionToken,
} from "@/lib/auth/token";
import type { AdminSessionPayload, PublicAdminUser } from "@/types/auth";

export {
  createSessionToken,
  getSessionCookieName,
  verifySessionToken,
} from "@/lib/auth/token";

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(getSessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getSessionDays() * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(getSessionCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionFromCookies(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (!token) {
    return null;
  }
  return verifySessionToken(token);
}

export function toPublicAdmin(
  session: AdminSessionPayload,
): PublicAdminUser {
  return {
    id: session.sub,
    login_id: session.loginId,
    name: session.name,
    role: session.role,
  };
}
