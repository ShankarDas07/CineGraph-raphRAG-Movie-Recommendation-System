import { FileJson, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { startJsonIndexing } from "@/store/slices/indexSlice";

export function JsonIndexer() {
  const dispatch = useAppDispatch();
  const submitting = useAppSelector((s) => s.index.submitting === "json");
  const running = useAppSelector((s) => s.index.status?.state === "RUNNING");
  const [graph, setGraph] = useState(true);
  const [vectors, setVectors] = useState(true);
  const invalid = !graph && !vectors;

  async function start() {
    try {
      await dispatch(startJsonIndexing({ graph, vectors })).unwrap();
      toast.success("JSON indexing started");
    } catch (err) {
      toast.error("Could not start indexing", { description: typeof err === "string" ? err : "Unexpected error" });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Index the server's movies.json</CardTitle>
        <CardDescription>
          POST /api/v1/index/json - reads the JSON file configured on the backend (app.indexing.json-path), no extraction needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4 rounded-md border p-4">
          <div>
            <Label htmlFor="sw-graph">Build Neo4j graph</Label>
            <p className="mt-1 text-xs text-muted-foreground">graph=true</p>
          </div>
          <Switch id="sw-graph" checked={graph} onCheckedChange={setGraph} />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-md border p-4">
          <div>
            <Label htmlFor="sw-vectors">Store Pinecone vectors</Label>
            <p className="mt-1 text-xs text-muted-foreground">vectors=true</p>
          </div>
          <Switch id="sw-vectors" checked={vectors} onCheckedChange={setVectors} />
        </div>

        {invalid ? (
          <p role="alert" className="text-sm text-destructive">
            Enable at least one of graph or vectors.
          </p>
        ) : null}
        {running ? <p className="text-sm text-muted-foreground">A job is already running.</p> : null}

        <Button disabled={invalid || submitting || running} onClick={() => void start()} className="w-full sm:w-auto">
          {submitting ? <Loader2 className="animate-spin" /> : <FileJson />}
          {submitting ? "Starting…" : "Start JSON indexing"}
        </Button>
      </CardContent>
    </Card>
  );
}
