import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  size = 32,
  showWordmark = true,
  className,
}: {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Image
        src="/logo_transparente.png"
        alt="Sova AI"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
      {showWordmark && (
        <span className="text-base font-semibold tracking-tight text-foreground">
          Sova <span className="text-brand">AI</span>
        </span>
      )}
    </span>
  );
}
