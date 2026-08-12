"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/app/dashboard/produtos/actions";

// ---------------------------------------------------------------------------
// Formulário de produto — cadastro e edição na mesma tela.
//
// A economia (custo, frete, margens) é opcional aqui de propósito: o seller
// cadastra o catálogo agora e volta para preencher custo quando for calcular
// comissão. Exigir tudo de uma vez faz o cadastro parar no primeiro produto.
// ---------------------------------------------------------------------------

export type ProductFormValues = {
  id?: string;
  name?: string;
  description?: string | null;
  category?: string;
  price?: string;
  stockQuantity?: string;
  imageUrl?: string | null;
  status?: string;
  productCost?: string;
  shippingCost?: string;
  operationalCost?: string;
  minimumMargin?: string;
  targetMargin?: string;
};

const STATUSES = [
  { value: "DRAFT", label: "Rascunho", hint: "Só você vê" },
  { value: "ACTIVE", label: "Ativo", hint: "Creators podem pedir para promover" },
  { value: "PAUSED", label: "Pausado", hint: "Some da descoberta, afiliações seguem" },
  { value: "ARCHIVED", label: "Arquivado", hint: "Fora de uso" },
];

export function ProductForm({
  initial = {},
  onSubmit,
  onDelete,
}: {
  initial?: ProductFormValues;
  onSubmit: (formData: FormData) => Promise<ActionResult>;
  onDelete?: () => Promise<void>;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();

  const isEdit = Boolean(initial.id);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await onSubmit(formData);
      if (result.ok) {
        router.push(`/dashboard/produtos/${result.productId}`);
      } else {
        setErrors(result.errors);
        // Leva o foco para o primeiro campo com erro — sem isso, num formulário
        // longo o usuário clica em salvar e nada parece acontecer.
        const first = Object.keys(result.errors)[0];
        document.getElementById(`field-${first}`)?.focus();
      }
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>O produto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            name="name"
            label="Nome"
            defaultValue={initial.name}
            error={errors.name}
            placeholder="Creatina Monohidratada 300g"
            required
          />

          <div className="space-y-1.5">
            <Label htmlFor="field-category">Categoria</Label>
            <select
              id="field-category"
              name="category"
              defaultValue={initial.category ?? ""}
              className={cn(
                "h-10 w-full rounded-xl border bg-transparent px-3 text-sm text-ink-primary outline-none focus:border-ink-primary",
                errors.category ? "border-status-critical" : "border-border-strong",
              )}
            >
              <option value="">Escolha uma categoria…</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.category ? (
              <p className="text-xs text-status-critical">{errors.category}</p>
            ) : (
              <p className="text-xs text-ink-muted">
                É por aqui que o creator certo encontra seu produto.
              </p>
            )}
          </div>

          <Field
            name="price"
            label="Preço de venda"
            prefix="R$"
            defaultValue={initial.price}
            error={errors.price}
            placeholder="89,90"
            inputMode="decimal"
            required
          />

          <Field
            name="stockQuantity"
            label="Estoque"
            defaultValue={initial.stockQuantity}
            error={errors.stockQuantity}
            placeholder="Deixe vazio se não controla"
            inputMode="numeric"
          />

          <div className="space-y-1.5">
            <Label htmlFor="field-description">Descrição</Label>
            <textarea
              id="field-description"
              name="description"
              defaultValue={initial.description ?? ""}
              rows={3}
              placeholder="O que o creator precisa saber para falar do produto."
              className="w-full rounded-xl border border-border-strong bg-transparent px-3 py-2 text-sm text-ink-primary outline-none focus:border-ink-primary"
            />
          </div>

          <Field
            name="imageUrl"
            label="URL da imagem"
            defaultValue={initial.imageUrl ?? ""}
            placeholder="https://…"
          />

          <div className="space-y-1.5">
            <Label htmlFor="field-status">Situação</Label>
            <select
              id="field-status"
              name="status"
              defaultValue={initial.status ?? "DRAFT"}
              className="h-10 w-full rounded-xl border border-border-strong bg-transparent px-3 text-sm text-ink-primary outline-none focus:border-ink-primary"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label} — {s.hint}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Seus custos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-ink-muted">
              Opcional agora. Sem isso o produto é cadastrado do mesmo jeito — mas a calculadora
              de comissão só funciona depois que estes números existirem.
            </p>

            <Field
              name="productCost"
              label="Custo do produto"
              prefix="R$"
              defaultValue={initial.productCost}
              placeholder="30,00"
              inputMode="decimal"
            />
            <Field
              name="shippingCost"
              label="Frete que você paga"
              prefix="R$"
              defaultValue={initial.shippingCost}
              placeholder="0,00"
              inputMode="decimal"
            />
            <Field
              name="operationalCost"
              label="Custo operacional"
              prefix="R$"
              defaultValue={initial.operationalCost}
              placeholder="0,00"
              inputMode="decimal"
            />

            <div className="grid grid-cols-2 gap-3">
              <Field
                name="minimumMargin"
                label="Margem mínima"
                suffix="%"
                defaultValue={initial.minimumMargin}
                placeholder="15"
                inputMode="decimal"
              />
              <Field
                name="targetMargin"
                label="Margem desejada"
                suffix="%"
                defaultValue={initial.targetMargin}
                placeholder="25"
                inputMode="decimal"
              />
            </div>
          </CardContent>
        </Card>

        {errors._ && (
          <p className="rounded-xl bg-status-critical/10 p-3 text-sm text-status-critical">
            {errors._}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Salvar alterações" : "Cadastrar produto"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
            Cancelar
          </Button>

          {onDelete && (
            <button
              type="button"
              disabled={deleting}
              onClick={() => startDelete(async () => void (await onDelete()))}
              className="ml-auto flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-ink-muted transition-colors hover:bg-status-critical/10 hover:text-status-critical"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Apagar produto
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  error,
  placeholder,
  prefix,
  suffix,
  inputMode,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  error?: string;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  inputMode?: "decimal" | "numeric";
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`field-${name}`}>
        {label}
        {required && <span className="ml-0.5 text-ink-muted">*</span>}
      </Label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
            {prefix}
          </span>
        )}
        <Input
          id={`field-${name}`}
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          inputMode={inputMode}
          aria-invalid={Boolean(error)}
          className={cn(prefix && "pl-9", suffix && "pr-8", error && "border-status-critical")}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-status-critical">{error}</p>}
    </div>
  );
}
