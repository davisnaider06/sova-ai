"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";

// ---------------------------------------------------------------------------
// Boundary genérico de erro.
//
// Em produção, Next só entrega `message` e `digest` aqui — nunca o stack nem
// detalhe de banco/API. `digest` é o que dá pra pedir a alguém que relate pro
// suporte sem expor nada sensível na tela.
//
// A mensagem de rate limit é a única que identificamos e explicamos; qualquer
// outro erro cai no texto genérico, de propósito — não é este componente que
// decide o que é seguro mostrar, é o Next filtrando antes de chegar aqui.
// ---------------------------------------------------------------------------
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isRateLimit = error.name === "RateLimitError";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-16">
      <Logo size={32} />

      <Card className="mt-8 p-6 sm:p-8">
        <AlertTriangle className="h-8 w-8 text-ink-muted" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink-primary">
          {isRateLimit ? "Muitas requisições" : "Algo deu errado"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          {isRateLimit
            ? error.message
            : "Não conseguimos completar essa ação agora. Tente de novo em instantes."}
        </p>

        <Button onClick={reset} size="lg" className="mt-7 w-full">
          Tentar de novo
        </Button>

        {error.digest && (
          <p className="mt-4 text-center text-xs text-ink-muted">
            Código para suporte: <span className="font-mono">{error.digest}</span>
          </p>
        )}
      </Card>

      <p className="mt-6 text-center text-xs text-ink-muted">
        <Link href="/" className="hover:text-ink-primary">
          Voltar para o site
        </Link>
      </p>
    </main>
  );
}
