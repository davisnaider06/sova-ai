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
  Lock,
  BarChart3,
  Hash,
  Check,
} from "lucide-react";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { HUBLA_CHECKOUT_URL } from "@/lib/checkout";
import {
  PLAN_FEATURES,
  PLANS,
  monthlyEquivalentCents,
  savingsAgainstMonthly,
} from "@/lib/plans";
import { formatBRL } from "@/lib/money";

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

      {/* ------------------------------------------------------------------
          Hero em duas colunas: a marca de um lado, a porta de entrada do
          outro. É a estrutura da referência — em vez de o visitante rolar
          atrás de um botão, a ação fica ao lado da promessa desde o primeiro
          quadro. Empilha no celular, com o cartão de acesso primeiro.
          ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden px-6 pb-20 pt-14 md:pt-20">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[900px] max-w-[140vw] -translate-x-1/2 rounded-full bg-brand/10 blur-[120px]" />
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Coluna da marca */}
          <div className="order-2 lg:order-1">
            <Badge variant="subtle" className="mb-6 w-fit">
              <Sparkles className="h-3 w-3 text-brand-ink" />
              Método + ferramenta para TikTok Shop
            </Badge>

            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-5xl xl:text-6xl">
              Cole o link do produto.
              <br />
              <span className="text-brand-ink">A IA devolve tudo</span> em segundos.
            </h1>

            <p className="mt-6 max-w-xl text-balance text-lg text-ink-secondary">
              Volume de vendas, concorrência, margem, vídeos virais, hashtags, roteiro, legenda
              e previsão de lucro — sem achismo e sem planilha.
            </p>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {analysisSteps.map((s) => (
                <li
                  key={s.label}
                  className="flex items-center gap-2.5 text-sm text-ink-secondary"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-2">
                    <s.icon className="h-4 w-4 text-brand-ink" />
                  </span>
                  {s.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Coluna de acesso */}
          <div className="order-1 lg:order-2">
            <Card className="p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <Logo size={34} showWordmark={false} />
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-ink-primary">
                    Acesse a Sova
                  </h2>
                  <p className="text-sm text-ink-muted">Entre para continuar vendendo</p>
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3">
                <Button asChild size="lg" className="w-full">
                  <Link href={HUBLA_CHECKOUT_URL}>
                    Assinar agora <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full">
                  <Link href="/login">Já sou assinante — entrar</Link>
                </Button>
              </div>

              <div className="mt-6 flex items-start gap-2 rounded-xl bg-surface-2 px-3.5 py-3">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" />
                <p className="text-xs leading-relaxed text-ink-muted">
                  O acesso à plataforma é exclusivo para assinantes. A assinatura é feita pela
                  Hubla, e o pagamento acontece no ambiente seguro deles.
                </p>
              </div>

              <p className="mt-5 text-center text-xs leading-relaxed text-ink-muted">
                Ao continuar, você concorda com os{" "}
                <Link href="/termos" className="text-brand-ink underline underline-offset-2">
                  Termos de Serviço
                </Link>{" "}
                e a{" "}
                <Link href="/privacidade" className="text-brand-ink underline underline-offset-2">
                  Política de Privacidade
                </Link>
                .
              </p>
            </Card>
          </div>
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
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15">
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
              Um acesso só. Você escolhe de quanto em quanto tempo paga.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-secondary">
              Todos os planos dão acesso à plataforma inteira. Períodos mais longos saem mais
              barato por mês.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {PLANS.map((plan) => {
              const economia = savingsAgainstMonthly(plan);
              const porMes = monthlyEquivalentCents(plan);

              return (
                <Card
                  key={plan.id}
                  className={
                    plan.highlighted
                      ? "relative border-brand-ink p-6 shadow-[0_0_0_1px_var(--brand)]"
                      : "p-6"
                  }
                >
                  {plan.highlighted && (
                    <Badge className="absolute -top-3 left-6">Melhor valor</Badge>
                  )}

                  <h3 className="text-lg font-semibold">{plan.name}</h3>

                  <p className="mt-5 flex items-baseline gap-1.5">
                    <span className="text-4xl font-semibold">{formatBRL(plan.priceCents)}</span>
                    <span className="text-sm text-ink-muted">{plan.periodLabel}</span>
                  </p>

                  {/* O equivalente mensal é o que torna a comparação honesta:
                      sem ele, R$ 597 parece caro ao lado de R$ 147. */}
                  <p className="mt-1.5 text-sm text-ink-secondary">
                    {plan.months === 1
                      ? "Cobrado todo mês"
                      : `Equivale a ${formatBRL(porMes)} por mês`}
                  </p>

                  {economia ? (
                    <p className="mt-3 inline-flex rounded-full bg-brand/15 px-2.5 py-1 text-xs font-medium text-brand-ink">
                      Economize {formatBRL(economia.cents)} ({economia.percent}%)
                    </p>
                  ) : (
                    <p className="mt-3 inline-flex rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-muted">
                      Cancele quando quiser
                    </p>
                  )}

                  <Button
                    asChild
                    className="mt-7 w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    <Link href={plan.checkoutUrl}>Assinar {plan.name.toLowerCase()}</Link>
                  </Button>
                </Card>
              );
            })}
          </div>

          {/* Uma lista só: o que muda entre os planos é o período, não o que
              você recebe. Repetir os mesmos itens em três cartões faria parecer
              que existem três produtos. */}
          <div className="mx-auto mt-12 max-w-3xl">
            <p className="text-center text-sm font-medium text-ink-primary">
              Todos os planos incluem
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {PLAN_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-ink-secondary">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink" />
                  {f}
                </li>
              ))}
            </ul>
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
            <Link href={HUBLA_CHECKOUT_URL}>
              Assinar agora <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Card>
      </section>

      <MarketingFooter />
    </div>
  );
}
