package com.tanti.movie_recommendation_system.service;

import com.tanti.movie_recommendation_system.dto.internal.Classification;
import com.tanti.movie_recommendation_system.dto.response.QueryResponse;
import com.tanti.movie_recommendation_system.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/** Router: classify the question, then send it to the factual / similarity / descriptive handler. */
@Slf4j
@Service
@RequiredArgsConstructor
public class QueryService {

    private final QueryClassifierService classifier;
    private final FactualQueryService factual;
    private final SimilarityQueryService similarity;
    private final DescriptiveQueryService descriptive;

    /** Automatic routing. */
    public QueryResponse ask(String query) {
        Classification c = classifier.classify(query);
        log.info("Query type={} reason={}", c.type(), c.reasoning());
        return route(c.type(), c.reasoning(), query);
    }

    /** Force a handler (factual | similarity | descriptive) - useful for testing each part separately. */
    public QueryResponse askAs(String type, String query) {
        return route(type, "forced by endpoint", query);
    }

    private QueryResponse route(String type, String reasoning, String query) {
        String t = type == null ? "factual" : type.toLowerCase();
        return switch (t) {
            case "similarity" -> new QueryResponse(query, t, reasoning, similarity.handle(query), null);
            case "descriptive" -> new QueryResponse(query, t, reasoning, descriptive.handle(query), null);
            case "factual" -> {
                FactualQueryService.FactualResult r = factual.handle(query);
                yield new QueryResponse(query, t, reasoning, r.answer(), r.debug());
            }
            default -> throw new BadRequestException("Unknown query type: " + type);
        };
    }
}
