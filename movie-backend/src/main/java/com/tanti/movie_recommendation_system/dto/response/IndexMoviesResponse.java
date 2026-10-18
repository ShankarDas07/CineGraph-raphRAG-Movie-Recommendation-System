package com.tanti.movie_recommendation_system.dto.response;

public record IndexMoviesResponse(int received, int insertedInGraph, int storedInVectorStore) {
}
