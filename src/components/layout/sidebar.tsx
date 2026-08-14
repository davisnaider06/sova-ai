"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand/logo";
import { ProfileSwitcher, type ProfileSummary } from "@/components/layout/profile-switcher";
import { isNavItemActive, navFor, secondaryNav, type NavItem } from "@/lib/nav";
import type { ProfileType } from "@/generated/prisma";

const STORAGE_KEY = "sova:sidebar-collapsed";

// O estado de recolhimento mora no localStorage, não no React — o componente
// só observa. Ler num useEffect e chamar setState causaria render em cascata
// (e o ESLint reclama, com razão); useSyncExternalStore existe exatamente para
// ler uma fonte externa sem esse ciclo extra.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => void listeners.delete(onChange);
}

function isCollapsedStored() {
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

/// No servidor não há localStorage: a barra sempre nasce expandida.
function isCollapsedOnServer() {
  return false;
}

function storeCollapsed(next: boolean) {
  window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  listeners.forEach((notify) => notify());
}

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      // Recolhida, o rótulo some da tela — o title vira a única pista visual, e
      // o aria-label mantém o leitor de tela funcionando.
      title={collapsed ? item.label : undefined}
      aria-label={item.label}
      className={cn(
        "flex shrink-0 items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-colors",
        collapsed ? "justify-center px-0" : "px-3",
        active
          ? "bg-selected text-selected-foreground"
          : "text-ink-secondary hover:bg-surface-2 hover:text-ink-primary",
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

export function Sidebar({
  profiles = [],
  activeProfileId = null,
  activeType,
}: {
  profiles?: ProfileSummary[];
  activeProfileId?: string | null;
  activeType: ProfileType;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();

  const collapsed = useSyncExternalStore(subscribe, isCollapsedStored, isCollapsedOnServer);

  // A transição só serve ao clique. Deixá-la ligada no carregamento faria a
  // barra deslizar sozinha na tela de quem a deixou fechada, então ela só entra
  // depois da primeira interação.
  const [animate, setAnimate] = useState(false);

  function toggle() {
    setAnimate(true);
    storeCollapsed(!collapsed);
  }

  const sections = navFor(activeType);
  const secondary = secondaryNav();

  const name = user?.fullName || user?.firstName || "Minha conta";
  const email = user?.primaryEmailAddress?.emailAddress || "";
  const initials = (name || "S")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        // Flutuante: margem em volta e cantos arredondados, sem encostar na
        // borda da janela.
        "glass-surface m-3 hidden h-[calc(100svh-1.5rem)] shrink-0 flex-col rounded-3xl p-3 lg:flex",
        animate && "transition-[width] duration-300 ease-out",
        collapsed ? "w-[76px]" : "w-64",
      )}
    >
      <div className={cn("flex items-center px-1 py-1", collapsed && "justify-center")}>
        <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
          <Logo size={30} showWordmark={!collapsed} />
        </Link>
      </div>

      <nav className="scrollbar-none mt-6 flex flex-1 flex-col gap-1 overflow-y-auto">
        {sections.map((section, i) => (
          <div key={section.title ?? i} className={cn(i > 0 && "mt-4")}>
            {/* Recolhida não há largura para o título da seção; o separador
                assume o papel de agrupar. */}
            {section.title &&
              (collapsed ? (
                <div className="my-3 h-px shrink-0 bg-border-hairline" />
              ) : (
                <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  {section.title}
                </p>
              ))}
            <div className="flex flex-col gap-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isNavItemActive(item.href, pathname)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="my-3 h-px shrink-0 bg-border-hairline" />

        {secondary.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isNavItemActive(item.href, pathname)}
            collapsed={collapsed}
          />
        ))}
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
            <Badge variant="subtle">{activeType === "SELLER" ? "Seller" : "Creator"}</Badge>
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
