"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CaseSummary, OpenCaseResult } from "@/lib/types";

const ICONS: Record<string, string> = { vpn: "🛡️", ai: "🤖", points: "💠" };
const ITEM_WIDTH = 104; // px, includes gap
const LANDING_INDEX = 26;
const STRIP_LENGTH = 32;

export default function CaseOpener({
  caseDef,
  result,
  error,
  onClose,
}: {
  caseDef: CaseSummary;
  result: OpenCaseResult | null;
  error: string | null;
  onClose: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [settled, setSettled] = useState(false);
  const [offset, setOffset] = useState(0);

  // Строим ленту-заполнитель из случайных призов этого кейса, последним
  // элементом (на позиции LANDING_INDEX) кладём реальный выпавший приз.
  const strip = useMemo(() => {
    const pool = caseDef.prizes;
    const items = Array.from({ length: STRIP_LENGTH }, (_, i) => {
      if (i === LANDING_INDEX && result) {
        return { label: result.prize.label, serviceType: result.prize.serviceType };
      }
      const p = pool[Math.floor(Math.random() * pool.length)];
      return { label: p.label, serviceType: p.serviceType };
    });
    return items;
  }, [caseDef, result]);

  useEffect(() => {
    if (!result || !trackRef.current) return;
    const containerWidth = trackRef.current.parentElement?.clientWidth ?? 480;
    const target = LANDING_INDEX * ITEM_WIDTH + ITEM_WIDTH / 2 - containerWidth / 2;
    // небольшой сброс перед стартом, чтобы transition точно сыграл
    setOffset(0);
    const raf = requestAnimationFrame(() => {
      setTimeout(() => setOffset(target), 30);
    });
    const settleTimer = setTimeout(() => setSettled(true), 3600);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settleTimer);
    };
  }, [result]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/90 backdrop-blur-sm p-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-surface p-6 shadow-violetGlow">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-medium text-ink">{caseDef.title}</h3>
          <button onClick={onClose} className="focus-ring rounded-full p-1 text-muted hover:text-ink" aria-label="Закрыть">
            ✕
          </button>
        </div>

        {error && (
          <p className="mt-6 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        {!error && !result && (
          <p className="mt-6 text-sm text-muted">Открываем кейс…</p>
        )}

        {!error && result && (
          <>
            <div className="relative mt-6 overflow-hidden rounded-xl border border-white/10 bg-bg bg-grid">
              <div className="pointer-events-none absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-gold/80" />
              <div
                ref={trackRef}
                className="flex gap-2 p-2 transition-transform ease-out"
                style={{
                  transitionDuration: "3.4s",
                  transform: `translateX(-${offset}px)`,
                }}
              >
                {strip.map((item, i) => (
                  <div
                    key={i}
                    className={`flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border text-center ${
                      i === LANDING_INDEX
                        ? "border-gold/60 bg-gold/10"
                        : "border-white/10 bg-surface2"
                    }`}
                  >
                    <span className="text-2xl">{ICONS[item.serviceType]}</span>
                    <span className="px-1 text-[10px] leading-tight text-muted">
                      {item.label.length > 18 ? item.label.slice(0, 16) + "…" : item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {settled && (
              <div className="mt-5 rounded-xl border border-gold/30 bg-gold/5 p-4">
                <p className="font-mono text-xs uppercase tracking-wide text-gold">Выпало</p>
                <p className="mt-1 font-display text-lg text-ink">{result.prize.label}</p>
                {result.mock && (
                  <p className="mt-2 text-xs leading-relaxed text-muted">{result.mock.note}</p>
                )}
                {result.mock?.vlessLink && (
                  <p className="mt-1 truncate font-mono text-[11px] text-muted">{result.mock.vlessLink}</p>
                )}
                {result.promocode && (
                  <p className="mt-2 font-mono text-xs text-muted">
                    Промокод (демо): <span className="text-ink">{result.promocode}</span>
                  </p>
                )}
                <button
                  onClick={onClose}
                  className="focus-ring mt-4 w-full rounded-lg bg-gold px-4 py-2.5 font-medium text-bg transition hover:brightness-110"
                >
                  Забрать и закрыть
                </button>
              </div>
            )}
          </>
        )}

        {error && (
          <button
            onClick={onClose}
            className="focus-ring mt-6 w-full rounded-lg bg-surface2 px-4 py-2.5 font-medium text-ink transition hover:brightness-110"
          >
            Закрыть
          </button>
        )}
      </div>
    </div>
  );
}
