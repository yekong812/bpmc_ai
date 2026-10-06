import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api/adminHandler";
import {
  archiveDocument,
  getDocumentById,
  updateDocument,
} from "@/lib/db/documents";
import {
  normalizeDocumentFields,
  validateDocumentInput,
} from "@/lib/documents/validation";
import { indexDocumentById } from "@/lib/rag/indexer";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  return withAdmin(async () => {
    const { id } = await context.params;
    const documentId = Number(id);
    if (!Number.isFinite(documentId)) {
      return NextResponse.json({ error: "잘못된 문서 ID입니다." }, { status: 400 });
    }

    const document = await getDocumentById(documentId);
    if (!document) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ document });
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return withAdmin(async (admin) => {
    const { id } = await context.params;
    const documentId = Number(id);
    if (!Number.isFinite(documentId)) {
      return NextResponse.json({ error: "잘못된 문서 ID입니다." }, { status: 400 });
    }

    const body = await request.json();
    const parsed = validateDocumentInput(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    let document = await updateDocument(
      documentId,
      normalizeDocumentFields(parsed.data),
      admin.login_id,
    );

    if (!document) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    if (document.publish_status === "PUBLISHED" || document.publish_status === "ARCHIVED") {
      try {
        const indexed = await indexDocumentById(documentId);
        return NextResponse.json({
          document: indexed.document,
          chunkCount: indexed.chunkCount,
          message: `저장 및 AI 반영이 완료되었습니다. (${indexed.chunkCount}개 Chunk)`,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "AI 반영에 실패했습니다.";
        document = await getDocumentById(documentId);
        return NextResponse.json({
          document,
          error: message,
          message: "문서는 저장되었지만 AI 반영에 실패했습니다.",
        });
      }
    }

    return NextResponse.json({ document });
  });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  return withAdmin(async (admin) => {
    const { id } = await context.params;
    const documentId = Number(id);
    if (!Number.isFinite(documentId)) {
      return NextResponse.json({ error: "잘못된 문서 ID입니다." }, { status: 400 });
    }

    let document = await archiveDocument(documentId, admin.login_id);
    if (!document) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    try {
      const indexed = await indexDocumentById(documentId);
      return NextResponse.json({
        document: indexed.document,
        message: "보관 처리 및 AI 메타데이터 갱신이 완료되었습니다.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI 반영에 실패했습니다.";
      document = await getDocumentById(documentId);
      return NextResponse.json({
        document,
        error: message,
        message: "보관은 완료되었지만 AI 반영에 실패했습니다.",
      });
    }
  });
}
