import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

// Moldura das páginas jurídicas (/termos e /privacidade).
//
// Elas precisam ser públicas e estáveis: o TikTok exige as duas URLs no
// cadastro da aplicação e volta a visitá-las nas revisões seguintes. Um link
// que quebra é motivo de recusa.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <MarketingNavbar />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <article
          className="
            text-ink-secondary
            [&_a]:text-brand-ink [&_a]:underline [&_a]:underline-offset-2
            [&_h1]:mb-2 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-ink-primary
            [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink-primary
            [&_li]:mb-1.5
            [&_p]:mb-4 [&_p]:leading-relaxed
            [&_strong]:font-medium [&_strong]:text-ink-primary
            [&_table]:mb-6 [&_table]:w-full [&_table]:text-sm
            [&_td]:border-t [&_td]:border-border-hairline [&_td]:py-2.5 [&_td]:pr-4 [&_td]:align-top
            [&_th]:pb-2 [&_th]:pr-4 [&_th]:text-left [&_th]:font-medium [&_th]:text-ink-primary
            [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5
          "
        >
          {children}
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}
