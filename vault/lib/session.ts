/**
 * session.ts — анонимная сессия через httpOnly cookie (UUID), т.к. пока
 * без Telegram нет естественного идентификатора пользователя. При переносе
 * на Telegram-бота эту сессию можно заменить на telegram_id — остальной
 * код (storage.ts, cases.ts) трогать не придётся, ключи в Redis используют
 * абстрактный "userId".
 */

import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "case_bot_session";
const MAX_AGE = 60 * 60 * 24 * 365; // 1 год

export function readSessionId(req: NextRequest): string {
  const existing = req.cookies.get(SESSION_COOKIE)?.value;
  return existing || randomUUID();
}

export function sessionCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
  };
}
