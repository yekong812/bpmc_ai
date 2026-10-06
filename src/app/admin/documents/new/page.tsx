import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { DocumentForm } from "@/components/admin/DocumentForm";
import { getSessionFromCookies, toPublicAdmin } from "@/lib/auth/session";
import type { DocumentCategory } from "@/types/document";

function parseCategory(value?: string): DocumentCategory {
  if (
    value === "BULLETIN" ||
    value === "RETREAT" ||
    value === "YOUTH_INFO" ||
    value === "EVENT"
  ) {
    return value;
  }
  return "YOUTH_INFO";
}

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/admin/login");
  }

  const admin = toPublicAdmin(session);
  const params = await searchParams;
  const defaultCategory = parseCategory(params.category);

  return (
    <AdminShell admin={admin} title="문서 등록">
      <DocumentForm mode="create" defaultCategory={defaultCategory} />
    </AdminShell>
  );
}
