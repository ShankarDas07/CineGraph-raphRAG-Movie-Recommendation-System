package com.tanti.movie_recommendation_system.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.tanti.movie_recommendation_system.dto.internal.QueryPlan;
import com.tanti.movie_recommendation_system.exception.QueryProcessingException;
import com.tanti.movie_recommendation_system.util.JsonUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.neo4j.driver.AccessMode;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Session;
import org.neo4j.driver.SessionConfig;
import org.springframework.stereotype.Service;

/** FACTUAL: question -> JSON plan -> safe Cypher -> Neo4j (READ only) -> natural language answer. */
@Slf4j
@Service
@RequiredArgsConstructor
public class FactualQueryService {

    public record FactualResult(String answer, Map<String, Object> debug) {
    }

    private final QueryPlannerService planner;
    private final CypherTemplateService templates;
    private final GeminiService gemini;
    private final Driver driver;

    public FactualResult handle(String query) {
        QueryPlan plan = planner.createPlan(query);
        CypherTemplateService.BuiltQuery built = templates.build(plan);
        log.debug("Cypher:\n{}\nparams={}", built.cypher(), built.params());

        List<Map<String, Object>> rows;
        try (Session session = driver.session(SessionConfig.builder().withDefaultAccessMode(AccessMode.READ).build())) {
            rows = session.executeRead(tx -> tx.run(built.cypher(), built.params()).list(r -> r.asMap()));
        } catch (Exception e) {
            throw new QueryProcessingException("Graph query failed: " + e.getMessage(), e);
        }

        Map<String, Object> debug = new LinkedHashMap<>();
        debug.put("plan", plan);
        debug.put("cypher", built.cypher());
        debug.put("params", built.params());
        debug.put("rowCount", rows.size());
        debug.put("rows", rows.size() > 50 ? rows.subList(0, 50) : rows);

        if (rows.isEmpty()) {
            return new FactualResult("I couldn't find any results for that query in the movie database.", debug);
        }

        String prompt = """
                You are a helpful movie assistant.
                Given the question and database results, provide a clear, natural language answer.
                Do NOT mention databases, Cypher, JSON, or technical details.
                Do NOT return any JSON. Only return plain English text.

                Question: %s

                Database Results:
                %s
                %s""".formatted(query,
                JsonUtil.pretty(rows.size() > 50 ? rows.subList(0, 50) : rows),
                rows.size() > 50 ? "... and " + (rows.size() - 50) + " more results" : "");

        return new FactualResult(gemini.chat(prompt).trim(), debug);
    }
}
