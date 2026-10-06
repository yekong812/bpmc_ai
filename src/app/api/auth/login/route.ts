import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, loginAdmin } from "@/lib/auth/admin";

const loginSchema = z.object({
  loginId: z.string().trim().min(1, "아이디를 입력해 주세요."),
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다." },
        { status: 400 },
      );
    }

    const admin = await loginAdmin(parsed.data.loginId, parsed.data.password);
    return NextResponse.json({ admin });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[auth/login]", error);
    return NextResponse.json(
      { error: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
