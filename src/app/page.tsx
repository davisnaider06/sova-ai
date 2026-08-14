import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  TrendingUp,
  Video,
  Users,
  GraduationCap,
  Trophy,
  Wand2,
  Link2,
  BarChart3,
  Hash,
  Check,
} from "lucide-react";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { plans, trendingProducts } from "@/lib/mock-data";
import { formatCurrencyBRL } from "@/lib/utils";

const flow = [
  { label: "Live TikTok", icon: Video },
  { label: "Conteúdo de valor", icon: Sparkles },
  { label: "Demonstração da ferramenta", icon: Wand2 },
  { label: "Comunidade", icon: Users },
  { label: "Oferta do SaaS", icon: Trophy },
];

const ecosystem = [
  {
    icon: Video,
    title: "Conteúdo gratuito",
    description: "Vídeos curtos e lives ensinando estratégias reais para TikTok Shop.",
  },
  {
    icon: Users,
    title: "Comunidade",
    description: "Grupo para dúvidas, networking e novidades entre vendedores.",
  },
  {
    icon: Sparkles,
    title: "SaaS",
    description: "Ferramenta com IA que resolve a dor específica de pesquisa, criação e gestão.",
  },
  {
    icon: GraduationCap,
    title: "Treinamento",
    description: "Curso ensinando a usar o TikTok Shop e extrair o máximo da ferramenta.",
  },
  {
    icon: Trophy,
    title: "Casos de sucesso",
    description: "Os primeiros clientes viram prova social para impulsionar novas vendas.",
  },
];

const analysisSteps = [
  { icon: TrendingUp, label: "Volume de vendas" },
  { icon: BarChart3, label: "Concorrência & margem" },
  { icon: Video, label: "Vídeos virais de referência" },
  { icon: Hash, label: "Hashtags & roteiro pronto" },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-20 pt-20 md:pt-28">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-brand/10 blur-[120px]" />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="subtle" className="mx-auto mb-6 w-fit">
            <Sparkles className="h-3 w-3 text-brand-ink" />
            Não vendemos software. Ensinamos como ganhar dinheiro na TikTok Shop.
          </Badge>

          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            Cole o link do produto.
            <br />
            <span className="text-brand-ink">A IA devolve tudo</span> em segundos.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-ink-secondary">
            Volume de vendas, concorrência, margem, vídeos virais, hashtags, roteiro, legenda
            e previsão de lucro — o método e a ferramenta que reduzem seu tempo de pesquisa,
            criação e gestão na TikTok Shop.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">
                Testar grátis por 7 dias <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/dashboard">Ver o dashboard</Link>
            </Button>
          </div>
        </div>

        {/* Product preview mock */}
        <div className="mx-auto mt-16 max-w-5xl">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-border-hairline px-5 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-status-critical/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-status-warning/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-status-good/70" />
              <span className="ml-3 flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-xs text-ink-muted">
                <Link2 className="h-3 w-3" /> sova.ai/pesquisa
              </span>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border-hairline bg-surface-2 p-5">
                <p className="text-xs text-ink-muted">Link do produto</p>
                <p className="mt-1 truncate text-sm text-ink-secondary">
                  tiktokshop.com/produto/mini-massageador-pescoco
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {analysisSteps.map((s) => (
                    <div key={s.label} className="flex items-center gap-2 rounded-xl bg-surface-3 px-3 py-2 text-xs text-ink-secondary">
                      <s.icon className="h-3.5 w-3.5 text-brand-ink" />
                      {s.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-selected p-5 text-selected-foreground">
                <p className="text-xs font-medium opacity-70">Opportunity Score</p>
                <p className="mt-1 text-4xl font-semibold">{trendingProducts[1].opportunityScore}</p>
                <p className="mt-1 text-sm opacity-80">{trendingProducts[1].name}</p>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span>Margem estimada</span>
                  <span className="font-semibold">{trendingProducts[1].margin}%</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span>Preço sugerido</span>
                  <span className="font-semibold">{formatCurrencyBRL(trendingProducts[1].price)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Método */}
      <section id="metodo" className="border-t border-border-hairline bg-surface-0 px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-sm font-medium text-brand-ink">O método</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Menos &quot;compra meu sistema&quot;. Mais prova, conteúdo e comunidade.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-ink-secondary">
            Em vez de empurrar um ERP gigante que resolve 200 coisas, resolvemos a dor que
            acontece todo dia, custa dinheiro e pode ser resolvida em segundos.
          </p>

          <div className="mt-12 flex flex-col items-center gap-3 md:flex-row md:justify-center md:gap-2">
            {flow.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-border-hairline bg-surface-1 px-5 py-4">
                  <step.icon className="h-5 w-5 text-brand-ink" />
                  <span className="text-sm font-medium text-ink-primary">{step.label}</span>
                </div>
                {i < flow.length - 1 && (
                  <ArrowRight className="hidden h-4 w-4 shrink-0 text-ink-muted md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ecosystem */}
      <section id="ecossistema" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-medium text-brand-ink">O ecossistema</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              Um ecossistema, não um produto solto
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {ecosystem.map((item) => (
              <Card key={item.title} className="p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-selected/10">
                  <item.icon className="h-5 w-5 text-brand-ink" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-ink-primary">{item.title}</h3>
                <p className="mt-1.5 text-sm text-ink-muted">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="border-t border-border-hairline bg-surface-0 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-medium text-brand-ink">Planos</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              Comece agora com o preço de lançamento
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-secondary">
              Hoje quem entrar trava o valor promocional para sempre.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={
                  plan.highlighted
                    ? "relative border-brand-ink p-6 shadow-[0_0_0_1px_var(--brand)]"
                    : "p-6"
                }
              >
                {plan.highlighted && (
                  <Badge className="absolute -top-3 left-6">Mais popular</Badge>
                )}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-ink-muted">{plan.tagline}</p>
                <p className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold">{formatCurrencyBRL(plan.price)}</span>
                  <span className="text-sm text-ink-muted">/mês</span>
                </p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-ink-secondary">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="mt-8 w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  <Link href="/signup">Assinar {plan.name}</Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20">
        <Card className="mx-auto max-w-4xl overflow-hidden p-10 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Quer saber como ganhar dinheiro usando a TikTok Shop?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-secondary">
            Mostramos o método e fornecemos a ferramenta. Os resultados dependem do nicho,
            da execução e da consistência de cada vendedor.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/signup">
              Começar agora <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Card>
      </section>

      <MarketingFooter />
    </div>
  );
}
