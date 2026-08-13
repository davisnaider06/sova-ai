import { notFound } from "next/navigation";
import { Compass, Package, Receipt, TrendingUp, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  MatchBreakdown,
  MatchConfidenceNotice,
  MatchScore,
} from "@/components/matching/match-score";
import { CommissionCalculator } from "@/components/produtos/commission-calculator";
import { matchCreatorToProduct, type CreatorSignals } from "@/lib/matching";
import { formatBRL, formatPercent } from "@/lib/money";

// ---------------------------------------------------------------------------
// Galeria de componentes — só em desenvolvimento.
//
// As telas reais exigem sessão do Clerk, o que impede olhar o resultado
// renderizado sem logar. Esta rota monta os componentes de maior densidade
// visual sobre dados fixos, para revisar espaçamento, contraste e hierarquia
// nos dois temas de uma vez.
//
// Fica fora de produção: `notFound()` em prod é mais seguro que confiar no
// build para não publicar a rota.
//
// Como capturar (o dev server precisa estar no ar):
//
//   chrome --headless=new --disable-gpu --hide-scrollbars \
//     --user-data-dir=<pasta temporária> --window-size=1440,1800 \
//     --screenshot=out.png http://localhost:3000/preview
//
// A rota está fora do matcher do `proxy.ts` de propósito — passando por lá, o
// Clerk desvia o primeiro acesso para o handshake de dev-browser, que um
// navegador headless não tem como completar. O efeito colateral é o ClerkJS
// reclamar no console **nesta página**: é esperado, e não afeta o resto do app.
//
// O tema vem do `defaultTheme` do layout raiz. Para revisar o outro, troque lá
// temporariamente — a seção escura daqui só cobre o que está dentro do `.dark`.
// ---------------------------------------------------------------------------

const CATEGORIA = "Saúde e suplementos";

function signals(over: Partial<CreatorSignals> = {}): CreatorSignals {
  return {
    niches: [CATEGORIA],
    followers: 128_000,
    averageViews: 42_000,
    engagementRate: 0.058,
    categoryHistory: {},
    hasConnectedAccount: false,
    ...over,
  };
}

const produto = { category: CATEGORIA, priceCents: 12_990, commissionRate: 0.2 };

const MATCHES = [
  {
    label: "Creator com histórico e conta conectada",
    match: matchCreatorToProduct(
      signals({
        hasConnectedAccount: true,
        categoryHistory: { [CATEGORIA]: { gmvCents: 12_000_000, orders: 340 } },
      }),
      produto,
    ),
  },
  {
    label: "Creator estabelecido, sem histórico na plataforma",
    match: matchCreatorToProduct(signals(), produto),
  },
  {
    label: "Creator novo, só o que declarou",
    match: matchCreatorToProduct(
      signals({ followers: 1_800, averageViews: 600, engagementRate: 0.071 }),
      produto,
    ),
  },
  {
    label: "Fora do nicho",
    match: matchCreatorToProduct(signals({ niches: ["Pet shop"] }), produto),
  },
];

export default async function PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="min-h-screen bg-page">
      <Section title="Tema claro" />
      <Gallery />
      <div className="dark bg-page">
        <Section title="Tema escuro" />
        <Gallery />
      </div>
    </main>
  );
}

function Section({ title }: { title: string }) {
  return (
    <div className="border-b border-border-hairline px-6 py-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{title}</p>
    </div>
  );
}

