"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Loader2, Plus, Store, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { switchProfile } from "@/app/onboarding/actions";

// Creator e Seller são experiências diferentes sobre o mesmo núcleo de dados,
// não dois apps — então trocar de papel é um toggle, não um relogin.

export type ProfileSummary = {
  id: string;
  type: "CREATOR" | "SELLER";
  displayName: string;
};

const ROLES = [
  { type: "CREATOR" as const, label: "Creator", icon: Sparkles },
  { type: "SELLER" as const, label: "Seller", icon: Store },
];

function SwitchButton({
  label,
  icon: Icon,
  active,
}: {
  label: string;
  icon: typeof Store;
  active: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={active || pending}
      className={cn(
        "flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-selected text-selected-foreground"
          : "text-ink-muted hover:bg-surface-3 hover:text-ink-primary",
        pending && "opacity-60",
      )}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

export function ProfileSwitcher({
  profiles,
  activeProfileId,
}: {
  profiles: ProfileSummary[];
  activeProfileId: string | null;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
      {ROLES.map(({ type, label, icon: Icon }) => {
        const profile = profiles.find((p) => p.type === type);

        // Papel que a conta ainda não tem: o toggle vira o convite para criá-lo.
        if (!profile) {
          return (
            <Link
              key={type}
              href="/onboarding"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink-primary"
              title={`Adicionar perfil de ${label}`}
            >
              <Plus className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        }

        return (
          <form key={type} action={switchProfile} className="w-full">
            <input type="hidden" name="profileId" value={profile.id} />
            <SwitchButton label={label} icon={Icon} active={profile.id === activeProfileId} />
          </form>
        );
      })}
    </div>
  );
}
