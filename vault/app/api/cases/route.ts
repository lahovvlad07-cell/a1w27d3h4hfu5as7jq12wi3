import { NextResponse } from "next/server";
import { CASES } from "@/lib/cases";

export async function GET() {
  const payload = CASES.map((c) => {
    const total = c.prizes.reduce((s, p) => s + p.weight, 0);
    return {
      key: c.key,
      title: c.title,
      price: c.price,
      prizes: c.prizes.map((p) => ({
        label: p.label,
        serviceType: p.serviceType,
        oddsPercent: Math.round((p.weight / total) * 1000) / 10,
        isFreeTier: !!p.isFreeTier,
      })),
    };
  });
  return NextResponse.json({ cases: payload });
}
