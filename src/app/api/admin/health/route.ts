import { NextResponse } from "next/server";
import { AuthError, requireAdminSession } from "@/lib/auth/admin";
import { pingDatabase } from "@/lib/db/client";

export async function GET() {
  try {
    const admin = await requireAdminSession();
    const dbOk = await pingDatabase();

    return NextResponse.json({
      ok: true,
      admin,
      database: dbOk ? "connected" : "unreachable",
      phase: 1,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[api/admin/health]", error);
    return NextResponse.json(
      { error: "관리자 API 확인 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
