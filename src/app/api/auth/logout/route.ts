import { NextResponse } from "next/server";
import { logoutAdmin } from "@/lib/auth/admin";

export async function POST() {
  try {
    await logoutAdmin();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth/logout]", error);
    return NextResponse.json(
      { error: "로그아웃 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
