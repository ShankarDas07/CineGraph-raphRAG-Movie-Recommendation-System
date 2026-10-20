import { Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 text-center">
      <Compass className="size-12 text-muted-foreground" aria-hidden />
      <h1 className="text-5xl font-bold">404</h1>
      <p className="text-muted-foreground">This page drifted out of the graph.</p>
      <Button asChild>
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
