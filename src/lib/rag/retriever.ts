import type { Schemas } from "@qdrant/js-client-rest";
import { getRagConfig } from "@/lib/config/rag";
import {
  ensureChurchCollection,
  getQdrantClient,
} from "@/lib/qdrant/client";
import { embedQuery } from "@/lib/rag/embedding";
import type { QueryAnalysis } from "@/lib/rag/dateResolver";
import type { DocumentCategory } from "@/types/document";

type Filter = Schemas["Filter"];

export interface RetrievedChunk {
  score: number;
  documentId: number;
  chunkId: string;
  title: string;
  category: DocumentCategory;
  content: string;
  eventStartDate: string | null;
  eventEndDate: string | null;
  publishedAt: string | null;
  publishStatus: string;
}

export interface ChatSource {
  documentId: number;
  title: string;
  category: DocumentCategory;
}

function buildFilter(analysis: QueryAnalysis): Filter {
  const must: NonNullable<Filter["must"]> = [];

  if (analysis.allowArchived) {
    must.push({
      key: "publish_status",
      match: { any: ["PUBLISHED", "ARCHIVED"] },
    });
  } else {
    must.push({
      key: "publish_status",
      match: { value: "PUBLISHED" },
    });
  }

  if (analysis.categories.length === 1) {
    must.push({
      key: "category",
      match: { value: analysis.categories[0] },
    });
  } else if (analysis.categories.length > 1) {
    must.push({
      key: "category",
      match: { any: analysis.categories },
    });
  }

  if (analysis.futureOnly) {
    must.push({
      key: "event_start_date",
      range: { gte: analysis.today },
    });
  }

  if (analysis.yearStart && analysis.yearEnd) {
    must.push({
      should: [
        {
          key: "event_start_date",
          range: { gte: analysis.yearStart, lte: analysis.yearEnd },
        },
        {
          key: "published_at",
          range: {
            gte: `${analysis.yearStart}T00:00:00`,
            lte: `${analysis.yearEnd}T23:59:59`,
          },
        },
      ],
    });
  }

  return { must };
}

function mapPoint(point: {
  score?: number;
  payload?: Record<string, unknown> | null;
}): RetrievedChunk | null {
  const payload = point.payload;
  if (!payload) {
    return null;
  }

  const documentId = Number(payload.document_id);
  const category = payload.category;
  if (
    !Number.isFinite(documentId) ||
    (category !== "BULLETIN" &&
      category !== "RETREAT" &&
      category !== "YOUTH_INFO" &&
      category !== "EVENT")
  ) {
    return null;
  }

  return {
    score: point.score ?? 0,
    documentId,
    chunkId: String(payload.chunk_id ?? ""),
    title: String(payload.title ?? ""),
    category,
    content: String(payload.content ?? ""),
    eventStartDate:
      typeof payload.event_start_date === "string"
        ? payload.event_start_date
        : null,
    eventEndDate:
      typeof payload.event_end_date === "string" ? payload.event_end_date : null,
    publishedAt:
      typeof payload.published_at === "string" ? payload.published_at : null,
    publishStatus: String(payload.publish_status ?? ""),
  };
}

function preferCurrentValidity(
  chunks: RetrievedChunk[],
  analysis: QueryAnalysis,
): RetrievedChunk[] {
  if (
    analysis.temporalIntent !== "current" &&
    analysis.temporalIntent !== "unspecified"
  ) {
    return chunks;
  }

  const currentYear = analysis.year ?? Number(analysis.today.slice(0, 4));
  return [...chunks].sort((a, b) => {
    const aYear = Number((a.eventStartDate ?? a.publishedAt ?? "").slice(0, 4));
    const bYear = Number((b.eventStartDate ?? b.publishedAt ?? "").slice(0, 4));
    const aClose = Number.isFinite(aYear) ? Math.abs(aYear - currentYear) : 99;
    const bClose = Number.isFinite(bYear) ? Math.abs(bYear - currentYear) : 99;
    if (aClose !== bClose) {
      return aClose - bClose;
    }
    return b.score - a.score;
  });
}

export function toUniqueSources(chunks: RetrievedChunk[]): ChatSource[] {
  const map = new Map<number, ChatSource>();
  for (const chunk of chunks) {
    if (!map.has(chunk.documentId)) {
      map.set(chunk.documentId, {
        documentId: chunk.documentId,
        title: chunk.title,
        category: chunk.category,
      });
    }
  }
  return Array.from(map.values());
}

export async function retrieveChunks(
  analysis: QueryAnalysis,
): Promise<RetrievedChunk[]> {
  const { topK } = getRagConfig();
  const collection = await ensureChurchCollection();
  const qdrant = getQdrantClient();
  const vector = await embedQuery(analysis.normalizedQuestion);
  const filter = buildFilter(analysis);

  const results = await qdrant.query(collection, {
    query: vector,
    limit: Math.max(topK * 2, topK),
    with_payload: true,
    filter,
  });

  const mapped = results.points
    .map((point) =>
      mapPoint({
        score: point.score,
        payload: (point.payload ?? null) as Record<string, unknown> | null,
      }),
    )
    .filter((item): item is RetrievedChunk => item !== null);

  return preferCurrentValidity(mapped, analysis).slice(0, topK);
}
