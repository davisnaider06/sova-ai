import { Compass } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { EmptyState } from "@/components/ui/empty-state";
import { MatchConfidenceNotice } from "@/components/matching/match-score";
import { requireCreatorScope } from "@/lib/session";
import { discoverProductsFor, loadCreatorSignals } from "@/lib/discovery";
import { DiscoverList } from "./discover-list";

export default async function DescobrirPage() {
  const { scope } = await requireCreatorScope();

  const [products, signals] = await Promise.all([
    discoverProductsFor(scope.creatorProfileId),
    loadCreatorSignals(scope.creatorProfileId),
  ]);

  const hasHistory = Object.keys(signals.categoryHistory).length > 0;

  return (
    <>
      <Topbar
        title="Descobrir produtos"
        subtitle={
          products.length > 0
            ? `${products.length} ${products.length === 1 ? "produto disponível" : "produtos disponíveis"}, ordenados pelo seu match`
            : "Produtos que você pode promover"
        }
      />

      <div className="flex flex-col gap-5 p-6">
        <MatchConfidenceNotice
          hasConnectedAccount={signals.hasConnectedAccount}
          hasHistory={hasHistory}
        />

        {products.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="Nenhum produto disponível ainda"
            description="Assim que um seller publicar produtos ativos, eles aparecem aqui — ordenados pelo quanto combinam com o seu perfil."
            action={{ href: "/dashboard/configuracoes", label: "Completar meu perfil" }}
          />
        ) : (
          <DiscoverList products={products} />
        )}
      </div>
    </>
  );
}
