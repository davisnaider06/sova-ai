"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Field, NativeSelect, Textarea } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { IDLE, type ActionState } from "@/lib/form";

export type CampaignFormValues = {
  id?: string;
  name: string;
  description: string;
  status: string;
  commissionRate: string;
  targetSales: string;
  budget: string;
  startAt: string;
  endAt: string;
};

export const EMPTY_CAMPAIGN: CampaignFormValues = {
  name: "",
  description: "",
  status: "DRAFT",
  commissionRate: "",
  targetSales: "",
  budget: "",
  startAt: "",
  endAt: "",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativa",
  PAUSED: "Pausada",
  ENDED: "Encerrada",
};

export function CampaignForm({
  action,
  values = EMPTY_CAMPAIGN,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  values?: CampaignFormValues;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, IDLE);
  const errors = state.status === "error" ? state.errors : {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {values.id && <input type="hidden" name="id" value={values.id} />}

      {state.status === "error" && state.message && (
        <p className="flex items-center gap-2 rounded-xl border border-status-critical/30 bg-status-critical/10 px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 text-status-critical" />
          {state.message}
        </p>
      )}
      {state.status === "success" && state.message && (
        <p className="flex items-center gap-2 rounded-xl border border-status-good/30 bg-status-good/10 px-4 py-3 text-sm">
          <CheckCircle2 className="h-4 w-4 text-status-good" />
          {state.message}
        </p>
      )}

      <Card className="flex flex-col gap-5 p-5">
        <Field label="Nome da campanha" htmlFor="name" error={errors.name} required>
          <Input
            id="name"
            name="name"
            defaultValue={values.name}
            placeholder="Ex.: Black Friday — linha de suplementos"
            maxLength={120}
          />
        </Field>

        <Field
          label="Objetivo"
          htmlFor="description"
          error={errors.description}
          hint="O que os creators precisam entender para aceitar o convite."
        >
          <Textarea
            id="description"
            name="description"
            defaultValue={values.description}
            placeholder="O que está sendo promovido, por quanto tempo, e o que se espera do creator."
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Status" htmlFor="status" error={errors.status}>
            <NativeSelect id="status" name="status" defaultValue={values.status}>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="Comissão da campanha (%)"
            htmlFor="commissionRate"
            error={errors.commissionRate}
            hint="Sobrepõe a taxa padrão dos produtos incluídos."
          >
            <Input
              id="commissionRate"
              name="commissionRate"
              defaultValue={values.commissionRate}
              placeholder="20"
              inputMode="decimal"
            />
          </Field>

          <Field label="Início" htmlFor="startAt" error={errors.startAt}>
            <Input id="startAt" name="startAt" type="date" defaultValue={values.startAt} />
          </Field>

          <Field label="Fim" htmlFor="endAt" error={errors.endAt}>
            <Input id="endAt" name="endAt" type="date" defaultValue={values.endAt} />
          </Field>

          <Field label="Meta de vendas" htmlFor="targetSales" error={errors.targetSales}>
            <Input
              id="targetSales"
              name="targetSales"
              defaultValue={values.targetSales}
              placeholder="100"
              inputMode="numeric"
            />
          </Field>

          <Field label="Orçamento" htmlFor="budget" error={errors.budget}>
            <Input
              id="budget"
              name="budget"
              defaultValue={values.budget}
              placeholder="R$ 0,00"
              inputMode="decimal"
            />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Salvando...">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
