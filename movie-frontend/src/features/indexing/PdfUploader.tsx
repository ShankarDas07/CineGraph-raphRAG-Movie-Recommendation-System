import { FileText, Loader2, Upload, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LIMITS } from "@/lib/env";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { startPdfIndexing } from "@/store/slices/indexSlice";

function validate(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".pdf")) return "Only .pdf files are supported.";
  if (file.size === 0) return "The selected file is empty.";
  if (file.size > LIMITS.pdfMaxBytes) return `File is too large (${formatBytes(file.size)}). Maximum is ${formatBytes(LIMITS.pdfMaxBytes)}.`;
  return null;
}

export function PdfUploader() {
  const dispatch = useAppDispatch();
  const submitting = useAppSelector((s) => s.index.submitting === "pdf");
  const running = useAppSelector((s) => s.index.status?.state === "RUNNING");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(f: File | undefined) {
    if (!f) return;
    const problem = validate(f);
    setError(problem);
    setFile(problem ? null : f);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files[0]);
  }

  async function start() {
    if (!file) return;
    try {
      await dispatch(startPdfIndexing(file)).unwrap();
      toast.success("PDF indexing started", { description: "Progress updates appear in the status panel." });
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      toast.error("Could not start indexing", { description: typeof err === "string" ? err : "Unexpected error" });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Index a movies PDF</CardTitle>
        <CardDescription>
          POST /api/v1/index/pdf - Gemini extracts entities, then Neo4j and Pinecone are populated in the background.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center gap-3 rounded-md border-2 border-dashed p-8 text-center transition-colors",
            dragging ? "border-primary bg-muted" : "border-input",
          )}
        >
          <Upload className="size-8" aria-hidden />
          <p className="text-sm text-muted-foreground">Drag & drop a PDF here, or</p>
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            Choose file
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            aria-label="PDF file"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <p className="text-xs text-muted-foreground">.pdf only · up to {formatBytes(LIMITS.pdfMaxBytes)}</p>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {file ? (
          <div className="flex items-center gap-3 rounded-md border bg-muted p-3">
            <FileText className="size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Remove file" onClick={() => setFile(null)}>
              <X />
            </Button>
          </div>
        ) : null}

        {running ? <p className="text-sm text-muted-foreground">A job is already running. Wait for it to finish before starting another.</p> : null}

        <Button className="w-full sm:w-auto" disabled={!file || submitting || running} onClick={() => void start()}>
          {submitting ? <Loader2 className="animate-spin" /> : <Upload />}
          {submitting ? "Uploading…" : "Upload & start indexing"}
        </Button>
      </CardContent>
    </Card>
  );
}
