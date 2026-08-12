"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Field, NativeSelect, Textarea } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { CATEGORIES } from "@/lib/categories";
import { IDLE, type ActionState } from "@/lib/form";

// Valores em texto, já formatados para o input. O componente não recebe Decimal
// do Prisma: instância de classe não atravessa a fronteira servidor→cliente, e
// forçar isso vira erro de serialização em runtime, não em compilação.
export type ProductFormValues = {
  id?: string;
  name: string;
  description: string;
  category: string;
  price: string;
  stockQuantity: string;
  status: string;
  imageUrl: string;
};

export const EMPTY_PRODUCT: ProductFormValues = {
  name: "",
  description: "",
  category: CATEGORIES[0],
  price: "",
  stockQuantity: "",
  status: "DRAFT",
  imageUrl: "",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho — só você vê",
  ACTIVE: "Ativo — creators podem se afiliar",
  PAUSED: "Pausado — some da descoberta",
  ARCHIVED: "Arquivado",
};

export function ProductForm({
  action,
  values = EMPTY_PRODUCT,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  values?: ProductFormValues;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, IDLE);
  const errors = state.status === "error" ? state.errors : {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {values.id && <input type="hidden" name="id" value={values.id} />}

      {state.status === "error" && state.message && (
        <Banner tone="error" message={state.message} />
      )}
      {state.status === "success" && state.message && (
        <Banner tone="success" message={state.message} />
      )}

      <Card className="flex flex-col gap-5 p-5">
        <Field label="Nome do produto" htmlFor="name" error={errors.name} required>
          <Input
            id="name"
            name="name"
            defaultValue={values.name}
            placeholder="Ex.: Creatina Monohidratada 300g"
            maxLength={120}
          />
        </Field>

        <Field
          label="Descrição"
          htmlFor="description"
          error={errors.description}
          hint="Aparece para os creators na descoberta. Diga o que o produto resolve."
        >
          <Textarea
            id="description"
            name="description"
            defaultValue={values.description}
            placeholder="Quem usa, para quê, e o que diferencia do concorrente."
            maxLength={2000}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Categoria" htmlFor="category" error={errors.category} required>
            <NativeSelect id="category" name="category" defaultValue={values.category}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="Preço de venda"
            htmlFor="price"
            error={errors.price}
            hint="É sobre ele que a comissão do creator incide."
            required
          >
            <Input
              id="price"
              name="price"
              defaultValue={values.price}
              placeholder="R$ 0,00"
              inputMode="decimal"
            />
          </Field>

          <Field
            label="Estoque"
            htmlFor="stockQuantity"
            error={errors.stockQuantity}
            hint="Opcional. Deixe vazio se não controla por aqui."
          >
            <Input
              id="stockQuantity"
              name="stockQuantity"
              defaultValue={values.stockQuantity}
              placeholder="0"
              inputMode="numeric"
            />
          </Field>

          <Field label="Status" htmlFor="status" error={errors.status}>
            <NativeSelect id="status" name="status" defaultValue={values.status}>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <Field
          label="Imagem do produto"
          htmlFor="imageUrl"
          error={errors.imageUrl}
          hint="Cole o link de uma imagem pública. Upload próprio entra depois."
        >
          <Input
            id="imageUrl"
            name="imageUrl"
            defaultValue={values.imageUrl}
            placeholder="https://..."
            inputMode="url"
          />
        </Field>
      </Card>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Salvando...">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

function Banner({ tone, message }: { tone: "error" | "success"; message: string }) {
  const error = tone === "error";
  const Icon = error ? AlertCircle : CheckCircle2;
  return (
    <div
      role="status"
      className={
        error
          ? "flex items-center gap-2 rounded-xl border border-status-critical/30 bg-status-critical/10 px-4 py-3 text-sm text-ink-primary"
          : "flex items-center gap-2 rounded-xl border border-status-good/30 bg-status-good/10 px-4 py-3 text-sm text-ink-primary"
      }
    >
      <Icon className={error ? "h-4 w-4 text-status-critical" : "h-4 w-4 text-status-good"} />
      {message}
    </div>
  );
}
