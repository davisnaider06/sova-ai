"use client";

// ---------------------------------------------------------------------------
// Rede de proteção do root layout.
//
// Por que este arquivo existe, e por que `error.tsx` não bastava:
//
//   > `error.js` wraps `loading.js`, `not-found.js`, `page.js`, and nested
//   > `layout.js` files (…). It does **not** wrap the `layout.js` or
//   > `template.js` above it in the same segment. To handle errors in the root
//   > layout, use `global-error.js`.
//   — node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md
//
// O root layout é justamente onde moram `ThemeProvider`, `ClerkThemeProvider`
// (→ `ClerkProvider`) e `AmbientBackground`. Sem este arquivo, qualquer
// exceção vinda de um deles não tinha boundary nenhum acima: o React derrubava
// a árvore e o usuário ficava com um documento **em branco**, sem mensagem,
// sem código de suporte, sem botão de tentar de novo. Era o único ponto do app
// que falhava em silêncio — e era o ponto onde mais coisa de terceiro roda.
//
// Duas restrições da doc que moldam o código abaixo:
//
//   1. "Global error UI must define its own `<html>` and `<body>` tags" — este
//      componente SUBSTITUI o root layout, não se aninha nele.
//   2. "`global-error` (…) do **not** include your global styles" — o
//      globals.css NÃO chega aqui. Por isso todo estilo é inline e as cores
//      estão escritas à mão: usar `text-ink-primary` ou `var(--brand)` daria
//      texto invisível exatamente na tela que existe para ser lida. O tema
//      segue o do sistema via `prefers-color-scheme`, como a doc recomenda.
// ---------------------------------------------------------------------------

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  // Em produção o Next já troca a mensagem real por um texto genérico antes de
  // ela chegar aqui — o que sobra é seguro de exibir. E exibir importa: sem
  // isso, uma falha que só acontece no aparelho de outra pessoa (outro
  // navegador, cookie de terceiro bloqueado, rede capturando o domínio) é
  // indistinguível de "o site não abre". Com a mensagem e o digest na tela, dá
  // para pedir um print e saber o que houve.
  const detail = error?.message?.trim();

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          // A safe-area importa aqui também: instalado como PWA, esta tela pode
          // aparecer em tela cheia, embaixo do notch.
          paddingTop: "calc(24px + env(safe-area-inset-top))",
          paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
          backgroundColor: "#0a0a0b",
          color: "#f7f8f2",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          lineHeight: 1.5,
        }}
      >
        <title>Algo deu errado — Sova AI</title>

        {/* Sem globals.css não há `.dark`, nem variável de tema, nem media
            query do Tailwind. Esta folha inline é o mínimo para a tela
            respeitar o tema claro do sistema em vez de ser sempre escura. */}
        <style>{`
          @media (prefers-color-scheme: light) {
            body { background-color: #eef0e6 !important; color: #14140f !important; }
            .sova-card { background: rgba(255,255,255,.7) !important; border-color: rgba(20,20,15,.1) !important; }
            .sova-muted { color: #55564c !important; }
            .sova-detail { background: rgba(20,20,15,.05) !important; color: #55564c !important; }
          }
          .sova-retry:hover { background-color: #aad11a !important; }
        `}</style>

        <main style={{ width: "100%", maxWidth: "440px" }}>
          <div
            className="sova-card"
            style={{
              background: "rgba(255,255,255,.045)",
              border: "1px solid rgba(255,255,255,.1)",
              borderRadius: "24px",
              padding: "28px",
            }}
          >
            {/* O quadrado lima é a marca reduzida ao essencial: um <img> aqui
                dependeria de a rede estar de pé, que é justamente o que pode
                não estar. */}
            <div
              aria-hidden="true"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                backgroundColor: "#c2ea22",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0b0d05",
                fontWeight: 700,
                fontSize: "20px",
              }}
            >
              S
            </div>

            <h1
              style={{
                margin: "20px 0 0",
                fontSize: "22px",
                fontWeight: 600,
                letterSpacing: "-0.01em",
              }}
            >
              Algo deu errado ao abrir a Sova
            </h1>

            <p className="sova-muted" style={{ margin: "10px 0 0", fontSize: "14px", color: "#b7b8ad" }}>
              A página não conseguiu carregar neste navegador. Tentar de novo
              costuma resolver — se insistir, mande o código abaixo para o
              suporte.
            </p>

            <button
              type="button"
              onClick={retry}
              className="sova-retry"
              style={{
                marginTop: "24px",
                width: "100%",
                // 48px: alvo de toque confortável no celular, que é onde esta
                // tela tem mais chance de aparecer.
                minHeight: "48px",
                border: "none",
                borderRadius: "14px",
                backgroundColor: "#c2ea22",
                color: "#0b0d05",
                fontSize: "15px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Tentar de novo
            </button>

            {/* eslint-disable-next-line @next/next/no-html-link-for-pages --
                `<a>` é deliberado: `<Link>` navega pelo roteador do cliente, e
                se esta tela está na frente é porque a árvore React caiu — o
                roteador é candidato a ser justamente o que quebrou. O link
                cru força recarga completa do documento, que é o único caminho
                que não depende do que já falhou. */}
            <a
              href="/"
              style={{
                display: "block",
                marginTop: "12px",
                minHeight: "48px",
                lineHeight: "48px",
                textAlign: "center",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,.14)",
                color: "inherit",
                textDecoration: "none",
                fontSize: "15px",
                fontWeight: 500,
              }}
            >
              Ir para a página inicial
            </a>

            {(detail || error?.digest) && (
              <div
                className="sova-detail"
                style={{
                  marginTop: "20px",
                  padding: "12px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,.05)",
                  color: "#b7b8ad",
                  fontSize: "12px",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  wordBreak: "break-word",
                }}
              >
                {detail}
                {detail && error?.digest ? <br /> : null}
                {error?.digest ? `digest: ${error.digest}` : null}
              </div>
            )}
          </div>
        </main>
      </body>
    </html>
  );
}
