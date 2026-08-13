import { ChevronDown, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SOURCE_LABEL, confidenceHint } from "@/lib/metrics";
import type { MatchResult } from "@/lib/matching";
import { cn } from "@/lib/utils";

// A regra do §23: nunca mostrar só "94%".
//
// O número fica visível, mas vem sempre acompanhado de (a) o motivo em uma
// frase, (b) o nível de confiança, e (c) a decomposição — que abre em
// <details>, sem JavaScript, para não custar interatividade numa lista longa.

const CONFIDENCE_STYLE = {
  alta: { dot: "bg-status-good", label: "confiança alta" },
  média: { dot: "bg-status-warning", label: "confiança média" },
  baixa: { dot: "bg-ink-muted", label: "confiança baixa" },
} as const;

export function MatchScore({
  match,
  className,
}: {
  match: MatchResult;
  className?: string;
}) {
  const conf = CONFIDENCE_STYLE[match.confidenceLevel];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
          match.score >= 70
            ? "bg-brand text-brand-foreground"
            : match.score >= 45
              ? "bg-surface-2 text-ink-primary"
              : "bg-surface-2 text-ink-muted",
        )}
      >
        <Sparkles className="h-3 w-3" />
        {match.score}
      </span>
      <span className="flex items-center gap-1.5 text-[11px] text-ink-muted">
        <span className={cn("h-1.5 w-1.5 rounded-full", conf.dot)} />
        {conf.label}
      </span>
    </div>
  );
}

export function MatchBreakdown({ match }: { match: MatchResult }) {
  const conf = CONFIDENCE_STYLE[match.confidenceLevel];

  // Sem caixa fechada em volta do resumo, de propósito: com borda e chevron ele
  // lia como um <select>, e num cartão que já tem um botão primário logo abaixo
  // isso dá duas coisas parecidas com controle disputando a atenção. Aqui o
  // resumo é texto com um chevron — a explicação, não uma escolha.
  return (
    <details className="group mt-3 border-t border-border-hairline pt-2.5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs text-ink-muted transition-colors hover:text-ink-secondary [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1 truncate">{match.headline}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>

      <div className="mt-3 flex flex-col gap-2.5 rounded-xl bg-surface-2 px-3.5 py-3">
        {match.components.map((c) => (
          <div key={c.key}>
            <div className="flex items-baseline justify-between gap-3 text-[11px]">
              <span className="font-medium text-ink-secondary">{c.label}</span>
              <span className="tabular-nums text-ink-muted">
                {Math.round(c.score * 100)}
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-border-strong">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.round(c.score * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-ink-muted">
              {c.reason} · <span className="italic">{SOURCE_LABEL[c.source]}</span>
            </p>
          </div>
        ))}

        <div className="mt-1 border-t border-border-hairline pt-2.5">
          <p className="flex items-center gap-1.5 text-[11px] text-ink-muted">
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", conf.dot)} />
            {confidenceHint(match.confidenceLevel)}
          </p>

          {match.improves.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {match.improves.slice(0, 2).map((hint) => (
                <li key={hint} className="text-[11px] text-ink-muted">
                  → {hint}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </details>
  );
}

/// Aviso de topo de página quando a confiança geral está baixa. É a frase
/// "Match preliminar — conecte seu TikTok para precisão" da §6 do plano.
export function MatchConfidenceNotice({
  hasConnectedAccount,
  hasHistory,
}: {
  hasConnectedAccount: boolean;
  hasHistory: boolean;
}) {
  if (hasConnectedAccount && hasHistory) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-border-hairline bg-surface-2 px-4 py-3">
      <Badge variant="subtle">Match preliminar</Badge>
      <p className="text-xs text-ink-secondary">
        {!hasHistory && !hasConnectedAccount
          ? "Estes matches usam só o que você informou no cadastro. Conecte seu TikTok e faça a primeira venda para eles ficarem precisos."
          : !hasConnectedAccount
            ? "Conecte seu TikTok para os matches usarem audiência medida, não declarada."
            : "Sua primeira venda em cada categoria torna os matches muito mais precisos."}
      </p>
    </div>
  );
}
