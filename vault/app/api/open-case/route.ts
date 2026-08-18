import { NextRequest, NextResponse } from "next/server";
import { readSessionId, sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";
import {
  ensureUser,
  hasAcceptedTerms,
  spendPoints,
  addPoints,
  canOpenFreeCase,
  markFreeCaseOpened,
  logCaseOpen,
  getBalance,
} from "@/lib/storage";
import { getCase, rollCase, generatePromocode } from "@/lib/cases";
import { issueMockVpnKey, issueMockAiGrant } from "@/lib/mockSatellites";

export async function POST(req: NextRequest) {
  const userId = readSessionId(req);
  await ensureUser(userId);

  const withCookie = (res: NextResponse) => {
    res.cookies.set(SESSION_COOKIE, userId, sessionCookieOptions());
    return res;
  };

  if (!(await hasAcceptedTerms(userId))) {
    return withCookie(NextResponse.json({ error: "terms_not_accepted" }, { status: 403 }));
  }

  const body = await req.json().catch(() => ({}));
  const caseKey = body?.caseKey as string | undefined;
  const def = caseKey ? getCase(caseKey) : undefined;
  if (!def) {
    return withCookie(NextResponse.json({ error: "unknown_case" }, { status: 400 }));
  }

  if (def.key === "free_box") {
    const { ok, reason } = await canOpenFreeCase(userId);
    if (!ok) {
      return withCookie(NextResponse.json({ error: "cooldown", reason }, { status: 429 }));
    }
    await markFreeCaseOpened(userId);
  } else {
    const spent = await spendPoints(userId, def.price);
    if (!spent) {
      return withCookie(NextResponse.json({ error: "insufficient_balance" }, { status: 400 }));
    }
  }

  const prize = rollCase(def.key);
  let promocode: string | null = null;
  let mock: { note: string; vlessLink?: string } | null = null;

  if (prize.serviceType === "points") {
    await addPoints(userId, Number(prize.rewardValue));
  } else if (prize.serviceType === "vpn") {
    promocode = generatePromocode();
    const issued = issueMockVpnKey(prize.rewardValue);
    mock = { note: issued.note, vlessLink: issued.vlessLink };
  } else {
    promocode = generatePromocode();
    const issued = issueMockAiGrant(prize.rewardValue);
    mock = { note: issued.note };
  }

  await logCaseOpen(userId, def.key, prize.label, promocode);
  const balance = await getBalance(userId);

  return withCookie(
    NextResponse.json({
      prize: {
        label: prize.label,
        serviceType: prize.serviceType,
        rewardValue: prize.rewardValue,
      },
      promocode,
      mock,
      balance,
    })
  );
}
