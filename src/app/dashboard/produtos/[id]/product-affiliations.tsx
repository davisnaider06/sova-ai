import { Check, UserRound, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatCompactNumber, formatPercent } from "@/lib/money";
import { decideAffiliation } from "@/app/dashboard/afiliacoes/actions";

export type AffiliationRow = {
  id: string;
  status: string;
  commissionRate: number;
  creatorName: string;
  followers: number | null;
  niches: string[];
  createdAt: string;
};

const STATUS_META: Record<
  string,
  { label: string; variant: "default" | "subtle" | "good" | "warning" | "critical" }
> = {
  PENDING: { label: "Aguardando você", variant: "warning" },
  ACTIVE: { label: "Ativa", variant: "good" },
  PAUSED: { label: "Pausada", variant: "subtle" },
  ENDED: { label: "Encerrada", variant: "subtle" },
  REJECTED: { label: "Recusada", variant: "critical" },
};

export function ProductAffiliations({ affiliations }: { affiliations: AffiliationRow[] }) {
  if (affiliations.length === 0) {
    return (
      <Card className="flex flex-col items-center px-6 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-ink-muted">
          <UserRound className="h-5 w-5" />
        </span>
        <p className="mt-4 text-sm font-medium text-ink-primary">
          Nenhum creator pediu para promover este produto
        </p>
        <p className="mt-1.5 max-w-sm text-sm text-ink-muted">
          Produtos com status <span className="text-ink-secondary">Ativo</span> aparecem
          na descoberta dos creators. Deixe os custos preenchidos para a comissão
          sair na faixa certa.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {affiliations.map((a) => {
        const meta = STATUS_META[a.status] ?? STATUS_META.PENDING;
        return (
          <Card key={a.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-ink-primary">
                  {a.creatorName}
                </p>
                <Badge variant={meta.variant}>{meta.label}</Badge>
              </div>
              <p className="mt-1 truncate text-xs text-ink-muted">
                {a.followers !== null
                  ? `${formatCompactNumber(a.followers)} seguidores`
                  : "Audiência não informada"}
                {a.niches.length > 0 && ` · ${a.niches.join(", ")}`}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-ink-muted">Comissão</p>
              <p className="text-sm font-semibold tabular-nums text-ink-primary">
                {formatPercent(a.commissionRate)}
              </p>
            </div>

            {a.status === "PENDING" ? (
              <div className="flex gap-2">
                <form action={decideAffiliation}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="status" value="ACTIVE" />
                  <SubmitButton size="sm" pendingLabel="...">
                    <Check className="h-4 w-4" />
                    Aprovar
                  </SubmitButton>
                </form>
                <form action={decideAffiliation}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="status" value="REJECTED" />
                  <SubmitButton size="sm" variant="outline" pendingLabel="...">
                    <X className="h-4 w-4" />
                    Recusar
                  </SubmitButton>
                </form>
              </div>
            ) : a.status === "ACTIVE" ? (
              <form action={decideAffiliation}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="status" value="PAUSED" />
                <SubmitButton size="sm" variant="ghost" pendingLabel="...">
                  Pausar
                </SubmitButton>
              </form>
            ) : a.status === "PAUSED" ? (
              <form action={decideAffiliation}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="status" value="ACTIVE" />
                <SubmitButton size="sm" variant="outline" pendingLabel="...">
                  Reativar
                </SubmitButton>
              </form>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
