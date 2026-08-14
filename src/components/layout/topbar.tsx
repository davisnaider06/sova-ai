"use client";

import { useEffect, useRef, useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import { cn } from "@/lib/utils";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user } = useUser();
  const firstName = user?.firstName || user?.username || null;
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
        <div className="min-w-0">
          {!scrolled && (
            <p className="text-xs font-medium text-ink-muted">
              {firstName ? `${greeting()}, ${firstName}` : greeting()}
            </p>
          )}
          <h1
            className={cn(
              "truncate font-semibold tracking-tight transition-all",
              scrolled ? "text-base" : "mt-0.5 text-xl",
            )}
          >
            {title}
          </h1>
          {!scrolled && subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
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
