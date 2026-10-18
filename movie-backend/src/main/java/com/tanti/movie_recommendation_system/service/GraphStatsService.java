package com.tanti.movie_recommendation_system.service;

import java.util.LinkedHashMap;
import java.util.Map;

import com.tanti.movie_recommendation_system.dto.response.GraphStatsResponse;
import lombok.RequiredArgsConstructor;
import org.neo4j.driver.AccessMode;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Session;
import org.neo4j.driver.SessionConfig;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GraphStatsService {

    private final Driver driver;

    public GraphStatsResponse stats() {
        try (Session s = driver.session(SessionConfig.builder().withDefaultAccessMode(AccessMode.READ).build())) {
            long nodes = s.run("MATCH (n) RETURN count(n) AS c").single().get("c").asLong();
            long rels = s.run("MATCH ()-[r]->() RETURN count(r) AS c").single().get("c").asLong();
            Map<String, Long> byLabel = new LinkedHashMap<>();
            s.run("MATCH (n) UNWIND labels(n) AS l RETURN l, count(*) AS c ORDER BY c DESC")
                    .forEachRemaining(r -> byLabel.put(r.get("l").asString(), r.get("c").asLong()));
            return new GraphStatsResponse(nodes, rels, byLabel);
        }
    }
}
