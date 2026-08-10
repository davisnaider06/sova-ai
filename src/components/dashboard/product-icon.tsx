import { HeartPulse, Magnet, Sparkle, Smartphone, GlassWater, Printer, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const icons: Record<string, LucideIcon> = {
  "heart-pulse": HeartPulse,
  magnet: Magnet,
  sparkle: Sparkle,
  smartphone: Smartphone,
  "glass-water": GlassWater,
  printer: Printer,
};

export function ProductIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Sparkle;
  return <Icon className={cn("text-brand", className)} strokeWidth={1.75} />;
}
