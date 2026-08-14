import { requireProfile } from "@/lib/session";
import { CreatorCommissions } from "./creator-commissions";
import { SellerCommissions } from "./seller-commissions";

// Os dois lados olham para o mesmo dinheiro de lados opostos do balcão: o
// creator vê o que tem a receber, o seller vê o que tem a pagar.
export default async function ComissoesPage() {
  const { profile } = await requireProfile();
  return profile.type === "SELLER" ? <SellerCommissions /> : <CreatorCommissions />;
}
