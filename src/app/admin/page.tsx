import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { getSessionFromCookies, toPublicAdmin } from "@/lib/auth/session";
import { listDocuments } from "@/lib/db/documents";
import { ADMIN_CATEGORY_LINKS } from "@/lib/documents/labels";

export default async function AdminDashboardPage() {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/admin/login");
  }

  const admin = toPublicAdmin(session);
  const [all, draft, published, failed] = await Promise.all([
    listDocuments({ limit: 1 }),
    listDocuments({ publishStatus: "DRAFT", limit: 1 }),
    listDocuments({ publishStatus: "PUBLISHED", limit: 1 }),
    listDocuments({ indexStatus: "FAILED", limit: 1 }),
  ]);

  return (
    <AdminShell admin={admin} title="대시보드">
      <section className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "전체 문서", value: all.total },
            { label: "임시저장", value: draft.total },
            { label: "게시됨", value: published.total },
            { label: "AI 반영 실패", value: failed.total },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">콘텐츠 바로가기</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {ADMIN_CATEGORY_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/admin/documents/new"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              새 문서 등록
            </Link>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
