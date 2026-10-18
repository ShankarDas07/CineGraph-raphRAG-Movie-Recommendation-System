package com.tanti.movie_recommendation_system.controller;

import com.tanti.movie_recommendation_system.dto.request.IndexMoviesRequest;
import com.tanti.movie_recommendation_system.dto.response.IndexMoviesResponse;
import com.tanti.movie_recommendation_system.dto.response.IndexStatusResponse;
import com.tanti.movie_recommendation_system.service.IndexingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/index")
@RequiredArgsConstructor
public class IndexController {

    private final IndexingService indexingService;

    /** POST /api/v1/index/pdf  (form-data, key "file" = movies.pdf) -> starts background job, 202 Accepted */
    @PostMapping(value = "/pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<IndexStatusResponse> indexPdf(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.accepted().body(indexingService.startPdfIndexing(file));
    }

    /** POST /api/v1/index/json?graph=true&vectors=true -> index from src/main/resources/data/movies.json */
    @PostMapping("/json")
    public ResponseEntity<IndexStatusResponse> indexJson(
            @RequestParam(defaultValue = "true") boolean graph,
            @RequestParam(defaultValue = "true") boolean vectors) {
        return ResponseEntity.accepted().body(indexingService.startJsonIndexing(graph, vectors));
    }

    /** GET /api/v1/index/status -> progress of the PDF job */
    @GetMapping("/status")
    public IndexStatusResponse status() {
        return indexingService.status();
    }

    /** POST /api/v1/index/movies (raw JSON) -> index a few movies directly, no PDF / extraction needed */
    @PostMapping("/movies")
    public IndexMoviesResponse indexMovies(@Valid @RequestBody IndexMoviesRequest request) {
        return indexingService.indexMovies(request.movies());
    }
}
