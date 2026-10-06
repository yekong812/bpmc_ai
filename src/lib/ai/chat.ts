import { getOpenAIClient } from "@/lib/ai/openai";
import { getRagConfig } from "@/lib/config/rag";
import {
  NO_RESULT_ANSWER,
  buildSystemPrompt,
  buildUserPrompt,
} from "@/lib/ai/prompt";
import { analyzeQuestion } from "@/lib/rag/dateResolver";
import {
  retrieveChunks,
  toUniqueSources,
  type ChatSource,
  type RetrievedChunk,
} from "@/lib/rag/retriever";

export interface ChatResult {
  answer: string;
  sources: ChatSource[];
  chunks: RetrievedChunk[];
}

export class ChatServiceError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ChatServiceError";
    this.status = status;
  }
}

export async function prepareChat(message: string): Promise<{
  analysis: ReturnType<typeof analyzeQuestion>;
  chunks: RetrievedChunk[];
  sources: ChatSource[];
}> {
  const trimmed = message.trim();
  if (!trimmed) {
    throw new ChatServiceError("질문을 입력해 주세요.", 400);
  }

  const analysis = analyzeQuestion(trimmed);

  let chunks: RetrievedChunk[];
  try {
    chunks = await retrieveChunks(analysis);
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "검색 중 오류가 발생했습니다.";
    throw new ChatServiceError(
      `관련 자료를 검색하지 못했습니다. 잠시 후 다시 시도해 주세요. (${detail})`,
      503,
    );
  }

  return {
    analysis,
    chunks,
    sources: toUniqueSources(chunks),
  };
}

export async function answerWithContext(
  analysis: ReturnType<typeof analyzeQuestion>,
  chunks: RetrievedChunk[],
): Promise<string> {
  if (chunks.length === 0) {
    return NO_RESULT_ANSWER;
  }

  const openai = getOpenAIClient();
  const { chatModel } = getRagConfig();

  const completion = await openai.chat.completions.create({
    model: chatModel,
    temperature: 0.2,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(analysis, chunks) },
    ],
  });

  const answer = completion.choices[0]?.message?.content?.trim();
  return answer || NO_RESULT_ANSWER;
}

export async function streamAnswerWithContext(
  analysis: ReturnType<typeof analyzeQuestion>,
  chunks: RetrievedChunk[],
): Promise<ReadableStream<Uint8Array>> {
  if (chunks.length === 0) {
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(NO_RESULT_ANSWER));
        controller.close();
      },
    });
  }

  const openai = getOpenAIClient();
  const { chatModel } = getRagConfig();

  const completion = await openai.chat.completions.create({
    model: chatModel,
    temperature: 0.2,
    stream: true,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(analysis, chunks) },
    ],
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const part of completion) {
          const text = part.choices[0]?.delta?.content;
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export async function runChat(message: string): Promise<ChatResult> {
  const prepared = await prepareChat(message);
  const answer = await answerWithContext(prepared.analysis, prepared.chunks);
  return {
    answer,
    sources: prepared.sources,
    chunks: prepared.chunks,
  };
}
