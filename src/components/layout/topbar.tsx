"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Search } from "lucide-react";
import { useUser, UserButton } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
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
  const firstName = user?.firstName || "Vendedor";
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
          "glass-pill sticky top-0 z-30 flex items-center justify-between gap-4 transition-[margin,padding,border-radius,box-shadow] duration-300 ease-out",
          scrolled
            ? "mx-3 mt-3 rounded-full px-5 py-2.5 sm:mx-6"
            : "flex-col rounded-none border-x-0 border-t-0 px-6 py-5 sm:flex-row sm:items-center",
        )}
      >
        <div className="min-w-0">
          {!scrolled && (
            <p className="text-xs font-medium text-ink-muted">
              {greeting()}, {firstName}
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
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              placeholder="Buscar produtos, vídeos..."
              className={cn("pl-10 transition-all", scrolled ? "h-9 w-44" : "w-64")}
            />
          </div>
          <button
            className={cn(
              "glass-surface relative flex shrink-0 items-center justify-center rounded-full text-ink-secondary transition-all hover:text-ink-primary",
              scrolled ? "h-9 w-9" : "h-10 w-10",
            )}
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-brand" />
          </button>
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
