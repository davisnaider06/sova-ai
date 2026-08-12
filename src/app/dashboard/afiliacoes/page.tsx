import Link from "next/link";
import { Handshake, Package } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireSellerScope } from "@/lib/session";
import { formatBRL, formatCompactNumber, formatPercent, toCents } from "@/lib/money";
import { Check, X } from "lucide-react";
import { decideAffiliation } from "./actions";

type Row = {
  id: string;
  status: string;
  commissionRate: number;
  createdAt: Date;
  creatorName: string;
  followers: number | null;
  niches: string[];
  product: { id: string; name: string; category: string; priceCents: number; imageUrl: string | null };
};

export default async function AfiliacoesPage() {
  const { scope } = await requireSellerScope();

  // Uma consulta por aba, em paralelo. Trazer tudo e filtrar em memória
  // funcionaria hoje e quebraria no primeiro seller com mil afiliações.
  const [pending, active, others] = await Promise.all([
    scope.affiliations.inbox("PENDING"),
    scope.affiliations.inbox("ACTIVE"),
    scope.affiliations.inbox({ in: ["PAUSED", "REJECTED", "ENDED"] }),
  ]);

  const toRow = (a: Awaited<ReturnType<typeof scope.affiliations.inbox>>[number]): Row => ({
    id: a.id,
    status: a.status,
    commissionRate: Number(a.commissionRate.toString()),
    createdAt: a.createdAt,
    creatorName: a.creatorProfile.profile.displayName,
    followers: a.creatorProfile.followersCount,
    niches: a.creatorProfile.niches,
    product: {
      id: a.product.id,
      name: a.product.name,
      category: a.product.category,
      priceCents: toCents(a.product.price),
      imageUrl: a.product.imageUrl,
    },
  });

  const pendingRows = pending.map(toRow);
  const activeRows = active.map(toRow);
  const otherRows = others.map(toRow);

  return (
    <>
      <Topbar
        title="Afiliações"
        subtitle={
          pendingRows.length > 0
            ? `${pendingRows.length} ${pendingRows.length === 1 ? "creator aguarda" : "creators aguardam"} sua decisão`
            : "Quem está habilitado a promover seus produtos"
        }
      />

      <div className="flex flex-col gap-6 p-6">
        <Tabs defaultValue={pendingRows.length > 0 ? "pendentes" : "ativas"}>
          <TabsList>
            <TabsTrigger value="pendentes">
              <span className="flex items-center gap-1.5">
                Pendentes
                {pendingRows.length > 0 && (
                  <Badge variant="warning" className="px-1.5 py-0 text-[10px]">
                    {pendingRows.length}
                  </Badge>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger value="ativas">Ativas ({activeRows.length})</TabsTrigger>
            <TabsTrigger value="outras">Encerradas ({otherRows.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes">
            {pendingRows.length === 0 ? (
              <EmptyState
                icon={Handshake}
                title="Nenhum pedido aguardando"
                description="Quando um creator pedir para promover um dos seus produtos ativos, ele aparece aqui para você aprovar ou recusar."
              />
            ) : (
              <List rows={pendingRows} />
            )}
          </TabsContent>

          <TabsContent value="ativas">
            {activeRows.length === 0 ? (
              <EmptyState
                icon={Handshake}
                title="Nenhuma afiliação ativa"
                description="Publique produtos como Ativos para que apareçam na descoberta dos creators."
                action={{ href: "/dashboard/produtos", label: "Ver produtos" }}
              />
            ) : (
              <List rows={activeRows} />
            )}
          </TabsContent>

          <TabsContent value="outras">
            {otherRows.length === 0 ? (
              <EmptyState icon={Handshake} title="Nada por aqui" />
            ) : (
              <List rows={otherRows} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

const STATUS_META: Record<
  string,
  { label: string; variant: "default" | "subtle" | "good" | "warning" | "critical" }
> = {
  PENDING: { label: "Aguardando você", variant: "warning" },
  ACTIVE: { label: "Ativa", variant: "good" },
  PAUSED: { label: "Pausada", variant: "subtle" },
  ENDED: { label: "Encerrada", variant: "subtle" },
  REJECTED: { label: "Recusada", variant: "critical" },
};

function List({ rows }: { rows: Row[] }) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((a) => {
        const meta = STATUS_META[a.status] ?? STATUS_META.PENDING;
        const commissionPerSale = Math.round(a.product.priceCents * a.commissionRate);

        return (
          <Card key={a.id} className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-2">
                {a.product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.product.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-4 w-4 text-ink-muted" />
                )}
              </span>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-ink-primary">
                    {a.creatorName}
                  </p>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  quer promover{" "}
                  <Link
                    href={`/dashboard/produtos/${a.product.id}`}
                    className="text-ink-secondary underline-offset-2 hover:underline"
                  >
                    {a.product.name}
                  </Link>
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {a.followers !== null
                    ? `${formatCompactNumber(a.followers)} seguidores`
                    : "Audiência não informada"}
                  {a.niches.length > 0 && ` · ${a.niches.join(", ")}`}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 gap-6">
              <div>
                <p className="text-xs text-ink-muted">Comissão</p>
                <p className="text-sm font-semibold tabular-nums text-ink-primary">
                  {formatPercent(a.commissionRate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Por venda</p>
                <p className="text-sm font-semibold tabular-nums text-ink-primary">
                  {formatBRL(commissionPerSale)}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              {a.status === "PENDING" && (
                <>
                  <form action={decideAffiliation}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="status" value="ACTIVE" />
                    <SubmitButton size="sm" pendingLabel="...">
                      <Check className="h-4 w-4" />
                      Aprovar
                    </SubmitButton>
                  </form>
                  <form action={decideAffiliation}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="status" value="REJECTED" />
                    <SubmitButton size="sm" variant="outline" pendingLabel="...">
                      <X className="h-4 w-4" />
                      Recusar
                    </SubmitButton>
                  </form>
                </>
              )}
              {a.status === "ACTIVE" && (
                <form action={decideAffiliation}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="status" value="PAUSED" />
                  <SubmitButton size="sm" variant="ghost" pendingLabel="...">
                    Pausar
                  </SubmitButton>
                </form>
              )}
              {(a.status === "PAUSED" || a.status === "REJECTED") && (
                <form action={decideAffiliation}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="status" value="ACTIVE" />
                  <SubmitButton size="sm" variant="outline" pendingLabel="...">
                    Reativar
                  </SubmitButton>
                </form>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
