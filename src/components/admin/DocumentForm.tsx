"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AiDocument, DocumentCategory, SourceType } from "@/types/document";
import { CATEGORY_LABELS } from "@/types/document";

type FormState = {
  title: string;
  category: DocumentCategory;
  content: string;
  source_type: SourceType;
  source_file_name: string;
  source_file_url: string;
  event_start_date: string;
  event_end_date: string;
  published_at: string;
  valid_from: string;
  valid_until: string;
};

function toInputDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function toInputDateTimeLocal(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  return value.replace(" ", "T").slice(0, 16);
}

function createInitialState(
  initial?: AiDocument | null,
  defaultCategory: DocumentCategory = "YOUTH_INFO",
): FormState {
  return {
    title: initial?.title ?? "",
    category: initial?.category ?? defaultCategory,
    content: initial?.content ?? "",
    source_type:
      initial?.source_type ??
      (defaultCategory === "BULLETIN" ? "PDF" : "MANUAL"),
    source_file_name: initial?.source_file_name ?? "",
    source_file_url: initial?.source_file_url ?? "",
    event_start_date: toInputDate(initial?.event_start_date),
    event_end_date: toInputDate(initial?.event_end_date),
    published_at: toInputDateTimeLocal(initial?.published_at),
    valid_from: toInputDateTimeLocal(initial?.valid_from),
    valid_until: toInputDateTimeLocal(initial?.valid_until),
  };
}

export function DocumentForm({
  mode,
  initialDocument,
  defaultCategory = "YOUTH_INFO",
}: {
  mode: "create" | "edit";
  initialDocument?: AiDocument | null;
  defaultCategory?: DocumentCategory;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(
    createInitialState(initialDocument, defaultCategory),
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const showEventDates =
    form.category === "RETREAT" || form.category === "EVENT";
  const showPublishedAt = form.category === "BULLETIN";
  const showPdfUpload = form.category === "BULLETIN";

  const categoryOptions = useMemo(
    () =>
      (Object.keys(CATEGORY_LABELS) as DocumentCategory[]).map((key) => ({
        value: key,
        label: CATEGORY_LABELS[key],
      })),
    [],
  );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "category") {
        next.source_type = value === "BULLETIN" ? "PDF" : "MANUAL";
        if (value === "YOUTH_INFO" || value === "BULLETIN") {
          next.event_start_date = "";
          next.event_end_date = "";
        }
      }
      return next;
    });
  }

  async function handlePdfUpload(file: File | null) {
    if (!file) {
      return;
    }

    setUploading(true);
    setError(null);
    setMessage(null);

    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/upload/pdf", {
        method: "POST",
        body,
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "PDF 업로드에 실패했습니다.");
        return;
      }

      setForm((prev) => ({
        ...prev,
        source_type: "PDF",
        source_file_name: data.file.fileName,
        source_file_url: data.file.url,
        content: data.previewText,
      }));
      setMessage(data.message ?? "PDF 텍스트를 추출했습니다. 내용을 확인·수정해 주세요.");
    } catch {
      setError("PDF 업로드 중 네트워크 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const payload = {
      title: form.title,
      category: form.category,
      content: form.content,
      source_type: form.source_type,
      source_file_name: form.source_file_name || null,
      source_file_url: form.source_file_url || null,
      event_start_date: form.event_start_date || null,
      event_end_date: form.event_end_date || null,
      published_at: form.published_at
        ? new Date(form.published_at).toISOString()
        : null,
      valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : null,
      valid_until: form.valid_until
        ? new Date(form.valid_until).toISOString()
        : null,
    };

    try {
      const response = await fetch(
        mode === "create"
          ? "/api/admin/documents"
          : `/api/admin/documents/${initialDocument?.id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      router.push("/admin/documents");
      router.refresh();
    } catch {
      setError("저장 중 네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">제목</span>
          <input
            required
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">카테고리</span>
          <select
            value={form.category}
            onChange={(e) =>
              updateField("category", e.target.value as DocumentCategory)
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {showPublishedAt ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              발행일
            </span>
            <input
              type="datetime-local"
              required
              value={form.published_at}
              onChange={(e) => updateField("published_at", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        ) : (
          <div />
        )}

        {showEventDates ? (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                행사 시작일
              </span>
              <input
                type="date"
                required
                value={form.event_start_date}
                onChange={(e) => updateField("event_start_date", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                행사 종료일
              </span>
              <input
                type="date"
                required
                value={form.event_end_date}
                onChange={(e) => updateField("event_end_date", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                유효 시작 (선택)
              </span>
              <input
                type="datetime-local"
                value={form.valid_from}
                onChange={(e) => updateField("valid_from", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                유효 종료 (선택)
              </span>
              <input
                type="datetime-local"
                value={form.valid_until}
                onChange={(e) => updateField("valid_until", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </>
        ) : null}
      </div>

      {showPdfUpload ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-800">주보 PDF 업로드</p>
          <p className="mt-1 text-xs text-slate-600">
            업로드 후 추출된 텍스트를 확인하고 수정한 뒤 저장합니다. 바로 게시되지
            않습니다.
          </p>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="mt-3 block w-full text-sm"
            disabled={uploading}
            onChange={(e) => handlePdfUpload(e.target.files?.[0] ?? null)}
          />
          {form.source_file_url ? (
            <p className="mt-2 text-xs text-slate-600">
              원본:{" "}
              <a
                href={form.source_file_url}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {form.source_file_name || "PDF 보기"}
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          본문 {showPdfUpload ? "(Preview / 수정)" : ""}
        </span>
        <textarea
          required
          rows={16}
          value={form.content}
          onChange={(e) => updateField("content", e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm leading-6"
          placeholder="문서 내용을 입력하세요."
        />
      </label>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? "저장 중..." : mode === "create" ? "등록" : "수정 저장"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/documents")}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          목록으로
        </button>
      </div>
    </form>
  );
}
