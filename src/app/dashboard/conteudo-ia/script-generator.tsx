"use client";

import { useActionState, useState } from "react";
import {
  AlertCircle,
  Check,
  Clapperboard,
  Copy,
  Hash,
  MessageSquareQuote,
  Mic,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Field, NativeSelect, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { generateScript } from "./actions";
import { SCRIPT_IDLE } from "./contract";

export type AffiliatedProduct = {
  id: string;
  name: string;
  category: string;
};

export function ScriptGenerator({ products }: { products: AffiliatedProduct[] }) {
  const [state, formAction] = useActionState(generateScript, SCRIPT_IDLE);

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Produto" htmlFor="productId" required>
              <NativeSelect id="productId" name="productId" defaultValue={products[0]?.id}>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field
              label="Ângulo (opcional)"
              htmlFor="angle"
              hint="Para quem, ou que problema atacar."
            >
              <Textarea
                id="angle"
                name="angle"
                className="min-h-11"
                placeholder="Ex.: focar em quem treina de manhã e tem pressa"
                maxLength={300}
              />
            </Field>
          </div>

          {state.status === "error" && (
            <p className="flex items-start gap-2 rounded-xl bg-status-critical/10 px-4 py-3 text-sm text-ink-primary">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-critical" />
              {state.message}
            </p>
          )}

          <div className="flex justify-end">
            <SubmitButton pendingLabel="Escrevendo o roteiro...">
              <Sparkles className="h-4 w-4" />
              Gerar roteiro
            </SubmitButton>
          </div>
        </form>
      </Card>

      {state.status === "done" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <SectionTitle icon={Clapperboard} title="Roteiro por cenas" />
            <p className="mt-3 rounded-xl bg-brand/10 p-3 text-sm font-medium text-ink-primary">
              {state.script.hook}
            </p>
            <ol className="mt-3 flex flex-col gap-3">
              {state.script.scenes.map((scene, i) => (
                <li key={i} className="rounded-xl bg-surface-2 p-3">
                  <p className="text-sm font-medium text-ink-primary">
                    {i + 1}. {scene.title}
                  </p>
                  <p className="mt-1 text-xs text-ink-secondary">{scene.action}</p>
                  {scene.onScreenText && (
                    <p className="mt-1.5 text-[11px] text-ink-muted">
                      Na tela: <span className="text-ink-secondary">{scene.onScreenText}</span>
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="p-5">
              <SectionTitle icon={MessageSquareQuote} title="Legenda e chamada" />
              <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm text-ink-secondary">
                {state.script.caption}
              </p>
              <p className="mt-2 rounded-xl bg-brand/10 p-3 text-sm font-medium text-brand-ink">
                {state.script.cta}
              </p>
              <CopyButton
                text={`${state.script.hook}\n\n${state.script.caption}\n\n${state.script.cta}\n\n${state.script.hashtags.join(" ")}`}
              />
            </Card>

            <Card className="p-5">
              <SectionTitle icon={Mic} title="Narração" />
              <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm text-ink-secondary">
                {state.script.narration}
              </p>
            </Card>

            <Card className="p-5">
              <SectionTitle icon={Hash} title="Hashtags" />
              <div className="mt-3 flex flex-wrap gap-2">
                {state.script.hashtags.map((h) => (
                  <Badge key={h} variant="subtle">
                    {h}
                  </Badge>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: typeof Clapperboard;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand-ink">
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-sm font-medium text-ink-primary">{title}</p>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="mt-3 flex items-center gap-1.5 rounded-full bg-surface-2 px-3.5 py-2 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-3 hover:text-ink-primary"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado" : "Copiar tudo"}
    </button>
  );
}
