"use client";

import { useState } from "react";

export default function TermsGate({ onAccept }: { onAccept: () => void }) {
  const [loading, setLoading] = useState(false);

  async function accept() {
    setLoading(true);
    try {
      await fetch("/api/accept-terms", { method: "POST" });
      onAccept();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/90 backdrop-blur-sm p-6">
      <div className="max-w-md rounded-2xl border border-white/10 bg-surface p-7 shadow-glow">
        <h2 className="font-display text-xl font-medium text-ink">Прежде чем начать</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Поинты — виртуальные единицы внутри демо-сервиса. Они не имеют
          денежной стоимости, не подлежат обмену на наличные средства или
          криптовалюту и не выводятся за пределы системы. Открытие кейса —
          демонстрация механики распределения цифровых наград; все VPN- и
          AI-награды в этом прототипе являются мок-заглушками.
        </p>
        <button
          onClick={accept}
          disabled={loading}
          className="focus-ring mt-6 w-full rounded-lg bg-gold px-4 py-3 font-medium text-bg transition hover:brightness-110 disabled:opacity-60"
        >
          {loading ? "…" : "Принять и продолжить"}
        </button>
      </div>
    </div>
  );
}
