package com.tanti.movie_recommendation_system.exception;

/** The LLM plan / Cypher building / answer generation failed (HTTP 422). */
public class QueryProcessingException extends RuntimeException {
    public QueryProcessingException(String message) {
        super(message);
    }

    public QueryProcessingException(String message, Throwable cause) {
        super(message, cause);
    }
}
