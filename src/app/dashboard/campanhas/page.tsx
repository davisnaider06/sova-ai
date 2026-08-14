import { requireProfile } from "@/lib/session";
import { SellerCampaigns } from "./seller-campaigns";
import { CreatorCampaigns } from "./creator-campaigns";

// Mesma URL, dois produtos: o seller organiza campanhas, o creator responde a
// convites. Manter um endereço só é o que faz o seletor de perfil continuar
// sendo um toggle — trocar de papel não deveria mudar de página.
export default async function CampanhasPage() {
  const { profile } = await requireProfile();
  return profile.type === "SELLER" ? <SellerCampaigns /> : <CreatorCampaigns />;
}
