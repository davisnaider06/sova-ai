// Exercita a camada de IA. Sem ANTHROPIC_API_KEY, verifica o caminho de
// "não configurado" (que é o estado atual do projeto). Com a chave definida,
// faz uma geração real e valida o formato do retorno.
//
//   npx tsx --conditions=react-server scripts/test-ai.ts
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { isAiConfigured } = await import("../src/lib/ai/client");
  const { generateVideoScript } = await import("../src/lib/ai/video-script");

  const configured = isAiConfigured();
  console.log(`ANTHROPIC_API_KEY presente: ${configured ? "sim" : "não"}\n`);

  const result = await generateVideoScript({
    productName: "Creatina Monohidratada 300g",
    productDescription:
      "Creatina pura, sem sabor, com laudo de pureza. Para quem treina forte e quer resultado consistente.",
    category: "Saúde e suplementos",
    priceCents: 12_990,
    commissionRate: 0.2,
    creatorNiches: ["Saúde e suplementos", "Fitness e esportes"],
    followers: 128_000,
    angle: "focar em quem treina de manhã e tem pressa",
  });

  if (!configured) {
    if (result.status !== "not_configured") {
      console.error(`✗ Sem chave, esperava not_configured; veio "${result.status}".`);
      process.exit(1);
    }
    console.log("✓ Sem chave, a geração devolve not_configured em vez de estourar.");
    console.log("  Defina ANTHROPIC_API_KEY em .env.local e rode de novo para testar de verdade.");
    return;
  }

  if (result.status !== "ok") {
    console.error(`✗ Geração falhou: ${result.status}`);
    if (result.status === "error") console.error(`  ${result.message}`);
    if (result.status === "refused") console.error(`  ${result.reason}`);
    process.exit(1);
  }

  const s = result.data;
  const problems: string[] = [];
  if (!s.hook) problems.push("hook vazio");
  if (!Array.isArray(s.scenes) || s.scenes.length < 3) problems.push("menos de 3 cenas");
  if (!Array.isArray(s.hashtags) || s.hashtags.length === 0) problems.push("sem hashtags");
  for (const [i, scene] of (s.scenes ?? []).entries()) {
    if (!scene.title || !scene.action) problems.push(`cena ${i + 1} incompleta`);
  }

  console.log("GANCHO:", s.hook);
  console.log("\nCENAS:");
  for (const [i, scene] of s.scenes.entries()) {
    console.log(`  ${i + 1}. ${scene.title} — ${scene.action}`);
  }
  console.log("\nLEGENDA:", s.caption);
  console.log("CTA:", s.cta);
  console.log("HASHTAGS:", s.hashtags.join(" "));
  console.log("NARRAÇÃO:", s.narration);

  if (problems.length > 0) {
    console.error(`\n✗ Formato com problemas: ${problems.join(", ")}`);
    process.exit(1);
  }
  console.log("\n✓ Roteiro gerado e no formato esperado.");
}

main().catch((e) => {
  console.error("ERRO FATAL:", e);
  process.exit(1);
});
