import type { DocumentCategory, IndexStatus, PublishStatus } from "@/types/document";
import { CATEGORY_LABELS } from "@/types/document";

export const PUBLISH_STATUS_LABELS: Record<PublishStatus, string> = {
  DRAFT: "임시저장",
  PUBLISHED: "게시",
  ARCHIVED: "보관",
};

export const INDEX_STATUS_LABELS: Record<IndexStatus, string> = {
  NOT_INDEXED: "미반영",
  INDEXING: "반영 중",
  SUCCESS: "반영 완료",
  FAILED: "반영 실패",
};

export const ADMIN_CATEGORY_LINKS: Array<{
  href: string;
  label: string;
  category?: DocumentCategory;
}> = [
  { href: "/admin/documents", label: "전체" },
  { href: "/admin/documents?category=BULLETIN", label: CATEGORY_LABELS.BULLETIN, category: "BULLETIN" },
  { href: "/admin/documents?category=RETREAT", label: CATEGORY_LABELS.RETREAT, category: "RETREAT" },
  { href: "/admin/documents?category=YOUTH_INFO", label: CATEGORY_LABELS.YOUTH_INFO, category: "YOUTH_INFO" },
  { href: "/admin/documents?category=EVENT", label: CATEGORY_LABELS.EVENT, category: "EVENT" },
];

export function formatAdminDate(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }
  return value.slice(0, 10);
}

export function formatAdminDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }
  return value.replace("T", " ").slice(0, 16);
}

export function documentDateSummary(doc: {
  category: DocumentCategory;
  event_start_date: string | null;
  event_end_date: string | null;
  published_at: string | null;
}): string {
  if (doc.category === "BULLETIN") {
    return formatAdminDate(doc.published_at);
  }
  if (doc.event_start_date || doc.event_end_date) {
    return `${formatAdminDate(doc.event_start_date)} ~ ${formatAdminDate(doc.event_end_date)}`;
  }
  return "-";
}
