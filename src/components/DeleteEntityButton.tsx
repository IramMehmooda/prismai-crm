"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

export default function DeleteEntityButton({
  endpoint,
  redirectTo,
  confirmText,
  className = "btn-ghost text-rose-600 hover:bg-rose-50",
  label = "Delete",
}: {
  endpoint: string;
  redirectTo: string;
  confirmText: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    const res = await fetch(endpoint, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      alert("Failed to delete");
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <button type="button" disabled={busy} onClick={handleDelete} className={className}>
      <Icon name="trash" size={14} /> {busy ? "..." : label}
    </button>
  );
}