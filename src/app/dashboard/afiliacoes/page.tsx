import { Users } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AffiliationRow, type AffiliationRowData } from "@/components/seller/affiliation-row";
import { requireSellerScope } from "@/lib/session";
import { prisma } from "@/lib/db";
import { analyzeCommission } from "@/lib/commission";
import { TIKTOK_SHOP_BR } from "@/lib/platform-fees";
import {
  approveAffiliation,
  pauseAffiliation,
  rejectAffiliation,
} from "@/app/dashboard/afiliacoes/actions";

// A funcionalidade #3 do lado loja: quem pediu, quem foi aceito, quem está
// ativo, quem sumiu. Hoje isso vive em planilha e WhatsApp.
export default async function AfiliacoesPage() {
  const { scope } = await requireSellerScope();

  const affiliations = await prisma.affiliation.findMany({
    where: { product: { sellerProfileId: scope.sellerProfileId } },
    include: {
      product: { include: { economics: true } },
      creatorProfile: { include: { profile: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const rows: AffiliationRowData[] = affiliations.map((a) => {
    const economics = a.product.economics;
    const analysis = economics
      ? analyzeCommission({
          price: a.product.price.toString(),
          productCost: economics.productCost.toString(),
          shippingCost: economics.shippingCost.toString(),
          operationalCost: economics.operationalCost.toString(),
          feeSchedule: TIKTOK_SHOP_BR,
          minimumMargin: economics.minimumMargin?.toString() ?? null,
        })
      : null;

    return {
      id: a.id,
      status: a.status,
      commissionRate: a.commissionRate.toString(),
      creatorName: a.creatorProfile.profile.displayName,
      creatorFollowers: a.creatorProfile.followersCount,
      productName: a.product.name,
      productPrice: a.product.price.toString(),
      maxRate: analysis?.maxRate?.toString() ?? null,
      requestedAt: a.createdAt.toISOString(),
    };
  });

  const pending = rows.filter((r) => r.status === "PENDING");
  const active = rows.filter((r) => r.status === "ACTIVE" || r.status === "PAUSED");
  const closed = rows.filter((r) => r.status === "REJECTED" || r.status === "ENDED");

  async function approve(id: string, rate?: string) {
    "use server";
    return approveAffiliation(id, rate);
  }
  async function reject(id: string) {
    "use server";
    return rejectAffiliation(id);
  }
  async function pause(id: string) {
    "use server";
    return pauseAffiliation(id);
  }

  const handlers = { onApprove: approve, onReject: reject, onPause: pause };

  return (
    <>
      <Topbar title="Afiliados" subtitle="Quem promove seus produtos" />

      <div className="space-y-5 px-3 py-5 sm:px-6">
        {rows.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-selected/10">
                <Users className="h-6 w-6 text-ink-secondary" />
              </span>
              <p className="mt-5 text-lg font-medium text-ink-primary">Nenhum afiliado ainda</p>
              <p className="mt-2 max-w-sm text-sm text-ink-muted">
                Deixe pelo menos um produto como <strong>Ativo</strong> para que creators
                encontrem e peçam para promover.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {pending.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Aguardando você ({pending.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pending.map((row) => (
                    <AffiliationRow key={row.id} data={row} {...handlers} />
                  ))}
                </CardContent>
              </Card>
            )}

            {active.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Promovendo agora ({active.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {active.map((row) => (
                    <AffiliationRow key={row.id} data={row} {...handlers} />
                  ))}
                </CardContent>
              </Card>
            )}

            {closed.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Encerradas ({closed.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {closed.map((row) => (
                    <AffiliationRow key={row.id} data={row} {...handlers} />
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
