import { getRagConfig } from "@/lib/config/rag";

export interface TextChunk {
  chunkId: string;
  sectionTitle: string;
  content: string;
  index: number;
}

interface Section {
  title: string;
  body: string;
}

function splitByHeadings(content: string): Section[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const sections: Section[] = [];
  let currentTitle = "";
  let currentBody: string[] = [];

  const flush = () => {
    const body = currentBody.join("\n").trim();
    if (!body && !currentTitle) {
      return;
    }
    sections.push({
      title: currentTitle || "본문",
      body: body || currentTitle,
    });
    currentBody = [];
  };

  for (const line of lines) {
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      flush();
      currentTitle = heading[1].trim();
      continue;
    }
    currentBody.push(line);
  }
  flush();

  if (sections.length === 0) {
    return [{ title: "본문", body: content.trim() }];
  }

  return sections.filter((section) => section.body.trim().length > 0);
}

function splitLongText(text: string, chunkSize: number, overlap: number): string[] {
  const normalized = text.trim();
  if (normalized.length <= chunkSize) {
    return [normalized];
  }

  const parts: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length);

    if (end < normalized.length) {
      const window = normalized.slice(start, end);
      const breakAt = Math.max(
        window.lastIndexOf("\n\n"),
        window.lastIndexOf("\n"),
        window.lastIndexOf(" "),
      );
      if (breakAt > Math.floor(chunkSize * 0.4)) {
        end = start + breakAt;
      }
    }

    const part = normalized.slice(start, end).trim();
    if (part) {
      parts.push(part);
    }

    if (end >= normalized.length) {
      break;
    }

    start = Math.max(end - overlap, start + 1);
  }

  return parts;
}

export function chunkDocument(params: {
  documentId: number;
  title: string;
  content: string;
}): TextChunk[] {
  const { chunkSize, chunkOverlap } = getRagConfig();
  const sections = splitByHeadings(params.content);
  const chunks: TextChunk[] = [];

  for (const section of sections) {
    const pieces = splitLongText(section.body, chunkSize, chunkOverlap);

    for (const piece of pieces) {
      const index = chunks.length;
      const chunkId = `${params.documentId}-${String(index + 1).padStart(3, "0")}`;
      const content = [
        `문서: ${params.title}`,
        `섹션: ${section.title}`,
        "",
        piece,
      ].join("\n");

      chunks.push({
        chunkId,
        sectionTitle: section.title,
        content,
        index,
      });
    }
  }

  return chunks;
}
