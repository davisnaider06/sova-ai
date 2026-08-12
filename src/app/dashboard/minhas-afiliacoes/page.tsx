import Link from "next/link";
import { Handshake } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireCreatorScope } from "@/lib/session";
import { prisma } from "@/lib/db";
import { categoryLabel } from "@/lib/categories";
import { formatMoney, formatRate } from "@/lib/commission";

const STATUS: Record<string, { label: string; hint: string; variant: "default" | "subtle" }> = {
  PENDING: { label: "Aguardando", hint: "A loja ainda não respondeu", variant: "default" },
  ACTIVE: { label: "Ativa", hint: "Pode divulgar", variant: "default" },
  PAUSED: { label: "Pausada", hint: "A loja pausou por enquanto", variant: "subtle" },
  REJECTED: { label: "Recusada", hint: "A loja não aceitou", variant: "subtle" },
  ENDED: { label: "Encerrada", hint: "Você encerrou", variant: "subtle" },
};

export default async function MinhasAfiliacoesPage() {
  const { scope } = await requireCreatorScope();

  const affiliations = await prisma.affiliation.findMany({
    where: { creatorProfileId: scope.creatorProfileId },
    include: {
      product: { include: { sellerProfile: { include: { profile: true } } } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const active = affiliations.filter((a) => a.status === "ACTIVE");
  const others = affiliations.filter((a) => a.status !== "ACTIVE");

  return (
    <>
      <Topbar title="Minhas parcerias" subtitle="Os produtos que você pode promover" />

      <div className="space-y-5 px-3 py-5 sm:px-6">
        {affiliations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-selected/10">
                <Handshake className="h-6 w-6 text-ink-secondary" />
              </span>
              <p className="mt-5 text-lg font-medium text-ink-primary">Nenhuma parceria ainda</p>
              <p className="mt-2 max-w-sm text-sm text-ink-muted">
                Encontre produtos que combinam com o seu público e peça para promover. Você vê
                quanto ganha por venda antes de decidir.
              </p>
              <Button asChild className="mt-6">
                <Link href="/dashboard/descobrir">Descobrir produtos</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {active.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Pode divulgar ({active.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  {active.map((a) => (
                    <AffiliationItem key={a.id} affiliation={a} />
                  ))}
                </CardContent>
              </Card>
            )}

            {others.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Outras ({others.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  {others.map((a) => (
                    <AffiliationItem key={a.id} affiliation={a} />
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}

type AffiliationWithProduct = Awaited<
  ReturnType<
    typeof prisma.affiliation.findMany<{
      include: { product: { include: { sellerProfile: { include: { profile: true } } } } };
    }>
  >
>[number];

function AffiliationItem({ affiliation }: { affiliation: AffiliationWithProduct }) {
  const status = STATUS[affiliation.status] ?? {
    label: affiliation.status,
    hint: "",
    variant: "subtle" as const,
  };

  const perSale = Number(affiliation.product.price) * Number(affiliation.commissionRate);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border-hairline py-4 first:border-t-0">
      <div className="min-w-0">
        <p className="truncate font-medium text-ink-primary">{affiliation.product.name}</p>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {categoryLabel(affiliation.product.category)} ·{" "}
          {affiliation.product.sellerProfile.profile.displayName}
        </p>
      </div>

      <div className="flex items-center gap-5">
        <div className="text-right">
          <p className="text-sm font-semibold text-ink-primary">{formatMoney(perSale.toFixed(2))}</p>
          <p className="text-xs text-ink-muted">
            {formatRate(affiliation.commissionRate.toString())} por venda
          </p>
        </div>
        <div className="text-right">
          <Badge variant={status.variant}>{status.label}</Badge>
          {status.hint && <p className="mt-1 text-[11px] text-ink-muted">{status.hint}</p>}
        </div>
      </div>
    </div>
  );
}
