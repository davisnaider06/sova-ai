import { cn } from "@/lib/utils";

/// Bloco cinza pulsante que ocupa o lugar do conteúdo enquanto ele carrega.
///
/// `aria-hidden` de propósito: para quem usa leitor de tela, o anúncio útil é
/// "carregando", feito uma vez pelo contêiner — não trinta retângulos vazios.
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("animate-pulse rounded-xl bg-surface-2", className)} />
  );
}
