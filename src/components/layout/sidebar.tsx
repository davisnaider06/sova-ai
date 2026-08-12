"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { useEffect, useState } from "react";
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
  PanelLeftClose,
  PanelLeftOpen,
  Calculator,
  Handshake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand/logo";
import { ProfileSwitcher, type ProfileSummary } from "@/components/layout/profile-switcher";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

// A navegação é por papel. Um seller não tem "minhas parcerias" e um creator
// não tem "meus produtos" — mostrar as duas listas para os dois faria metade
// dos itens levar a uma tela que redireciona.
const navSeller: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/produtos", label: "Produtos", icon: Package },
  { href: "/dashboard/calculadora", label: "Calculadora de comissão", icon: Calculator },
  { href: "/dashboard/afiliacoes", label: "Afiliados", icon: Handshake },
  { href: "/dashboard/influenciadores", label: "Encontrar creators", icon: Users },
];

const navCreator: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/descobrir", label: "Descobrir produtos", icon: Compass },
  { href: "/dashboard/minhas-afiliacoes", label: "Minhas parcerias", icon: Handshake },
  { href: "/dashboard/conteudo-ia", label: "Conteúdo IA", icon: Wand2 },
];

// Telas do protótipo antigo, que rodam sobre dado fictício. Ficam fora do menu
// principal até migrarem para o domínio real — ver POSICIONAMENTO.md §9.
const navLegacy: NavItem[] = [
  { href: "/dashboard/rankings", label: "Rankings", icon: Trophy },
  { href: "/dashboard/influenciadores-ia", label: "Influenciadores IA", icon: Bot },
  { href: "/dashboard/pagina-vendas", label: "Página de Vendas IA", icon: FileText },
  { href: "/dashboard/inteligencia-mercado", label: "Inteligência de Mercado", icon: Radar },
];

const navSecondary: NavItem[] = [
  { href: "/dashboard/favoritos", label: "Favoritos", icon: Heart },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
];

const STORAGE_KEY = "sova:sidebar-collapsed";

export function Sidebar({
  profiles = [],
  activeProfileId = null,
  activeType = "SELLER",
  showLegacy = false,
}: {
  profiles?: ProfileSummary[];
  activeProfileId?: string | null;
  activeType?: "SELLER" | "CREATOR";
  /// Telas do protótipo, sobre dado fictício. Só aparecem na conta demo.
  showLegacy?: boolean;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();

  // Começa expandida e só encolhe depois de ler o localStorage. O caminho
  // inverso faria a barra "pular" no carregamento para todo mundo que a deixou
  // aberta — que é a maioria.
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    setHydrated(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

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

  const primary = activeType === "CREATOR" ? navCreator : navSeller;
  const items: (NavItem | null)[] = [
    ...primary,
    ...(showLegacy ? [null, ...navLegacy] : []),
    null,
    ...navSecondary,
  ];

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        // Flutuante: margem em volta e cantos arredondados, sem encostar na
        // borda da janela. Antes era `h-screen` colada na lateral com os cantos
        // e as bordas esquerda/topo/base zerados.
        "glass-surface m-3 hidden h-[calc(100svh-1.5rem)] shrink-0 flex-col rounded-3xl p-3 lg:flex",
        // Sem transição antes de hidratar, senão a barra desliza sozinha no
        // carregamento de quem a deixou fechada.
        hydrated && "transition-[width] duration-300 ease-out",
        collapsed ? "w-[76px]" : "w-64",
      )}
    >
      <div className={cn("flex items-center px-1 py-1", collapsed && "justify-center")}>
        <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
          <Logo size={30} showWordmark={!collapsed} />
        </Link>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto scrollbar-none">
        {items.map((item, i) =>
          item === null ? (
            <div key={`sep-${i}`} className="my-3 h-px shrink-0 bg-border-hairline" />
          ) : (
            <Link
              key={item.href}
              href={item.href}
              // Recolhida, o rótulo some da tela — o title vira a única pista
              // visual, e o aria-label mantém o leitor de tela funcionando.
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-0" : "px-3",
                isActive(item.href)
                  ? "bg-selected text-selected-foreground"
                  : "text-ink-secondary hover:bg-surface-2 hover:text-ink-primary",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          ),
        )}
      </nav>

      <button
        onClick={toggle}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        aria-expanded={!collapsed}
        title={collapsed ? "Expandir menu" : "Recolher menu"}
        className={cn(
          "mt-3 flex shrink-0 items-center gap-3 rounded-xl py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink-primary",
          collapsed ? "justify-center px-0" : "px-3",
        )}
      >
        {collapsed ? (
          <PanelLeftOpen className="h-4 w-4 shrink-0" />
        ) : (
          <>
            <PanelLeftClose className="h-4 w-4 shrink-0" />
            <span>Recolher</span>
          </>
        )}
      </button>

      <div className={cn("glass-surface mt-3 shrink-0 rounded-2xl", collapsed ? "p-2" : "p-3")}>
        {!collapsed && <ProfileSwitcher profiles={profiles} activeProfileId={activeProfileId} />}

        <div
          className={cn(
            "flex items-center gap-2.5",
            !collapsed && "mt-3",
            collapsed && "justify-center",
          )}
        >
          <Avatar>
            <AvatarImage src={user?.imageUrl} alt={name} />
            <AvatarFallback className="bg-selected/10 text-ink-primary">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-primary">{name}</p>
              <p className="truncate text-xs text-ink-muted">{email || "conta"}</p>
            </div>
          )}
        </div>

        {collapsed ? (
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            aria-label="Sair"
            title="Sair"
            className="mt-2 flex w-full items-center justify-center rounded-lg py-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink-primary"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        ) : (
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
        )}
      </div>
    </aside>
  );
}
