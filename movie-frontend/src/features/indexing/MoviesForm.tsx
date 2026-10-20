import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Plus, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import type { ExtractedMovie } from "@/api/types";
import { TagInput } from "@/components/common/TagInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LIMITS } from "@/lib/env";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { submitMovies } from "@/store/slices/indexSlice";

const list = z.array(z.string().trim().min(1)).max(50, "At most 50 entries");

const movieSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  year: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{4}$/.test(v) && Number(v) >= 1888 && Number(v) <= 2100), "Enter a 4-digit year (1888-2100)"),
  director: z.string().trim().max(200, "Name is too long"),
  actors: list,
  genres: list,
  themes: list,
  awards: list,
});

const formSchema = z.object({
  movies: z
    .array(movieSchema)
    .min(1, "Add at least one movie")
    .max(LIMITS.moviesMaxPerRequest, `At most ${LIMITS.moviesMaxPerRequest} movies per request`),
});
type FormValues = z.infer<typeof formSchema>;

const emptyMovie = (): FormValues["movies"][number] => ({
  title: "",
  year: "",
  director: "",
  actors: [],
  genres: [],
  themes: [],
  awards: [],
});

function toExtracted(m: FormValues["movies"][number]): ExtractedMovie {
  return {
    movie: { title: m.title, year: m.year ? Number(m.year) : null },
    director: m.director ? { name: m.director } : null,
    actors: m.actors,
    genres: m.genres,
    themes: m.themes,
    awards: m.awards,
  };
}

/** Same shape as the backend's ExtractedMovie record. */
const rawMovieSchema = z.object({
  movie: z.object({ title: z.string().trim().min(1, "movie.title is required"), year: z.number().int().nullable().optional() }),
  director: z.object({ name: z.string() }).nullable().optional(),
  actors: z.array(z.string()).optional(),
  genres: z.array(z.string()).optional(),
  themes: z.array(z.string()).optional(),
  awards: z.array(z.string()).optional(),
});
const rawSchema = z
  .array(rawMovieSchema)
  .min(1, "Provide at least one movie")
  .max(LIMITS.moviesMaxPerRequest, `At most ${LIMITS.moviesMaxPerRequest} movies per request`);

const RAW_PLACEHOLDER = `[
  {
    "movie": { "title": "Inception", "year": 2010 },
    "director": { "name": "Christopher Nolan" },
    "actors": ["Leonardo DiCaprio"],
    "genres": ["Sci-Fi", "Thriller"],
    "themes": ["dreams"],
    "awards": ["Oscar"]
  }
]`;

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="mt-1 text-xs text-destructive">
      {message}
    </p>
  ) : null;
}

function RawJsonForm({ onSubmit, busy }: { onSubmit: (movies: ExtractedMovie[]) => Promise<void>; busy: boolean }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      setError("That is not valid JSON.");
      return;
    }
    const candidate = data && typeof data === "object" && !Array.isArray(data) && "movies" in data ? (data as { movies: unknown }).movies : data;
    const parsed = rawSchema.safeParse(candidate);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setError(first ? `${first.path.join(".") || "root"}: ${first.message}` : "Invalid movie data.");
      return;
    }
    setError(null);
    await onSubmit(parsed.data);
  }

  return (
    <div className="space-y-3">
      <Label htmlFor="raw-json">Movies JSON (array, or {"{ \"movies\": [...] }"})</Label>
      <Textarea
        id="raw-json"
        rows={12}
        spellCheck={false}
        className="font-mono text-xs"
        placeholder={RAW_PLACEHOLDER}
        value={text}
        aria-invalid={error ? true : undefined}
        onChange={(e) => setText(e.target.value)}
      />
      <FieldError message={error ?? undefined} />
      <Button disabled={busy || !text.trim()} onClick={() => void submit()}>
        {busy ? <Loader2 className="animate-spin" /> : <Send />}
        Index JSON
      </Button>
    </div>
  );
}

