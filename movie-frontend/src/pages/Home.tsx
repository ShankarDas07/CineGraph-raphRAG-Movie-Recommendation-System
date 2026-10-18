import { motion } from "framer-motion";
import { Activity, ArrowRight, Database, GitBranch, Network, Search, Sparkles, Zap } from "lucide-react";
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
  { to: "/ask", icon: Sparkles, title: "Ask the Graph", text: "Factual, similarity and descriptive questions routed automatically by Gemini.", tone: "text-primary" },
  { to: "/index", icon: Database, title: "Indexing", text: "Upload a PDF, load the server JSON or add movies by hand, with live job progress.", tone: "text-accent" },
  { to: "/graph", icon: Network, title: "Graph Stats", text: "Node and relationship counts straight from Neo4j.", tone: "text-secondary" },
  { to: "/health", icon: Activity, title: "System Health", text: "Neo4j, Gemini and Pinecone connectivity checks.", tone: "text-success" },
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
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-card/40 p-6 backdrop-blur-xl sm:p-12">
        <div className="absolute -right-10 -top-10 hidden size-72 animate-float rounded-full bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/30 blur-3xl sm:block" aria-hidden />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative max-w-3xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Zap className="size-3" /> Neo4j · Pinecone · Gemini
          </p>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            Ask your movie <span className="neon-text">knowledge graph</span> anything.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Directors, actors, genres, themes and recommendations - answered with GraphRAG over your own indexed catalogue.
          </p>

          <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-3 sm:flex-row">
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
                className="h-12 pl-9 text-base"
              />
              {error ? (
                <p role="alert" className="absolute -bottom-5 left-1 text-xs text-destructive">
                  {error}
                </p>
              ) : null}
            </div>
            <Button type="submit" size="lg" variant="accent">
              Ask <ArrowRight />
            </Button>
          </form>
        </motion.div>
      </section>

      <section aria-label="Graph overview" className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Nodes" value={graph.data ? formatNumber(graph.data.nodes) : "-"} icon={Database} loading={loading} />
        <StatTile label="Relationships" value={graph.data ? formatNumber(graph.data.relationships) : "-"} icon={GitBranch} tone="accent" loading={loading} />
        <StatTile
          label="Node labels"
          value={graph.data ? Object.keys(graph.data.nodesByLabel).length : "-"}
          icon={Network}
          tone="secondary"
          loading={loading}
        />
      </section>
      {graph.status === "failed" ? (
        <p role="alert" className="-mt-6 text-sm text-destructive">
          Could not reach the graph: {graph.error}
        </p>
      ) : null}

      <section aria-label="Features" className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map(({ to, icon: Icon, title, text, tone }, i) => (
          <motion.div key={to} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}>
            <Link to={to} className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-neon">
                <CardContent className="flex h-full items-start gap-4 p-5 sm:p-6">
                  <Icon className={`mt-0.5 size-6 shrink-0 ${tone}`} aria-hidden />
                  <div className="flex-1">
                    <h2 className="font-semibold">{title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                  </div>
                  <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" aria-hidden />
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
