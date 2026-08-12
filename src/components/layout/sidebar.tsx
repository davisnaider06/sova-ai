"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand/logo";
import { ProfileSwitcher, type ProfileSummary } from "@/components/layout/profile-switcher";
import { isNavItemActive, navFor, secondaryNav, type NavItem } from "@/lib/nav";
import type { ProfileType } from "@/generated/prisma";

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
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
    <aside className="glass-surface hidden h-screen w-64 shrink-0 flex-col rounded-none border-y-0 border-l-0 p-4 lg:flex">
      <Link href="/dashboard" className="flex items-center gap-2 px-2 py-2">
        <Logo size={30} />
      </Link>

      <nav className="scrollbar-none mt-6 flex flex-1 flex-col gap-1 overflow-y-auto">
        {sections.map((section, i) => (
          <div key={section.title ?? i} className={cn(i > 0 && "mt-4")}>
            {section.title && (
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                {section.title}
              </p>
            )}
            <div className="flex flex-col gap-1">
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} active={isNavItemActive(item.href, pathname)} />
              ))}
            </div>
          </div>
        ))}

        <div className="my-3 h-px bg-border-hairline" />

        {secondary.map((item) => (
          <NavLink key={item.href} item={item} active={isNavItemActive(item.href, pathname)} />
        ))}
      </nav>

      <div className="glass-surface mt-4 rounded-2xl p-3">
        <ProfileSwitcher profiles={profiles} activeProfileId={activeProfileId} />

        <div className="mt-3 flex items-center gap-2.5">
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
          <Badge variant="subtle">{activeType === "SELLER" ? "Seller" : "Creator"}</Badge>
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
