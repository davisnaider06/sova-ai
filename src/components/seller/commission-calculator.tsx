"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Info, TrendingDown } from "lucide-react";
import {
  analyzeCommission,
  commissionLadder,
  formatMoney,
  formatRate,
} from "@/lib/commission";
import { FEE_SCHEDULES, findFeeSchedule, platformFee, TIKTOK_SHOP_BR } from "@/lib/platform-fees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Calculadora de comissão recomendada (§43 do doc de arquitetura).
//
// Recalcula a cada tecla, no navegador — por isso o cálculo mora em
// `lib/commission.ts`, que não importa Prisma.
//
// A tela mostra a conta aberta de propósito. O seller que não entende de onde
// saiu o teto não confia nele, e o que não confia continua chutando 20%.
// ---------------------------------------------------------------------------

export type CalculatorInitial = {
  price?: string;
  productCost?: string;
  shippingCost?: string;
  operationalCost?: string;
  minimumMargin?: string;
  targetMargin?: string;
  feeScheduleId?: string;
};

export function CommissionCalculator({
  initial = {},
  compact = false,
}: {
  initial?: CalculatorInitial;
  compact?: boolean;
}) {
  const [price, setPrice] = useState(initial.price ?? "");
  const [productCost, setProductCost] = useState(initial.productCost ?? "");
  const [shippingCost, setShippingCost] = useState(initial.shippingCost ?? "");
  const [operationalCost, setOperationalCost] = useState(initial.operationalCost ?? "");
  const [minimumMargin, setMinimumMargin] = useState(initial.minimumMargin ?? "15");
  const [targetMargin, setTargetMargin] = useState(initial.targetMargin ?? "25");
  const [feeScheduleId, setFeeScheduleId] = useState(
    initial.feeScheduleId ?? TIKTOK_SHOP_BR.id,
  );

  const schedule = findFeeSchedule(feeScheduleId) ?? TIKTOK_SHOP_BR;

  const inputs = useMemo(
    () => ({
      price,
      productCost,
      shippingCost,
      operationalCost,
      feeSchedule: schedule,
      // O formulário pede percentual ("15"), a lib quer fração (0.15).
      minimumMargin: pct(minimumMargin),
      targetMargin: pct(targetMargin),
    }),
    [price, productCost, shippingCost, operationalCost, schedule, minimumMargin, targetMargin],
  );

  const analysis = useMemo(() => analyzeCommission(inputs), [inputs]);
  const ladder = useMemo(() => commissionLadder(inputs), [inputs]);
  const fee = useMemo(() => platformFee(schedule, analysis.price), [schedule, analysis.price]);

  const hasPrice = analysis.price.gt(0);

  return (
    <div className={cn("grid gap-5", !compact && "lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]")}>
      {/* ---------------------------------------------------------------- */}
      {/* Entradas                                                          */}
      {/* ---------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Números do produto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            id="calc-price"
            label="Preço de venda"
            prefix="R$"
            value={price}
            onChange={setPrice}
            placeholder="89,90"
            autoFocus
          />
          <Field
            id="calc-cost"
            label="Custo do produto"
            prefix="R$"
            value={productCost}
            onChange={setProductCost}
            placeholder="30,00"
          />
          <Field
            id="calc-shipping"
            label="Frete que você paga"
            prefix="R$"
            value={shippingCost}
            onChange={setShippingCost}
            placeholder="0,00"
          />
          <Field
            id="calc-operational"
            label="Custo operacional"
            hint="Embalagem, mão de obra, o que mais entrar por venda."
            prefix="R$"
            value={operationalCost}
            onChange={setOperationalCost}
            placeholder="0,00"
          />

          <div className="space-y-1.5">
            <Label htmlFor="calc-fee">Onde você vende</Label>
            <select
              id="calc-fee"
              value={feeScheduleId}
              onChange={(e) => setFeeScheduleId(e.target.value)}
              className="h-10 w-full rounded-xl border border-border-strong bg-transparent px-3 text-sm text-ink-primary outline-none focus:border-ink-primary"
            >
              {FEE_SCHEDULES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-ink-muted">
              A taxa da plataforma entra sozinha — você não precisa saber a tabela.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              id="calc-min"
              label="Margem mínima"
              suffix="%"
              value={minimumMargin}
              onChange={setMinimumMargin}
              placeholder="15"
            />
            <Field
              id="calc-target"
              label="Margem desejada"
              suffix="%"
              value={targetMargin}
              onChange={setTargetMargin}
              placeholder="25"
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Resultado                                                         */}
      {/* ---------------------------------------------------------------- */}
      <div className="space-y-5">
        <Card>
          <CardContent className="pt-6">
            {!hasPrice ? (
              <p className="text-sm text-ink-muted">
                Informe o preço de venda para ver até quanto dá para pagar de comissão.
              </p>
            ) : analysis.status === "LOSS" ? (
              <Alert
                tone="critical"
                icon={TrendingDown}
                title="Este produto dá prejuízo antes de qualquer comissão"
              >
                O custo total ({formatMoney(analysis.totalCost)}) já passa do preço de venda
                ({formatMoney(analysis.price)}). Não há comissão possível — o preço ou o custo
                precisa mudar.
              </Alert>
            ) : analysis.status === "NO_ROOM" ? (
              <Alert
                tone="warning"
                icon={AlertTriangle}
                title="Dá lucro, mas não sobra para comissão"
              >
                Com margem mínima de {minimumMargin || "0"}%, não sobra nada para pagar creator.
                Pagando qualquer comissão você fura a própria margem.
              </Alert>
            ) : (
              <div>
                <p className="text-sm text-ink-secondary">Comissão recomendada</p>
                <p className="mt-1 text-5xl font-semibold tracking-tight text-ink-primary">
                  {formatRate(analysis.recommendedRate)}
                </p>
                <p className="mt-2 text-sm text-ink-secondary">
                  {formatMoney(analysis.recommendedValue)} por venda, mantendo{" "}
                  {targetMargin || "0"}% de margem.
                </p>
                <p className="mt-4 text-sm text-ink-muted">
                  Teto sem furar sua margem mínima:{" "}
                  <strong className="text-ink-primary">{formatRate(analysis.maxRate)}</strong>{" "}
                  ({formatMoney(analysis.maxValue)}). Acima de{" "}
                  <strong className="text-ink-primary">{formatRate(analysis.breakEvenRate)}</strong>{" "}
                  você paga para vender.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {hasPrice && (
          <Card>
            <CardHeader>
              <CardTitle>Para onde vai o dinheiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Row label="Preço de venda" value={formatMoney(analysis.price)} strong />
              <Row label="Custo do produto" value={`− ${formatMoney(analysis.breakdown.productCost)}`} />
              {analysis.breakdown.shippingCost.gt(0) && (
                <Row label="Frete" value={`− ${formatMoney(analysis.breakdown.shippingCost)}`} />
              )}
              {analysis.breakdown.operationalCost.gt(0) && (
                <Row
                  label="Custo operacional"
                  value={`− ${formatMoney(analysis.breakdown.operationalCost)}`}
                />
              )}
              <Row
                label={`Taxa ${schedule.label}`}
                value={`− ${formatMoney(analysis.breakdown.platformFee)}`}
                detail={
                  schedule.tiers.length > 1
                    ? `${formatRate(fee.tier.rate)} + ${formatMoney(fee.fixed)} fixos = ${formatRate(fee.effectiveRate)} do preço`
                    : undefined
                }
              />
              <div className="h-px bg-border-hairline" />
              <Row
                label="Sobra antes da comissão"
                value={formatMoney(analysis.grossProfit)}
                strong
              />

              {fee.fixed.gt(0) && fee.effectiveRate.gt(0.15) && (
                <div className="mt-3 flex gap-2 rounded-xl bg-selected/[0.05] p-3 text-xs text-ink-secondary">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Os {formatMoney(fee.fixed)} fixos pesam muito num produto deste preço: a taxa
                    real fica em <strong>{formatRate(fee.effectiveRate)}</strong>, não em{" "}
                    {formatRate(fee.tier.rate)}.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {hasPrice && analysis.status === "OK" && (
          <Card>
            <CardHeader>
              <CardTitle>E se eu pagar…</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-muted">
                      <th className="pb-2 font-medium">Comissão</th>
                      <th className="pb-2 font-medium">Você paga</th>
                      <th className="pb-2 font-medium">Sobra</th>
                      <th className="pb-2 font-medium">Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ladder.map((row) => (
                      <tr
                        key={row.rate.toString()}
                        className={cn(
                          "border-t border-border-hairline",
                          row.isRecommended && "bg-selected/[0.05]",
                        )}
                      >
                        <td className="py-2.5 font-medium text-ink-primary">
                          <span className="flex items-center gap-1.5">
                            {formatRate(row.rate)}
                            {row.isRecommended && (
                              <Check className="h-3.5 w-3.5 text-brand-ink" aria-label="recomendada" />
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 text-ink-secondary">
                          {formatMoney(row.commissionValue)}
                        </td>
                        <td
                          className={cn(
                            "py-2.5",
                            row.belowBreakEven ? "text-status-critical" : "text-ink-secondary",
                          )}
                        >
                          {formatMoney(row.netProfit)}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              row.belowBreakEven
                                ? "bg-status-critical/10 text-status-critical"
                                : row.viable
                                  ? "text-ink-secondary"
                                  : "bg-status-warning/15 text-ink-primary",
                            )}
                          >
                            {formatRate(row.netMarginRate)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-ink-muted">
                Linha destacada = maior degrau que ainda entrega a margem desejada. Amarelo fura a
                margem mínima; vermelho é prejuízo por venda.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function pct(value: string): string | null {
  const clean = value.trim();
  if (clean === "") return null;
  const n = Number(clean.replace(",", "."));
  return Number.isFinite(n) ? String(n / 100) : null;
}

function Field({
  id,
  label,
  hint,
  prefix,
  suffix,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  id: string;
  label: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
            {prefix}
          </span>
        )}
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          // `inputMode` decimal abre o teclado numérico no celular sem impedir
          // a vírgula, que é como o brasileiro digita.
          inputMode="decimal"
          className={cn(prefix && "pl-9", suffix && "pr-8")}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

function Row({
  label,
  value,
  detail,
  strong,
}: {
  label: string;
  value: string;
  detail?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div className="min-w-0">
        <span className={cn("text-sm", strong ? "font-medium text-ink-primary" : "text-ink-secondary")}>
          {label}
        </span>
        {detail && <p className="text-xs text-ink-muted">{detail}</p>}
      </div>
      <span
        className={cn(
          "shrink-0 tabular-nums",
          strong ? "text-sm font-semibold text-ink-primary" : "text-sm text-ink-secondary",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Alert({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: "critical" | "warning";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl p-4",
        tone === "critical" ? "bg-status-critical/10" : "bg-status-warning/15",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-5 w-5 shrink-0",
          tone === "critical" ? "text-status-critical" : "text-ink-primary",
        )}
      />
      <div>
        <p className="text-sm font-medium text-ink-primary">{title}</p>
        <p className="mt-1 text-sm text-ink-secondary">{children}</p>
      </div>
    </div>
  );
}
