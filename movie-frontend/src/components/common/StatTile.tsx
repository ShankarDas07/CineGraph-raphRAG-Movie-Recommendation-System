import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  loading?: boolean;
}

export function StatTile({ label, value, icon: Icon, loading }: Props) {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4 sm:p-5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase text-muted-foreground">{label}</p>
        {loading ? <Skeleton className="mt-1.5 h-7 w-20" /> : <p className="truncate text-2xl font-bold tabular-nums">{value}</p>}
      </div>
    </div>
  );
}
