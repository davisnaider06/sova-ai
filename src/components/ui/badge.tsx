import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-brand text-brand-foreground",
        subtle: "bg-surface-2 text-ink-secondary border border-border-hairline",
        good: "bg-status-good/15 text-[#4ade80]",
        warning: "bg-status-warning/15 text-[#fbbf24]",
        critical: "bg-status-critical/15 text-[#f87171]",
        outline: "border border-border-strong text-ink-primary",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
