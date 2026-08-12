"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

// Botão de submit que conhece o estado do formulário em que está.
//
// `useFormStatus` só enxerga o <form> pai, então este componente precisa ser
// filho do formulário — não é o formulário que passa `pending` para ele. É o
// que permite ter vários botões com estados independentes na mesma página sem
// nenhum useState.

export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  );
}
