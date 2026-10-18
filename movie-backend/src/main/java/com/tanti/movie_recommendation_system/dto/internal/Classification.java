package com.tanti.movie_recommendation_system.dto.internal;

/** type: factual | similarity | descriptive */
public record Classification(String type, String reasoning) {
}
