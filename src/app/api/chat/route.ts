import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ChatServiceError,
  answerWithContext,
  prepareChat,
  streamAnswerWithContext,
} from "@/lib/ai/chat";

const chatSchema = z.object({
  message: z.string().trim().min(1, "질문을 입력해 주세요.").max(2000),
  conversationId: z.string().optional(),
  stream: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다." },
        { status: 400 },
      );
    }

    const prepared = await prepareChat(parsed.data.message);

    if (parsed.data.stream) {
      const answerStream = await streamAnswerWithContext(
        prepared.analysis,
        prepared.chunks,
      );

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "sources",
                sources: prepared.sources,
              })}\n\n`,
            ),
          );

          const reader = answerStream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                break;
              }
              const text = new TextDecoder().decode(value);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "token", text })}\n\n`,
                ),
              );
            }
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`),
            );
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new NextResponse(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const answer = await answerWithContext(prepared.analysis, prepared.chunks);
    return NextResponse.json({
      answer,
      sources: prepared.sources,
      conversationId: parsed.data.conversationId ?? null,
    });
  } catch (error) {
    if (error instanceof ChatServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("[api/chat]", error);
    return NextResponse.json(
      { error: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
