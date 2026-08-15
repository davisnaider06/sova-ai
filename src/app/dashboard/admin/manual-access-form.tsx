"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { IDLE } from "@/lib/form";
import { setManualAccess } from "./actions";

// Válvula de escape para o que o webhook não cobre: cortesia, teste, cliente
// que pagou por fora, ou pagamento travado que não pode esperar o suporte da
// Hubla. Fica no audit log — liberar acesso de graça é decisão auditável.
export function ManualAccessForm() {
  const [state, formAction] = useActionState(setManualAccess, IDLE);

  return (
    <Card className="p-5">
      <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="manual-email" className="text-xs font-medium text-ink-secondary">
            E-mail do cliente
          </label>
          <Input
            id="manual-email"
            name="email"
            type="email"
            placeholder="cliente@exemplo.com"
            className="mt-1.5"
            required
          />
        </div>

        <div className="flex gap-2">
          <SubmitButton name="grant" value="1" pendingLabel="Liberando...">
            Liberar
          </SubmitButton>
          <SubmitButton name="grant" value="0" variant="outline" pendingLabel="Revogando...">
            Revogar
          </SubmitButton>
        </div>
      </form>

      <p className="mt-3 text-xs text-ink-muted">
        O e-mail precisa ser o mesmo com que a pessoa entra na plataforma. A liberação vale mesmo
        que a conta ainda não exista — ela é amarrada no primeiro acesso.
      </p>

      {state.status === "error" && state.message && (
        <p className="mt-3 flex items-center gap-2 text-xs text-status-critical">
          <AlertCircle className="h-3.5 w-3.5" /> {state.message}
        </p>
      )}
      {state.status === "success" && state.message && (
        <p className="mt-3 flex items-center gap-2 text-xs text-status-good">
          <CheckCircle2 className="h-3.5 w-3.5" /> {state.message}
        </p>
      )}
    </Card>
  );
}
