import { NextResponse } from "next/server";
import { findAdminByLoginId } from "@/lib/db/admin";
import { verifyPassword } from "@/lib/auth/password";
import {
  clearSessionCookie,
  createSessionToken,
  getSessionFromCookies,
  setSessionCookie,
  toPublicAdmin,
} from "@/lib/auth/session";
import type { PublicAdminUser } from "@/types/auth";

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export async function loginAdmin(
  loginId: string,
  password: string,
): Promise<PublicAdminUser> {
  const admin = await findAdminByLoginId(loginId);

  if (!admin || admin.use_yn !== "Y") {
    throw new AuthError("아이디 또는 비밀번호가 올바르지 않습니다.");
  }

  const valid = await verifyPassword(password, admin.password_hash);
  if (!valid) {
    throw new AuthError("아이디 또는 비밀번호가 올바르지 않습니다.");
  }

  const token = await createSessionToken({
    sub: admin.id,
    loginId: admin.login_id,
    name: admin.name,
    role: admin.role,
  });

  await setSessionCookie(token);

  return {
    id: admin.id,
    login_id: admin.login_id,
    name: admin.name,
    role: admin.role,
  };
}

export async function logoutAdmin(): Promise<void> {
  await clearSessionCookie();
}

export async function requireAdminSession(): Promise<PublicAdminUser> {
  const session = await getSessionFromCookies();
  if (!session) {
    throw new AuthError("로그인이 필요합니다.", 401);
  }
  return toPublicAdmin(session);
}

export function unauthorizedJson(message = "로그인이 필요합니다.") {
  return NextResponse.json({ error: message }, { status: 401 });
}
