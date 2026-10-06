import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db/client";
import type {
  AiDocument,
  DocumentCategory,
  IndexStatus,
  PublishStatus,
} from "@/types/document";
import type { DocumentInput } from "@/lib/documents/validation";

type DocumentRow = AiDocument & RowDataPacket;

export interface DocumentListFilter {
  category?: DocumentCategory;
  publishStatus?: PublishStatus;
  indexStatus?: IndexStatus;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface DocumentListResult {
  items: AiDocument[];
  total: number;
}

function mapRow(row: DocumentRow): AiDocument {
  return {
    id: Number(row.id),
    title: row.title,
    category: row.category,
    content: row.content,
    source_type: row.source_type,
    source_file_name: row.source_file_name,
    source_file_url: row.source_file_url,
    event_start_date: row.event_start_date,
    event_end_date: row.event_end_date,
    published_at: row.published_at,
    valid_from: row.valid_from,
    valid_until: row.valid_until,
    publish_status: row.publish_status,
    index_status: row.index_status,
    index_error: row.index_error,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listDocuments(
  filter: DocumentListFilter = {},
): Promise<DocumentListResult> {
  const where: string[] = [];
  const params: Array<string | number> = [];

  if (filter.category) {
    where.push("category = ?");
    params.push(filter.category);
  }
  if (filter.publishStatus) {
    where.push("publish_status = ?");
    params.push(filter.publishStatus);
  }
  if (filter.indexStatus) {
    where.push("index_status = ?");
    params.push(filter.indexStatus);
  }
  if (filter.q?.trim()) {
    where.push("(title LIKE ? OR content LIKE ?)");
    const like = `%${filter.q.trim()}%`;
    params.push(like, like);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 100);
  const offset = Math.max(filter.offset ?? 0, 0);

  const countRows = await query<Array<RowDataPacket & { total: number }>>(
    `SELECT COUNT(*) AS total FROM ai_document ${whereSql}`,
    params,
  );

  const rows = await query<DocumentRow[]>(
    `SELECT *
     FROM ai_document
     ${whereSql}
     ORDER BY updated_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return {
    items: rows.map(mapRow),
    total: Number(countRows[0]?.total ?? 0),
  };
}

export async function getDocumentById(id: number): Promise<AiDocument | null> {
  const rows = await query<DocumentRow[]>(
    `SELECT * FROM ai_document WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function createDocument(
  input: DocumentInput,
  actor: string,
): Promise<AiDocument> {
  const result = await execute(
    `INSERT INTO ai_document (
      title, category, content, source_type, source_file_name, source_file_url,
      event_start_date, event_end_date, published_at, valid_from, valid_until,
      publish_status, index_status, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', 'NOT_INDEXED', ?, ?)`,
    [
      input.title,
      input.category,
      input.content,
      input.source_type ?? "MANUAL",
      input.source_file_name ?? null,
      input.source_file_url ?? null,
      input.event_start_date ?? null,
      input.event_end_date ?? null,
      input.published_at ?? null,
      input.valid_from ?? null,
      input.valid_until ?? null,
      actor,
      actor,
    ],
  );

  const created = await getDocumentById(Number(result.insertId));
  if (!created) {
    throw new Error("문서 생성 후 조회에 실패했습니다.");
  }
  return created;
}

export async function updateDocument(
  id: number,
  input: DocumentInput,
  actor: string,
): Promise<AiDocument | null> {
  const existing = await getDocumentById(id);
  if (!existing) {
    return null;
  }

  await execute(
    `UPDATE ai_document SET
      title = ?,
      category = ?,
      content = ?,
      source_type = ?,
      source_file_name = ?,
      source_file_url = ?,
      event_start_date = ?,
      event_end_date = ?,
      published_at = ?,
      valid_from = ?,
      valid_until = ?,
      index_status = CASE
        WHEN publish_status = 'PUBLISHED' THEN 'NOT_INDEXED'
        ELSE index_status
      END,
      index_error = CASE
        WHEN publish_status = 'PUBLISHED' THEN NULL
        ELSE index_error
      END,
      updated_by = ?
     WHERE id = ?`,
    [
      input.title,
      input.category,
      input.content,
      input.source_type ?? existing.source_type,
      input.source_file_name ?? null,
      input.source_file_url ?? null,
      input.event_start_date ?? null,
      input.event_end_date ?? null,
      input.published_at ?? null,
      input.valid_from ?? null,
      input.valid_until ?? null,
      actor,
      id,
    ],
  );

  return getDocumentById(id);
}

export async function archiveDocument(
  id: number,
  actor: string,
): Promise<AiDocument | null> {
  const existing = await getDocumentById(id);
  if (!existing) {
    return null;
  }

  await execute(
    `UPDATE ai_document
     SET publish_status = 'ARCHIVED', updated_by = ?
     WHERE id = ?`,
    [actor, id],
  );

  return getDocumentById(id);
}

export async function publishDocument(
  id: number,
  actor: string,
): Promise<AiDocument | null> {
  const existing = await getDocumentById(id);
  if (!existing) {
    return null;
  }

  await execute(
    `UPDATE ai_document
     SET publish_status = 'PUBLISHED',
         index_status = 'NOT_INDEXED',
         index_error = NULL,
         updated_by = ?
     WHERE id = ?`,
    [actor, id],
  );

  return getDocumentById(id);
}

export async function updateIndexStatus(
  id: number,
  indexStatus: IndexStatus,
  indexError: string | null = null,
): Promise<void> {
  await execute(
    `UPDATE ai_document
     SET index_status = ?, index_error = ?
     WHERE id = ?`,
    [indexStatus, indexError, id],
  );
}

export async function listIndexableDocuments(): Promise<AiDocument[]> {
  const rows = await query<DocumentRow[]>(
    `SELECT *
     FROM ai_document
     WHERE publish_status IN ('PUBLISHED', 'ARCHIVED')
     ORDER BY id ASC`,
  );
  return rows.map(mapRow);
}
