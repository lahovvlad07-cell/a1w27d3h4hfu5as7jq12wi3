"use client";

import { useState } from "react";
import type { CaseSummary } from "@/lib/types";

const ICONS: Record<string, string> = { vpn: "🛡️", ai: "🤖", points: "💠" };

export default function CaseCard({
  caseDef,
  balance,
  disabled,
  cooldownReason,
  onOpen,
}: {
  caseDef: CaseSummary;
  balance: number;
  disabled?: boolean;
  cooldownReason?: string;
  onOpen: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isFree = caseDef.key === "free_box";
  const canAfford = isFree || balance >= caseDef.price;

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-surface p-5 transition hover:border-white/20">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-lg font-medium text-ink">{caseDef.title}</h3>
          <p className="mt-1 font-mono text-sm text-gold">
            {isFree ? "БЕСПЛАТНО · 1 раз в 7 дней" : `${caseDef.price} поинтов`}
          </p>
        </div>
        <span className="text-2xl">{isFree ? "🎁" : "📦"}</span>
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="focus-ring mt-4 self-start text-xs text-muted underline decoration-dotted underline-offset-4 hover:text-ink"
      >
        {expanded ? "скрыть шансы" : "показать шансы"}
      </button>

      {expanded && (
        <ul className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
          {caseDef.prizes.map((p) => (
            <li key={p.label} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted">
                <span>{ICONS[p.serviceType]}</span>
                {p.label}
              </span>
              <span className="font-mono text-ink">{p.oddsPercent}%</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex-1" />

      <button
        onClick={() => onOpen(caseDef.key)}
        disabled={disabled || !canAfford}
        className="focus-ring w-full rounded-lg bg-violet px-4 py-2.5 font-medium text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-surface2 disabled:text-muted"
      >
        {!canAfford ? "Недостаточно поинтов" : "Открыть"}
      </button>
      {cooldownReason && <p className="mt-2 text-xs text-muted">{cooldownReason}</p>}
    </div>
  );
}
