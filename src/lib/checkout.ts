// ---------------------------------------------------------------------------
// Checkout da assinatura.
//
// O pagamento acontece fora da plataforma, na Hubla. Aqui ficam os endereços —
// num lugar só, porque eles aparecem na landing, na navbar e nos planos, e link
// de pagamento espalhado por seis arquivos é o tipo de coisa que se atualiza
// em cinco e fica errado no sexto.
//
// Cada plano da Hubla (Mensal, Trimestral e Anual) é uma oferta separada, com
// o seu próprio link. Mandar todo mundo para o mesmo endereço faria o cliente
// clicar em "Anual" e pagar mensal — por isso a chave aqui é o id do plano em
// `plans.ts`, e não uma URL solta.
//
// ⚠️ Estes links levam o visitante ao pagamento, mas **nada verifica ainda** se
// quem entrou pagou de fato. Ligar as duas pontas depende de webhook da Hubla
// (ou de liberação manual) — ver a pergunta em aberto no fim da conversa de
// 14/08/2026. Enquanto isso, assinar e criar conta são fluxos independentes.
// ---------------------------------------------------------------------------

export const HUBLA_CHECKOUT_URLS = {
  mensal: "https://pay.hub.la/R1waUwQB11Ij9557qq5Z",
  trimestral: "https://pay.hub.la/xSVNnXOavnqwWOCppWaS",
  anual: "https://pay.hub.la/tNj8WDAoQajkAeyT1OEX",
} as const;

export type CheckoutPlanId = keyof typeof HUBLA_CHECKOUT_URLS;

/// Para os botões que aparecem antes de o visitante escolher período — o
/// "Assinar agora" do topo, o da navbar, o da porta fechada. Aponta para o
/// mensal, que é a menor barreira de entrada; quem quer comparar desce até a
/// seção de planos e clica no cartão certo.
export const HUBLA_CHECKOUT_URL: string = HUBLA_CHECKOUT_URLS.mensal;
