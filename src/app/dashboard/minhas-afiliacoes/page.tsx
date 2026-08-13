import { Clock, Handshake, Package } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prisma } from "@/lib/db";
import { requireCreatorScope } from "@/lib/session";
import { formatBRL, formatPercent, toCents } from "@/lib/money";
import { endAffiliation } from "@/app/dashboard/descobrir/actions";

const STATUS_META: Record<
  string,
  { label: string; variant: "default" | "subtle" | "good" | "warning" | "critical" }
> = {
  PENDING: { label: "Aguardando seller", variant: "warning" },
  ACTIVE: { label: "Ativa", variant: "good" },
  PAUSED: { label: "Pausada pelo seller", variant: "subtle" },
  ENDED: { label: "Encerrada", variant: "subtle" },
  REJECTED: { label: "Recusada", variant: "critical" },
};

export default async function MinhasAfiliacoesPage() {
  const { scope } = await requireCreatorScope();

  // Afiliações com o produto junto: sem o nome e o preço, a lista seria uma
  // coluna de ids. O join tem nome de negócio aqui em vez de virar include
  // genérico no escopo.
  const affiliations = await prisma.affiliation.findMany({
    where: { creatorProfileId: scope.creatorProfileId },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      product: {
        select: {
          id: true,
          name: true,
          category: true,
          price: true,
          imageUrl: true,
          status: true,
          sellerProfile: { select: { profile: { select: { displayName: true } } } },
        },
      },
      _count: { select: { commissions: true } },
    },
  });

  const rows = affiliations.map((a) => ({
    id: a.id,
    status: a.status,
    rate: Number(a.commissionRate.toString()),
    commissionCount: a._count.commissions,
    product: {
      id: a.product.id,
      name: a.product.name,
      category: a.product.category,
      priceCents: toCents(a.product.price),
      imageUrl: a.product.imageUrl,
      sellerName: a.product.sellerProfile.profile.displayName,
      active: a.product.status === "ACTIVE",
    },
  }));

  const active = rows.filter((r) => r.status === "ACTIVE");
  const pending = rows.filter((r) => r.status === "PENDING");
  const others = rows.filter((r) => !["ACTIVE", "PENDING"].includes(r.status));

  return (
    <>
      <Topbar
        title="Minhas afiliações"
        subtitle={
          active.length > 0
            ? `${active.length} ${active.length === 1 ? "produto ativo" : "produtos ativos"}`
            : "Produtos que você está habilitado a promover"
        }
      />

      <div className="flex flex-col gap-6 p-6">
        {rows.length === 0 ? (
          <EmptyState
            icon={Handshake}
            title="Você ainda não pediu nenhuma afiliação"
            description="Encontre produtos que combinam com o seu público na descoberta. Cada pedido vai para o seller aprovar."
            action={{ href: "/dashboard/descobrir", label: "Descobrir produtos" }}
          />
        ) : (
          <Tabs defaultValue={pending.length > 0 ? "pendentes" : "ativas"}>
            <TabsList>
              <TabsTrigger value="ativas">Ativas ({active.length})</TabsTrigger>
              <TabsTrigger value="pendentes">
                <span className="flex items-center gap-1.5">
                  Pendentes
                  {pending.length > 0 && (
                    <Badge variant="warning" className="px-1.5 py-0 text-[10px]">
                      {pending.length}
                    </Badge>
                  )}
                </span>
              </TabsTrigger>
              <TabsTrigger value="outras">Encerradas ({others.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="ativas">
              {active.length === 0 ? (
                <EmptyState
                  icon={Handshake}
                  title="Nenhuma afiliação ativa"
                  description="Assim que um seller aprovar seu pedido, o produto aparece aqui."
                  action={{ href: "/dashboard/descobrir", label: "Descobrir produtos" }}
                />
              ) : (
                <List rows={active} />
              )}
            </TabsContent>

            <TabsContent value="pendentes">
              {pending.length === 0 ? (
                <EmptyState icon={Clock} title="Nenhum pedido aguardando" />
              ) : (
                <List rows={pending} />
              )}
            </TabsContent>

            <TabsContent value="outras">
              {others.length === 0 ? (
                <EmptyState icon={Handshake} title="Nada por aqui" />
              ) : (
                <List rows={others} />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
}

type Row = {
  id: string;
  status: string;
  rate: number;
  commissionCount: number;
  product: {
    id: string;
    name: string;
    category: string;
    priceCents: number;
    imageUrl: string | null;
    sellerName: string;
    active: boolean;
  };
};

function List({ rows }: { rows: Row[] }) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((a) => {
        const meta = STATUS_META[a.status] ?? STATUS_META.PENDING;
        const perSale = Math.round(a.product.priceCents * a.rate);

        return (
          <Card key={a.id} className="flex flex-wrap items-center gap-x-6 gap-y-4 p-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-2">
              {a.product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.product.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Package className="h-4 w-4 text-ink-muted" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium text-ink-primary">
                  {a.product.name}
                </p>
                <Badge variant={meta.variant}>{meta.label}</Badge>
                {!a.product.active && a.status === "ACTIVE" && (
                  <Badge variant="subtle">Produto fora do ar</Badge>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-ink-muted">
                {a.product.sellerName} · {a.product.category}
              </p>
            </div>

            <div className="flex gap-6">
              <div>
                <p className="text-[11px] text-ink-muted">Comissão</p>
                <p className="text-sm font-semibold tabular-nums text-ink-primary">
                  {formatPercent(a.rate, 0)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-ink-muted">Por venda</p>
                <p className="text-sm font-semibold tabular-nums text-brand-ink">
                  {formatBRL(perSale)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-ink-muted">Vendas</p>
                <p className="text-sm font-semibold tabular-nums text-ink-primary">
                  {a.commissionCount}
                </p>
              </div>
            </div>

            {a.status === "ACTIVE" && (
              <form action={endAffiliation}>
                <input type="hidden" name="id" value={a.id} />
                <SubmitButton size="sm" variant="ghost" pendingLabel="...">
                  Encerrar
                </SubmitButton>
              </form>
            )}
          </Card>
        );
      })}
    </div>
  );
}
