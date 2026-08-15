import type { MetadataRoute } from "next";

// Manifest do PWA, servido pelo Next em /manifest.webmanifest.
//
// `display: standalone` é o que faz o app abrir sem a barra do navegador
// depois de instalado. `start_url` aponta para o dashboard porque quem instala
// já é assinante — cair na landing a cada abertura seria um passo a mais para
// chegar onde a pessoa queria.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sova AI",
    short_name: "Sova",
    description:
      "Encontre produtos, acompanhe suas vendas e transforme audiência em renda na TikTok Shop.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    // Cor da barra do sistema e da tela de abertura. O quase-preto da marca
    // vale nos dois temas: no claro ele emoldura, no escuro ele continua.
    background_color: "#0b0d05",
    theme_color: "#0b0d05",
    categories: ["business", "productivity", "shopping"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // `maskable` é o que impede o Android de recortar a logo ao aplicar a
      // máscara do sistema — os arquivos já são gerados com margem para isso.
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
