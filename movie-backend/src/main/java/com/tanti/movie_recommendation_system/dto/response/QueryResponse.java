package com.tanti.movie_recommendation_system.dto.response;

import java.util.Map;

/** debug = plan / cypher / params / rows for factual queries (handy while testing in Postman). */
public record QueryResponse(
        String question,
        String type,
        String reasoning,
        String answer,
        Map<String, Object> debug) {
}
