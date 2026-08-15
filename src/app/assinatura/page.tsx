import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Clock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { HUBLA_CHECKOUT_URL } from "@/lib/checkout";
import { requireUser } from "@/lib/session";
import { evaluateAccess, findSubscriptionForUser } from "@/lib/subscription";

export const metadata: Metadata = { title: "Assinatura — Sova" };

// A porta fechada, para quem entrou sem assinatura ativa.
//
// Ela precisa responder três coisas que o cliente vai perguntar: por que não
// entrei, o que faço agora, e "eu acabei de pagar, cadê?". A terceira é a que
// mais gera suporte — o pagamento e o cadastro são sistemas diferentes, e o
// webhook pode levar alguns segundos.
export default async function AssinaturaPage() {
  const user = await requireUser();
  const subscription = await findSubscriptionForUser(user.id);
  const access = evaluateAccess(user, subscription);

  // Quem tem acesso não tem o que fazer aqui.
  if (access.allowed) redirect("/dashboard");

  const expirou = access.reason === "expired";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-16">
      <Logo size={32} />

      <Card className="mt-8 p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-primary">
          {expirou ? "Sua assinatura expirou" : "Falta a assinatura"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          {expirou
            ? "O acesso à plataforma ficou suspenso. Renovando, tudo volta exatamente como estava — seus produtos, campanhas e histórico continuam aqui."
            : "O acesso à Sova é exclusivo para assinantes. A assinatura é feita pela Hubla, no ambiente de pagamento deles."}
        </p>

        <Button asChild size="lg" className="mt-7 w-full">
          <Link href={HUBLA_CHECKOUT_URL}>
            {expirou ? "Renovar assinatura" : "Assinar agora"} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>

        <div className="mt-6 flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
          <div className="flex items-start gap-2.5">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
            <p className="text-xs leading-relaxed text-ink-secondary">
              <span className="font-medium text-ink-primary">Acabou de pagar?</span> A liberação é
              automática, mas pode levar alguns instantes. Atualize esta página.
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
            <p className="text-xs leading-relaxed text-ink-secondary">
              {/* A causa nº 1 de "paguei e não entrou": pagar com um e-mail e
                  criar a conta com outro. Dizer qual e-mail está logado aqui
                  resolve o caso sozinho, sem abrir suporte. */}
              A liberação usa o e-mail da compra. Você está nesta conta como{" "}
              <span className="font-medium text-ink-primary">{user.email}</span> — se pagou com
              outro e-mail, entre com ele ou fale com a gente.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-ink-muted">
          Dúvidas:{" "}
          <a
            href="mailto:atlasassessoria@gmail.com"
            className="text-brand-ink underline underline-offset-2"
          >
            atlasassessoria@gmail.com
          </a>
        </p>
      </Card>

      <p className="mt-6 text-center text-xs text-ink-muted">
        <Link href="/" className="hover:text-ink-primary">
          Voltar para o site
        </Link>
      </p>
    </main>
  );
}
