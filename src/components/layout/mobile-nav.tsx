"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Compass, Wand2, Radar, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/descobrir", label: "Descobrir", icon: Compass },
  { href: "/dashboard/conteudo-ia", label: "Conteúdo", icon: Wand2 },
  { href: "/dashboard/inteligencia-mercado", label: "Mercado", icon: Radar },
  { href: "/dashboard/configuracoes", label: "Menu", icon: Menu },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="glass-surface fixed inset-x-0 bottom-0 z-40 flex items-center justify-around rounded-none border-x-0 border-b-0 px-2 py-2 lg:hidden">
      {items.map((item) => {
        const active =
          item.href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium",
              active ? "text-brand" : "text-ink-muted",
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
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
