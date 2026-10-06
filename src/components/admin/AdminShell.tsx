import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import { ADMIN_CATEGORY_LINKS } from "@/lib/documents/labels";
import type { PublicAdminUser } from "@/types/auth";

export function AdminShell({
  admin,
  title,
  children,
}: {
  admin: PublicAdminUser;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Admin
            </p>
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>
              {admin.name} ({admin.login_id})
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4">
          <nav className="space-y-5 text-sm">
            <div>
              <Link
                href="/admin"
                className="block rounded-lg px-2 py-1.5 font-medium text-slate-900 hover:bg-slate-50"
              >
                대시보드
              </Link>
            </div>

            <div>
              <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                콘텐츠 관리
              </p>
              <ul className="mt-2 space-y-1">
                {ADMIN_CATEGORY_LINKS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block rounded-lg px-2 py-1.5 text-slate-700 hover:bg-slate-50"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <Link
                href="/admin/indexing"
                className="block rounded-lg px-2 py-1.5 font-medium text-slate-900 hover:bg-slate-50"
              >
                AI 반영 상태
              </Link>
            </div>
          </nav>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
