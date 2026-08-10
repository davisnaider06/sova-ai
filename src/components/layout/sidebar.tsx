"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Package,
  Compass,
  Users,
  Bot,
  Wand2,
  Radar,
  Heart,
  Settings,
  LogOut,
  Trophy,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand/logo";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/produtos", label: "Produtos", icon: Package },
  { href: "/dashboard/descobrir", label: "Descobrir Produtos", icon: Compass },
  { href: "/dashboard/rankings", label: "Rankings", icon: Trophy },
  { href: "/dashboard/influenciadores", label: "Influenciadores", icon: Users },
  { href: "/dashboard/influenciadores-ia", label: "Influenciadores IA", icon: Bot },
  { href: "/dashboard/conteudo-ia", label: "Conteúdo IA", icon: Wand2 },
  { href: "/dashboard/pagina-vendas", label: "Página de Vendas IA", icon: FileText },
  { href: "/dashboard/inteligencia-mercado", label: "Inteligência de Mercado", icon: Radar },
];

const navSecondary = [
  { href: "/dashboard/favoritos", label: "Favoritos", icon: Heart },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname?.startsWith(href);
  }

  const name = user?.fullName || user?.firstName || "Vendedor";
  const email = user?.primaryEmailAddress?.emailAddress || "";
  const initials = (name || "V")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="glass-surface hidden h-screen w-64 shrink-0 flex-col rounded-none border-y-0 border-l-0 p-4 lg:flex">
      <Link href="/dashboard" className="flex items-center gap-2 px-2 py-2">
        <Logo size={30} />
      </Link>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {nav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand text-brand-foreground"
                  : "text-ink-secondary hover:bg-surface-2 hover:text-ink-primary",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        <div className="my-3 h-px bg-border-hairline" />

        {navSecondary.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand text-brand-foreground"
                  : "text-ink-secondary hover:bg-surface-2 hover:text-ink-primary",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="glass-surface mt-4 rounded-2xl p-3">
        <div className="flex items-center gap-2.5">
          <Avatar>
            <AvatarImage src={user?.imageUrl} alt={name} />
            <AvatarFallback className="bg-brand/15 text-brand">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-primary">{name}</p>
            <p className="truncate text-xs text-ink-muted">{email || "conta"}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Badge variant="subtle">Plano Pro</Badge>
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink-primary"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}
