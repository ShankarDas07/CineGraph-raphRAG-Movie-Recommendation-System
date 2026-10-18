package com.tanti.movie_recommendation_system.dto.response;

import java.util.Map;

public record GraphStatsResponse(long nodes, long relationships, Map<String, Long> nodesByLabel) {
}