export function MoviesForm() {
  const dispatch = useAppDispatch();
  const busy = useAppSelector((s) => s.index.submitting === "movies");
  const result = useAppSelector((s) => s.index.moviesResult);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { movies: [emptyMovie()] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "movies" });

  async function send(movies: ExtractedMovie[]) {
    try {
      const res = await dispatch(submitMovies(movies)).unwrap();
      toast.success("Movies indexed", {
        description: `${res.insertedInGraph} in graph · ${res.storedInVectorStore} in vector store`,
      });
      reset({ movies: [emptyMovie()] });
    } catch (err) {
      toast.error("Indexing failed", { description: typeof err === "string" ? err : "Unexpected error" });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add movies directly</CardTitle>
        <CardDescription>
          POST /api/v1/index/movies - synchronous; writes to Neo4j and Pinecone and returns counts. Up to {LIMITS.moviesMaxPerRequest} movies per request.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {result ? (
          <div className="flex items-start gap-3 rounded-md border bg-muted p-3 text-sm">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
            <p>
              Last request: received <b>{result.received}</b>, inserted in graph <b>{result.insertedInGraph}</b>, stored in vector store{" "}
              <b>{result.storedInVectorStore}</b>.
            </p>
          </div>
        ) : null}

        <Tabs defaultValue="form">
          <TabsList>
            <TabsTrigger value="form">Form</TabsTrigger>
            <TabsTrigger value="raw">Raw JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="form">
            <form onSubmit={handleSubmit((v) => send(v.movies.map(toExtracted)))} noValidate className="space-y-5">
              {fields.map((field, index) => {
                const e = errors.movies?.[index];
                return (
                  <fieldset key={field.id} className="space-y-4 rounded-md border p-4">
                    <legend className="px-2 text-xs font-medium uppercase text-muted-foreground">Movie {index + 1}</legend>
                    <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                      <div>
                        <Label htmlFor={`title-${field.id}`}>Title *</Label>
                        <Input id={`title-${field.id}`} className="mt-1.5" aria-invalid={e?.title ? true : undefined} {...register(`movies.${index}.title`)} />
                        <FieldError message={e?.title?.message} />
                      </div>
                      <div>
                        <Label htmlFor={`year-${field.id}`}>Year</Label>
                        <Input id={`year-${field.id}`} inputMode="numeric" maxLength={4} className="mt-1.5" aria-invalid={e?.year ? true : undefined} {...register(`movies.${index}.year`)} />
                        <FieldError message={e?.year?.message} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`director-${field.id}`}>Director</Label>
                      <Input id={`director-${field.id}`} className="mt-1.5" aria-invalid={e?.director ? true : undefined} {...register(`movies.${index}.director`)} />
                      <FieldError message={e?.director?.message} />
                    </div>
                    {(["actors", "genres", "themes", "awards"] as const).map((key) => (
                      <div key={key}>
                        <Label htmlFor={`${key}-${field.id}`} className="capitalize">
                          {key}
                        </Label>
                        <Controller
                          control={control}
                          name={`movies.${index}.${key}`}
                          render={({ field: f }) => (
                            <TagInput id={`${key}-${field.id}`} className="mt-1.5" value={f.value} onChange={f.onChange} placeholder="Type and press Enter" />
                          )}
                        />
                      </div>
                    ))}
                    {fields.length > 1 ? (
                      <Button variant="ghost" size="sm" onClick={() => remove(index)}>
                        <Trash2 /> Remove movie
                      </Button>
                    ) : null}
                  </fieldset>
                );
              })}

              <FieldError message={errors.movies?.message ?? errors.movies?.root?.message} />

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" disabled={fields.length >= LIMITS.moviesMaxPerRequest} onClick={() => append(emptyMovie())}>
                  <Plus /> Add another movie
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" /> : <Send />}
                  {busy ? "Indexing…" : `Index ${fields.length} movie${fields.length === 1 ? "" : "s"}`}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="raw">
            <RawJsonForm busy={busy} onSubmit={send} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
