package com.tanti.movie_recommendation_system.dto.request;

import java.util.List;

import com.tanti.movie_recommendation_system.entity.ExtractedMovie;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public record IndexMoviesRequest(
        @NotEmpty(message = "movies must not be empty")
        @Size(max = 200, message = "max 200 movies per request")
        List<ExtractedMovie> movies) {
}
