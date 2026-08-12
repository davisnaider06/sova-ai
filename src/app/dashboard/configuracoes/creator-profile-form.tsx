"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { CATEGORIES } from "@/lib/categories";
import { IDLE } from "@/lib/form";
import { cn } from "@/lib/utils";
import { saveCreatorProfile } from "./actions";

export type CreatorProfileValues = {
  displayName: string;
  bio: string;
  niches: string[];
  followersCount: string;
  averageViews: string;
  engagementRate: string;
};

export function CreatorProfileForm({ values }: { values: CreatorProfileValues }) {
  const [state, formAction] = useActionState(saveCreatorProfile, IDLE);
  const errors = state.status === "error" ? state.errors : {};

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      <Card className="flex flex-col gap-5 p-5">
        <Field label="Nome público" htmlFor="displayName" error={errors.displayName} required>
          <Input
            id="displayName"
            name="displayName"
            defaultValue={values.displayName}
            placeholder="Como os sellers vão te ver"
            maxLength={80}
          />
        </Field>

        <Field
          label="Bio"
          htmlFor="bio"
          error={errors.bio}
          hint="Duas linhas sobre o que você faz e para quem."
        >
          <Textarea
            id="bio"
            name="bio"
            defaultValue={values.bio}
            placeholder="Falo sobre treino e suplementação para quem está começando."
            maxLength={600}
          />
        </Field>
      </Card>

      {/* Nichos saem da MESMA lista das categorias de produto. É o que permite
          o matching comparar nicho com categoria diretamente, em vez de tentar
          adivinhar que "suplemento" e "Saúde e suplementos" são a mesma coisa. */}
      <Card className="flex flex-col gap-3 p-5">
        <div>
          <p className="text-sm font-medium text-ink-primary">Seus nichos</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            É por aqui que os produtos certos chegam até você. Escolha quantos quiser.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const checked = values.niches.includes(c);
            return (
              <label
                key={c}
                className={cn(
                  "cursor-pointer rounded-full border px-3.5 py-2 text-xs font-medium transition-colors",
                  "has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-brand-foreground",
                  "border-border-strong bg-surface-2 text-ink-secondary hover:bg-surface-3",
                )}
              >
                <input
                  type="checkbox"
                  name="niches"
                  value={c}
                  defaultChecked={checked}
                  className="sr-only"
                />
                {c}
              </label>
            );
          })}
        </div>

        {errors.niches && <p className="text-xs text-status-critical">{errors.niches}</p>}
      </Card>

      <Card className="flex flex-col gap-5 p-5">
        <div>
          <p className="text-sm font-medium text-ink-primary">Sua audiência</p>
          <p className="mt-0.5 flex items-start gap-1.5 text-xs text-ink-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Estes números entram como <span className="text-ink-secondary">informados por
            você</span> e valem menos no match do que dados de conta conectada. Conectar
            o TikTok depois substitui a estimativa por medição.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Seguidores" htmlFor="followersCount" error={errors.followersCount}>
            <Input
              id="followersCount"
              name="followersCount"
              defaultValue={values.followersCount}
              placeholder="25000"
              inputMode="numeric"
            />
          </Field>

          <Field label="Views por vídeo" htmlFor="averageViews" error={errors.averageViews}>
            <Input
              id="averageViews"
              name="averageViews"
              defaultValue={values.averageViews}
              placeholder="8000"
              inputMode="numeric"
            />
          </Field>

          <Field label="Engajamento (%)" htmlFor="engagementRate" error={errors.engagementRate}>
            <Input
              id="engagementRate"
              name="engagementRate"
              defaultValue={values.engagementRate}
              placeholder="4,5"
              inputMode="decimal"
            />
          </Field>
        </div>
      </Card>

      {state.status === "error" && state.message && (
        <p className="flex items-center gap-2 text-sm text-status-critical">
          <AlertCircle className="h-4 w-4" />
          {state.message}
        </p>
      )}
      {state.status === "success" && state.message && (
        <p className="flex items-center gap-2 text-sm text-status-good">
          <CheckCircle2 className="h-4 w-4" />
          {state.message}
        </p>
      )}

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Salvando...">Salvar perfil</SubmitButton>
      </div>
    </form>
  );
}
