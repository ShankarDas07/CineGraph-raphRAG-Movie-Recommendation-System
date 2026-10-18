import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, Film, Loader2, Network, Send, Sparkles, Trash2, type LucideIcon } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { QueryMode } from "@/api/types";
import { AnswerCard } from "@/features/ask/AnswerCard";
import { LIMITS } from "@/lib/env";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { askQuestion, clearHistory } from "@/store/slices/querySlice";

const schema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "Type a question first")
    .max(LIMITS.queryMaxLength, `At most ${LIMITS.queryMaxLength} characters`),
});
type FormValues = z.infer<typeof schema>;

const MODES: { value: QueryMode; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "auto", label: "Auto", hint: "Gemini picks the best path", icon: Sparkles },
  { value: "factual", label: "Factual", hint: "Neo4j graph lookups & counts", icon: Network },
  { value: "similarity", label: "Similar", hint: "Pinecone recommendations", icon: Film },
  { value: "descriptive", label: "Describe", hint: "Pinecone 'tell me about'", icon: BookOpen },
];

// Example questions taken from the backend's own classifier prompt.
const EXAMPLES = ["Movies directed by Nolan", "How many sci-fi movies?", "Movies like Inception", "Who is James Cameron?", "Tell me about Inception"];

export default function Ask() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.query.items);
  const [params] = useSearchParams();
  const [mode, setMode] = useState<QueryMode>("auto");
  const busy = items.some((i) => i.status === "pending");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { query: (params.get("q") ?? "").slice(0, LIMITS.queryMaxLength) },
  });

  const length = watch("query")?.length ?? 0;

  const onSubmit = (values: FormValues) => {
    void dispatch(askQuestion({ query: values.query, mode }));
    reset({ query: "" });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSubmit(onSubmit)();
    }
  };

  return (
    <>
      <PageHeader
        icon={Sparkles}
        title="Ask the Graph"
        description="Natural-language questions answered from your Neo4j knowledge graph and Pinecone vector index, powered by Gemini."
        actions={
          items.some((i) => i.status !== "pending") ? (
            <Button variant="outline" size="sm" onClick={() => dispatch(clearHistory())}>
              <Trash2 /> Clear history
            </Button>
          ) : undefined
        }
      />

      <Card className="neon-border mb-6">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div role="radiogroup" aria-label="Query mode" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {MODES.map(({ value, label, hint, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                onClick={() => setMode(value)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  mode === value
                    ? "border-primary/60 bg-primary/10 shadow-neon"
                    : "border-border bg-background/30 hover:border-primary/30",
                )}
              >
                <span className={cn("flex items-center gap-2 text-sm font-semibold", mode === value && "text-primary")}>
                  <Icon className="size-4" /> {label}
                </span>
                <span className="text-xs text-muted-foreground">{hint}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
            <div>
              <label htmlFor="query" className="sr-only">
                Your question
              </label>
              <Textarea
                id="query"
                rows={3}
                placeholder="e.g. Movies like Inception…"
                aria-invalid={errors.query ? true : undefined}
                aria-describedby="query-help"
                onKeyDown={onKeyDown}
                {...register("query")}
              />
              <div id="query-help" className="mt-1.5 flex items-center justify-between gap-3 text-xs">
                <span className={errors.query ? "text-destructive" : "text-muted-foreground"}>
                  {errors.query?.message ?? "Ctrl/⌘ + Enter to send"}
                </span>
                <span className={cn("tabular-nums", length > LIMITS.queryMaxLength ? "text-destructive" : "text-muted-foreground")}>
                  {length}/{LIMITS.queryMaxLength}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setValue("query", ex, { shouldValidate: true })}
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    {ex}
                  </button>
                ))}
              </div>
              <Button type="submit" variant="accent" size="lg" disabled={busy} className="w-full sm:w-auto">
                {busy ? <Loader2 className="animate-spin" /> : <Send />}
                {busy ? "Working…" : "Ask"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          <Sparkles className="mx-auto mb-3 size-8 text-primary/70" aria-hidden />
          <p>Ask your first question above. Answers and their Cypher internals will appear here.</p>
        </div>
      ) : (
        <section aria-label="Answers" className="space-y-4">
          {items.map((item) => (
            <AnswerCard key={item.id} item={item} />
          ))}
        </section>
      )}
    </>
  );
}
