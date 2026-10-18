package com.tanti.movie_recommendation_system.service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Supplier;

import com.tanti.movie_recommendation_system.dto.response.ConnectionStatusResponse;
import com.tanti.movie_recommendation_system.dto.response.ConnectionStatusResponse.ServiceStatus;
import lombok.RequiredArgsConstructor;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Session;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.stereotype.Service;

/** Same idea as 1_testConnection.js: check Neo4j, Pinecone, Gemini LLM and Gemini embeddings. */
@Service
@RequiredArgsConstructor
public class ConnectionTestService {

    private final Driver driver;
    private final VectorStoreService vectorStore;
    private final GeminiService gemini;
    private final EmbeddingModel embeddingModel;

    public ConnectionStatusResponse check() {
        Map<String, ServiceStatus> result = new LinkedHashMap<>();

        result.put("neo4j", test(() -> {
            try (Session s = driver.session()) {
                return s.run("RETURN 'Neo4j Connected!' AS message").single().get("message").asString();
            }
        }));
        result.put("geminiLlm", test(() -> gemini.chat("Say 'Gemini Connected!' and nothing else.").trim()));
        result.put("geminiEmbeddings", test(() -> {
            int dim = embeddingModel.embed("test").length;
            return "dimension=" + dim + (dim == 3072 ? "" : " (expected 3072 - Pinecone index must match!)");
        }));
        result.put("pinecone", test(() -> "connected, search returned "
                + vectorStore.search("test", 1).size() + " result(s)"));

        boolean allOk = result.values().stream().allMatch(ServiceStatus::ok);
        return new ConnectionStatusResponse(allOk, result);
    }

    private ServiceStatus test(Supplier<String> action) {
        try {
            return new ServiceStatus(true, action.get());
        } catch (Exception e) {
            return new ServiceStatus(false, e.getClass().getSimpleName() + ": " + e.getMessage());
        }
    }
}
