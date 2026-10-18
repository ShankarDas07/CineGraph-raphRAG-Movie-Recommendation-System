import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  loading?: boolean;
  tone?: "primary" | "secondary" | "accent" | "success";
}

const toneClass: Record<NonNullable<Props["tone"]>, string> = {
  primary: "text-primary border-primary/30 bg-primary/10",
  secondary: "text-secondary border-secondary/30 bg-secondary/10",
  accent: "text-accent border-accent/30 bg-accent/10",
  success: "text-success border-success/30 bg-success/10",
};

export function StatTile({ label, value, icon: Icon, loading, tone = "primary" }: Props) {
  return (
    <div className="glass flex items-center gap-4 rounded-2xl p-4 sm:p-5">
      <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl border", toneClass[tone])}>
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        {loading ? <Skeleton className="mt-1.5 h-7 w-20" /> : <p className="truncate text-2xl font-bold tabular-nums">{value}</p>}
      </div>
    </div>
  );
}
