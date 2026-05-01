"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";

type CommentItem = {
  id: string;
  body: string;
  user: {
    id: string;
    name: string;
  };
  createdAtLabel: string;
  updatedAtLabel: string;
  wasEdited: boolean;
  canManage: boolean;
};

export default function OpportunityCommentsPanel({
  locale,
  opportunityId,
  comments,
}: {
  locale: Locale;
  opportunityId: string;
  comments: CommentItem[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");

  async function createComment(form: HTMLFormElement) {
    setBusy(true);
    setError(null);

    const body = (new FormData(form).get("body") as string | null)?.trim() ?? "";
    if (!body) {
      setError(locale === "ar" ? "أدخل تعليقًا أولاً." : "Enter a comment first.");
      setBusy(false);
      return;
    }

    const res = await fetch(`/api/opportunities/${opportunityId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });

    setBusy(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload?.error ?? (locale === "ar" ? "تعذر حفظ التعليق." : "Failed to save comment."));
      return;
    }

    form.reset();
    router.refresh();
  }

  async function saveEdit(commentId: string) {
    const body = editingBody.trim();
    if (!body) {
      setError(locale === "ar" ? "أدخل تعليقًا أولاً." : "Enter a comment first.");
      return;
    }

    setBusy(true);
    setError(null);
    const res = await fetch(`/api/opportunities/${opportunityId}/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setBusy(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload?.error ?? (locale === "ar" ? "تعذر تحديث التعليق." : "Failed to update comment."));
      return;
    }

    setEditingId(null);
    setEditingBody("");
    router.refresh();
  }

  async function deleteComment(commentId: string) {
    const confirmed = window.confirm(locale === "ar" ? "حذف هذا التعليق؟" : "Delete this comment?");
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    const res = await fetch(`/api/opportunities/${opportunityId}/comments/${commentId}`, {
      method: "DELETE",
    });
    setBusy(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload?.error ?? (locale === "ar" ? "تعذر حذف التعليق." : "Failed to delete comment."));
      return;
    }

    if (editingId === commentId) {
      setEditingId(null);
      setEditingBody("");
    }
    router.refresh();
  }

  return (
    <div className="card">
      <div className="card-header"><span>{locale === "ar" ? "تعليقات التقدم" : "Progress comments"}</span></div>
      <div className="card-body space-y-4">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            await createComment(e.currentTarget);
          }}
        >
          <textarea
            name="body"
            className="input min-h-[96px]"
            placeholder={locale === "ar" ? "أضف تحديثًا عن التقدم، المخاطر، أو ما تم الاتفاق عليه مع العميل..." : "Add a progress update, blocker, next step, or buyer feedback..."}
          />
          {error && <div className="text-xs text-accent-red">{error}</div>}
          <button disabled={busy} className="btn-primary w-full">{busy ? "…" : (locale === "ar" ? "إضافة تعليق" : "Add comment")}</button>
        </form>

        <div className="space-y-3">
          {comments.length === 0 ? (
            <div className="text-sm text-ink-400">{locale === "ar" ? "لا توجد تعليقات تقدم على هذه الصفقة حتى الآن." : "No progress comments have been added to this deal yet."}</div>
          ) : comments.map((comment) => {
            const editing = editingId === comment.id;
            return (
              <div key={comment.id} className="rounded-2xl border border-ink-100 bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-ink-900">{comment.user.name}</div>
                    <div className="text-[12px] text-ink-400">
                      {comment.createdAtLabel}
                      {comment.wasEdited ? ` · ${locale === "ar" ? "عُدّل" : "Edited"} ${comment.updatedAtLabel}` : ""}
                    </div>
                  </div>
                  {comment.canManage ? (
                    <div className="flex items-center gap-2 text-sm">
                      {editing ? (
                        <>
                          <button type="button" className="btn-outline" disabled={busy} onClick={() => saveEdit(comment.id)}>{locale === "ar" ? "حفظ" : "Save"}</button>
                          <button type="button" className="btn-ghost" disabled={busy} onClick={() => { setEditingId(null); setEditingBody(""); }}>{locale === "ar" ? "إلغاء" : "Cancel"}</button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="btn-outline" disabled={busy} onClick={() => { setEditingId(comment.id); setEditingBody(comment.body); setError(null); }}>{locale === "ar" ? "تعديل" : "Edit"}</button>
                          <button type="button" className="btn-ghost text-accent-red" disabled={busy} onClick={() => deleteComment(comment.id)}>{locale === "ar" ? "حذف" : "Delete"}</button>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>

                {editing ? (
                  <textarea
                    className="input min-h-[96px]"
                    value={editingBody}
                    onChange={(e) => setEditingBody(e.target.value)}
                  />
                ) : (
                  <div className="text-sm text-ink-700 whitespace-pre-wrap">{comment.body}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
