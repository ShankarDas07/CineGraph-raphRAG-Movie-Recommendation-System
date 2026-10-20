import { Loader2 } from "lucide-react";

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground" role="status" aria-label="Loading">
      <Loader2 className="size-8 animate-spin" />
    </div>
  );
}
