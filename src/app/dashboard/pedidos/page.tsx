import { Receipt } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireSellerScope } from "@/lib/session";
import { formatBRL, toCents } from "@/lib/money";
import { ImportOrders } from "./import-orders";

const STATUS_META: Record<
  string,
  { label: string; variant: "default" | "subtle" | "good" | "warning" | "critical" }
> = {
  PENDING: { label: "Pendente", variant: "subtle" },
  CONFIRMED: { label: "Confirmado", variant: "warning" },
  SHIPPED: { label: "Enviado", variant: "warning" },
  DELIVERED: { label: "Entregue", variant: "good" },
  CANCELLED: { label: "Cancelado", variant: "critical" },
  RETURNED: { label: "Devolvido", variant: "critical" },
};

export default async function PedidosPage() {
  const { scope } = await requireSellerScope();

  const orders = await prisma.order.findMany({
    where: { sellerProfileId: scope.sellerProfileId },
    orderBy: { placedAt: "desc" },
    take: 100,
    include: {
      items: {
        select: { quantity: true, product: { select: { name: true } } },
      },
      attributedAffiliation: {
        select: {
          creatorProfile: { select: { profile: { select: { displayName: true } } } },
        },
      },
      commissions: { select: { estimatedAmount: true, status: true } },
    },
  });

  const totalGmv = orders.reduce((acc, o) => acc + toCents(o.totalAmount), 0);
  const attributed = orders.filter((o) => o.attributedAffiliationId !== null).length;

  return (
    <>
      <Topbar
        title="Pedidos"
        subtitle={
          orders.length > 0
            ? `${orders.length} ${orders.length === 1 ? "pedido" : "pedidos"} · ${formatBRL(totalGmv)} · ${attributed} com creator`
            : "Importe suas vendas para gerar as comissões"
        }
      />

      <div className="flex flex-col gap-6 p-6">
        <ImportOrders />

        {orders.length === 0 ? (
          <Card className="flex flex-col items-center px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-ink-muted">
              <Receipt className="h-5 w-5" />
            </span>
            <p className="mt-4 text-sm font-medium text-ink-primary">Nenhum pedido ainda</p>
            <p className="mt-1.5 max-w-md text-sm text-ink-muted">
              Suba a planilha de pedidos acima. Cada venda é confrontada com as
              afiliações ativas na data, e a comissão do creator sai daí — com a
              taxa congelada no momento da venda.
            </p>
          </Card>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-3xl text-sm">
              <thead>
                <tr className="border-b border-border-hairline text-left text-xs text-ink-muted">
                  <th className="px-5 py-3 font-medium">Pedido</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Itens</th>
                  <th className="px-5 py-3 font-medium">Creator</th>
                  <th className="px-5 py-3 text-right font-medium">Valor</th>
                  <th className="px-5 py-3 text-right font-medium">Comissão</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const meta = STATUS_META[o.orderStatus] ?? STATUS_META.PENDING;
                  const commission = o.commissions.reduce(
                    (acc, c) => acc + toCents(c.estimatedAmount),
                    0,
                  );
                  const creatorName =
                    o.attributedAffiliation?.creatorProfile.profile.displayName ?? null;

                  return (
                    <tr key={o.id} className="border-b border-border-hairline last:border-0">
                      <td className="px-5 py-3 font-medium text-ink-primary">
                        {o.externalOrderId ?? o.id.slice(0, 8)}
                      </td>
                      <td className="px-5 py-3 tabular-nums text-ink-secondary">
                        {o.placedAt.toLocaleDateString("pt-BR")}
                      </td>
                      <td className="max-w-56 truncate px-5 py-3 text-ink-secondary">
                        {o.items
                          .map((i) => `${i.quantity}× ${i.product.name}`)
                          .join(", ")}
                      </td>
                      <td className="px-5 py-3">
                        {creatorName ? (
                          <span className="text-ink-primary">{creatorName}</span>
                        ) : (
                          // Nulo é resposta legítima: venda orgânica, sem creator.
                          <span className="text-ink-muted">Orgânica</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-ink-primary">
                        {formatBRL(toCents(o.totalAmount))}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-ink-secondary">
                        {commission > 0 ? formatBRL(commission) : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </>
  );
}
