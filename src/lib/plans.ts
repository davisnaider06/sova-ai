import { HUBLA_CHECKOUT_URL } from "@/lib/checkout";

// ---------------------------------------------------------------------------
// Os planos, em centavos.
//
// Saíram de `mock-data.ts` de propósito: preço é informação comercial real, e
// misturá-la com dado fictício de demonstração é como um número errado acaba
// na tela de um cliente.
//
// Os três não são produtos diferentes — é o mesmo acesso, com períodos de
// cobrança diferentes. Por isso a lista de benefícios é uma só, mostrada
// abaixo dos cartões em vez de repetida três vezes.
// ---------------------------------------------------------------------------

export type Plan = {
  id: string;
  name: string;
  priceCents: number;
  /// Quantos meses o pagamento cobre. É daqui que sai o equivalente mensal.
  months: number;
  /// Como o período aparece ao lado do preço. Igual ao que a Hubla mostra no
  /// checkout — o cliente não pode ver "à vista" aqui e "/trimestre" lá.
  periodLabel: string;
  highlighted?: boolean;
  checkoutUrl: string;
};

// ⚠️ Os três apontam para o mesmo link porque só existe um endereço de
// checkout conhecido. Na Hubla há três planos separados (Mensal, Trimestral e
// Anual), e cada um tem o seu próprio link — trocar aqui é a única coisa que
// falta para o botão levar ao plano certo.
export const PLANS: Plan[] = [
  {
    id: "mensal",
    name: "Mensal",
    priceCents: 14700,
    months: 1,
    periodLabel: "/mês",
    checkoutUrl: HUBLA_CHECKOUT_URL,
  },
  {
    id: "trimestral",
    name: "Trimestral",
    priceCents: 29700,
    months: 3,
    periodLabel: "/trimestre",
    checkoutUrl: HUBLA_CHECKOUT_URL,
  },
  {
    id: "anual",
    name: "Anual",
    priceCents: 59700,
    months: 12,
    periodLabel: "/ano",
    highlighted: true,
    checkoutUrl: HUBLA_CHECKOUT_URL,
  },
];

/// O que todo plano inclui. Uma lista só, porque o acesso é o mesmo.
export const PLAN_FEATURES = [
  "Pesquisa de produtos ilimitada",
  "Calculadora de comissão e margem",
  "Descoberta de produtos e creators com compatibilidade explicada",
  "Campanhas, afiliações e acompanhamento de comissões",
  "Assistente de conteúdo com IA",
  "Conexão com a sua conta do TikTok",
];

/// Preço por mês embutido no plano — é o número que deixa a comparação honesta.
export function monthlyEquivalentCents(plan: Plan): number {
  return Math.round(plan.priceCents / plan.months);
}

/// Quanto se economiza em relação a pagar o mensal durante o mesmo período.
/// Devolve null no próprio mensal, que é a régua e não economiza nada.
export function savingsAgainstMonthly(plan: Plan): { cents: number; percent: number } | null {
  const monthly = PLANS.find((p) => p.id === "mensal");
  if (!monthly || plan.months === 1) return null;

  const semDesconto = monthly.priceCents * plan.months;
  const cents = semDesconto - plan.priceCents;
  if (cents <= 0) return null;

  return { cents, percent: Math.round((cents / semDesconto) * 100) };
}
