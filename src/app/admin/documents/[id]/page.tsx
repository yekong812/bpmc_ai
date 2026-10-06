import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { DocumentForm } from "@/components/admin/DocumentForm";
import { getSessionFromCookies, toPublicAdmin } from "@/lib/auth/session";
import { getDocumentById } from "@/lib/db/documents";

export default async function EditDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/admin/login");
  }

  const admin = toPublicAdmin(session);
  const { id } = await params;
  const documentId = Number(id);
  if (!Number.isFinite(documentId)) {
    notFound();
  }

  const document = await getDocumentById(documentId);
  if (!document) {
    notFound();
  }

  return (
    <AdminShell admin={admin} title="문서 수정">
      <DocumentForm mode="edit" initialDocument={document} />
    </AdminShell>
  );
}
