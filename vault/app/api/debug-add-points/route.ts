/**
 * ⚠️ ТОЛЬКО ДЛЯ ДЕМО/ЛОКАЛЬНОГО ТЕСТА.
 * Позволяет любому посетителю сайта бесплатно начислить себе поинты —
 * это заменяет ненаписанный платёжный шлюз (Stars/фиат-эквайринг).
 * Перед любым реальным использованием этот роут нужно УДАЛИТЬ или
 * закрыть авторизацией/платежами.
 */
import { NextRequest, NextResponse } from "next/server";
import { readSessionId, sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";
import { ensureUser, addPoints, getBalance } from "@/lib/storage";

const MAX_DEBUG_TOPUP = 5000;

export async function POST(req: NextRequest) {
  const userId = readSessionId(req);
  await ensureUser(userId);

  const body = await req.json().catch(() => ({}));
  let amount = Number(body?.amount) || 500;
  amount = Math.max(1, Math.min(amount, MAX_DEBUG_TOPUP));

  await addPoints(userId, amount);
  const balance = await getBalance(userId);

  const res = NextResponse.json({ balance });
  res.cookies.set(SESSION_COOKIE, userId, sessionCookieOptions());
  return res;
}
