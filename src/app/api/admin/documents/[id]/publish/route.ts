import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api/adminHandler";
import { getDocumentById, publishDocument } from "@/lib/db/documents";
import { indexDocumentById } from "@/lib/rag/indexer";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  return withAdmin(async (admin) => {
    const { id } = await context.params;
    const documentId = Number(id);
    if (!Number.isFinite(documentId)) {
      return NextResponse.json({ error: "잘못된 문서 ID입니다." }, { status: 400 });
    }

    const published = await publishDocument(documentId, admin.login_id);
    if (!published) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    try {
      const { document, chunkCount } = await indexDocumentById(documentId);
      return NextResponse.json({
        document,
        chunkCount,
        message: `게시 및 AI 반영이 완료되었습니다. (${chunkCount}개 Chunk)`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI 반영에 실패했습니다.";
      const document = await getDocumentById(documentId);
      return NextResponse.json({
        document,
        error: message,
        message:
          "게시는 완료되었지만 AI 반영에 실패했습니다. AI 다시 반영을 시도해 주세요.",
      });
    }
  });
}
