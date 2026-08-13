"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Field, NativeSelect } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { IDLE } from "@/lib/form";
import { saveContent } from "./actions";

export type AffiliatedProduct = { id: string; name: string };

export function ContentForm({ products }: { products: AffiliatedProduct[] }) {
  const [state, formAction] = useActionState(saveContent, IDLE);
  const errors = state.status === "error" ? state.errors : {};

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand-ink">
          <Plus className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-ink-primary">Registrar conteúdo</p>
          <p className="text-xs text-ink-muted">
            A data é o que decide a atribuição da venda dentro da janela.
          </p>
        </div>
      </div>

      <form action={formAction} className="mt-5 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Produto" htmlFor="productId" error={errors.productId} required>
            <NativeSelect id="productId" name="productId" defaultValue={products[0]?.id}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Tipo" htmlFor="contentType" error={errors.contentType}>
            <NativeSelect id="contentType" name="contentType" defaultValue="VIDEO">
              <option value="VIDEO">Vídeo</option>
              <option value="LIVE">Live</option>
              <option value="IMAGE">Post com imagem</option>
              <option value="OTHER">Outro</option>
            </NativeSelect>
          </Field>
        </div>

        <Field label="Link" htmlFor="url" error={errors.url} required>
          <Input
            id="url"
            name="url"
            defaultValue=""
            placeholder="https://www.tiktok.com/@voce/video/..."
            inputMode="url"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título" htmlFor="title" error={errors.title}>
            <Input
              id="title"
              name="title"
              placeholder="Como eu uso a creatina todo dia"
              maxLength={160}
            />
          </Field>

          <Field label="Publicado em" htmlFor="publishedAt" error={errors.publishedAt}>
            <Input id="publishedAt" name="publishedAt" type="date" defaultValue={today} max={today} />
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

        <div className="flex justify-end">
          <SubmitButton size="sm" pendingLabel="Salvando...">
            Registrar
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}
