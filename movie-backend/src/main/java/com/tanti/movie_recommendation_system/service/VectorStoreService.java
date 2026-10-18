package com.tanti.movie_recommendation_system.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import com.tanti.movie_recommendation_system.entity.ExtractedMovie;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

/** STEP 4: movie text -> Gemini embedding -> Pinecone (VectorStore does the embedding for us). */
@Slf4j
@Service
@RequiredArgsConstructor
public class VectorStoreService {

    private static final int UPSERT_BATCH = 50;

    private final VectorStore vectorStore;

    public int storeAll(List<ExtractedMovie> movies) {
        int stored = 0;
        for (int i = 0; i < movies.size(); i += UPSERT_BATCH) {
            List<ExtractedMovie> batch = movies.subList(i, Math.min(i + UPSERT_BATCH, movies.size()));
            List<Document> docs = new ArrayList<>();
            for (ExtractedMovie m : batch) {
                if (m.hasTitle()) {
                    docs.add(toDocument(m));
                }
            }
            if (!docs.isEmpty()) {
                vectorStore.add(docs);
                stored += docs.size();
            }
            log.info("Vector store: {}/{}", stored, movies.size());
        }
        return stored;
    }

    public List<Document> search(String text, int topK) {
        return vectorStore.similaritySearch(SearchRequest.builder().query(text).topK(topK).build());
    }

    /** Metadata value for prompts. Pinecone returns numbers as double (2010.0) - show them as 2010. */
    public static Object meta(Document d, String key) {
        Object v = d.getMetadata().get(key);
        if (v == null) {
            return "";
        }
        if (v instanceof Number n && n.doubleValue() == Math.rint(n.doubleValue())) {
            return n.longValue();
        }
        return v;
    }

    static Document toDocument(ExtractedMovie m) {
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("title", m.title());
        meta.put("year", m.movie().year() == null ? 0 : m.movie().year());
        meta.put("director", m.hasDirector() ? m.director().name() : "");
        meta.put("genres", String.join(", ", m.genres()));
        meta.put("themes", String.join(", ", m.themes()));
        meta.put("actors", String.join(", ", m.actors()));

        return Document.builder()
                .id(slug(m.title()))
                .text(embeddingText(m))
                .metadata(meta)
                .build();
    }

    /** Clean description that embeds better than raw PDF text. */
    static String embeddingText(ExtractedMovie m) {
        StringBuilder sb = new StringBuilder();
        sb.append(m.title()).append(" is a ").append(String.join(", ", m.genres()))
                .append(" movie released in ").append(m.movie().year()).append(". ");
        if (m.hasDirector()) {
            sb.append("Directed by ").append(m.director().name()).append(". ");
        }
        sb.append("Starring ").append(String.join(", ", m.actors())).append(". ");
        sb.append("The movie explores themes of ").append(String.join(", ", m.themes())).append(".");
        if (!m.awards().isEmpty()) {
            sb.append(" Awards: ").append(String.join(", ", m.awards())).append(".");
        }
        return sb.toString();
    }

    /** Pinecone ids must be plain ASCII. "The Dark Knight" -> "the-dark-knight". */
    static String slug(String title) {
        String s = title.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        return s.isEmpty() ? "movie-" + Math.abs(title.hashCode()) : s;
    }
}
