"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AiDocument, DocumentCategory } from "@/types/document";
import { CATEGORY_LABELS } from "@/types/document";
import {
  INDEX_STATUS_LABELS,
  PUBLISH_STATUS_LABELS,
  documentDateSummary,
  formatAdminDateTime,
} from "@/lib/documents/labels";

export function DocumentListClient({
  initialItems,
  initialTotal,
  category,
  q,
}: {
  initialItems: AiDocument[];
  initialTotal: number;
  category?: DocumentCategory;
  q?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const heading = useMemo(() => {
    if (!category) {
      return "전체 콘텐츠";
    }
    return CATEGORY_LABELS[category];
  }, [category]);

  async function runAction(
    id: number,
    path: string,
    method: string,
    successMessage: string,
  ) {
    setBusyId(id);
    setMessage(null);
    try {
      const response = await fetch(path, { method });
      const data = await response.json();
      if (data.document) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? data.document : item)),
        );
      }
      if (!response.ok) {
        setMessage(data.error ?? "처리에 실패했습니다.");
        return;
      }
      setMessage(data.message ?? successMessage);
      router.refresh();
    } catch {
      setMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
          <p className="text-sm text-slate-600">총 {initialTotal}건</p>
        </div>
        <Link
          href={
            category
              ? `/admin/documents/new?category=${category}`
              : "/admin/documents/new"
          }
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          새 문서 등록
        </Link>
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        {category ? <input type="hidden" name="category" value={category} /> : null}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="제목/내용 검색"
          className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-white"
        >
          검색
        </button>
      </form>

      {message ? (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">제목</th>
              <th className="px-4 py-3 font-medium">카테고리</th>
              <th className="px-4 py-3 font-medium">행사일/발행일</th>
              <th className="px-4 py-3 font-medium">게시</th>
              <th className="px-4 py-3 font-medium">AI 반영</th>
              <th className="px-4 py-3 font-medium">수정일</th>
              <th className="px-4 py-3 font-medium">작업</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  등록된 문서가 없습니다.
                </td>
              </tr>
            ) : (
              items.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/documents/${doc.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {doc.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {CATEGORY_LABELS[doc.category]}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {documentDateSummary(doc)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {PUBLISH_STATUS_LABELS[doc.publish_status]}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {INDEX_STATUS_LABELS[doc.index_status]}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatAdminDateTime(doc.updated_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/documents/${doc.id}`}
                        className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        수정
                      </Link>
                      {doc.publish_status !== "PUBLISHED" ? (
                        <button
                          type="button"
                          disabled={busyId === doc.id}
                          onClick={() =>
                            runAction(
                              doc.id,
                              `/api/admin/documents/${doc.id}/publish`,
                              "POST",
                              "게시되었습니다.",
                            )
                          }
                          className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                        >
                          게시
                        </button>
                      ) : null}
                      {doc.publish_status !== "ARCHIVED" ? (
                        <button
                          type="button"
                          disabled={busyId === doc.id}
                          onClick={() =>
                            runAction(
                              doc.id,
                              `/api/admin/documents/${doc.id}`,
                              "DELETE",
                              "보관 처리되었습니다.",
                            )
                          }
                          className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                        >
                          보관
                        </button>
                      ) : null}
                      {doc.publish_status === "PUBLISHED" ||
                      doc.publish_status === "ARCHIVED" ? (
                        <button
                          type="button"
                          disabled={busyId === doc.id}
                          onClick={() =>
                            runAction(
                              doc.id,
                              `/api/admin/documents/${doc.id}/reindex`,
                              "POST",
                              "재인덱싱 요청 완료",
                            )
                          }
                          className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                        >
                          AI 다시 반영
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
