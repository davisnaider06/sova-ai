"use client";

import { useMemo, useState } from "react";
import { Check, Clock, Megaphone, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { MatchBreakdown, MatchScore } from "@/components/matching/match-score";
import { formatCompactNumber, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ScoredCreator } from "@/lib/discovery";
import { enableCreator, inviteCreatorToCampaign } from "./actions";

const SORTS = [
  { key: "match", label: "Compatibilidade" },
  { key: "followers", label: "Audiência" },
  { key: "engagement", label: "Engajamento" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];

export function CreatorsList({
  creators,
  productId,
  productCategory,
  campaign,
  invitedIds,
}: {
  creators: ScoredCreator[];
  productId: string;
  productCategory: string;
  campaign: { id: string; name: string } | null;
  invitedIds: string[];
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("match");
  const [minFollowers, setMinFollowers] = useState(0);
  const [minMatch, setMinMatch] = useState(0);
  const [onlyNiche, setOnlyNiche] = useState(false);

  const invited = useMemo(() => new Set(invitedIds), [invitedIds]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const list = creators.filter((c) => {
      const matchesQuery =
        needle === "" ||
        c.displayName.toLowerCase().includes(needle) ||
        c.niches.some((n) => n.toLowerCase().includes(needle));
      const matchesFollowers = (c.followers ?? 0) >= minFollowers;
      const matchesScore = c.match.score >= minMatch;
      const matchesNiche = !onlyNiche || c.niches.includes(productCategory);
      return matchesQuery && matchesFollowers && matchesScore && matchesNiche;
    });

    const sorted = [...list];
    switch (sort) {
      case "followers":
        sorted.sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0));
        break;
      case "engagement":
        sorted.sort((a, b) => (b.engagementRate ?? 0) - (a.engagementRate ?? 0));
        break;
      default:
        sorted.sort((a, b) => b.match.score - a.match.score);
    }
    return sorted;
  }, [creators, query, sort, minFollowers, minMatch, onlyNiche, productCategory]);

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar creator ou nicho..."
          className="pl-11"
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl bg-surface-2 px-4 py-3">
        <label className="flex items-center gap-2 text-xs text-ink-secondary">
          Ordenar por
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-border-strong bg-surface-3 px-2.5 py-1.5 text-xs text-ink-primary outline-none focus-visible:border-brand"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs text-ink-secondary">
          Seguidores
          <select
            value={minFollowers}
            onChange={(e) => setMinFollowers(Number(e.target.value))}
            className="rounded-lg border border-border-strong bg-surface-3 px-2.5 py-1.5 text-xs text-ink-primary outline-none focus-visible:border-brand"
          >
            <option value={0}>qualquer</option>
            <option value={5_000}>5 mil+</option>
            <option value={25_000}>25 mil+</option>
            <option value={100_000}>100 mil+</option>
            <option value={500_000}>500 mil+</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs text-ink-secondary">
          Match mínimo
          <input
            type="range"
            min={0}
            max={90}
            step={10}
            value={minMatch}
            onChange={(e) => setMinMatch(Number(e.target.value))}
            className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-border-strong accent-brand"
          />
          <span className="w-6 tabular-nums text-ink-primary">{minMatch}</span>
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-secondary">
          <input
            type="checkbox"
            checked={onlyNiche}
            onChange={(e) => setOnlyNiche(e.target.checked)}
            className="h-3.5 w-3.5 accent-brand"
          />
          Só do nicho do produto
        </label>

        <span className="ml-auto text-xs text-ink-muted">
          {filtered.length} de {creators.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-muted">
          Nenhum creator corresponde a esses filtros.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.creatorProfileId} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-primary">
                    {c.displayName}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {c.followers !== null
                      ? `${formatCompactNumber(c.followers)} seguidores`
                      : "Audiência não informada"}
                    {c.engagementRate !== null &&
                      ` · ${formatPercent(c.engagementRate)} engajamento`}
                  </p>
                </div>
                <MatchScore match={c.match} />
              </div>

              {c.bio && <p className="mt-3 line-clamp-2 text-xs text-ink-secondary">{c.bio}</p>}

              {c.niches.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.niches.slice(0, 3).map((n) => (
                    <Badge
                      key={n}
                      variant={n === productCategory ? "default" : "subtle"}
                      className="px-2 py-0.5 text-[10px]"
                    >
                      {n}
                    </Badge>
                  ))}
                  {c.niches.length > 3 && (
                    <Badge variant="subtle" className="px-2 py-0.5 text-[10px]">
                      +{c.niches.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              <MatchBreakdown match={c.match} />

              <div className="mt-4 flex flex-col gap-2">
                {c.affiliationStatus === "ACTIVE" ? (
                  <Badge variant="good" className="w-full justify-center py-2">
                    <Check className="h-3.5 w-3.5" />
                    Já promove este produto
                  </Badge>
                ) : c.affiliationStatus === "PENDING" ? (
                  <Badge variant="warning" className="w-full justify-center py-2">
                    <Clock className="h-3.5 w-3.5" />
                    Pediu — aguardando você
                  </Badge>
                ) : (
                  <form action={enableCreator}>
                    <input type="hidden" name="productId" value={productId} />
                    <input type="hidden" name="creatorProfileId" value={c.creatorProfileId} />
                    <SubmitButton
                      className="w-full"
                      size="sm"
                      variant="outline"
                      pendingLabel="Habilitando..."
                    >
                      Habilitar para promover
                    </SubmitButton>
                  </form>
                )}

                {campaign &&
                  (invited.has(c.creatorProfileId) ? (
                    <Badge variant="subtle" className="w-full justify-center py-2">
                      Convidado para {campaign.name}
                    </Badge>
                  ) : (
                    <form action={inviteCreatorToCampaign}>
                      <input type="hidden" name="campaignId" value={campaign.id} />
                      <input type="hidden" name="creatorProfileId" value={c.creatorProfileId} />
                      <SubmitButton
                        className={cn("w-full")}
                        size="sm"
                        variant="ghost"
                        pendingLabel="Convidando..."
                      >
                        <Megaphone className="h-3.5 w-3.5" />
                        Convidar para {campaign.name}
                      </SubmitButton>
                    </form>
                  ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
