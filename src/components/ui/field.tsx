import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Wrapper de campo de formulário: rótulo, dica e erro no mesmo lugar.
// Existe para que a mensagem de erro fique presa ao campo que a causou —
// erro solto no topo do formulário faz o usuário caçar qual campo errou.

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-status-critical">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-status-critical">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/// `<select>` nativo estilizado. Radix Select é mais bonito, mas não envia
/// valor em submit de formulário sem um input escondido em paralelo — e estes
/// formulários postam direto para Server Actions. Nativo mantém o formulário
/// funcionando inclusive antes do JS carregar.
export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-11 w-full appearance-none rounded-xl border border-border-strong bg-surface-2 bg-[length:1rem] bg-[right_0.875rem_center] bg-no-repeat px-4 pr-10 text-sm text-ink-primary outline-none transition-colors focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238b8c80' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
    }}
    {...props}
  >
    {children}
  </select>
));
NativeSelect.displayName = "NativeSelect";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-24 w-full rounded-xl border border-border-strong bg-surface-2 px-4 py-3 text-sm text-ink-primary placeholder:text-ink-muted outline-none transition-colors focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
