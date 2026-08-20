import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import { HUBLA_CHECKOUT_URL } from "@/lib/checkout";

export function MarketingNavbar() {
  return (
    <header className="glass-pill sticky top-0 z-40 rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={30} />
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-ink-secondary md:flex">
          <Link href="#produto" className="hover:text-ink-primary transition-colors">
            Ferramenta
          </Link>
          <Link href="#ecossistema" className="hover:text-ink-primary transition-colors">
            Ecossistema
          </Link>
          <Link href="#planos" className="hover:text-ink-primary transition-colors">
            Planos
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Show
            when="signed-out"
            fallback={
              <>
                <Button asChild size="sm">
                  <Link href="/dashboard">Ir para o Dashboard</Link>
                </Button>
                <UserButton />
              </>
            }
          >
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Entrar</Link>
            </Button>
            {/* Vai para o checkout da Hubla, não para /signup: o acesso é de
                assinante, e mandar o visitante criar conta antes de pagar
                produz cadastro que não consegue usar nada. */}
            <Button asChild size="sm">
              <Link href={HUBLA_CHECKOUT_URL}>Assinar</Link>
            </Button>
          </Show>
        </div>
      </div>
    </header>
  );
}
