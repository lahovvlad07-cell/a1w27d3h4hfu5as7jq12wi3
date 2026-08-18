/**
 * cases.ts — механика кейсов. Веса заданы как целые числа, умноженные на 10
 * (т.е. 0.1% -> 1, 100% -> 1000), чтобы использовать crypto.randomInt без
 * проблем с плавающей точкой. Сумма весов в каждом кейсе = 1000.
 */

import { randomBytes, randomInt } from "crypto";

export type ServiceType = "vpn" | "ai" | "points";

export interface Prize {
  label: string;
  weight: number; // scaled x10
  serviceType: ServiceType;
  rewardValue: string;
  isFreeTier?: boolean;
}

export interface CaseDef {
  key: string;
  title: string;
  price: number;
  prizes: Prize[];
}

export const CASES: CaseDef[] = [
  {
    key: "vpn_box",
    title: "VPN-Box",
    price: 40,
    prizes: [
      { label: "1 месяц (безлимит)", weight: 600, serviceType: "vpn", rewardValue: "30_days" },
      { label: "3 месяца (безлимит)", weight: 300, serviceType: "vpn", rewardValue: "90_days" },
      { label: "6 месяцев (безлимит)", weight: 90, serviceType: "vpn", rewardValue: "180_days" },
      { label: "12 месяцев (безлимит)", weight: 10, serviceType: "vpn", rewardValue: "365_days" },
    ],
  },
  {
    key: "ai_box",
    title: "AI & Neural Box",
    price: 50,
    prizes: [
      { label: "100 000 токенов (все модели)", weight: 550, serviceType: "ai", rewardValue: "100000_tokens" },
      { label: "300 000 токенов + топ-модель", weight: 300, serviceType: "ai", rewardValue: "300000_tokens_top" },
      { label: "Безлимит на 1 месяц (rate-limited)", weight: 120, serviceType: "ai", rewardValue: "unlimited_30_days" },
      { label: "VIP-безлимит на 3 месяца", weight: 30, serviceType: "ai", rewardValue: "vip_unlimited_90_days" },
    ],
  },
  {
    key: "points_booster",
    title: "Points Booster",
    price: 30,
    prizes: [
      { label: "15 поинтов", weight: 450, serviceType: "points", rewardValue: "15" },
      { label: "25 поинтов", weight: 350, serviceType: "points", rewardValue: "25" },
      { label: "45 поинтов", weight: 150, serviceType: "points", rewardValue: "45" },
      { label: "100 поинтов", weight: 45, serviceType: "points", rewardValue: "100" },
      { label: "300 поинтов (джекпот)", weight: 5, serviceType: "points", rewardValue: "300" },
    ],
  },
  {
    key: "free_box",
    title: "Daily / Weekly Free Box",
    price: 0,
    prizes: [
      { label: "VPN-тест: 1 день / 2 ГБ", weight: 700, serviceType: "vpn", rewardValue: "1_day_2gb", isFreeTier: true },
      { label: "AI-тест: 5–10 запросов", weight: 200, serviceType: "ai", rewardValue: "5_10_requests_light", isFreeTier: true },
      { label: "5–10 поинтов", weight: 99, serviceType: "points", rewardValue: "5" },
      { label: "VPN-подписка 1 месяц (джекпот)", weight: 1, serviceType: "vpn", rewardValue: "30_days", isFreeTier: true },
    ],
  },
];

export function getCase(key: string): CaseDef | undefined {
  return CASES.find((c) => c.key === key);
}

export function rollCase(caseKey: string): Prize {
  const def = getCase(caseKey);
  if (!def) throw new Error("unknown_case");
  const total = def.prizes.reduce((sum, p) => sum + p.weight, 0);
  const roll = randomInt(0, total); // CSPRNG, [0, total)
  let cumulative = 0;
  for (const prize of def.prizes) {
    cumulative += prize.weight;
    if (roll < cumulative) return prize;
  }
  return def.prizes[def.prizes.length - 1];
}

export function generatePromocode(): string {
  return randomBytes(8).toString("hex").toUpperCase();
}
