import { Database, GitBranch, Layers, Network, RefreshCw, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatTile } from "@/components/common/StatTile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchGraphStats } from "@/store/slices/systemSlice";

export default function Graph() {
  const dispatch = useAppDispatch();
  const { data, status, error } = useAppSelector((s) => s.system.graph);
  const loading = status === "loading";

  useEffect(() => {
    void dispatch(fetchGraphStats());
  }, [dispatch]);

  const labels = data ? Object.entries(data.nodesByLabel).sort((a, b) => b[1] - a[1]) : [];
  const max = labels.reduce((m, [, c]) => Math.max(m, c), 1);

  return (
    <>
      <PageHeader
        icon={Network}
        title="Graph Stats"
        description="Node and relationship counts in your Neo4j movie knowledge graph (GET /api/v1/graph/stats)."
        actions={
          <Button variant="outline" onClick={() => void dispatch(fetchGraphStats())} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />} Refresh
          </Button>
        }
      />

      {error ? <ErrorState message={error} onRetry={() => void dispatch(fetchGraphStats())} /> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Nodes" value={data ? formatNumber(data.nodes) : "-"} icon={Database} loading={loading && !data} />
        <StatTile label="Relationships" value={data ? formatNumber(data.relationships) : "-"} icon={GitBranch} loading={loading && !data} />
        <StatTile label="Node labels" value={data ? labels.length : "-"} icon={Layers} loading={loading && !data} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Nodes by label</CardTitle>
          <CardDescription>Distribution of node types in the graph.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !data ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : data && data.nodes === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              <p>The graph is empty.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/index">Index some movies</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {labels.map(([label, count]) => (
                <li key={label}>
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="font-medium">{label}</span>
                    <span className="tabular-nums text-muted-foreground">{formatNumber(count)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-sm border bg-muted" role="img" aria-label={`${label}: ${count}`}>
                    <div className="h-full bg-primary" style={{ width: `${Math.max(2, (count / max) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
