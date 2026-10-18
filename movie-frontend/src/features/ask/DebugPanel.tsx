import { ChevronDown, Terminal } from "lucide-react";
import { useState } from "react";
import { CodeBlock } from "@/components/common/CodeBlock";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Debug = Record<string, unknown>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return "-";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function pretty(v: unknown): string {
  return JSON.stringify(v, null, 2) ?? "";
}

/** Shows what the backend returns in QueryResponse.debug for factual queries: plan, cypher, params, rows. */
export function DebugPanel({ debug }: { debug: Debug }) {
  const [open, setOpen] = useState(false);
  const cypher = typeof debug.cypher === "string" ? debug.cypher : null;
  const rows = Array.isArray(debug.rows) ? debug.rows.filter(isRecord) : [];
  const columns = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const rowCount = typeof debug.rowCount === "number" ? debug.rowCount : rows.length;

  return (
    <div className="rounded-xl border border-border bg-background/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <span className="flex items-center gap-2">
          <Terminal className="size-4" /> Query internals · {rowCount} row{rowCount === 1 ? "" : "s"}
        </span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="border-t border-border p-3">
          <Tabs defaultValue={cypher ? "cypher" : "rows"}>
            <TabsList>
              {cypher ? <TabsTrigger value="cypher">Cypher</TabsTrigger> : null}
              {debug.params !== undefined ? <TabsTrigger value="params">Params</TabsTrigger> : null}
              {debug.plan !== undefined ? <TabsTrigger value="plan">Plan</TabsTrigger> : null}
              <TabsTrigger value="rows">Rows</TabsTrigger>
            </TabsList>
            {cypher ? (
              <TabsContent value="cypher">
                <CodeBlock code={cypher} label="cypher" />
              </TabsContent>
            ) : null}
            {debug.params !== undefined ? (
              <TabsContent value="params">
                <CodeBlock code={pretty(debug.params)} label="json" />
              </TabsContent>
            ) : null}
            {debug.plan !== undefined ? (
              <TabsContent value="plan">
                <CodeBlock code={pretty(debug.plan)} label="json" />
              </TabsContent>
            ) : null}
            <TabsContent value="rows">
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rows returned.</p>
              ) : (
                <div className="max-h-80 overflow-auto rounded-lg border border-border">
                  <table className="w-full min-w-max text-left text-xs">
                    <thead className="sticky top-0 bg-muted text-muted-foreground">
                      <tr>
                        {columns.map((c) => (
                          <th key={c} className="px-3 py-2 font-medium">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className="border-t border-border/60 odd:bg-white/[0.02]">
                          {columns.map((c) => (
                            <td key={c} className="max-w-xs truncate px-3 py-1.5 font-mono" title={cell(r[c])}>
                              {cell(r[c])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {rowCount > rows.length ? (
                <p className="mt-2 text-xs text-muted-foreground">Showing the first {rows.length} of {rowCount} rows (backend limit).</p>
              ) : null}
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </div>
  );
}
