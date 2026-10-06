import { getOpenAIClient } from "@/lib/ai/openai";
import { getRagConfig } from "@/lib/config/rag";

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const openai = getOpenAIClient();
  const { embeddingModel } = getRagConfig();

  const response = await openai.embeddings.create({
    model: embeddingModel,
    input: texts,
  });

  return response.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  if (!vector) {
    throw new Error("질문 Embedding 생성에 실패했습니다.");
  }
  return vector;
}
