"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificationFeed, NotificationItem } from "@/lib/notifications";

export function NotificationsBell({ className }: { className?: string }) {
  const [feed, setFeed] = useState<NotificationFeed | null>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Recarrega a cada navegação: aprovar uma afiliação muda o contador, e o
  // sino precisa refletir isso sem F5.
  useEffect(() => {
    let alive = true;
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: NotificationFeed | null) => {
        if (alive && data) setFeed(data);
      })
      .catch(() => {
        // Falha no fundo não merece alarde: o sino simplesmente não acende.
      });
    return () => {
      alive = false;
    };
  }, [pathname]);

  // Não há efeito para fechar o painel ao navegar: ele já fecha no clique do
  // item (`onNavigate`) e no clique fora. Um efeito a mais aqui só criaria
  // renderização em cascata para um estado que já está resolvido.
  const count = feed?.actionableCount ?? 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={count > 0 ? `${count} itens pedem sua atenção` : "Notificações"}
        aria-expanded={open}
        className={cn(
          "glass-surface relative flex shrink-0 items-center justify-center rounded-full text-ink-secondary transition-colors hover:text-ink-primary",
          className,
        )}
      >
        <Bell className="h-4 w-4" />
        {/* O ponto só aparece quando existe algo pedindo ação. Um ponto fixo
            ensina o usuário a ignorar o sino em uma semana. */}
        {count > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold tabular-nums text-brand-foreground">
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="glass-pill absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl p-2">
            {feed === null ? (
              <p className="px-3 py-4 text-xs text-ink-muted">Carregando...</p>
            ) : feed.items.length === 0 ? (
              <div className="flex flex-col items-center px-3 py-6 text-center">
                <Check className="h-5 w-5 text-ink-muted" />
                <p className="mt-2 text-xs text-ink-muted">Nada pedindo sua atenção.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-1">
                {feed.items.map((item) => (
                  <li key={item.id}>
                    <NotificationRow item={item} onNavigate={() => setOpen(false)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function NotificationRow({
  item,
  onNavigate,
}: {
  item: NotificationItem;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className="flex gap-2.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2"
    >
      <span
        className={cn(
          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
          item.tone === "action"
            ? "bg-brand"
            : item.tone === "good"
              ? "bg-status-good"
              : "bg-ink-muted",
        )}
      />
      <span className="min-w-0">
        <span className="block text-xs font-medium text-ink-primary">{item.title}</span>
        {item.detail && (
          <span className="mt-0.5 block text-[11px] text-ink-muted">{item.detail}</span>
        )}
      </span>
    </Link>
  );
}
