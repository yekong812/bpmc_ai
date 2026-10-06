import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api/adminHandler";
import { getDocumentById } from "@/lib/db/documents";
import { indexDocumentById } from "@/lib/rag/indexer";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  return withAdmin(async () => {
    const { id } = await context.params;
    const documentId = Number(id);
    if (!Number.isFinite(documentId)) {
      return NextResponse.json({ error: "잘못된 문서 ID입니다." }, { status: 400 });
    }

    const existing = await getDocumentById(documentId);
    if (!existing) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    if (existing.publish_status === "DRAFT") {
      return NextResponse.json(
        { error: "게시된 문서만 AI 반영을 요청할 수 있습니다." },
        { status: 400 },
      );
    }

    try {
      const { document, chunkCount } = await indexDocumentById(documentId);
      return NextResponse.json({
        document,
        chunkCount,
        message: `AI 반영이 완료되었습니다. (${chunkCount}개 Chunk)`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI 반영에 실패했습니다.";
      const document = await getDocumentById(documentId);
      return NextResponse.json(
        {
          document,
          error: message,
        },
        { status: 500 },
      );
    }
  });
}
