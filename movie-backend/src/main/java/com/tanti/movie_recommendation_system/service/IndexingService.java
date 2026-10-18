package com.tanti.movie_recommendation_system.service;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.UnaryOperator;

import com.tanti.movie_recommendation_system.dto.response.IndexMoviesResponse;
import com.tanti.movie_recommendation_system.dto.response.IndexStatusResponse;
import com.tanti.movie_recommendation_system.entity.ExtractedMovie;
import com.tanti.movie_recommendation_system.exception.BadRequestException;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Whole indexing pipeline:  PDF -> blocks -> Gemini entities -> Neo4j graph -> Pinecone vectors.
 * The PDF job runs in the background (1000 movies take minutes) - poll GET /api/v1/index/status.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IndexingService {

    private final PdfParserService pdfParser;
    private final EntityExtractorService extractor;
    private final GraphBuilderService graphBuilder;
    private final VectorStoreService vectorStore;
    private final JsonMovieLoaderService jsonLoader;

    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final AtomicReference<IndexStatusResponse> status = new AtomicReference<>(IndexStatusResponse.idle());

    public IndexStatusResponse status() {
        return status.get();
    }

    public IndexStatusResponse startPdfIndexing(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Please upload a non-empty PDF in form-data key 'file'.");
        }
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (!name.endsWith(".pdf")) {
            throw new BadRequestException("Only .pdf files are supported.");
        }
        if ("RUNNING".equals(status.get().state())) {
            throw new BadRequestException("An indexing job is already running. Check GET /api/v1/index/status.");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();   // read now - the temp upload file disappears after the request ends
        } catch (IOException e) {
            throw new BadRequestException("Could not read upload: " + e.getMessage());
        }

        status.set(IndexStatusResponse.builder()
                .state("RUNNING").stage("PARSING_PDF").startedAt(Instant.now())
                .message("Job started for " + file.getOriginalFilename()).build());
        worker.submit(() -> runPipeline(bytes));
        return status.get();
    }

    /** Index from the JSON file (no PDF, no Gemini extraction). Runs in background, poll /index/status. */
    public IndexStatusResponse startJsonIndexing(boolean graph, boolean vectors) {
        if (!graph && !vectors) {
            throw new BadRequestException("Nothing to do: graph=false and vectors=false.");
        }
        if ("RUNNING".equals(status.get().state())) {
            throw new BadRequestException("An indexing job is already running. Check GET /api/v1/index/status.");
        }
        List<ExtractedMovie> movies = jsonLoader.load();   // load now so file errors show up in Postman
        status.set(IndexStatusResponse.builder()
                .state("RUNNING").stage("LOADED_JSON").startedAt(Instant.now())
                .extractedMovies(movies.size()).message("Loaded " + movies.size() + " movies from JSON").build());
        worker.submit(() -> {
            try {
                int g = 0, v = 0;
                if (graph) {
                    update(s -> s.toBuilder().stage("BUILDING_GRAPH").message("Writing Neo4j graph...").build());
                    g = graphBuilder.buildGraph(movies);
                }
                if (vectors) {
                    update(s -> s.toBuilder().stage("BUILDING_VECTORS").message("Writing Pinecone vectors...").build());
                    v = vectorStore.storeAll(movies);
                }
                String msg = "Done. graph=" + g + " movies, vectors=" + v;
                update(s -> s.toBuilder().state("DONE").stage("FINISHED").finishedAt(Instant.now()).message(msg).build());
            } catch (Throwable t) {
                log.error("JSON indexing failed", t);
                update(s -> s.toBuilder().state("FAILED").finishedAt(Instant.now()).message(String.valueOf(t.getMessage())).build());
            }
        });
        return status.get();
    }

    /** Synchronous: index movies that are already structured JSON (good for quick Postman tests). */
    public IndexMoviesResponse indexMovies(List<ExtractedMovie> movies) {
        List<ExtractedMovie> valid = movies.stream().filter(m -> m != null && m.hasTitle()).toList();
        if (valid.isEmpty()) {
            throw new BadRequestException("No movie with a movie.title found in the request.");
        }
        int graph = graphBuilder.buildGraph(valid);
        int vectors = vectorStore.storeAll(valid);
        return new IndexMoviesResponse(movies.size(), graph, vectors);
    }

    private void runPipeline(byte[] pdf) {
        try {
            List<String> blocks = pdfParser.extractMovieBlocks(pdf);
            update(s -> s.toBuilder().stage("EXTRACTING").pdfMovieBlocks(blocks.size())
                    .batchesTotal(extractor.batchCount(blocks.size()))
                    .message("Gemini is extracting entities...").build());

            EntityExtractorService.ExtractionResult result = extractor.extractAll(blocks,
                    (done, total) -> update(s -> s.toBuilder().batchesDone(done).batchesTotal(total).build()));
            update(s -> s.toBuilder().stage("BUILDING_GRAPH").extractedMovies(result.movies().size())
                    .failedBatches(result.failedBatches()).message("Writing Neo4j graph...").build());

            int graph = graphBuilder.buildGraph(result.movies());
            update(s -> s.toBuilder().stage("BUILDING_VECTORS").message("Writing Pinecone vectors...").build());

            int vectors = vectorStore.storeAll(result.movies());
            update(s -> s.toBuilder().state("DONE").stage("FINISHED").finishedAt(Instant.now())
                    .message("Done. graph=" + graph + " movies, vectors=" + vectors + ", failedBatches="
                            + result.failedBatches()).build());
        } catch (Throwable t) {
            log.error("Indexing failed", t);
            update(s -> s.toBuilder().state("FAILED").finishedAt(Instant.now()).message(String.valueOf(t.getMessage())).build());
        }
    }

    private void update(UnaryOperator<IndexStatusResponse> fn) {
        status.updateAndGet(fn);
    }

    @PreDestroy
    void shutdown() {
        worker.shutdownNow();
    }
}
