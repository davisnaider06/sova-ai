"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Field, NativeSelect } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { IDLE } from "@/lib/form";
import { saveSellerProfile } from "./actions";

export type SellerProfileValues = {
  displayName: string;
  companyName: string;
  document: string;
  businessType: string;
};

const BUSINESS_TYPES = [
  "",
  "Marca própria",
  "Revenda / distribuidor",
  "Dropshipping",
  "Indústria",
  "Outro",
];

export function SellerProfileForm({ values }: { values: SellerProfileValues }) {
  const [state, formAction] = useActionState(saveSellerProfile, IDLE);
  const errors = state.status === "error" ? state.errors : {};

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      <Card className="flex flex-col gap-5 p-5">
        <Field label="Nome público" htmlFor="displayName" error={errors.displayName} required>
          <Input
            id="displayName"
            name="displayName"
            defaultValue={values.displayName}
            placeholder="Como os creators vão te ver"
            maxLength={80}
          />
        </Field>

        <Field label="Razão social" htmlFor="companyName" error={errors.companyName}>
          <Input
            id="companyName"
            name="companyName"
            defaultValue={values.companyName}
            maxLength={120}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="CNPJ / CPF"
            htmlFor="document"
            error={errors.document}
            hint="Usado no cadastro do TikTok Shop Partner Center."
          >
            <Input
              id="document"
              name="document"
              defaultValue={values.document}
              placeholder="00.000.000/0000-00"
              maxLength={32}
            />
          </Field>

          <Field label="Tipo de negócio" htmlFor="businessType" error={errors.businessType}>
            <NativeSelect
              id="businessType"
              name="businessType"
              defaultValue={values.businessType}
            >
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === "" ? "Selecione..." : t}
                </option>
              ))}
            </NativeSelect>
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
