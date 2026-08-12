"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Info, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatBRL } from "@/lib/money";
import {
  ATTRACTIVE_RATE_FLOOR,
  recommendCommission,
  scenarioAt,
  type ProductCosts,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";

// A calculadora mostra a faixa inteira, não um número.
//
// Um "18%" sozinho é um veredito que o seller não tem como auditar. Mostrando
// o ponto de equilíbrio, o teto da margem mínima e o lucro em cada degrau, a
// decisão volta para quem tem que tomá-la — o mesmo princípio do §23 aplicado
// a preço em vez de match.

export function CommissionCalculator({
  priceCents,
  costs,
  minimumMargin,
  targetMargin,
  currentRate,
}: {
  priceCents: number;
  costs: ProductCosts;
  minimumMargin: number;
  targetMargin: number;
  /// Taxa já praticada nas afiliações ativas, para comparar com a recomendada.
  currentRate?: number | null;
}) {
  const advice = useMemo(
    () => recommendCommission(priceCents, costs, { minimumMargin, targetMargin }),
    [priceCents, costs, minimumMargin, targetMargin],
  );

  const [rate, setRate] = useState<number>(
    advice.recommendedRate ?? advice.maxRate ?? 0.1,
  );

  const picked = useMemo(
    () => scenarioAt(priceCents, costs, rate, minimumMargin),
    [priceCents, costs, rate, minimumMargin],
  );

  if (advice.impossible) {
    return (
      <Card className="p-5">
        <SectionTitle />
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-status-critical/30 bg-status-critical/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-critical" />
          <div className="text-sm">
            <p className="font-medium text-ink-primary">
              Não há folga para comissão neste preço.
            </p>
            <p className="mt-1 text-ink-secondary">
              Os custos somam {formatBRL(advice.totalCosts)} e o preço é{" "}
              {formatBRL(priceCents)}. Antes de afiliar creators, ajuste o preço ou
              os custos.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const maxSlider = Math.max(advice.breakEvenRate, 0.05);

  return (
    <Card className="p-5">
      <SectionTitle />

      {/* A recomendação, com o porquê logo abaixo — nunca o número sozinho. */}
      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <p className="text-xs text-ink-muted">Comissão recomendada</p>
          <p className="text-4xl font-semibold tracking-tight text-ink-primary">
            {formatRate(advice.recommendedRate ?? 0)}
          </p>
        </div>
        <div className="pb-1 text-sm text-ink-secondary">
          <p>
            Mantém sua margem alvo de {formatRate(targetMargin)} e paga{" "}
            <span className="font-medium text-ink-primary">
              {formatBRL(Math.round(priceCents * (advice.recommendedRate ?? 0)))}
            </span>{" "}
            ao creator por venda.
          </p>
        </div>
      </div>

      {advice.recommendedBelowMarketFloor && (
        <Note tone="warning">
          Cabe no seu preço, mas {formatRate(advice.recommendedRate ?? 0)} dificilmente
          atrai creator — a faixa usual no TikTok Shop começa perto de{" "}
          {formatRate(ATTRACTIVE_RATE_FLOOR)}.{" "}
          <span className="text-ink-muted">
            Essa faixa é referência de mercado, não resultado do cálculo.
          </span>
        </Note>
      )}

      {currentRate != null && advice.maxRate != null && currentRate > advice.maxRate && (
        <Note tone="warning">
          Suas afiliações ativas pagam {formatRate(currentRate)}, acima do teto de{" "}
          {formatRate(advice.maxRate)} que preserva a margem mínima.
        </Note>
      )}

      {/* Explorador: o seller move a taxa e vê o efeito antes de decidir. */}
      <div className="mt-6 rounded-2xl bg-surface-2 p-4">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="rate-explorer" className="text-sm font-medium text-ink-secondary">
            Simular outra taxa
          </label>
          <span className="text-lg font-semibold tabular-nums text-ink-primary">
            {formatRate(rate)}
          </span>
        </div>

        <input
          id="rate-explorer"
          type="range"
          min={0}
          max={Math.round(maxSlider * 100)}
          step={1}
          value={Math.round(rate * 100)}
          onChange={(e) => setRate(Number(e.target.value) / 100)}
          className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border-strong accent-brand"
        />
        <div className="mt-1.5 flex justify-between text-[11px] text-ink-muted">
          <span>0%</span>
          <span>equilíbrio {formatRate(advice.breakEvenRate)}</span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Creator recebe" value={formatBRL(picked.commission)} />
          <Stat
            label="Seu lucro"
            value={formatBRL(picked.profit)}
            tone={picked.negative ? "bad" : picked.belowMinimum ? "warn" : "good"}
          />
          <Stat
            label="Margem"
            value={formatRate(picked.margin)}
            tone={picked.negative ? "bad" : picked.belowMinimum ? "warn" : "good"}
          />
        </div>

        {picked.negative ? (
          <Note tone="critical">Nessa taxa cada venda dá prejuízo.</Note>
        ) : picked.belowMinimum ? (
          <Note tone="warning">
            Abaixo da sua margem mínima de {formatRate(minimumMargin)}.
          </Note>
        ) : null}
      </div>

      {/* A escada inteira: é o que transforma o número em decisão auditável. */}
      <div className="mt-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-muted">
          O que sobra em cada faixa
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-md text-sm">
            <thead>
              <tr className="border-b border-border-hairline text-left text-xs text-ink-muted">
                <th className="pb-2 font-medium">Comissão</th>
                <th className="pb-2 text-right font-medium">Creator recebe</th>
                <th className="pb-2 text-right font-medium">Seu lucro</th>
                <th className="pb-2 text-right font-medium">Margem</th>
              </tr>
            </thead>
            <tbody>
              {advice.scenarios.map((s) => {
                const isRecommended =
                  advice.recommendedRate !== null &&
                  Math.abs(s.rate - advice.recommendedRate) < 0.005;
                return (
                  <tr
                    key={s.rate}
                    className={cn(
                      "border-b border-border-hairline last:border-0",
                      isRecommended && "bg-brand/10",
                    )}
                  >
                    <td className="py-2.5 font-medium tabular-nums text-ink-primary">
                      <span className="flex items-center gap-2">
                        {formatRate(s.rate)}
                        {isRecommended && (
                          <Badge className="px-2 py-0.5 text-[10px]">recomendada</Badge>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-ink-secondary">
                      {formatBRL(s.commission)}
                    </td>
                    <td
                      className={cn(
                        "py-2.5 text-right tabular-nums",
                        s.negative
                          ? "text-status-critical"
                          : s.belowMinimum
                            ? "text-status-warning"
                            : "text-ink-primary",
                      )}
                    >
                      {formatBRL(s.profit)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-ink-secondary">
                      {formatRate(s.margin)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 flex items-start gap-1.5 text-xs text-ink-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Custos considerados: {formatBRL(advice.totalCosts)} por venda. No ponto de
        equilíbrio ({formatRate(advice.breakEvenRate)}) seu lucro é zero.
      </p>
    </Card>
  );
}

function SectionTitle() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand">
        <TrendingUp className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-medium text-ink-primary">Comissão sustentável</p>
        <p className="text-xs text-ink-muted">Calculada a partir dos seus custos</p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  return (
    <div>
      <p className="text-[11px] text-ink-muted">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-base font-semibold tabular-nums",
          tone === "bad"
            ? "text-status-critical"
            : tone === "warn"
              ? "text-status-warning"
              : "text-ink-primary",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Note({
  tone,
  children,
}: {
  tone: "warning" | "critical";
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs",
        tone === "critical"
          ? "bg-status-critical/10 text-ink-primary"
          : "bg-status-warning/10 text-ink-primary",
      )}
    >
      <AlertTriangle
        className={cn(
          "mt-0.5 h-3.5 w-3.5 shrink-0",
          tone === "critical" ? "text-status-critical" : "text-status-warning",
        )}
      />
      <span>{children}</span>
    </p>
  );
}

function formatRate(rate: number): string {
  const pct = rate * 100;
  const digits = Number.isInteger(pct) ? 0 : 1;
  return `${pct.toFixed(digits).replace(".", ",")}%`;
}
