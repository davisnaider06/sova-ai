import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Clock, Package, Sparkles } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireCreatorScope } from "@/lib/session";
import { discoverProductById } from "@/lib/discovery";
import { formatBRL, formatNumber, formatPercent } from "@/lib/money";
import { SOURCE_LABEL, confidenceHint } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { requestAffiliation } from "../actions";

// §38 — a tela em que o creator decide.
//
// O card da listagem existe para comparar; esta existe para decidir. Por isso
// o breakdown vem aberto e por extenso: "Por que recomendamos?" é a pergunta
// que precede o clique, e escondê-la atrás de um accordion aqui seria pedir
// uma decisão sem mostrar a razão.
export default async function ProdutoDescobertaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { scope } = await requireCreatorScope();

  const product = await discoverProductById(scope.creatorProfileId, id);
  if (!product) notFound();

  const perSale = Math.round(product.priceCents * product.commissionRate);
  const match = product.match;

  return (
    <>
      <Topbar title={product.name} subtitle={`${product.sellerName} · ${product.category}`} />

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-6">
        <Link
          href="/dashboard/descobrir"
          className="flex w-fit items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a descoberta
        </Link>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
          <div className="flex flex-col gap-5">
            <Card className="flex gap-4 p-5">
              <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-2">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-7 w-7 text-ink-muted" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-ink-primary">{product.name}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {product.sellerCompany ?? product.sellerName}
                </p>
                {product.stockQuantity !== null && (
                  <p className="mt-2 text-xs text-ink-muted">
                    {product.stockQuantity > 0
                      ? `${formatNumber(product.stockQuantity)} em estoque`
                      : "Sem estoque informado"}
                  </p>
                )}
              </div>
            </Card>

            {product.description && (
              <Card className="p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                  Sobre o produto
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-ink-secondary">
                  {product.description}
                </p>
              </Card>
            )}

            {/* "Por que recomendamos?" — o §38 pede isso com todas as letras. */}
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand-ink">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-ink-primary">Por que recomendamos</p>
                  <p className="text-xs text-ink-muted">{match.headline}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-4">
                {match.components.map((c) => (
                  <div key={c.key}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium text-ink-secondary">{c.label}</span>
                      <span className="text-sm tabular-nums text-ink-muted">
                        {Math.round(c.score * 100)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border-strong">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${Math.round(c.score * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-ink-muted">
                      {c.reason} · <span className="italic">{SOURCE_LABEL[c.source]}</span>
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t border-border-hairline pt-4">
                <p className="text-xs text-ink-secondary">
                  {confidenceHint(match.confidenceLevel)}
                </p>
                {match.improves.length > 0 && (
                  <ul className="mt-2.5 flex flex-col gap-1.5">
                    {match.improves.map((hint) => (
                      <li key={hint} className="text-xs text-ink-muted">
                        → {hint}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </div>

          {/* Coluna da decisão: números e ação, sem rolar a página. */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink-secondary">Preço</span>
                <span className="text-lg font-semibold tabular-nums text-ink-primary">
                  {formatBRL(product.priceCents)}
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-sm text-ink-secondary">Comissão</span>
                <span className="text-lg font-semibold tabular-nums text-ink-primary">
                  {formatPercent(product.commissionRate, 0)}
                </span>
              </div>

              <div className="mt-4 rounded-xl bg-surface-2 p-4">
                <p className="text-xs text-ink-muted">Você ganha por venda</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-brand-ink">
                  {formatBRL(perSale)}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border-hairline pt-4">
                <span className="text-sm text-ink-secondary">Compatibilidade</span>
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums",
                      match.score >= 70
                        ? "bg-brand text-brand-foreground"
                        : "bg-surface-2 text-ink-primary",
                    )}
                  >
                    {match.score}
                  </span>
                </span>
              </div>
              <p className="mt-1.5 text-right text-[11px] text-ink-muted">
                confiança {match.confidenceLevel}
              </p>

              <div className="mt-5">
                <AffiliationAction productId={product.id} status={product.affiliationStatus} />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function AffiliationAction({
  productId,
  status,
}: {
  productId: string;
  status: string | null;
}) {
  if (status === "ACTIVE") {
    return (
      <Badge variant="good" className="w-full justify-center py-2.5">
        <Check className="h-3.5 w-3.5" />
        Você já promove este produto
      </Badge>
    );
  }

  if (status === "PENDING") {
    return (
      <Badge variant="warning" className="w-full justify-center py-2.5">
        <Clock className="h-3.5 w-3.5" />
        Aguardando aprovação do seller
      </Badge>
    );
  }

  if (status === "REJECTED") {
    return (
      <Badge variant="subtle" className="w-full justify-center py-2.5">
        Pedido recusado pelo seller
      </Badge>
    );
  }

  return (
    <form action={requestAffiliation}>
      <input type="hidden" name="productId" value={productId} />
      <SubmitButton className="w-full" pendingLabel="Enviando...">
        {status === null ? "Quero promover" : "Pedir novamente"}
      </SubmitButton>
    </form>
  );
}
