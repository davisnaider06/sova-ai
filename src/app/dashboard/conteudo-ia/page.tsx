import { KeyRound, Video } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/db";
import { requireCreatorScope } from "@/lib/session";
import { isAiConfigured } from "@/lib/ai/client";
import { ScriptGenerator } from "./script-generator";

// §39 — Assistente de conteúdo do creator.
//
// Depois da afiliação vem a pergunta "e agora, como eu divulgo isso?". Esta
// tela responde com um roteiro gravável, escrito a partir do produto real, da
// comissão real e dos nichos declarados pelo creator.
export default async function ConteudoIaPage() {
  const { scope } = await requireCreatorScope();

  const affiliations = await prisma.affiliation.findMany({
    where: { creatorProfileId: scope.creatorProfileId, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    select: {
      product: { select: { id: true, name: true, category: true } },
    },
  });

  const products = affiliations.map((a) => a.product);
  const configured = isAiConfigured();

  return (
    <>
      <Topbar
        title="Assistente de conteúdo"
        subtitle="Roteiro de vídeo para os produtos que você promove"
      />

      <div className="flex flex-col gap-6 p-6">
        {/* Sem chave, a tela diz que está sem chave. A alternativa — mostrar um
            roteiro de exemplo — é a mentira que o §79 proíbe, e a pior possível
            aqui: o creator publicaria achando que a IA escreveu. */}
        {!configured && (
          <Card className="flex items-start gap-3 border-status-warning/30 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-status-warning/15 text-status-warning">
              <KeyRound className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-ink-primary">
                Geração por IA ainda não configurada
              </p>
              <p className="mt-1 max-w-2xl text-sm text-ink-muted">
                Falta a variável <code className="text-ink-secondary">ANTHROPIC_API_KEY</code>{" "}
                no ambiente. A chave sai do console.anthropic.com e é cobrada por uso —
                assinatura do Claude.ai não dá acesso à API. O formulário abaixo continua
                visível para você conferir o fluxo, mas a geração vai falhar até a chave
                existir.
              </p>
            </div>
          </Card>
        )}

        {products.length === 0 ? (
          <EmptyState
            icon={Video}
            title="Você precisa de uma afiliação ativa"
            description="O roteiro é escrito a partir de um produto que você promove — com o preço, a categoria e a comissão reais. Peça a afiliação na descoberta e volte aqui."
            action={{ href: "/dashboard/descobrir", label: "Descobrir produtos" }}
          />
        ) : (
          <ScriptGenerator products={products} />
        )}
      </div>
    </>
  );
}
