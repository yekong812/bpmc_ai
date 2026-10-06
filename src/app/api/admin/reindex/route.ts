import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api/adminHandler";
import { reindexAllDocuments } from "@/lib/rag/indexer";
import { ensureChurchCollection } from "@/lib/qdrant/client";

export async function POST() {
  return withAdmin(async () => {
    await ensureChurchCollection();
    const result = await reindexAllDocuments();

    return NextResponse.json({
      ...result,
      message: `전체 Re-index 완료: 성공 ${result.success}/${result.total}`,
    });
  });
}
