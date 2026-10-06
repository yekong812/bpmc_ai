import { QdrantClient } from "@qdrant/js-client-rest";
import { getRagConfig } from "@/lib/config/rag";

let client: QdrantClient | null = null;
let ensuredCollection: string | null = null;

export function getQdrantClient(): QdrantClient {
  if (client) {
    return client;
  }

  const url = process.env.QDRANT_URL;
  if (!url) {
    throw new Error("QDRANT_URL 환경변수가 설정되지 않았습니다.");
  }

  client = new QdrantClient({
    url,
    apiKey: process.env.QDRANT_API_KEY || undefined,
  });

  return client;
}

export async function ensureChurchCollection(): Promise<string> {
  const { collection, embeddingDims } = getRagConfig();
  if (ensuredCollection === collection) {
    return collection;
  }

  const qdrant = getQdrantClient();
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some((item) => item.name === collection);

  if (!exists) {
    await qdrant.createCollection(collection, {
      vectors: {
        size: embeddingDims,
        distance: "Cosine",
      },
    });

    await qdrant.createPayloadIndex(collection, {
      field_name: "document_id",
      field_schema: "integer",
    });
    await qdrant.createPayloadIndex(collection, {
      field_name: "category",
      field_schema: "keyword",
    });
    await qdrant.createPayloadIndex(collection, {
      field_name: "publish_status",
      field_schema: "keyword",
    });
    await qdrant.createPayloadIndex(collection, {
      field_name: "event_start_date",
      field_schema: "datetime",
    });
    await qdrant.createPayloadIndex(collection, {
      field_name: "published_at",
      field_schema: "datetime",
    });
  }

  ensuredCollection = collection;
  return collection;
}

export async function deletePointsByDocumentId(documentId: number): Promise<void> {
  const collection = await ensureChurchCollection();
  const qdrant = getQdrantClient();

  await qdrant.delete(collection, {
    wait: true,
    filter: {
      must: [
        {
          key: "document_id",
          match: { value: documentId },
        },
      ],
    },
  });
}
