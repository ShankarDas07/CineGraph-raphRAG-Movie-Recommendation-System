package com.tanti.movie_recommendation_system.service;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.tanti.movie_recommendation_system.entity.ExtractedMovie;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Session;
import org.springframework.stereotype.Service;

/** STEP 3: ExtractedMovie -> Neo4j nodes + relationships (MERGE = no duplicates). */
@Slf4j
@Service
@RequiredArgsConstructor
public class GraphBuilderService {

    private static final Pattern AWARD = Pattern.compile("^(.+?)\\s*\\((.+)\\)$");

    private final Driver driver;

    public void createIndexes() {
        try (Session session = driver.session()) {
            session.run("CREATE INDEX IF NOT EXISTS FOR (m:Movie) ON (m.title)").consume();
            session.run("CREATE INDEX IF NOT EXISTS FOR (d:Director) ON (d.name)").consume();
            session.run("CREATE INDEX IF NOT EXISTS FOR (a:Actor) ON (a.name)").consume();
            session.run("CREATE INDEX IF NOT EXISTS FOR (g:Genre) ON (g.name)").consume();
            session.run("CREATE INDEX IF NOT EXISTS FOR (t:Theme) ON (t.name)").consume();
            session.run("CREATE INDEX IF NOT EXISTS FOR (aw:Award) ON (aw.name, aw.category)").consume();
        }
    }

    /** Inserts all movies, returns how many were inserted successfully. */
    public int buildGraph(List<ExtractedMovie> movies) {
        createIndexes();
        int ok = 0;
        for (ExtractedMovie movie : movies) {
            if (!movie.hasTitle()) {
                continue;
            }
            try {
                insertMovie(movie);
                ok++;
            } catch (Exception e) {
                log.error("Graph insert failed for '{}': {}", movie.title(), e.getMessage());
            }
            if (ok % 50 == 0) {
                log.info("Graph: inserted {}/{}", ok, movies.size());
            }
        }
        log.info("Graph built: {}/{} movies", ok, movies.size());
        return ok;
    }

    private void insertMovie(ExtractedMovie e) {
        String title = e.title();
        try (Session session = driver.session()) {
            session.executeWrite(tx -> {
                tx.run("MERGE (m:Movie {title: $title}) SET m.year = $year",
                        Map.of("title", title, "year", e.movie().year() == null ? 0 : e.movie().year())).consume();

                if (e.hasDirector()) {
                    tx.run("""
                            MERGE (d:Director {name: $name})
                            MERGE (m:Movie {title: $title})
                            MERGE (d)-[:DIRECTED]->(m)""",
                            Map.of("name", e.director().name().trim(), "title", title)).consume();
                }
                if (!e.actors().isEmpty()) {
                    tx.run("""
                            MATCH (m:Movie {title: $title})
                            UNWIND $names AS n
                            MERGE (a:Actor {name: n})
                            MERGE (a)-[:ACTED_IN]->(m)""",
                            Map.of("title", title, "names", e.actors())).consume();
                }
                if (!e.genres().isEmpty()) {
                    tx.run("""
                            MATCH (m:Movie {title: $title})
                            UNWIND $names AS n
                            MERGE (g:Genre {name: n})
                            MERGE (m)-[:BELONGS_TO]->(g)""",
                            Map.of("title", title, "names", e.genres())).consume();
                }
                if (!e.themes().isEmpty()) {
                    tx.run("""
                            MATCH (m:Movie {title: $title})
                            UNWIND $names AS n
                            MERGE (t:Theme {name: n})
                            MERGE (m)-[:EXPLORES]->(t)""",
                            Map.of("title", title, "names", e.themes())).consume();
                }
                if (!e.awards().isEmpty()) {
                    // "Oscar (Best Cinematography)" -> name=Oscar, category=Best Cinematography
                    List<Map<String, String>> awards = e.awards().stream().map(a -> {
                        Matcher m = AWARD.matcher(a);
                        return m.matches()
                                ? Map.of("name", m.group(1).trim(), "category", m.group(2).trim())
                                : Map.of("name", a.trim(), "category", "General");
                    }).toList();
                    tx.run("""
                            MATCH (m:Movie {title: $title})
                            UNWIND $awards AS aw
                            MERGE (a:Award {name: aw.name, category: aw.category})
                            MERGE (m)-[:WON]->(a)""",
                            Map.of("title", title, "awards", awards)).consume();
                }
                return null;
            });
        }
    }
}
