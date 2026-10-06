export type DocumentCategory =
  | "BULLETIN"
  | "RETREAT"
  | "YOUTH_INFO"
  | "EVENT";

export type PublishStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type IndexStatus =
  | "NOT_INDEXED"
  | "INDEXING"
  | "SUCCESS"
  | "FAILED";

export type SourceType = "MANUAL" | "PDF";

export interface AiDocument {
  id: number;
  title: string;
  category: DocumentCategory;
  content: string;
  source_type: SourceType;
  source_file_name: string | null;
  source_file_url: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
  published_at: string | null;
  valid_from: string | null;
  valid_until: string | null;
  publish_status: PublishStatus;
  index_status: IndexStatus;
  index_error: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  BULLETIN: "주보",
  RETREAT: "수련회",
  YOUTH_INFO: "청년부정보",
  EVENT: "행사",
};
