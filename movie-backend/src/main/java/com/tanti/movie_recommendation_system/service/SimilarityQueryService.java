package com.tanti.movie_recommendation_system.service;

import java.util.List;
import java.util.Map;

import com.tanti.movie_recommendation_system.util.JsonUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * SIMILARITY: Pinecone top-N candidates -> Gemini picks the best M and explains why.
 * Metadata (genres, themes, director, actors) is already in Pinecone, so Neo4j is not needed here.
 */
@Slf4j
@Service
public class SimilarityQueryService {

    private final GeminiService gemini;
    private final VectorStoreService vectors;
    private final int candidates;
    private final int top;

    public SimilarityQueryService(GeminiService gemini, VectorStoreService vectors,
                                  @Value("${app.similarity.candidates:50}") int candidates,
                                  @Value("${app.similarity.top:10}") int top) {
        this.gemini = gemini;
        this.vectors = vectors;
        this.candidates = candidates;
        this.top = top;
    }

    public String handle(String query) {
        String movieName = extractMovieName(query);
        List<Document> hits = vectors.search(movieName != null ? movieName : query, candidates);
        if (hits.isEmpty()) {
            return "I couldn't find any similar movies.";
        }

        Map<String, Object> source = null;
        List<Document> pool = hits;
        if (movieName != null) {
            source = hits.stream()
                    .filter(d -> movieName.equalsIgnoreCase(String.valueOf(d.getMetadata().get("title"))))
                    .map(Document::getMetadata).findFirst().orElse(null);
            pool = hits.stream()
                    .filter(d -> !movieName.equalsIgnoreCase(String.valueOf(d.getMetadata().get("title"))))
                    .toList();
        }

        List<Map<String, Object>> candidateList = pool.stream().map(d -> Map.of(
                "title", VectorStoreService.meta(d, "title"), "year", VectorStoreService.meta(d, "year"), "director", VectorStoreService.meta(d, "director"),
                "genres", VectorStoreService.meta(d, "genres"), "themes", VectorStoreService.meta(d, "themes"), "actors", VectorStoreService.meta(d, "actors"))).toList();

        String prompt;
        if (source != null) {
            prompt = """
                    You are a movie recommendation expert.

                    The user wants movies similar to: "%s" (%s)
                      - Genres: %s
                      - Themes: %s
                      - Director: %s
                      - Actors: %s

                    Here are %d candidate movies from our database:
                    %s

                    Pick the %d BEST matches. Rank them by how well they match in:
                    1. Genre overlap (most important)
                    2. Theme similarity
                    3. Same director or actors (bonus)

                    For each pick, explain in 1-2 sentences WHY it matches.
                    Do NOT mention scores, vectors, databases, or technical terms.
                    Format as a numbered list.""".formatted(
                    source.get("title"), source.get("year") instanceof Number n ? (Object) n.longValue() : source.get("year"), source.get("genres"), source.get("themes"),
                    source.get("director"), source.get("actors"),
                    candidateList.size(), JsonUtil.pretty(candidateList), top);
        } else {
            prompt = """
                    You are a movie recommendation expert.

                    The user asked: "%s"

                    Here are %d candidate movies:
                    %s

                    Pick the %d BEST matches for what the user is looking for.
                    For each pick, explain in 1-2 sentences WHY it fits.
                    Do NOT mention scores, vectors, databases, or technical terms.
                    Format as a numbered list.""".formatted(query, candidateList.size(), JsonUtil.pretty(candidateList), top);
        }
        return gemini.chat(prompt).trim();
    }

    private String extractMovieName(String query) {
        String r = gemini.chat("""
                Extract the movie title from the user's query.
                If a specific movie is mentioned, return ONLY the movie title (nothing else).
                If no specific movie is mentioned, return exactly: NONE""", query).trim();
        return (r.isEmpty() || r.equalsIgnoreCase("NONE")) ? null : r;
    }

}
