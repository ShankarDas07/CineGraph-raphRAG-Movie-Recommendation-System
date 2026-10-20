import { CheckCircle2, CircleDot, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorState } from "@/components/common/ErrorState";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDateTime, formatDuration, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";

/** Stages emitted by IndexingService, in pipeline order. */
const STAGES: { key: string; label: string }[] = [
  { key: "PARSING_PDF", label: "Parse PDF" },
  { key: "LOADED_JSON", label: "Load JSON" },
  { key: "EXTRACTING", label: "Extract entities" },
  { key: "BUILDING_GRAPH", label: "Neo4j graph" },
  { key: "BUILDING_VECTORS", label: "Pinecone vectors" },
  { key: "FINISHED", label: "Finished" },
];

const STATE_BADGE = {
  IDLE: { variant: "outline", label: "Idle" },
  RUNNING: { variant: "warning", label: "Running" },
  DONE: { variant: "success", label: "Done" },
  FAILED: { variant: "destructive", label: "Failed" },
} as const;

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{formatNumber(value)}</p>
    </div>
  );
}

export function StatusPanel() {
  const status = useAppSelector((s) => s.index.status);
  const error = useAppSelector((s) => s.index.statusError);
  const [now, setNow] = useState(() => Date.now());
  const running = status?.state === "RUNNING";

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const badge = STATE_BADGE[status?.state ?? "IDLE"];
  const started = status?.startedAt ? new Date(status.startedAt).getTime() : null;
  const finished = status?.finishedAt ? new Date(status.finishedAt).getTime() : null;
  const elapsed = started ? (finished ?? now) - started : null;
  const stageIndex = STAGES.findIndex((s) => s.key === status?.stage);
  const percent = status && status.batchesTotal > 0 ? Math.round((status.batchesDone / status.batchesTotal) * 100) : 0;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Indexing job</CardTitle>
          <CardDescription>Live status from GET /api/v1/index/status</CardDescription>
        </div>
        <Badge variant={badge.variant}>
          {running ? <Loader2 className="size-3 animate-spin" /> : null}
          {badge.label}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        {error ? <ErrorState title="Could not load status" message={error} /> : null}

        {!status && !error ? <p className="text-sm text-muted-foreground">Loading status…</p> : null}

        {status ? (
          <>
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Pipeline stages">
              {STAGES.map((st, i) => {
                const done = status.state === "DONE" || (stageIndex >= 0 && i < stageIndex);
                const current = status.state === "RUNNING" && i === stageIndex;
                const failed = status.state === "FAILED" && i === stageIndex;
                return (
                  <li
                    key={st.key}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs",
                      current && "border-dashed border-foreground font-medium",
                      done && "border-foreground bg-muted font-medium",
                      failed && "border-destructive text-destructive",
                      !current && !done && !failed && "text-muted-foreground",
                    )}
                  >
                    {failed ? (
                      <XCircle className="size-4" />
                    ) : done ? (
                      <CheckCircle2 className="size-4" />
                    ) : current ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CircleDot className="size-4" />
                    )}
                    {st.label}
                  </li>
                );
              })}
            </ol>

            {status.batchesTotal > 0 ? (
              <div>
                <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>
                    Extraction batches {status.batchesDone}/{status.batchesTotal}
                  </span>
                  <span className="tabular-nums">{percent}%</span>
                </div>
                <Progress value={percent} aria-label="Extraction progress" />
              </div>
            ) : running ? (
              <Progress indeterminate aria-label="Working" />
            ) : null}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Counter label="PDF blocks" value={status.pdfMovieBlocks} />
              <Counter label="Extracted movies" value={status.extractedMovies} />
              <Counter label="Batches done" value={status.batchesDone} />
              <Counter label="Failed batches" value={status.failedBatches} />
            </div>

            {status.message ? (
              <p className={cn("break-words rounded-md border px-3 py-2 text-sm", status.state === "FAILED" ? "border-destructive" : "bg-muted")}>
                {status.message}
              </p>
            ) : null}

            <dl className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              <div>
                <dt>Started</dt>
                <dd className="text-foreground">{formatDateTime(status.startedAt)}</dd>
              </div>
              <div>
                <dt>Finished</dt>
                <dd className="text-foreground">{formatDateTime(status.finishedAt)}</dd>
              </div>
              <div>
                <dt>Elapsed</dt>
                <dd className="text-foreground">{elapsed !== null ? formatDuration(elapsed) : "-"}</dd>
              </div>
            </dl>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
