import { prisma } from "@/lib/db";
import { requireProfile } from "@/lib/session";
import { sellerScope } from "@/lib/scoped-db";
import { loadCreatorStats, loadSellerStats } from "@/lib/dashboard-stats";
import { discoverProductsFor } from "@/lib/discovery";
import { SellerDashboard } from "./seller-dashboard";
import { CreatorDashboard } from "./creator-dashboard";

// A rota é a mesma para os dois papéis, e o Profile ativo decide o que
// renderizar. Manter uma URL só é o que faz o seletor de perfil na barra
// lateral funcionar como um toggle — trocar de papel não muda de endereço.
export default async function DashboardPage() {
  const { profile } = await requireProfile();

  if (profile.type === "SELLER") {
    const seller = await prisma.sellerProfile.findUnique({
      where: { profileId: profile.id },
      select: { id: true },
    });
    if (!seller) throw new Error(`Profile ${profile.id} é SELLER mas não tem SellerProfile.`);

    const scope = sellerScope(seller.id);
    const [stats, productCount] = await Promise.all([
      loadSellerStats(seller.id),
      scope.products.count(),
    ]);

    return (
      <SellerDashboard
        stats={stats}
        displayName={profile.displayName}
        hasProducts={productCount > 0}
      />
    );
  }

  const creator = await prisma.creatorProfile.findUnique({
    where: { profileId: profile.id },
    select: { id: true, niches: true },
  });
  if (!creator) throw new Error(`Profile ${profile.id} é CREATOR mas não tem CreatorProfile.`);

  const [stats, matches] = await Promise.all([
    loadCreatorStats(creator.id),
    discoverProductsFor(creator.id, { take: 40 }),
  ]);

  return (
    <CreatorDashboard
      stats={stats}
      displayName={profile.displayName}
      topMatches={matches.filter((m) => m.affiliationStatus === null).slice(0, 4)}
      profileComplete={creator.niches.length > 0}
    />
  );
}
