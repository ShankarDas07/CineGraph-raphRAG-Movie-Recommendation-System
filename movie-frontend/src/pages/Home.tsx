import { Activity, ArrowRight, Database, GitBranch, Network, Search, Sparkles } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StatTile } from "@/components/common/StatTile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LIMITS } from "@/lib/env";
import { formatNumber } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchGraphStats } from "@/store/slices/systemSlice";

const FEATURES = [
  { to: "/ask", icon: Sparkles, title: "Ask the Graph", text: "Factual, similarity and descriptive questions routed automatically by Gemini." },
  { to: "/index", icon: Database, title: "Indexing", text: "Upload a PDF, load the server JSON or add movies by hand, with live job progress." },
  { to: "/graph", icon: Network, title: "Graph Stats", text: "Node and relationship counts straight from Neo4j." },
  { to: "/health", icon: Activity, title: "System Health", text: "Neo4j, Gemini and Pinecone connectivity checks." },
] as const;

export default function Home() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const graph = useAppSelector((s) => s.system.graph);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void dispatch(fetchGraphStats());
  }, [dispatch]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = q.trim();
    if (!value) return setError("Type a question first");
    if (value.length > LIMITS.queryMaxLength) return setError(`At most ${LIMITS.queryMaxLength} characters`);
    navigate(`/ask?q=${encodeURIComponent(value)}`);
  }

  const loading = graph.status === "loading" && !graph.data;

  return (
    <div className="space-y-8">
      <section className="rounded-lg border bg-card p-6 sm:p-8">
        <p className="mb-3 text-sm text-muted-foreground">Neo4j · Pinecone · Gemini</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Ask your movie knowledge graph anything.</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Directors, actors, genres, themes and recommendations - answered with GraphRAG over your own indexed catalogue.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <label htmlFor="home-q" className="sr-only">
              Ask a question
            </label>
            <Input
              id="home-q"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setError(null);
              }}
              placeholder="Movies like Inception…"
              aria-invalid={error ? true : undefined}
              className="h-11 pl-9 text-base"
            />
            {error ? (
              <p role="alert" className="absolute -bottom-5 left-1 text-xs text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <Button type="submit" size="lg">
            Ask <ArrowRight />
          </Button>
        </form>
      </section>

      <section aria-label="Graph overview" className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Nodes" value={graph.data ? formatNumber(graph.data.nodes) : "-"} icon={Database} loading={loading} />
        <StatTile label="Relationships" value={graph.data ? formatNumber(graph.data.relationships) : "-"} icon={GitBranch} loading={loading} />
        <StatTile
          label="Node labels"
          value={graph.data ? Object.keys(graph.data.nodesByLabel).length : "-"}
          icon={Network}
          loading={loading}
        />
      </section>
      {graph.status === "failed" ? (
        <p role="alert" className="-mt-6 text-sm text-destructive">
          Could not reach the graph: {graph.error}
        </p>
      ) : null}

      <section aria-label="Features" className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map(({ to, icon: Icon, title, text }) => (
          <Link
            key={to}
            to={to}
            className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="h-full transition-colors group-hover:bg-muted">
              <CardContent className="flex h-full items-start gap-4 p-5">
                <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
                <div className="flex-1">
                  <h2 className="font-semibold">{title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
