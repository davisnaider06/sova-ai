"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { IDLE } from "@/lib/form";
import { saveEconomics } from "../actions";

export type EconomicsFormValues = {
  productCost: string;
  shippingCost: string;
  platformFee: string;
  operationalCost: string;
  minimumMargin: string;
  targetMargin: string;
};

export function EconomicsForm({
  productId,
  values,
}: {
  productId: string;
  values: EconomicsFormValues;
}) {
  const [state, formAction] = useActionState(saveEconomics, IDLE);
  const errors = state.status === "error" ? state.errors : {};

  return (
    <form action={formAction}>
      <input type="hidden" name="productId" value={productId} />

      <Card className="flex flex-col gap-4 p-5">
        <div>
          <p className="text-sm font-medium text-ink-primary">Custos por venda</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Tudo que sai do seu bolso a cada unidade vendida.
          </p>
        </div>

        <Field label="Custo do produto" htmlFor="productCost" error={errors.productCost} required>
          <Input
            id="productCost"
            name="productCost"
            defaultValue={values.productCost}
            placeholder="R$ 0,00"
            inputMode="decimal"
          />
        </Field>

        <Field label="Frete" htmlFor="shippingCost" error={errors.shippingCost}>
          <Input
            id="shippingCost"
            name="shippingCost"
            defaultValue={values.shippingCost}
            placeholder="R$ 0,00"
            inputMode="decimal"
          />
        </Field>

        <Field
          label="Taxa da plataforma"
          htmlFor="platformFee"
          error={errors.platformFee}
          hint="A comissão do marketplace, não a do creator."
        >
          <Input
            id="platformFee"
            name="platformFee"
            defaultValue={values.platformFee}
            placeholder="R$ 0,00"
            inputMode="decimal"
          />
        </Field>

        <Field
          label="Custo operacional"
          htmlFor="operationalCost"
          error={errors.operationalCost}
          hint="Embalagem, manuseio, o que mais couber."
        >
          <Input
            id="operationalCost"
            name="operationalCost"
            defaultValue={values.operationalCost}
            placeholder="R$ 0,00"
            inputMode="decimal"
          />
        </Field>

        <div className="h-px bg-border-hairline" />

        <div>
          <p className="text-sm font-medium text-ink-primary">Suas margens</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Definem o teto e a recomendação da calculadora.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Mínima (%)"
            htmlFor="minimumMargin"
            error={errors.minimumMargin}
            hint="O piso inegociável."
          >
            <Input
              id="minimumMargin"
              name="minimumMargin"
              defaultValue={values.minimumMargin}
              inputMode="decimal"
            />
          </Field>

          <Field
            label="Alvo (%)"
            htmlFor="targetMargin"
            error={errors.targetMargin}
            hint="O que você quer ganhar."
          >
            <Input
              id="targetMargin"
              name="targetMargin"
              defaultValue={values.targetMargin}
              inputMode="decimal"
            />
          </Field>
        </div>

        {state.status === "error" && state.message && (
          <p className="flex items-center gap-2 text-xs text-status-critical">
            <AlertCircle className="h-3.5 w-3.5" />
            {state.message}
          </p>
        )}
        {state.status === "success" && state.message && (
          <p className="flex items-center gap-2 text-xs text-status-good">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {state.message}
          </p>
        )}

        <SubmitButton className="w-full" pendingLabel="Salvando...">
          Salvar custos
        </SubmitButton>
      </Card>
    </form>
  );
}
