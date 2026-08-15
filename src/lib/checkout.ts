// ---------------------------------------------------------------------------
// Checkout da assinatura.
//
// O pagamento acontece fora da plataforma, na Hubla. Aqui fica só o endereço —
// num lugar só, porque ele aparece na landing, na navbar e nos planos, e link
// de pagamento espalhado por seis arquivos é o tipo de coisa que se atualiza
// em cinco e fica errado no sexto.
//
// ⚠️ Este link leva o visitante ao pagamento, mas **nada verifica ainda** se
// quem entrou pagou de fato. Ligar as duas pontas depende de webhook da Hubla
// (ou de liberação manual) — ver a pergunta em aberto no fim da conversa de
// 14/08/2026. Enquanto isso, assinar e criar conta são fluxos independentes.
// ---------------------------------------------------------------------------

export const HUBLA_CHECKOUT_URL = "https://pay.hub.la/R1waUwQB11Ij9557qq5Z";
