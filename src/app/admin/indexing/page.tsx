import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { IndexingActions } from "@/components/admin/IndexingActions";
import { getSessionFromCookies, toPublicAdmin } from "@/lib/auth/session";
import { listDocuments } from "@/lib/db/documents";
import {
  INDEX_STATUS_LABELS,
  PUBLISH_STATUS_LABELS,
  formatAdminDateTime,
} from "@/lib/documents/labels";
import { CATEGORY_LABELS } from "@/types/document";

export default async function AdminIndexingPage() {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/admin/login");
  }

  const admin = toPublicAdmin(session);
  const [failed, indexing, published] = await Promise.all([
    listDocuments({ indexStatus: "FAILED", limit: 50 }),
    listDocuments({ indexStatus: "INDEXING", limit: 50 }),
    listDocuments({ publishStatus: "PUBLISHED", limit: 50 }),
  ]);

  const rows = [
    ...failed.items,
    ...indexing.items.filter((item) => !failed.items.some((f) => f.id === item.id)),
    ...published.items.filter(
      (item) =>
        item.index_status !== "FAILED" &&
        item.index_status !== "INDEXING" &&
        !failed.items.some((f) => f.id === item.id),
    ),
  ];

  return (
    <AdminShell admin={admin} title="AI 반영 상태">
      <section className="space-y-4">
        <p className="text-sm text-slate-600">
          게시/보관 문서의 Qdrant 인덱싱 상태를 확인하고, 실패 건은 문서 목록에서
          AI 다시 반영을 실행할 수 있습니다.
        </p>

        <IndexingActions />

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">제목</th>
                <th className="px-4 py-3 font-medium">카테고리</th>
                <th className="px-4 py-3 font-medium">게시</th>
                <th className="px-4 py-3 font-medium">AI 반영</th>
                <th className="px-4 py-3 font-medium">오류</th>
                <th className="px-4 py-3 font-medium">수정일</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    표시할 문서가 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((doc) => (
                  <tr key={doc.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/documents/${doc.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {doc.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{CATEGORY_LABELS[doc.category]}</td>
                    <td className="px-4 py-3">
                      {PUBLISH_STATUS_LABELS[doc.publish_status]}
                    </td>
                    <td className="px-4 py-3">
                      {INDEX_STATUS_LABELS[doc.index_status]}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-600">
                      {doc.index_error ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {formatAdminDateTime(doc.updated_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
