package com.tanti.movie_recommendation_system.controller;

import com.tanti.movie_recommendation_system.dto.response.ConnectionStatusResponse;
import com.tanti.movie_recommendation_system.service.ConnectionTestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
@RequiredArgsConstructor
public class HealthController {

    private final ConnectionTestService connectionTestService;

    /** GET /api/v1/health/connections  -> Neo4j / Gemini LLM / Gemini embeddings / Pinecone status */
    @GetMapping("/connections")
    public ResponseEntity<ConnectionStatusResponse> connections() {
        ConnectionStatusResponse res = connectionTestService.check();
        return res.allOk() ? ResponseEntity.ok(res) : ResponseEntity.status(503).body(res);
    }
}
