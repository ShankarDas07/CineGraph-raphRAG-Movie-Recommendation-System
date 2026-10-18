package com.tanti.movie_recommendation_system.service;

import java.util.List;
import java.util.Map;

import com.tanti.movie_recommendation_system.util.JsonUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.document.Document;
import org.springframework.stereotype.Service;

/** DESCRIPTIVE: "Who is X?" / "Tell me about X" -> Pinecone top 10 -> Gemini summary. */
@Service
@RequiredArgsConstructor
public class DescriptiveQueryService {

    private final GeminiService gemini;
    private final VectorStoreService vectors;

    public String handle(String query) {
        String entity = gemini.chat("""
                Extract the main entity (person, movie, etc.) from the user's query.
                Return ONLY the entity name, nothing else.
                Examples:
                  "Who is James Cameron?" -> James Cameron
                  "Tell me about Inception" -> Inception
                  "What genre is The Matrix?" -> The Matrix""", query).trim();

        List<Document> hits = vectors.search(entity, 10);
        if (hits.isEmpty()) {
            return "I couldn't find any information about \"" + entity + "\" in the movie database.";
        }

        List<Map<String, Object>> context = hits.stream().map(d -> Map.<String, Object>of(
                "title", VectorStoreService.meta(d, "title"),
                "year", VectorStoreService.meta(d, "year"),
                "director", VectorStoreService.meta(d, "director"),
                "genres", VectorStoreService.meta(d, "genres"),
                "themes", VectorStoreService.meta(d, "themes"),
                "actors", VectorStoreService.meta(d, "actors"))).toList();

        String prompt = """
                You are a movie expert.

                The user asked: "%s"

                Here is relevant data from our movie database:
                %s

                Using ONLY the data above, provide a clear and informative answer.
                If the entity appears as a director, actor, or in movie metadata - describe their work.
                Do NOT mention databases, scores, vectors, or technical terms.
                If the data doesn't contain enough info, say so honestly.""".formatted(query, JsonUtil.pretty(context));

        return gemini.chat(prompt).trim();
    }
}
