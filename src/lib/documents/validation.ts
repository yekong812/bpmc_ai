import { z } from "zod";
import type { DocumentCategory, SourceType } from "@/types/document";

const emptyToNull = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return value;
};

const optionalDate = z.preprocess(
  emptyToNull,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다.").nullable(),
);

const optionalDateTime = z.preprocess(
  emptyToNull,
  z
    .string()
    .refine(
      (value) => !Number.isNaN(Date.parse(value)),
      "일시 형식이 올바르지 않습니다.",
    )
    .nullable(),
);

const baseSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해 주세요.").max(255),
  category: z.enum(["BULLETIN", "RETREAT", "YOUTH_INFO", "EVENT"]),
  content: z.string().trim().min(1, "내용을 입력해 주세요."),
  source_type: z.enum(["MANUAL", "PDF"]).default("MANUAL"),
  source_file_name: z.preprocess(emptyToNull, z.string().max(255).nullable()).optional(),
  source_file_url: z.preprocess(emptyToNull, z.string().max(1000).nullable()).optional(),
  event_start_date: optionalDate.optional(),
  event_end_date: optionalDate.optional(),
  published_at: optionalDateTime.optional(),
  valid_from: optionalDateTime.optional(),
  valid_until: optionalDateTime.optional(),
});

export type DocumentInput = z.infer<typeof baseSchema>;

function requireEventDates(data: DocumentInput, ctx: z.RefinementCtx) {
  if (!data.event_start_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["event_start_date"],
      message: "행사 시작일을 입력해 주세요.",
    });
  }
  if (!data.event_end_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["event_end_date"],
      message: "행사 종료일을 입력해 주세요.",
    });
  }
  if (
    data.event_start_date &&
    data.event_end_date &&
    data.event_start_date > data.event_end_date
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["event_end_date"],
      message: "종료일은 시작일 이후여야 합니다.",
    });
  }
}

export function validateDocumentInput(input: unknown) {
  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) {
    return parsed;
  }

  const refined = baseSchema.superRefine((data, ctx) => {
    if (data.category === "RETREAT" || data.category === "EVENT") {
      requireEventDates(data, ctx);
    }

    if (data.category === "BULLETIN") {
      if (!data.published_at) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["published_at"],
          message: "주보 발행일을 입력해 주세요.",
        });
      }
      if (data.source_type === "PDF") {
        if (!data.source_file_url && !data.content) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["source_file_url"],
            message: "PDF 파일 또는 본문이 필요합니다.",
          });
        }
      }
    }

    if (data.category === "YOUTH_INFO") {
      if (data.event_start_date || data.event_end_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["event_start_date"],
          message: "청년부정보는 행사 날짜가 필요하지 않습니다.",
        });
      }
    }

    if (
      data.valid_from &&
      data.valid_until &&
      data.valid_from > data.valid_until
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["valid_until"],
        message: "유효 종료는 유효 시작 이후여야 합니다.",
      });
    }
  }).safeParse(input);

  return refined;
}

export function normalizeDocumentFields(data: DocumentInput): DocumentInput {
  if (data.category === "YOUTH_INFO") {
    return {
      ...data,
      event_start_date: null,
      event_end_date: null,
    };
  }

  if (data.category === "BULLETIN") {
    return {
      ...data,
      event_start_date: null,
      event_end_date: null,
    };
  }

  return data;
}

export function defaultSourceType(category: DocumentCategory): SourceType {
  return category === "BULLETIN" ? "PDF" : "MANUAL";
}
