import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { exchangeCode, fetchGoogleUser } from "@/lib/google";
import { gmailPushConfigured, gmailWatch } from "@/lib/gmail";
import { createSession, getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state") ?? "";
  const error = url.searchParams.get("error");

  if (error) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, req.url));
  if (!code) return NextResponse.redirect(new URL("/login?error=missing_code", req.url));

  const cookieState = cookies().get("prismai_oauth_state")?.value ?? "";
  const [mode, state] = stateParam.split(":");
  if (!cookieState || cookieState !== state) {
    const r = NextResponse.redirect(new URL("/login?error=state_mismatch", req.url));
    r.cookies.delete("prismai_oauth_state");
    return r;
  }

  let tokens;
  let g;
  try {
    tokens = await exchangeCode(code);
    g = await fetchGoogleUser(tokens.access_token);
  } catch (e: any) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("oauth_failed")}`, req.url));
  }

  if (!g.email) return NextResponse.redirect(new URL("/login?error=no_email", req.url));

  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000);
  const tokenData = {
    googleId: g.id,
    googleAccessToken: tokens.access_token,
    googleTokenExpiresAt: expiresAt,
    image: g.picture ?? null,
    ...(tokens.refresh_token ? { googleRefreshToken: tokens.refresh_token } : {}),
  };

  if (mode === "connect") {
    // Attach Google to the currently logged-in user
    const session = await getSession();
    if (!session) return NextResponse.redirect(new URL("/login", req.url));

    // Detach this googleId from any other user that may already hold it
    // (e.g. a stale account from a previous sign-in). googleId is unique.
    await prisma.user.updateMany({
      where: { googleId: g.id, NOT: { id: session.sub } },
      data: {
        googleId: null,
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiresAt: null,
      },
    });

    await prisma.user.update({ where: { id: session.sub }, data: tokenData });
    if (gmailPushConfigured()) {
      try {
        const watch = await gmailWatch(session.sub);
        await prisma.user.update({
          where: { id: session.sub },
          data: {
            gmailPushEnabled: true,
            gmailHistoryId: watch.historyId,
            gmailWatchExpiration: new Date(Number(watch.expiration)),
          },
        });
      } catch {
        // best-effort
      }
    }
    await prisma.auditLog.create({
      data: { userId: session.sub, action: "GMAIL_CONNECTED", entity: "User", entityId: session.sub, metadata: JSON.stringify({ email: g.email }) },
    }).catch(() => null);
    const r = NextResponse.redirect(new URL("/settings?connected=gmail", req.url));
    r.cookies.delete("prismai_oauth_state");
    return r;
  }

  // Login flow: find existing user or create new one
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: g.id }, { email: g.email.toLowerCase() }] },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: g.email.toLowerCase(),
        name: g.name ?? g.email.split("@")[0],
        passwordHash: await bcrypt.hash(randomBytes(24).toString("hex"), 10),
        role: "SALES_REP",
        locale: "en",
        ...tokenData,
      },
    });
    await prisma.auditLog.create({
      data: { userId: user.id, action: "USER_CREATED_VIA_GOOGLE", entity: "User", entityId: user.id, metadata: JSON.stringify({ email: user.email }) },
    }).catch(() => null);
  } else {
    user = await prisma.user.update({ where: { id: user.id }, data: tokenData });
  }

  if (gmailPushConfigured()) {
    try {
      const watch = await gmailWatch(user.id);
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          gmailPushEnabled: true,
          gmailHistoryId: watch.historyId,
          gmailWatchExpiration: new Date(Number(watch.expiration)),
        },
      });
    } catch {
      // best-effort
    }
  }

  await createSession({
    sub: user.id, email: user.email, name: user.name, role: user.role, locale: user.locale,
  });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "LOGIN_GOOGLE", entity: "User", entityId: user.id },
  }).catch(() => null);

  const r = NextResponse.redirect(new URL("/dashboard", req.url));
  r.cookies.delete("prismai_oauth_state");
  return r;
}
