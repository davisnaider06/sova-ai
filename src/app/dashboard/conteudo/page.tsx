import { ExternalLink, Video } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { prisma } from "@/lib/db";
import { requireCreatorScope } from "@/lib/session";
import { formatBRL, formatCompactNumber, toCents } from "@/lib/money";
import { ContentForm } from "./content-form";
import { deleteContent } from "./actions";

const TYPE_LABEL: Record<string, string> = {
  VIDEO: "Vídeo",
  LIVE: "Live",
  IMAGE: "Post",
  OTHER: "Outro",
};

export default async function ConteudoPage() {
  const { scope } = await requireCreatorScope();

  const [contents, affiliations] = await Promise.all([
    prisma.content.findMany({
      where: { creatorProfileId: scope.creatorProfileId },
      orderBy: { publishedAt: "desc" },
      take: 100,
      include: { product: { select: { id: true, name: true, category: true } } },
    }),
    scope.affiliations.findMany({
      where: { status: { in: ["ACTIVE", "PAUSED"] } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Produtos elegíveis para registrar conteúdo = onde há afiliação viva.
  const products = await prisma.product.findMany({
    where: { id: { in: affiliations.map((a) => a.productId) } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const totalViews = contents.reduce((acc, c) => acc + c.views, 0);
  const totalGmv = contents.reduce((acc, c) => acc + toCents(c.gmv), 0);

  return (
    <>
      <Topbar
        title="Meu conteúdo"
        subtitle={
          contents.length > 0
            ? `${contents.length} ${contents.length === 1 ? "publicação" : "publicações"} · ${formatCompactNumber(totalViews)} views`
            : "Registre o que você publicou para garantir a atribuição"
        }
      />

      <div className="flex flex-col gap-6 p-6">
        {products.length === 0 ? (
          <EmptyState
            icon={Video}
            title="Você precisa de uma afiliação ativa primeiro"
            description="O conteúdo é sempre ligado a um produto que você promove. Peça a afiliação na descoberta e volte aqui."
            action={{ href: "/dashboard/descobrir", label: "Descobrir produtos" }}
          />
        ) : (
          <ContentForm products={products} />
        )}

        {contents.length > 0 && (
          <>
            {totalGmv > 0 && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Metric label="Views" value={formatCompactNumber(totalViews)} />
                <Metric
                  label="Cliques"
                  value={formatCompactNumber(contents.reduce((a, c) => a + c.clicks, 0))}
                />
                <Metric
                  label="Pedidos"
                  value={String(contents.reduce((a, c) => a + c.orders, 0))}
                />
                <Metric label="GMV gerado" value={formatBRL(totalGmv)} />
              </div>
            )}

            <div className="flex flex-col gap-3">
              {contents.map((c) => (
                <Card key={c.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-ink-primary">
                        {c.title || c.product?.name || "Conteúdo sem título"}
                      </p>
                      <Badge variant="subtle">{TYPE_LABEL[c.contentType] ?? c.contentType}</Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-ink-muted">
                      {c.product?.name ?? "Sem produto"}
                      {c.publishedAt &&
                        ` · publicado em ${c.publishedAt.toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>

                  {/* Métricas só quando existem. Zeros alinhados numa grade dão
                      a impressão de dado medido — e ninguém mediu nada ainda. */}
                  {c.views > 0 && (
                    <div className="flex gap-6">
                      <Metric small label="Views" value={formatCompactNumber(c.views)} />
                      <Metric small label="Pedidos" value={String(c.orders)} />
                      <Metric small label="GMV" value={formatBRL(toCents(c.gmv))} />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {c.url && (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-ink-muted transition-colors hover:text-ink-primary"
                        title="Abrir publicação"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <form action={deleteContent}>
                      <input type="hidden" name="id" value={c.id} />
                      <SubmitButton size="sm" variant="ghost" pendingLabel="...">
                        Remover
                      </SubmitButton>
                    </form>
                  </div>
                </Card>
              ))}
            </div>

            <p className="text-xs text-ink-muted">
              As métricas de views e conversão vêm da conta conectada. Enquanto o
              OAuth do TikTok não estiver liberado, elas ficam vazias — e vazio é o
              que a tela mostra, em vez de um número estimado.
            </p>
          </>
        )}
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  if (small) {
    return (
      <div>
        <p className="text-[11px] text-ink-muted">{label}</p>
        <p className="text-sm font-semibold tabular-nums text-ink-primary">{value}</p>
      </div>
    );
  }
  return (
    <Card className="p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-ink-primary">{value}</p>
    </Card>
  );
}
