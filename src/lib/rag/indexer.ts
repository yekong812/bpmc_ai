import { randomUUID } from "node:crypto";
import {
  deletePointsByDocumentId,
  ensureChurchCollection,
  getQdrantClient,
} from "@/lib/qdrant/client";
import { chunkDocument } from "@/lib/rag/chunker";
import { embedTexts } from "@/lib/rag/embedding";
import {
  getDocumentById,
  listIndexableDocuments,
  updateIndexStatus,
} from "@/lib/db/documents";
import type { AiDocument } from "@/types/document";

export interface ChurchChunkPayload {
  document_id: number;
  chunk_id: string;
  title: string;
  category: string;
  content: string;
  event_start_date: string | null;
  event_end_date: string | null;
  valid_from: string | null;
  valid_until: string | null;
  published_at: string | null;
  source_type: string;
  publish_status: string;
}

function toPayload(document: AiDocument, chunkId: string, content: string): ChurchChunkPayload {
  return {
    document_id: document.id,
    chunk_id: chunkId,
    title: document.title,
    category: document.category,
    content,
    event_start_date: document.event_start_date,
    event_end_date: document.event_end_date,
    valid_from: document.valid_from,
    valid_until: document.valid_until,
    published_at: document.published_at,
    source_type: document.source_type,
    publish_status: document.publish_status,
  };
}

async function upsertChunks(document: AiDocument): Promise<number> {
  const chunks = chunkDocument({
    documentId: document.id,
    title: document.title,
    content: document.content,
  });

  if (chunks.length === 0) {
    throw new Error("인덱싱할 Chunk가 없습니다. 본문을 확인해 주세요.");
  }

  const vectors = await embedTexts(chunks.map((chunk) => chunk.content));
  if (vectors.length !== chunks.length) {
    throw new Error("Embedding 개수가 Chunk 개수와 일치하지 않습니다.");
  }

  const collection = await ensureChurchCollection();
  const qdrant = getQdrantClient();

  await qdrant.upsert(collection, {
    wait: true,
    points: chunks.map((chunk, index) => ({
      id: randomUUID(),
      vector: vectors[index],
      payload: toPayload(document, chunk.chunkId, chunk.content) as unknown as Record<
        string,
        unknown
      >,
    })),
  });

  return chunks.length;
}

export async function indexDocumentById(documentId: number): Promise<{
  document: AiDocument;
  chunkCount: number;
}> {
  const document = await getDocumentById(documentId);
  if (!document) {
    throw new Error("문서를 찾을 수 없습니다.");
  }

  if (document.publish_status === "DRAFT") {
    throw new Error("DRAFT 문서는 인덱싱할 수 없습니다.");
  }

  await updateIndexStatus(documentId, "INDEXING", null);

  try {
    await deletePointsByDocumentId(documentId);
    const chunkCount = await upsertChunks(document);
    await updateIndexStatus(documentId, "SUCCESS", null);

    const updated = await getDocumentById(documentId);
    if (!updated) {
      throw new Error("인덱싱 후 문서 조회에 실패했습니다.");
    }

    return { document: updated, chunkCount };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 인덱싱 오류";
    await updateIndexStatus(documentId, "FAILED", message);
    throw error;
  }
}

export async function removeDocumentIndex(documentId: number): Promise<void> {
  await deletePointsByDocumentId(documentId);
  await updateIndexStatus(documentId, "NOT_INDEXED", null);
}

export async function reindexAllDocuments(): Promise<{
  total: number;
  success: number;
  failed: Array<{ id: number; error: string }>;
}> {
  await ensureChurchCollection();

  const targets = await listIndexableDocuments();
  let success = 0;
  const failed: Array<{ id: number; error: string }> = [];

  for (const item of targets) {
    try {
      await indexDocumentById(item.id);
      success += 1;
    } catch (error) {
      failed.push({
        id: item.id,
        error: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  return {
    total: targets.length,
    success,
    failed,
  };
}
