import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api/adminHandler";
import { readStoredFile } from "@/lib/storage/local";

type RouteContext = {
  params: Promise<{ key: string[] }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  return withAdmin(async () => {
    const { key } = await context.params;
    const fileKey = key.join("/");

    try {
      const buffer = await readStoredFile(fileKey);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${fileKey.split("/").pop() ?? "document.pdf"}"`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    } catch {
      return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
    }
  });
}