function Gallery() {
  return (
    <div className="flex flex-col gap-10 px-6 py-8">
      <Block title="KPIs">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="GMV" value="R$ 12,4 mil" delta={18.3} icon={TrendingUp} accent />
          <StatCard label="Pedidos" value="87" delta={-4.2} icon={Receipt} />
          <StatCard label="Creators ativos" value="12" hint="3 aguardando você" icon={Wallet} />
          <StatCard label="Comissões a pagar" value="R$ 1.980,40" hint="Aprovadas e pendentes" icon={Wallet} />
        </div>
      </Block>

      <Block title="Match — cartão da descoberta">
        <MatchConfidenceNotice hasConnectedAccount={false} hasHistory={false} />
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {MATCHES.map(({ label, match }) => (
            <Card key={label} className="flex flex-col p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-2">
                  <Package className="h-5 w-5 text-ink-muted" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-primary">
                    Creatina Monohidratada 300g
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">NutriForce · {CATEGORIA}</p>
                  <MatchScore match={match} className="mt-2" />
                </div>
              </div>

              <p className="mt-3 line-clamp-2 text-xs text-ink-secondary">
                Creatina pura, sem sabor, com laudo de pureza. Para quem treina forte e quer
                resultado consistente.
              </p>

              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] text-ink-muted">Preço</p>
                  <p className="text-base font-semibold tabular-nums text-ink-primary">
                    {formatBRL(produto.priceCents)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-ink-muted">
                    Você ganha ({formatPercent(produto.commissionRate, 0)})
                  </p>
                  <p className="text-base font-semibold tabular-nums text-brand-ink">
                    {formatBRL(Math.round(produto.priceCents * produto.commissionRate))}
                  </p>
                </div>
              </div>

              <MatchBreakdown match={match} />

              <div className="mt-4">
                <Button size="sm" className="w-full">
                  Quero promover
                </Button>
              </div>
              <p className="mt-2 text-center text-[10px] text-ink-muted">{label}</p>
            </Card>
          ))}
        </div>
      </Block>

      <Block title="Calculadora de comissão">
        <div className="max-w-2xl">
          <CommissionCalculator
            priceCents={12_990}
            costs={{
              productCost: 4_800,
              shippingCost: 1_400,
              platformFee: 779,
              operationalCost: 300,
            }}
            minimumMargin={0.12}
            targetMargin={0.25}
            currentRate={0.2}
          />
        </div>
      </Block>

      <Block title="Selos e botões">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>padrão</Badge>
          <Badge variant="subtle">discreto</Badge>
          <Badge variant="good">ativo</Badge>
          <Badge variant="warning">aguardando</Badge>
          <Badge variant="critical">recusado</Badge>
          <Badge variant="outline">contorno</Badge>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm">Primário</Button>
          <Button size="sm" variant="outline">Contorno</Button>
          <Button size="sm" variant="subtle">Sutil</Button>
          <Button size="sm" variant="ghost">Fantasma</Button>
          <Button size="sm" variant="destructive">Destrutivo</Button>
        </div>
      </Block>

      <Block title="Tabela">
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-3xl text-sm">
            <thead>
              <tr className="border-b border-border-hairline text-left text-xs text-ink-muted">
                <th className="px-5 py-3 font-medium">Pedido</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium">Creator</th>
                <th className="px-5 py-3 text-right font-medium">Valor</th>
                <th className="px-5 py-3 text-right font-medium">Comissão</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["DEMO-1001", "20/07/2026", "Joana Fit", "R$ 129,90", "R$ 25,98", "Entregue", "good"],
                ["DEMO-1014", "02/08/2026", "Orgânica", "R$ 97,00", "—", "Enviado", "warning"],
                ["DEMO-1021", "09/08/2026", "Bia Skincare", "R$ 479,60", "R$ 119,90", "Entregue", "good"],
              ].map(([id, data, creator, valor, com, status, variant]) => (
                <tr key={id} className="border-b border-border-hairline last:border-0">
                  <td className="px-5 py-3 font-medium text-ink-primary">{id}</td>
                  <td className="px-5 py-3 tabular-nums text-ink-secondary">{data}</td>
                  <td className="px-5 py-3">
                    <span className={creator === "Orgânica" ? "text-ink-muted" : "text-ink-primary"}>
                      {creator}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink-primary">{valor}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink-secondary">{com}</td>
                  <td className="px-5 py-3">
                    <Badge variant={variant as "good" | "warning"}>{status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Block>

      <Block title="Estado vazio">
        <EmptyState
          icon={Compass}
          title="Nenhum produto disponível ainda"
          description="Assim que um seller publicar produtos ativos, eles aparecem aqui — ordenados pelo quanto combinam com o seu perfil."
          action={{ href: "#", label: "Completar meu perfil" }}
        />
      </Block>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-ink-primary">{title}</h2>
      {children}
    </section>
  );
}
