package com.tanti.movie_recommendation_system.dto.internal;

import java.util.List;

/**
 * One step of the JSON plan Gemini produces. Only the fields that belong to the step "type" are filled:
 * traversal: from, rel, to | filter: field, op, value | projection: fields, distinct
 * aggregation: function, field, alias, groupBy | sort: field, direction | limit: value
 */
public record PlanStep(
        String type,
        String from,
        String rel,
        String to,
        String field,
        String op,
        Object value,
        List<String> fields,
        Boolean distinct,
        String function,
        String alias,
        String groupBy,
        String direction) {
}
