import { NextRequest, NextResponse } from "next/server";
import { readSessionId, sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";
import { ensureUser, getBalance, hasAcceptedTerms } from "@/lib/storage";

export async function GET(req: NextRequest) {
  const userId = readSessionId(req);
  await ensureUser(userId);
  const [balance, acceptedTerms] = await Promise.all([
    getBalance(userId),
    hasAcceptedTerms(userId),
  ]);

  const res = NextResponse.json({ balance, acceptedTerms });
  res.cookies.set(SESSION_COOKIE, userId, sessionCookieOptions());
  return res;
}
