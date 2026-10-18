package com.tanti.movie_recommendation_system.controller;

import com.tanti.movie_recommendation_system.dto.request.QueryRequest;
import com.tanti.movie_recommendation_system.dto.response.QueryResponse;
import com.tanti.movie_recommendation_system.service.QueryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/query")
@RequiredArgsConstructor
public class QueryController {

    private final QueryService queryService;

    /** POST /api/v1/query  {"query":"..."}  -> auto-classified (factual / similarity / descriptive) */
    @PostMapping
    public QueryResponse ask(@Valid @RequestBody QueryRequest request) {
        return queryService.ask(request.query());
    }

    /** POST /api/v1/query/factual  -> force Neo4j path */
    @PostMapping("/factual")
    public QueryResponse factual(@Valid @RequestBody QueryRequest request) {
        return queryService.askAs("factual", request.query());
    }

    /** POST /api/v1/query/similar  -> force Pinecone recommendation path */
    @PostMapping("/similar")
    public QueryResponse similar(@Valid @RequestBody QueryRequest request) {
        return queryService.askAs("similarity", request.query());
    }

    /** POST /api/v1/query/describe  -> force Pinecone "tell me about X" path */
    @PostMapping("/describe")
    public QueryResponse describe(@Valid @RequestBody QueryRequest request) {
        return queryService.askAs("descriptive", request.query());
    }
}
