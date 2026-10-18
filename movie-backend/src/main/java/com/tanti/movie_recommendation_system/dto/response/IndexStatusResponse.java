package com.tanti.movie_recommendation_system.dto.response;

import java.time.Instant;

import lombok.Builder;

/** state: IDLE | RUNNING | DONE | FAILED   stage: PARSING_PDF | EXTRACTING | BUILDING_GRAPH | BUILDING_VECTORS */
@Builder(toBuilder = true)
public record IndexStatusResponse(
        String state,
        String stage,
        int pdfMovieBlocks,
        int batchesDone,
        int batchesTotal,
        int failedBatches,
        int extractedMovies,
        String message,
        Instant startedAt,
        Instant finishedAt) {

    public static IndexStatusResponse idle() {
        return IndexStatusResponse.builder().state("IDLE").message("No indexing job has run yet.").build();
    }
}
