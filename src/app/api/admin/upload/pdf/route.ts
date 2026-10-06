import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api/adminHandler";
import { PdfParseError, assertPdfUpload, extractPdfText } from "@/lib/pdf/parser";
import { getPdfMaxBytes, savePdfFile } from "@/lib/storage/local";

export async function POST(request: NextRequest) {
  return withAdmin(async () => {
    try {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "PDF 파일이 필요합니다." },
          { status: 400 },
        );
      }

      const maxBytes = getPdfMaxBytes();
      assertPdfUpload(
        { name: file.name, type: file.type, size: file.size },
        maxBytes,
      );

      const buffer = Buffer.from(await file.arrayBuffer());
      const extracted = await extractPdfText(buffer);
      const stored = await savePdfFile(file.name, buffer, file.type || "application/pdf");

      return NextResponse.json({
        file: stored,
        previewText: extracted.text,
        numPages: extracted.numPages,
        message: "PDF 텍스트를 추출했습니다. 내용을 확인·수정한 뒤 저장해 주세요.",
      });
    } catch (error) {
      if (error instanceof PdfParseError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  });
}
