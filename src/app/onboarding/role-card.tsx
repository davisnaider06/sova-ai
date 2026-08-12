"use client";

import { useFormStatus } from "react-dom";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { chooseRole } from "./actions";

function Submit({
  title,
  description,
  bullets,
  owned,
}: {
  title: string;
  description: string;
  bullets: string[];
  owned: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "glass-surface group flex h-full w-full flex-col rounded-2xl p-6 text-left transition-all",
        "hover:border-brand/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
        pending && "pointer-events-none opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink-primary">{title}</h2>
        {pending ? (
          <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin text-brand" />
        ) : (
          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
        )}
      </div>

      <p className="mt-2 text-sm text-ink-secondary">{description}</p>

      <ul className="mt-5 flex flex-col gap-2">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm text-ink-muted">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
            {b}
          </li>
        ))}
      </ul>

      {owned && (
        <span className="mt-5 text-xs font-medium text-brand">
          Você já tem este perfil — entrar com ele
        </span>
      )}
    </button>
  );
}

export function RoleCard({
  type,
  title,
  description,
  bullets,
  owned = false,
}: {
  type: "CREATOR" | "SELLER";
  title: string;
  description: string;
  bullets: string[];
  owned?: boolean;
}) {
  return (
    <form action={chooseRole} className="h-full">
      <input type="hidden" name="type" value={type} />
      <Submit title={title} description={description} bullets={bullets} owned={owned} />
    </form>
  );
}
