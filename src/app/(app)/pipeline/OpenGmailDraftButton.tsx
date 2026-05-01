"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import type { Locale } from "@/lib/i18n";

function buildGmailComposeUrl({
  to,
  cc,
  subject,
  body,
}: {
  to: string[];
  cc: string[];
  subject: string;
  body: string;
}) {
  const url = new URL("https://mail.google.com/mail/");
  url.searchParams.set("view", "cm");
  url.searchParams.set("fs", "1");
  url.searchParams.set("tf", "1");
  if (to.length > 0) url.searchParams.set("to", to.join(","));
  if (cc.length > 0) url.searchParams.set("cc", cc.join(","));
  if (subject.trim()) url.searchParams.set("su", subject);
  if (body.trim()) url.searchParams.set("body", body);
  return url.toString();
}

export default function OpenGmailDraftButton({
  locale,
  opportunityId,
  to,
  cc,
  subject,
  body,
}: {
  locale: Locale;
  opportunityId: string;
  to: string[];
  cc: string[];
  subject: string;
  body: string;
}) {
  const router = useRouter();

  async function syncSentMail() {
    try {
      const res = await fetch("/api/gmail/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId, relatedEmails: [...to, ...cc] }),
      });
      if (res.ok) router.refresh();
    } catch {
      // best-effort sync only
    }
  }

  function openDraft() {
    const target = buildGmailComposeUrl({ to, cc, subject, body });
    const width = Math.max(720, Math.floor(window.screen.availWidth * 0.5));
    const height = Math.max(560, Math.floor(window.screen.availHeight * 0.5));
    const left = Math.max(0, Math.floor((window.screen.availWidth - width) / 2));
    const top = Math.max(0, Math.floor((window.screen.availHeight - height) / 2));
    const features = [
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
      "resizable=yes",
      "scrollbars=yes",
      "toolbar=no",
      "menubar=no",
      "location=no",
      "status=no",
    ].join(",");

    const popup = window.open("", "prismai-gmail-draft", features);
    if (!popup) {
      window.location.href = target;
      return;
    }

    popup.location.replace(target);
    popup.focus();

    const watcher = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(watcher);
        void syncSentMail();
      }
    }, 1500);
  }

  return (
    <button type="button" className="btn-outline" onClick={openDraft}>
      <Icon name="mail" size={14} /> {locale === "ar" ? "إرسال بريد" : "Send email"}
    </button>
  );
}