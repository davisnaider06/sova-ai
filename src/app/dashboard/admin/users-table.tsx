"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, ShieldCheck, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { IDLE } from "@/lib/form";
import { setUserRole } from "./actions";

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: "MEMBER" | "ADMIN";
  createdAt: string;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  provider: string | null;
};

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "subtle" | "outline" }> = {
  ACTIVE: { label: "Ativa", variant: "default" },
  PAST_DUE: { label: "Em atraso", variant: "outline" },
  CANCELED: { label: "Cancelada", variant: "outline" },
  EXPIRED: { label: "Expirada", variant: "subtle" },
};

export function UsersTable({ users, currentUserId }: { users: AdminUserRow[]; currentUserId: string }) {
  const [state, formAction] = useActionState(setUserRole, IDLE);

  return (
    <Card className="p-0">
      {state.status === "error" && state.message && (
        <p className="flex items-center gap-2 border-b border-border-hairline px-5 py-3 text-xs text-status-critical">
          <AlertCircle className="h-3.5 w-3.5" /> {state.message}
        </p>
      )}
      {state.status === "success" && state.message && (
        <p className="flex items-center gap-2 border-b border-border-hairline px-5 py-3 text-xs text-status-good">
          <CheckCircle2 className="h-3.5 w-3.5" /> {state.message}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-2xl text-sm">
          <thead>
            <tr className="border-b border-border-hairline text-left text-xs text-ink-muted">
              <th className="px-5 py-3 font-medium">Usuário</th>
              <th className="px-5 py-3 font-medium">Assinatura</th>
              <th className="px-5 py-3 font-medium">Papel</th>
              <th className="px-5 py-3 font-medium text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const status = u.subscriptionStatus
                ? (STATUS_LABEL[u.subscriptionStatus] ?? {
                    label: u.subscriptionStatus,
                    variant: "subtle" as const,
                  })
                : null;

              return (
                <tr key={u.id} className="border-b border-border-hairline last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink-primary">{u.name ?? "—"}</p>
                    <p className="text-xs text-ink-muted">{u.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    {status ? (
                      <div className="flex flex-col gap-1">
                        <Badge variant={status.variant} className="w-fit">
                          {status.label}
                        </Badge>
                        <span className="text-xs text-ink-muted">
                          {u.subscriptionPlan ?? "—"}
                          {u.provider === "MANUAL" && " · manual"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-ink-muted">sem assinatura</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {u.role === "ADMIN" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-ink">
                        <ShieldCheck className="h-3.5 w-3.5" /> Administrador
                      </span>
                    ) : (
                      <span className="text-xs text-ink-muted">Membro</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {/* O próprio admin não vê o botão de rebaixar: a ação já é
                        recusada no servidor, e oferecer um botão que sempre
                        falha é convite para o clique frustrado. */}
                    {u.id === currentUserId ? (
                      <span className="text-xs text-ink-muted">você</span>
                    ) : (
                      <form action={formAction} className="inline">
                        <input type="hidden" name="userId" value={u.id} />
                        <input
                          type="hidden"
                          name="role"
                          value={u.role === "ADMIN" ? "MEMBER" : "ADMIN"}
                        />
                        <SubmitButton variant="outline" size="sm" pendingLabel="...">
                          {u.role === "ADMIN" ? (
                            <>
                              <ShieldOff className="h-3.5 w-3.5" /> Remover admin
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="h-3.5 w-3.5" /> Tornar admin
                            </>
                          )}
                        </SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
