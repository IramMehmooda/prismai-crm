// Gmail REST helpers (no external SDK)
import { getValidAccessToken } from "./google";

const BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export type GmailListResponse = { messages?: { id: string; threadId: string }[]; nextPageToken?: string; resultSizeEstimate: number };
export type GmailMessage = {
  id: string;
  threadId: string;
  snippet: string;
  internalDate: string;
  payload: {
    headers: { name: string; value: string }[];
    parts?: any[];
    body?: { data?: string; size?: number };
    mimeType?: string;
  };
  labelIds?: string[];
};

export type GmailWatchResponse = {
  historyId: string;
  expiration: string;
};

export function gmailPushConfigured() {
  return Boolean(process.env.GMAIL_PUBSUB_TOPIC && process.env.GMAIL_PUSH_WEBHOOK_SECRET);
}

export function buildGmailThreadUrl(threadId: string) {
  return `https://mail.google.com/mail/u/0/#all/${threadId}`;
}

export async function gmailList(userId: string, q = "", max = 25): Promise<GmailListResponse> {
  const tok = await getValidAccessToken(userId);
  if (!tok) throw new Error("Gmail not connected");
  const url = new URL(`${BASE}/messages`);
  if (q) url.searchParams.set("q", q);
  url.searchParams.set("maxResults", String(max));
  const res = await fetch(url, { headers: { Authorization: `Bearer ${tok}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Gmail list failed: ${res.status}`);
  return res.json();
}

export async function gmailGet(userId: string, id: string): Promise<GmailMessage> {
  const tok = await getValidAccessToken(userId);
  if (!tok) throw new Error("Gmail not connected");
  const res = await fetch(`${BASE}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`, {
    headers: { Authorization: `Bearer ${tok}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Gmail get failed: ${res.status}`);
  return res.json();
}

export async function gmailWatch(userId: string): Promise<GmailWatchResponse> {
  const tok = await getValidAccessToken(userId);
  if (!tok) throw new Error("Gmail not connected");
  const topicName = process.env.GMAIL_PUBSUB_TOPIC;
  if (!topicName) throw new Error("Gmail push is not configured");
  const res = await fetch(`${BASE}/watch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tok}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topicName,
      labelIds: ["INBOX", "SENT"],
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Gmail watch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export function header(msg: GmailMessage, name: string): string | undefined {
  return msg.payload.headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}

export function extractEmail(addr: string | undefined): string | null {
  if (!addr) return null;
  const m = addr.match(/<([^>]+)>/);
  const e = (m ? m[1] : addr).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

export function extractEmails(value: string | undefined): string[] {
  if (!value) return [];
  return Array.from(new Set(value
    .split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/)
    .map((part) => extractEmail(part))
    .filter((email): email is string => Boolean(email))));
}

export async function gmailSendRaw(userId: string, raw: string): Promise<{ id: string; threadId: string }> {
  const tok = await getValidAccessToken(userId);
  if (!tok) throw new Error("Gmail not connected");
  const res = await fetch(`${BASE}/messages/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) throw new Error(`Gmail send failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function toBase64Url(input: string) {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export type RawEmailAttachment = {
  filename: string;
  mimeType: string;
  content: Buffer;
};

/** Build a base64url-encoded RFC 2822 message for gmail.send */
export function buildRawEmail({
  to,
  cc,
  from,
  subject,
  body,
  attachments,
}: {
  to: string | string[];
  cc?: string | string[];
  from: string;
  subject: string;
  body: string;
  attachments?: RawEmailAttachment[];
}): string {
  const toList = Array.isArray(to) ? to.join(", ") : to;
  const ccList = Array.isArray(cc) ? cc.join(", ") : cc;
  const normalizedAttachments = attachments?.filter((attachment) => attachment.content.length > 0) ?? [];
  const headers = [
    `From: ${from}`,
    `To: ${toList}`,
    ...(ccList ? [`Cc: ${ccList}`] : []),
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
  ];

  if (normalizedAttachments.length === 0) {
    const lines = [
      ...headers,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: 7bit",
      "",
      body,
    ];
    return toBase64Url(lines.join("\r\n"));
  }

  const boundary = `prismai-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const parts = [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    body,
  ];

  for (const attachment of normalizedAttachments) {
    const base64 = attachment.content.toString("base64");
    const wrapped = base64.match(/.{1,76}/g)?.join("\r\n") ?? base64;
    parts.push(
      `--${boundary}`,
      `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      "Content-Transfer-Encoding: base64",
      "",
      wrapped,
    );
  }

  parts.push(`--${boundary}--`, "");
  return toBase64Url(parts.join("\r\n"));
}
