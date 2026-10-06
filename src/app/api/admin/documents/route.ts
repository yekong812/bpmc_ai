import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api/adminHandler";
import { createDocument, listDocuments } from "@/lib/db/documents";
import {
  normalizeDocumentFields,
  validateDocumentInput,
} from "@/lib/documents/validation";
import type { DocumentCategory, IndexStatus, PublishStatus } from "@/types/document";

function asCategory(value: string | null): DocumentCategory | undefined {
  if (
    value === "BULLETIN" ||
    value === "RETREAT" ||
    value === "YOUTH_INFO" ||
    value === "EVENT"
  ) {
    return value;
  }
  return undefined;
}

function asPublishStatus(value: string | null): PublishStatus | undefined {
  if (value === "DRAFT" || value === "PUBLISHED" || value === "ARCHIVED") {
    return value;
  }
  return undefined;
}

function asIndexStatus(value: string | null): IndexStatus | undefined {
  if (
    value === "NOT_INDEXED" ||
    value === "INDEXING" ||
    value === "SUCCESS" ||
    value === "FAILED"
  ) {
    return value;
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  return withAdmin(async () => {
    const { searchParams } = request.nextUrl;
    const result = await listDocuments({
      category: asCategory(searchParams.get("category")),
      publishStatus: asPublishStatus(searchParams.get("publishStatus")),
      indexStatus: asIndexStatus(searchParams.get("indexStatus")),
      q: searchParams.get("q") ?? undefined,
      limit: Number(searchParams.get("limit") ?? 50),
      offset: Number(searchParams.get("offset") ?? 0),
    });

    return NextResponse.json(result);
  });
}

export async function POST(request: NextRequest) {
  return withAdmin(async (admin) => {
    const body = await request.json();
    const parsed = validateDocumentInput(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    const document = await createDocument(
      normalizeDocumentFields(parsed.data),
      admin.login_id,
    );

    return NextResponse.json({ document }, { status: 201 });
  });
}
