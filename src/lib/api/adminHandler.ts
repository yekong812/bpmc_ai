import { NextResponse } from "next/server";
import { AuthError, requireAdminSession } from "@/lib/auth/admin";
import type { PublicAdminUser } from "@/types/auth";

export async function withAdmin<T>(
  handler: (admin: PublicAdminUser) => Promise<T>,
): Promise<T | NextResponse> {
  try {
    const admin = await requireAdminSession();
    return await handler(admin);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/admin]", error);
    return NextResponse.json(
      { error: "요청 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
