"use client";

import { useEffect, useState } from "react";
import BalanceBadge from "./BalanceBadge";
import TermsGate from "./TermsGate";
import CaseCard from "./CaseCard";
import CaseOpener from "./CaseOpener";
import type { CaseSummary, OpenCaseResult } from "@/lib/types";

export default function VaultApp() {
  const [balance, setBalance] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState<boolean | null>(null);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [activeCase, setActiveCase] = useState<CaseSummary | null>(null);
  const [openResult, setOpenResult] = useState<OpenCaseResult | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [cooldownReason, setCooldownReason] = useState<string | undefined>();
  const [debugBusy, setDebugBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [sessionRes, casesRes] = await Promise.all([
        fetch("/api/session").then((r) => r.json()),
        fetch("/api/cases").then((r) => r.json()),
      ]);
      setBalance(sessionRes.balance);
      setAcceptedTerms(sessionRes.acceptedTerms);
      setCases(casesRes.cases);
    })();
  }, []);

  async function handleOpen(key: string) {
    const def = cases.find((c) => c.key === key);
    if (!def) return;
    setActiveCase(def);
    setOpenResult(null);
    setOpenError(null);

    const res = await fetch("/api/open-case", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseKey: key }),
    });
    const data = await res.json();

    if (!res.ok) {
      const messages: Record<string, string> = {
        insufficient_balance: "Недостаточно поинтов для открытия этого кейса.",
        cooldown: data.reason || "Бесплатный кейс пока недоступен.",
        terms_not_accepted: "Сначала нужно принять соглашение.",
        unknown_case: "Кейс не найден.",
      };
      setOpenError(messages[data.error] || "Что-то пошло не так.");
      if (data.error === "cooldown" && key === "free_box") setCooldownReason(data.reason);
      return;
    }

    setOpenResult(data);
    setBalance(data.balance);
    if (key === "free_box") setCooldownReason(undefined);
  }

  async function handleDebugTopUp() {
    setDebugBusy(true);
    try {
      const res = await fetch("/api/debug-add-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 500 }),
      });
      const data = await res.json();
      setBalance(data.balance);
    } finally {
      setDebugBusy(false);
    }
  }

  if (acceptedTerms === null) {
    return <div className="flex min-h-screen items-center justify-center text-muted">Загрузка…</div>;
  }

  return (
    <main className="min-h-screen bg-grid">
      {!acceptedTerms && <TermsGate onAccept={() => setAcceptedTerms(true)} />}

      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted">демо-прототип</p>
          <h1 className="font-display text-3xl font-bold text-ink">Vault</h1>
        </div>
        <div className="flex items-center gap-3">
          <BalanceBadge balance={balance} />
          <button
            onClick={handleDebugTopUp}
            disabled={debugBusy}
            className="focus-ring rounded-full border border-white/10 px-3 py-2 font-mono text-xs text-muted transition hover:text-ink disabled:opacity-50"
            title="Заглушка вместо платёжного шлюза — только для теста"
          >
            {debugBusy ? "…" : "+500 (демо)"}
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 pb-6">
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Все награды здесь — заглушки. VPN-ссылки и AI-доступ не выдаются по-настоящему,
          пополнение баланса временно заменено демо-кнопкой вместо платёжного шлюза.
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {cases.map((c) => (
          <CaseCard
            key={c.key}
            caseDef={c}
            balance={balance}
            onOpen={handleOpen}
            cooldownReason={c.key === "free_box" ? cooldownReason : undefined}
          />
        ))}
      </section>

      {activeCase && (
        <CaseOpener
          caseDef={activeCase}
          result={openResult}
          error={openError}
          onClose={() => {
            setActiveCase(null);
            setOpenResult(null);
            setOpenError(null);
          }}
        />
      )}
    </main>
  );
}
