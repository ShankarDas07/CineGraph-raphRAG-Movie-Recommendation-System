import { Activity, Brain, CheckCircle2, Cpu, Database, Loader2, Network, RefreshCw, ServerCrash, XCircle, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchHealth } from "@/store/slices/systemSlice";
import { cn } from "@/lib/utils";

/** Keys come from ConnectionTestService: neo4j, geminiLlm, geminiEmbeddings, pinecone. */
const SERVICE_META: Record<string, { label: string; description: string; icon: LucideIcon }> = {
  neo4j: { label: "Neo4j", description: "Knowledge graph database", icon: Network },
  geminiLlm: { label: "Gemini LLM", description: "Classification, planning & answers", icon: Brain },
  geminiEmbeddings: { label: "Gemini Embeddings", description: "Vector embeddings (3072-dim)", icon: Cpu },
  pinecone: { label: "Pinecone", description: "Vector similarity index", icon: Database },
};

export default function Health() {
  const dispatch = useAppDispatch();
  const { data, status, error, fetchedAt } = useAppSelector((s) => s.system.health);
  const loading = status === "loading";

  useEffect(() => {
    void dispatch(fetchHealth());
  }, [dispatch]);

  const services = data ? Object.entries(data.services) : [];

  return (
    <>
      <PageHeader
        icon={Activity}
        title="System Health"
        description="Live connectivity checks for Neo4j, Gemini (LLM and embeddings) and Pinecone, straight from GET /api/v1/health/connections."
        actions={
          <Button variant="outline" onClick={() => void dispatch(fetchHealth())} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />} Run checks
          </Button>
        }
      />

      {error ? <ErrorState title="Health endpoint unreachable" message={error} onRetry={() => void dispatch(fetchHealth())} /> : null}

      {data ? (
        <div
          className={cn(
            "mb-6 flex items-center gap-3 rounded-2xl border p-4",
            data.allOk ? "border-success/40 bg-success/10 text-success" : "border-destructive/40 bg-destructive/10 text-destructive",
          )}
          role="status"
        >
          {data.allOk ? <CheckCircle2 className="size-6" /> : <ServerCrash className="size-6" />}
          <div>
            <p className="font-semibold">{data.allOk ? "All systems operational" : "Some services are failing"}</p>
            {fetchedAt ? <p className="text-xs opacity-80">Checked at {new Date(fetchedAt).toLocaleTimeString()}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {!data && loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
          : services.map(([key, svc]) => {
              const meta = SERVICE_META[key] ?? { label: key, description: "Backend dependency", icon: Activity };
              const Icon = meta.icon;
              return (
                <Card key={key} className={cn(svc.ok ? "border-success/20" : "border-destructive/40")}>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex size-10 items-center justify-center rounded-xl border", svc.ok ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive")}>
                          <Icon className="size-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{meta.label}</p>
                          <p className="text-xs text-muted-foreground">{meta.description}</p>
                        </div>
                      </div>
                      <Badge variant={svc.ok ? "success" : "destructive"}>
                        {svc.ok ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                        {svc.ok ? "Online" : "Failing"}
                      </Badge>
                    </div>
                    {svc.detail ? <p className="break-words rounded-lg bg-background/50 p-2.5 font-mono text-xs text-muted-foreground">{svc.detail}</p> : null}
                  </CardContent>
                </Card>
              );
            })}
      </div>
    </>
  );
}
