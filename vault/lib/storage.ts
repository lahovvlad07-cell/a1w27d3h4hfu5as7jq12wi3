/**
 * storage.ts — работа с Redis. Ключи используют абстрактный userId (сейчас —
 * анонимный session id из cookie; при переносе на Telegram — telegram_id).
 *
 * ВНИМАНИЕ (ограничение прототипа): spendPoints() ниже делает GET, потом
 * HINCRBY — это не атомарная операция и в теории уязвима к гонкам при
 * параллельных запросах одного пользователя (например, если открыть один
 * и тот же кейс из двух вкладок одновременно). Для продакшна замените на
 * Redis Lua-скрипт (EVAL) с проверкой-и-списанием одной командой.
 */

import { redis } from "./redis";

export async function ensureUser(userId: string) {
  const key = `user:${userId}`;
  const exists = await redis.exists(key);
  if (!exists) {
    await redis.hset(key, {
      balance: 0,
      accepted_terms: 0,
      created_at: new Date().toISOString(),
    });
  }
}

export async function getBalance(userId: string): Promise<number> {
  const val = await redis.hget<number>(`user:${userId}`, "balance");
  return Number(val) || 0;
}

export async function hasAcceptedTerms(userId: string): Promise<boolean> {
  const val = await redis.hget<number>(`user:${userId}`, "accepted_terms");
  return Number(val) === 1;
}

export async function setAcceptedTerms(userId: string) {
  await redis.hset(`user:${userId}`, { accepted_terms: 1 });
}

export async function addPoints(userId: string, amount: number) {
  await redis.hincrby(`user:${userId}`, "balance", amount);
}

export async function spendPoints(userId: string, amount: number): Promise<boolean> {
  const balance = await getBalance(userId);
  if (balance < amount) return false;
  await redis.hincrby(`user:${userId}`, "balance", -amount);
  return true;
}

export async function canOpenFreeCase(userId: string): Promise<{ ok: boolean; reason: string }> {
  const last = await redis.get<string>(`freecase:${userId}:last_opened`);
  if (!last) return { ok: true, reason: "" };
  const lastMs = new Date(last).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - lastMs;
  if (elapsed >= sevenDaysMs) return { ok: true, reason: "" };
  const hoursLeft = Math.ceil((sevenDaysMs - elapsed) / (60 * 60 * 1000));
  return { ok: false, reason: `Следующий бесплатный кейс будет доступен через ~${hoursLeft} ч.` };
}

export async function markFreeCaseOpened(userId: string) {
  await redis.set(`freecase:${userId}:last_opened`, new Date().toISOString());
}

export async function logCaseOpen(
  userId: string,
  caseKey: string,
  prizeLabel: string,
  promocode: string | null
) {
  const entry = `${new Date().toISOString()}|${userId}|${caseKey}|${prizeLabel}|${promocode ?? ""}`;
  await redis.lpush("case_open_log", entry);
  await redis.ltrim("case_open_log", 0, 499);
}
