package com.tanti.movie_recommendation_system.service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.BiConsumer;

import com.tanti.movie_recommendation_system.entity.ExtractedMovie;
import com.tanti.movie_recommendation_system.util.JsonUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;

/** STEP 2: raw movie blocks -> Gemini -> structured ExtractedMovie list (batched, parallel, with retries). */
@Slf4j
@Service
public class EntityExtractorService {

    private static final String SYSTEM_PROMPT = """
            You are a precise entity extractor for a movie knowledge graph.
            You receive several movie text blocks. For EACH block output this EXACT JSON structure:
            {
              "movie": {"title": "string", "year": number},
              "director": {"name": "string"},
              "actors": ["string"],
              "genres": ["string"],
              "themes": ["string"],
              "awards": ["string"]
            }
            Rules:
            - If awards say "None", return awards as empty array []
            - Keep exact names as written
            - Year must be a number, not a string
            - Keep awards in the form "Oscar (Best Cinematography)" when a category is given
            - Return ONE JSON ARRAY with one object per block, in the same order: [{...}, {...}]
            - Return ONLY valid JSON. No markdown, no backticks, no explanation.
            """;

    public record ExtractionResult(List<ExtractedMovie> movies, int failedBatches) {
    }

    private final GeminiService gemini;
    private final int batchSize;
    private final int concurrency;
    private final int maxRetries;

    public EntityExtractorService(GeminiService gemini,
                                  @Value("${app.indexing.batch-size:20}") int batchSize,
                                  @Value("${app.indexing.concurrency:4}") int concurrency,
                                  @Value("${app.indexing.max-retries:3}") int maxRetries) {
        this.gemini = gemini;
        this.batchSize = batchSize;
        this.concurrency = concurrency;
        this.maxRetries = maxRetries;
    }

    public int batchCount(int blocks) {
        return (int) Math.ceil(blocks / (double) batchSize);
    }

    /** onProgress(batchesDone, batchesTotal) is called after every finished batch. */
    public ExtractionResult extractAll(List<String> blocks, BiConsumer<Integer, Integer> onProgress) {
        List<List<String>> batches = new ArrayList<>();
        for (int i = 0; i < blocks.size(); i += batchSize) {
            batches.add(blocks.subList(i, Math.min(i + batchSize, blocks.size())));
        }

        Semaphore limiter = new Semaphore(concurrency);
        AtomicInteger done = new AtomicInteger();
        AtomicInteger failed = new AtomicInteger();
        List<ExtractedMovie> all = new ArrayList<>();

        try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<List<ExtractedMovie>>> futures = new ArrayList<>();
            for (int i = 0; i < batches.size(); i++) {
                final int batchNo = i + 1;
                final List<String> batch = batches.get(i);
                futures.add(pool.submit(() -> {
                    limiter.acquire();
                    try {
                        List<ExtractedMovie> res = extractBatch(batch, batchNo);
                        if (res.isEmpty()) {
                            failed.incrementAndGet();
                        }
                        return res;
                    } finally {
                        limiter.release();
                        onProgress.accept(done.incrementAndGet(), batches.size());
                    }
                }));
            }
            for (Future<List<ExtractedMovie>> f : futures) {
                try {
                    all.addAll(f.get());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException("Extraction interrupted", e);
                } catch (ExecutionException e) {
                    log.error("Batch crashed", e.getCause());
                }
            }
        }
        log.info("Extracted {} movies from {} blocks ({} failed batches)", all.size(), blocks.size(), failed.get());
        return new ExtractionResult(all, failed.get());
    }

    private List<ExtractedMovie> extractBatch(List<String> batch, int batchNo) {
        StringBuilder user = new StringBuilder("Extract these ").append(batch.size()).append(" movie blocks:\n\n");
        for (int i = 0; i < batch.size(); i++) {
            user.append("=== BLOCK ").append(i + 1).append(" ===\n").append(batch.get(i)).append("\n\n");
        }

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                String raw = gemini.chat(SYSTEM_PROMPT, user.toString());
                List<ExtractedMovie> parsed = JsonUtil.parse(raw, new TypeReference<List<ExtractedMovie>>() {
                });
                List<ExtractedMovie> valid = parsed.stream().filter(ExtractedMovie::hasTitle).toList();
                if (valid.isEmpty()) {
                    throw new IllegalStateException("Gemini returned no valid movies");
                }
                log.debug("Batch {} ok: {} movies", batchNo, valid.size());
                return valid;
            } catch (Exception e) {
                boolean rateLimited = String.valueOf(e.getMessage()).contains("429");
                log.warn("Batch {} attempt {}/{} failed: {}", batchNo, attempt, maxRetries, e.getMessage());
                if (attempt < maxRetries) {
                    sleepSeconds((rateLimited ? 30L : 5L) * attempt);
                }
            }
        }
        log.error("Batch {} permanently failed", batchNo);
        return List.of();
    }

    private static void sleepSeconds(long s) {
        try {
            Thread.sleep(s * 1000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
