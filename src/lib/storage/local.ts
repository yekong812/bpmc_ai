import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

export interface StoredFile {
  key: string;
  fileName: string;
  url: string;
  size: number;
  mimeType: string;
}

function getUploadRoot() {
  return path.join(process.cwd(), "uploads");
}

function getMaxBytes() {
  const raw = process.env.PDF_MAX_BYTES;
  const parsed = raw ? Number(raw) : DEFAULT_MAX_BYTES;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_BYTES;
}

export function getPdfMaxBytes() {
  return getMaxBytes();
}

export async function savePdfFile(
  fileName: string,
  buffer: Buffer,
  mimeType: string,
): Promise<StoredFile> {
  const safeName = path.basename(fileName).replace(/[^\w.\-()가-힣\s]/g, "_");
  const key = `pdf/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;
  const absolutePath = path.join(getUploadRoot(), key);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);

  // STORAGE_* 가 설정되면 이후 Object Storage로 교체 가능.
  // 1차에서는 로컬 uploads에 원본을 보존한다.
  void process.env.STORAGE_ENDPOINT;
  void process.env.STORAGE_BUCKET;

  return {
    key,
    fileName: safeName,
    url: `/api/admin/files/${key}`,
    size: buffer.length,
    mimeType,
  };
}

export async function readStoredFile(key: string): Promise<Buffer> {
  const normalized = key.replace(/^\/+/, "").replace(/\.\./g, "");
  if (!normalized.startsWith("pdf/")) {
    throw new Error("허용되지 않은 파일 경로입니다.");
  }

  const absolutePath = path.join(getUploadRoot(), normalized);
  return fs.readFile(absolutePath);
}
