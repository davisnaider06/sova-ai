"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavItemActive, mobileNavFor } from "@/lib/nav";
import type { ProfileType } from "@/generated/prisma";

export function MobileNav({ activeType }: { activeType: ProfileType }) {
  const pathname = usePathname();
  const items = mobileNavFor(activeType);

  return (
    <nav
      className="glass-surface fixed inset-x-0 bottom-0 z-40 flex items-center justify-around rounded-none border-x-0 border-b-0 px-2 pt-2 lg:hidden"
      // Instalado como PWA no iPhone, a barra de gestos fica por cima da nav.
      // O padding acompanha a safe-area e vale zero onde ela não existe.
      style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
    >
      {items.map((item) => {
        const active = isNavItemActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium",
              active ? "text-brand-ink" : "text-ink-muted",
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full",
                active && "bg-brand text-brand-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
            </span>
            <span className="max-w-16 truncate">{item.label.split(" ")[0]}</span>
          </Link>
        );
      })}

      <Link
        href="/dashboard/configuracoes"
        className={cn(
          "flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium",
          isNavItemActive("/dashboard/configuracoes", pathname) ? "text-brand-ink" : "text-ink-muted",
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full",
            // Lima, igual aos demais itens desta barra. O preto do item ativo
            // é exclusividade da barra lateral do desktop.
            isNavItemActive("/dashboard/configuracoes", pathname) &&
              "bg-brand text-brand-foreground",
          )}
        >
          <Menu className="h-4 w-4" />
        </span>
        Menu
      </Link>
    </nav>
  );
}
