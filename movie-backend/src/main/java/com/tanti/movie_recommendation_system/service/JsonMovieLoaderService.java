package com.tanti.movie_recommendation_system.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import com.tanti.movie_recommendation_system.dto.request.IndexMoviesRequest;
import com.tanti.movie_recommendation_system.entity.ExtractedMovie;
import com.tanti.movie_recommendation_system.exception.BadRequestException;
import com.tanti.movie_recommendation_system.util.JsonUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;

/**
 * Reads the already-extracted movies from a JSON file (default: src/main/resources/data/movies.json).
 * Accepts either a plain array  [ {...}, {...} ]  or an object  { "movies": [ {...} ] }.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JsonMovieLoaderService {

    private final ResourceLoader resourceLoader;

    @Value("${app.indexing.json-path:classpath:data/movies.json}")
    private String jsonPath;

    public List<ExtractedMovie> load() {
        Resource resource = resourceLoader.getResource(jsonPath);
        if (!resource.exists()) {
            throw new BadRequestException("JSON file not found: " + jsonPath
                    + " (put it in src/main/resources/data/movies.json)");
        }
        try (InputStream in = resource.getInputStream()) {
            String text = new String(in.readAllBytes(), StandardCharsets.UTF_8).trim();
            List<ExtractedMovie> movies = text.startsWith("[")
                    ? JsonUtil.parse(text, new TypeReference<List<ExtractedMovie>>() { })
                    : JsonUtil.parse(text, IndexMoviesRequest.class).movies();

            List<ExtractedMovie> valid = movies.stream().filter(m -> m != null && m.hasTitle()).toList();
            if (valid.isEmpty()) {
                throw new BadRequestException("No movie with movie.title found in " + jsonPath);
            }
            log.info("Loaded {} movies from {}", valid.size(), jsonPath);
            return valid;
        } catch (IOException e) {
            throw new BadRequestException("Could not read " + jsonPath + ": " + e.getMessage());
        } catch (RuntimeException e) {
            if (e instanceof BadRequestException) throw e;
            throw new BadRequestException("Invalid JSON format in " + jsonPath + ": " + e.getMessage());
        }
    }
}
