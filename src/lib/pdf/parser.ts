import { PDFParse } from "pdf-parse";

export class PdfParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfParseError";
  }
}

export async function extractPdfText(buffer: Buffer): Promise<{
  text: string;
  numPages: number;
}> {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const text = (result.text ?? "").trim();

    if (!text) {
      throw new PdfParseError(
        "텍스트 레이어가 없는 PDF입니다. 스캔본은 현재 OCR을 지원하지 않습니다.",
      );
    }

    return {
      text,
      numPages: result.total ?? 0,
    };
  } catch (error) {
    if (error instanceof PdfParseError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : "PDF 텍스트 추출에 실패했습니다.";
    throw new PdfParseError(message);
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

export function assertPdfUpload(file: {
  name: string;
  type: string;
  size: number;
}, maxBytes: number) {
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith(".pdf")) {
    throw new PdfParseError("PDF 파일만 업로드할 수 있습니다.");
  }

  const allowedMime = ["application/pdf", "application/x-pdf", ""];
  if (file.type && !allowedMime.includes(file.type)) {
    throw new PdfParseError("PDF MIME 타입이 올바르지 않습니다.");
  }

  if (file.size <= 0) {
    throw new PdfParseError("빈 파일은 업로드할 수 없습니다.");
  }

  if (file.size > maxBytes) {
    throw new PdfParseError(
      `파일 크기가 너무 큽니다. 최대 ${Math.floor(maxBytes / (1024 * 1024))}MB까지 가능합니다.`,
    );
  }
}
