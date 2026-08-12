"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Pause, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatMoney, formatRate } from "@/lib/commission";

export type AffiliationRowData = {
  id: string;
  status: string;
  commissionRate: string;
  creatorName: string;
  creatorFollowers: number | null;
  productName: string;
  productPrice: string;
  /// Teto que a margem do seller aguenta. Null quando o produto não tem custos
  /// cadastrados — aí não há como avisar nada.
  maxRate: string | null;
  requestedAt: string;
};

const STATUS: Record<string, { label: string; variant: "default" | "subtle" }> = {
  PENDING: { label: "Aguardando você", variant: "default" },
  ACTIVE: { label: "Ativa", variant: "subtle" },
  PAUSED: { label: "Pausada", variant: "subtle" },
  REJECTED: { label: "Recusada", variant: "subtle" },
  ENDED: { label: "Encerrada", variant: "subtle" },
};

export function AffiliationRow({
  data,
  onApprove,
  onReject,
  onPause,
}: {
  data: AffiliationRowData;
  onApprove: (id: string, rate?: string) => Promise<{ ok: boolean; error?: string }>;
  onReject: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onPause: (id: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [rate, setRate] = useState(() => String(Number(data.commissionRate) * 100));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const status = STATUS[data.status] ?? { label: data.status, variant: "subtle" as const };
  const isPending = data.status === "PENDING";

  // O seller pode digitar qualquer taxa na aprovação — inclusive uma que fura
  // a própria margem. A tela avisa em vez de bloquear: é dinheiro dele, e às
  // vezes pagar caro num creator específico é decisão consciente.
  const overCeiling =
    data.maxRate !== null && Number(rate) / 100 > Number(data.maxRate) && rate.trim() !== "";

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Não deu certo.");
    });
  }

  const initials = data.creatorName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="border-t border-border-hairline py-4 first:border-t-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-selected/10 text-ink-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-primary">{data.creatorName}</p>
            <p className="truncate text-xs text-ink-muted">
              {data.creatorFollowers !== null
                ? `${data.creatorFollowers.toLocaleString("pt-BR")} seguidores · `
                : ""}
              quer promover <strong className="text-ink-secondary">{data.productName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </div>

      {isPending ? (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label
              htmlFor={`rate-${data.id}`}
              className="block text-xs font-medium text-ink-secondary"
            >
              Comissão a aprovar
            </label>
            <div className="relative w-32">
              <Input
                id={`rate-${data.id}`}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                inputMode="decimal"
                className={cn("pr-7", overCeiling && "border-status-warning")}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                %
              </span>
            </div>
          </div>

          <Button size="sm" disabled={pending} onClick={() => run(() => onApprove(data.id, rate))}>
            {pending ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="mr-2 h-3.5 w-3.5" />
            )}
            Aprovar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => onReject(data.id))}
          >
            <X className="mr-2 h-3.5 w-3.5" />
            Recusar
          </Button>

          <p className="w-full text-xs text-ink-muted sm:w-auto">
            {data.maxRate !== null
              ? `Seu teto neste produto é ${formatRate(data.maxRate)}.`
              : "Sem custos cadastrados — não dá para saber seu teto."}
          </p>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <p className="text-sm text-ink-secondary">
            Comissão <strong className="text-ink-primary">{formatRate(data.commissionRate)}</strong>{" "}
            ={" "}
            {formatMoney(
              (Number(data.productPrice) * Number(data.commissionRate)).toFixed(2),
            )}{" "}
            por venda
          </p>
          {data.status === "ACTIVE" && (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => run(() => onPause(data.id))}
            >
              <Pause className="mr-2 h-3.5 w-3.5" />
              Pausar
            </Button>
          )}
        </div>
      )}

      {overCeiling && isPending && (
        <p className="mt-2 text-xs text-ink-secondary">
          Atenção: {formatRate(String(Number(rate) / 100))} passa do seu teto de{" "}
          {formatRate(data.maxRate)}. Dá para aprovar assim, mas você fura a margem que definiu.
        </p>
      )}

      {error && <p className="mt-2 text-xs text-status-critical">{error}</p>}
    </div>
  );
}
