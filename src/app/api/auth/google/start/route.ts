import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildAuthUrl, googleConfigured, googleRedirectUri } from "@/lib/google";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", req.url));
  }
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") === "connect" ? "connect" : "login";
  // For "connect" mode the user must already be signed in.
  if (mode === "connect" && !(await getSession())) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildAuthUrl(state, mode, googleRedirectUri(url.origin)));
  res.cookies.set("prismai_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
