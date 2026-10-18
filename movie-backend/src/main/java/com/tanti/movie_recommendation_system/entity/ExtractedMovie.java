package com.tanti.movie_recommendation_system.entity;

import java.util.List;

/**
 * One movie after Gemini extraction. This is the same JSON shape your Node project used:
 * { movie:{title,year}, director:{name}, actors:[], genres:[], themes:[], awards:[] }
 * It is also the request body of POST /api/v1/index/movies.
 */
public record ExtractedMovie(
        MovieInfo movie,
        DirectorInfo director,
        List<String> actors,
        List<String> genres,
        List<String> themes,
        List<String> awards) {

    public ExtractedMovie {
        actors = clean(actors);
        genres = clean(genres);
        themes = clean(themes);
        awards = clean(awards);
    }

    public record MovieInfo(String title, Integer year) {
    }

    public record DirectorInfo(String name) {
    }

    public boolean hasTitle() {
        return movie != null && movie.title() != null && !movie.title().isBlank();
    }

    public String title() {
        return movie.title().trim();
    }

    public boolean hasDirector() {
        return director != null && director.name() != null && !director.name().isBlank();
    }

    private static List<String> clean(List<String> in) {
        if (in == null) {
            return List.of();
        }
        return in.stream()
                .filter(s -> s != null && !s.isBlank() && !s.equalsIgnoreCase("none"))
                .map(String::trim)
                .distinct()
                .toList();
    }
}
