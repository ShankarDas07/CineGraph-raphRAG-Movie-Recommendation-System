package com.tanti.movie_recommendation_system.controller;

import com.tanti.movie_recommendation_system.dto.response.GraphStatsResponse;
import com.tanti.movie_recommendation_system.service.GraphStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/graph")
@RequiredArgsConstructor
public class GraphController {

    private final GraphStatsService graphStatsService;

    /** GET /api/v1/graph/stats -> node / relationship counts in Neo4j */
    @GetMapping("/stats")
    public GraphStatsResponse stats() {
        return graphStatsService.stats();
    }
}
