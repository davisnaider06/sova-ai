"use client";

import { useEffect, useRef, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import { cn } from "@/lib/utils";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const container = headerRef.current?.closest<HTMLElement>("[data-scroll-container]");
    if (!container) return;

    const onScroll = () => setScrolled(container.scrollTop > 8);
    onScroll();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  return (
      <header
        ref={headerRef}
        className={cn(
          // Pílula flutuante SEMPRE: arredondada e descolada do topo, em
          // qualquer posição de rolagem. Antes ela era um cabeçalho chapado
          // colado no topo e só virava pílula depois de rolar — agora a forma
          // é constante e só o tamanho responde à rolagem.
          "glass-pill sticky top-3 z-30 mx-3 mt-3 flex items-center justify-between gap-4 rounded-full px-5 transition-[padding,box-shadow] duration-300 ease-out sm:mx-6",
          scrolled ? "py-2.5" : "py-3.5",
        )}
      >
        {/* Só o título e o contexto da tela.
            Antes havia uma saudação ("Boa noite, Davi") empilhada acima do
            título: três blocos de texto dentro de uma pílula, sendo que o nome
            já aparece no rodapé da barra lateral e a hora do dia não ajuda a
            decidir nada. */}
        <div className="min-w-0">
          <h1
            className={cn(
              "truncate font-semibold leading-tight tracking-tight transition-all",
              scrolled ? "text-base" : "text-xl",
            )}
          >
            {title}
          </h1>
          {!scrolled && subtitle && (
            <p className="mt-0.5 truncate text-sm text-ink-muted">{subtitle}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {/* Aqui havia um campo de busca global que não buscava nada. Cada
              listagem já tem a sua, que funciona — e um campo que aceita o que
              você digita e não faz nada é pior que campo nenhum. */}
          <NotificationsBell
            className={cn("transition-all", scrolled ? "h-9 w-9" : "h-10 w-10")}
          />
          <ThemeToggle className={cn("shrink-0 transition-all", scrolled ? "h-9 w-9" : "h-10 w-10")} />
          <UserButton
            appearance={{
              elements: { avatarBox: scrolled ? "h-8 w-8" : "h-9 w-9" },
            }}
          />
        </div>
      </header>
  );
}
