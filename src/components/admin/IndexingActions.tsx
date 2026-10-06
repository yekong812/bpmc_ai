"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function IndexingActions() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleReindexAll() {
    if (!window.confirm("게시/보관된 전체 문서를 다시 인덱싱할까요?")) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/reindex", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "전체 Re-index에 실패했습니다.");
        return;
      }
      setMessage(data.message ?? "전체 Re-index가 완료되었습니다.");
      router.refresh();
    } catch {
      setMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleReindexAll}
        disabled={loading}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? "전체 Re-index 중..." : "전체 Re-index"}
      </button>
      {message ? (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}
