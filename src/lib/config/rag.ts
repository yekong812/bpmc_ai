function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getRagConfig() {
  return {
    chunkSize: readInt("RAG_CHUNK_SIZE", 800),
    chunkOverlap: readInt("RAG_CHUNK_OVERLAP", 120),
    topK: readInt("RAG_TOP_K", 5),
    chatModel: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
    embeddingModel:
      process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    embeddingDims: readInt("OPENAI_EMBEDDING_DIMS", 1536),
    collection: process.env.QDRANT_COLLECTION || "church_documents",
  };
}
