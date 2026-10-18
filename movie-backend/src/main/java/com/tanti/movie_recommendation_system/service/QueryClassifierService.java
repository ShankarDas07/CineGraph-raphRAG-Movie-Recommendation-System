package com.tanti.movie_recommendation_system.service;

import com.tanti.movie_recommendation_system.dto.internal.Classification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/** Is the question FACTUAL (Neo4j), SIMILARITY (Pinecone) or DESCRIPTIVE (Pinecone)? */
@Slf4j
@Service
@RequiredArgsConstructor
public class QueryClassifierService {

    private static final String PROMPT = """
            You are a query classifier for a movie knowledge graph.

            Classify the query as:
            1. "factual" - asks for specific lists, counts, or graph relationships
               Examples: "Movies directed by Nolan", "Actors who won Oscar", "How many sci-fi movies?"
            2. "similarity" - asks for recommendations or similar items
               Examples: "Movies like Inception", "Recommend sci-fi movies", "Something similar to thriller"
            3. "descriptive" - asks about an entity (who, what, tell me about)
               Examples: "Who is James Cameron?", "Tell me about Inception", "What is The Godfather about?"

            Respond ONLY with JSON: {"type": "factual" or "similarity" or "descriptive", "reasoning": "one sentence"}
            No markdown, no backticks.
            """;

    private final GeminiService gemini;

    public Classification classify(String query) {
        try {
            Classification c = gemini.chatForObject(PROMPT, query, Classification.class);
            if (c == null || c.type() == null) {
                throw new IllegalStateException("empty classification");
            }
            return c;
        } catch (Exception e) {
            log.warn("Classification failed ({}), defaulting to factual", e.getMessage());
            return new Classification("factual", "Default fallback");
        }
    }
}
