// Lightweight Google OAuth 2.0 helpers (no external SDK required)
import { prisma } from "./db";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

export function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Resolves the OAuth redirect URI. Prefers an explicit GOOGLE_REDIRECT_URI
 * (useful for a stable custom domain); otherwise derives it from the current
 * request origin so it works on any Vercel deployment URL without hardcoding.
 */
export function googleRedirectUri(origin: string) {
  return process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;
}

export function buildAuthUrl(state: string, mode: "login" | "connect" = "login", redirectUri?: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri ?? process.env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state: `${mode}:${state}`,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export type GoogleTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
  scope: string;
  token_type: string;
};

export async function exchangeCode(code: string, redirectUri?: string): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: redirectUri ?? process.env.GOOGLE_REDIRECT_URI!,
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Google refresh failed: ${res.status}`);
  return res.json();
}

export type GoogleUser = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  verified_email?: boolean;
};

export async function fetchGoogleUser(accessToken: string): Promise<GoogleUser> {
  const res = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error("Failed to fetch Google userinfo");
  return res.json();
}

/** Returns a usable access token, refreshing if expired. */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u?.googleAccessToken) return null;
  const exp = u.googleTokenExpiresAt?.getTime() ?? 0;
  if (exp - Date.now() > 60_000) return u.googleAccessToken;
  if (!u.googleRefreshToken) return null;
  const refreshed = await refreshAccessToken(u.googleRefreshToken);
  await prisma.user.update({
    where: { id: userId },
    data: {
      googleAccessToken: refreshed.access_token,
      googleTokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    },
  });
  return refreshed.access_token;
}
