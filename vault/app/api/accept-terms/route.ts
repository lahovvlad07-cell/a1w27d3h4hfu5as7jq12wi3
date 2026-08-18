import { NextRequest, NextResponse } from "next/server";
import { readSessionId, sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";
import { ensureUser, setAcceptedTerms } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const userId = readSessionId(req);
  await ensureUser(userId);
  await setAcceptedTerms(userId);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, userId, sessionCookieOptions());
  return res;
}
