import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border-hairline">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <Logo size={26} />
            </Link>
            <p className="mt-3 max-w-xs text-sm text-ink-muted">
              Método + ferramenta para vender mais na TikTok Shop. Menos achismo, mais dados.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-4">
            <div>
              <p className="mb-3 font-medium text-ink-primary">Produto</p>
              <ul className="space-y-2 text-ink-muted">
                <li><Link href="#produto" className="hover:text-ink-primary">Pesquisa de produtos</Link></li>
                <li><Link href="#produto" className="hover:text-ink-primary">Conteúdo com IA</Link></li>
                <li><Link href="#planos" className="hover:text-ink-primary">Planos</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 font-medium text-ink-primary">Ecossistema</p>
              <ul className="space-y-2 text-ink-muted">
                <li><Link href="#ecossistema" className="hover:text-ink-primary">Comunidade</Link></li>
                <li><Link href="#ecossistema" className="hover:text-ink-primary">Treinamento</Link></li>
                <li><Link href="#ecossistema" className="hover:text-ink-primary">Casos de sucesso</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 font-medium text-ink-primary">Conta</p>
              <ul className="space-y-2 text-ink-muted">
                <li><Link href="/login" className="hover:text-ink-primary">Entrar</Link></li>
                <li><Link href="/signup" className="hover:text-ink-primary">Criar conta</Link></li>
              </ul>
            </div>
            <div>
              {/* O TikTok exige as duas URLs no cadastro da aplicação e checa se
                  elas são alcançáveis a partir do site. Link quebrado aqui é
                  motivo de recusa na revisão. */}
              <p className="mb-3 font-medium text-ink-primary">Legal</p>
              <ul className="space-y-2 text-ink-muted">
                <li><Link href="/termos" className="hover:text-ink-primary">Termos de Serviço</Link></li>
                <li><Link href="/privacidade" className="hover:text-ink-primary">Privacidade</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border-hairline pt-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Sova AI. Todos os direitos reservados.</p>
          <p>Os resultados dependem do nicho, da execução e da consistência de cada vendedor.</p>
        </div>
      </div>
    </footer>
  );
}
