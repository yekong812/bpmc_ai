import type { DocumentCategory } from "@/types/document";

export type TemporalIntent = "current" | "past" | "future" | "unspecified";

export interface DateResolution {
  temporalIntent: TemporalIntent;
  /** 명시적 연도 (올해/작년/2025 등) */
  year: number | null;
  /** 앞으로/예정 질문 */
  futureOnly: boolean;
  /** ARCHIVED 검색 허용 (명시적 과거) */
  allowArchived: boolean;
  /** 오늘 (YYYY-MM-DD) */
  today: string;
  yearStart: string | null;
  yearEnd: string | null;
}

export interface QueryAnalysis extends DateResolution {
  categories: DocumentCategory[];
  normalizedQuestion: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function detectCategories(question: string): DocumentCategory[] {
  const categories = new Set<DocumentCategory>();

  if (/주보/.test(question)) {
    categories.add("BULLETIN");
  }
  if (/수련회|동계|하계/.test(question)) {
    categories.add("RETREAT");
  }
  if (/청년부|예배\s*시간|새가족|담당자/.test(question)) {
    categories.add("YOUTH_INFO");
  }
  if (/행사|체육대회|절기|특별\s*집회/.test(question)) {
    categories.add("EVENT");
  }

  return Array.from(categories);
}

export function resolveDateExpression(
  question: string,
  now = new Date(),
): DateResolution {
  const today = toDateString(now);
  const currentYear = now.getFullYear();

  const explicitYear = question.match(/(20\d{2})\s*년?/);
  let year: number | null = explicitYear ? Number(explicitYear[1]) : null;
  let temporalIntent: TemporalIntent = "unspecified";
  let futureOnly = false;
  let allowArchived = false;

  if (/앞으로|예정|다가오|향후|앞으로의/.test(question)) {
    temporalIntent = "future";
    futureOnly = true;
  } else if (/작년|지난해|지난\s*해/.test(question)) {
    year = currentYear - 1;
    temporalIntent = "past";
    allowArchived = true;
  } else if (/재작년/.test(question)) {
    year = currentYear - 2;
    temporalIntent = "past";
    allowArchived = true;
  } else if (/올해|금년|이번\s*해/.test(question)) {
    year = currentYear;
    temporalIntent = "current";
  } else if (/이번|현재|요즘/.test(question)) {
    year = year ?? currentYear;
    temporalIntent = "current";
  } else if (/지난|과거|예전에/.test(question)) {
    temporalIntent = "past";
    allowArchived = true;
  }

  if (year !== null && year < currentYear) {
    temporalIntent = "past";
    allowArchived = true;
  }
  if (year !== null && year === currentYear && temporalIntent === "unspecified") {
    temporalIntent = "current";
  }
  if (year !== null && year > currentYear) {
    temporalIntent = "future";
  }

  return {
    temporalIntent,
    year,
    futureOnly,
    allowArchived,
    today,
    yearStart: year !== null ? `${year}-01-01` : null,
    yearEnd: year !== null ? `${year}-12-31` : null,
  };
}

export function analyzeQuestion(
  question: string,
  now = new Date(),
): QueryAnalysis {
  const normalizedQuestion = question.trim().replace(/\s+/g, " ");
  const date = resolveDateExpression(normalizedQuestion, now);
  const categories = detectCategories(normalizedQuestion);

  return {
    ...date,
    categories,
    normalizedQuestion,
  };
}
