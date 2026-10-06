import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { DocumentListClient } from "@/components/admin/DocumentListClient";
import { getSessionFromCookies, toPublicAdmin } from "@/lib/auth/session";
import { listDocuments } from "@/lib/db/documents";
import type { DocumentCategory } from "@/types/document";

function parseCategory(value?: string): DocumentCategory | undefined {
  if (
    value === "BULLETIN" ||
    value === "RETREAT" ||
    value === "YOUTH_INFO" ||
    value === "EVENT"
  ) {
    return value;
  }
  return undefined;
}

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/admin/login");
  }

  const admin = toPublicAdmin(session);
  const params = await searchParams;
  const category = parseCategory(params.category);
  const q = params.q?.trim() || undefined;
  const result = await listDocuments({ category, q, limit: 100 });

  return (
    <AdminShell admin={admin} title="콘텐츠 관리">
      <DocumentListClient
        initialItems={result.items}
        initialTotal={result.total}
        category={category}
        q={q}
      />
    </AdminShell>
  );
}
