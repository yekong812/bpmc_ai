import { NextResponse } from "next/server";
import { AuthError, requireAdminSession } from "@/lib/auth/admin";

export async function GET() {
  try {
    const admin = await requireAdminSession();
    return NextResponse.json({ admin });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[auth/me]", error);
    return NextResponse.json(
      { error: "세션 확인 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
