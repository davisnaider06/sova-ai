"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categoryLabel } from "@/lib/categories";
import { formatMoney, formatRate } from "@/lib/commission";
import { basisLabel, type EarningsBasis } from "@/lib/creator-earnings";

export type DiscoveryProduct = {
  id: string;
  name: string;
  category: string;
  price: string;
  imageUrl: string | null;
  sellerName: string;
  commissionRate: string | null;
  perSale: string;
  estimatedLow: string | null;
  estimatedHigh: string | null;
  basis: EarningsBasis;
  matchesNiche: boolean;
  alreadyRequested: boolean;
};

export function ProductDiscoveryCard({
  product,
  onRequest,
}: {
  product: DiscoveryProduct;
  onRequest: (productId: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [requested, setRequested] = useState(product.alreadyRequested);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function request() {
    setError(null);
    start(async () => {
      const result = await onRequest(product.id);
      if (result.ok) setRequested(true);
      else setError(result.error ?? "Não deu certo.");
    });
  }

  const hasCommission = product.commissionRate !== null && Number(product.commissionRate) > 0;

  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-primary">{product.name}</p>
            <p className="mt-0.5 truncate text-xs text-ink-muted">
              {categoryLabel(product.category)} · {product.sellerName}
            </p>
          </div>
          {product.matchesNiche && (
            <Badge variant="default" className="shrink-0">
              <Sparkles className="mr-1 h-3 w-3" />
              Seu nicho
            </Badge>
          )}
        </div>

        {/* O número que decide se vale gravar. Fica em destaque de propósito:
            é o "R$ 3,00 por venda" que o creator precisa ver antes, não depois. */}
        <div className="mt-5">
          {hasCommission ? (
            <>
              <p className="text-xs text-ink-secondary">Você ganha por venda</p>
              <p className="mt-0.5 text-3xl font-semibold tracking-tight text-ink-primary">
                {formatMoney(product.perSale)}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {formatRate(product.commissionRate)} de {formatMoney(product.price)}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-ink-secondary">Comissão a combinar</p>
              <p className="mt-0.5 text-lg font-medium text-ink-primary">
                {formatMoney(product.price)}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                A loja ainda não definiu a comissão deste produto.
              </p>
            </>
          )}
        </div>

        {product.estimatedLow && product.estimatedHigh && (
          <div className="mt-4 rounded-xl bg-selected/[0.05] p-3">
            <p className="text-xs text-ink-secondary">
              Um vídeo seu renderia entre{" "}
              <strong className="text-ink-primary">{formatMoney(product.estimatedLow)}</strong> e{" "}
              <strong className="text-ink-primary">{formatMoney(product.estimatedHigh)}</strong>
            </p>
            <p className="mt-1 text-[11px] text-ink-muted">{basisLabel(product.basis)}</p>
          </div>
        )}

        <div className="mt-auto pt-5">
          {requested ? (
            <p className="flex items-center gap-1.5 text-sm text-ink-secondary">
              <Check className="h-4 w-4 shrink-0" />
              Pedido enviado — aguardando a loja
            </p>
          ) : (
            <Button onClick={request} disabled={pending} className="w-full">
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Quero promover
            </Button>
          )}
          {error && <p className="mt-2 text-xs text-status-critical">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
