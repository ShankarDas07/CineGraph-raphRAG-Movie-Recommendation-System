import { BookOpen, Film, Loader2, Network, Trash2 } from "lucide-react";
import { ErrorState } from "@/components/common/ErrorState";
import { RichText } from "@/components/common/RichText";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/format";
import { askQuestion, removeItem, type QueryHistoryItem } from "@/store/slices/querySlice";
import { useAppDispatch } from "@/store/hooks";
import { DebugPanel } from "./DebugPanel";

const TYPE_META: Record<string, { label: string; source: string; icon: typeof Network }> = {
  factual: { label: "Factual", source: "Neo4j graph", icon: Network },
  similarity: { label: "Similarity", source: "Pinecone vectors", icon: Film },
  descriptive: { label: "Descriptive", source: "Pinecone vectors", icon: BookOpen },
};

export function AnswerCard({ item }: { item: QueryHistoryItem }) {
  const dispatch = useAppDispatch();
  const res = item.response;
  const meta = res ? TYPE_META[res.type.toLowerCase()] : undefined;
  const Icon = meta?.icon ?? Network;

  return (
    <Card className="overflow-hidden">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-base font-semibold sm:text-lg">{item.query}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {item.status === "pending" ? (
                  <Badge variant="warning">
                    <Loader2 className="size-3 animate-spin" /> Thinking
                  </Badge>
                ) : null}
                {meta ? (
                  <Badge>
                    <Icon className="size-3" /> {meta.label} · {meta.source}
                  </Badge>
                ) : res ? (
                  <Badge variant="outline">{res.type}</Badge>
                ) : null}
                <span className="text-xs text-muted-foreground">
                  {item.mode === "auto" ? "auto-routed" : `forced: ${item.mode}`} · {formatRelative(item.createdAt)}
                </span>
              </div>
            </div>
            {item.status !== "pending" ? (
              <Button variant="ghost" size="icon" aria-label="Remove from history" onClick={() => dispatch(removeItem(item.id))}>
                <Trash2 />
              </Button>
            ) : null}
          </div>

          {item.status === "pending" ? (
            <div className="space-y-2" aria-live="polite">
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-9/12" />
              <Skeleton className="h-4 w-10/12" />
              <p className="pt-1 text-xs text-muted-foreground">Classifying, planning and querying - this can take a few seconds.</p>
            </div>
          ) : null}

          {item.status === "error" ? (
            <ErrorState
              title="Query failed"
              message={item.error ?? "Unknown error"}
              onRetry={() => {
                dispatch(removeItem(item.id));
                void dispatch(askQuestion({ query: item.query, mode: item.mode }));
              }}
            />
          ) : null}

          {res ? (
            <>
              {res.reasoning ? <p className="text-xs italic text-muted-foreground">Routing: {res.reasoning}</p> : null}
              <RichText text={res.answer} />
              {res.debug ? <DebugPanel debug={res.debug} /> : null}
            </>
          ) : null}
        </CardContent>
      </Card>
  );
}
