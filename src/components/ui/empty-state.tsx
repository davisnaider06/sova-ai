import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Estado vazio que ensina o próximo passo em vez de só constatar a ausência.
// "Nenhum produto encontrado" deixa o usuário parado; "Cadastre o primeiro
// produto → [botão]" move.

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-ink-muted">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-sm font-medium text-ink-primary">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{description}</p>
      )}
      {action && (
        <Button asChild size="sm" className="mt-5">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </Card>
  );
}
