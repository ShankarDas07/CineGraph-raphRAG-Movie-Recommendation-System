import type { ReactNode } from "react";

/** Minimal, XSS-safe renderer for LLM answers: paragraphs, bullet/numbered lists and **bold**. */
function inline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={`${keyPrefix}-${i}`} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    ),
  );
}

export function RichText({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      const key = `p${blocks.length}`;
      blocks.push(
        <p key={key} className="leading-relaxed text-foreground/90">
          {inline(para.join(" "), key)}
        </p>,
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const key = `l${blocks.length}`;
      const items = list.items.map((it, i) => (
        <li key={`${key}-${i}`} className="leading-relaxed">
          {inline(it, `${key}-${i}`)}
        </li>
      ));
      blocks.push(
        list.ordered ? (
          <ol key={key} className="ml-5 list-decimal space-y-1 text-foreground/90 marker:text-primary">
            {items}
          </ol>
        ) : (
          <ul key={key} className="ml-5 list-disc space-y-1 text-foreground/90 marker:text-primary">
            {items}
          </ul>
        ),
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    const bullet = /^[*-]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (!line) {
      flushPara();
      flushList();
    } else if (bullet || numbered) {
      flushPara();
      const ordered = Boolean(numbered);
      const content = (bullet ?? numbered)![1] ?? "";
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push(content);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();

  return <div className="space-y-3 text-sm sm:text-base">{blocks}</div>;
}
