package com.tanti.movie_recommendation_system.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import com.tanti.movie_recommendation_system.dto.internal.PlanStep;
import com.tanti.movie_recommendation_system.dto.internal.QueryPlan;
import com.tanti.movie_recommendation_system.exception.QueryProcessingException;
import org.springframework.stereotype.Service;

/**
 * SAFE Cypher generation. The LLM only returns a JSON plan; every step is checked against
 * whitelists here and Cypher is built from fixed templates. Values always go in as parameters.
 * Result: no DELETE / SET / CREATE can ever reach Neo4j.
 */
@Service
public class CypherTemplateService {

    private static final Set<String> LABELS = Set.of("Movie", "Director", "Actor", "Genre", "Theme", "Award");
    private static final Set<String> RELATIONSHIPS = Set.of("DIRECTED", "ACTED_IN", "BELONGS_TO", "EXPLORES", "WON");
    private static final Map<String, Set<String>> PROPERTIES = Map.of(
            "Movie", Set.of("title", "year"),
            "Director", Set.of("name"),
            "Actor", Set.of("name"),
            "Genre", Set.of("name"),
            "Theme", Set.of("name"),
            "Award", Set.of("name", "category"));
    private static final Set<String> OPERATORS = Set.of("=", "<>", ">", "<", ">=", "<=", "CONTAINS", "STARTS WITH");
    private static final Set<String> AGGREGATIONS = Set.of("count", "collect", "sum", "avg", "min", "max");
    private static final Map<String, String> VAR = Map.of(
            "Movie", "m", "Director", "d", "Actor", "a", "Genre", "g", "Theme", "t", "Award", "aw");
    private static final Pattern ALIAS = Pattern.compile("^[A-Za-z_][A-Za-z0-9_]{0,40}$");

    public record BuiltQuery(String cypher, Map<String, Object> params) {
    }

    public BuiltQuery build(QueryPlan plan) {
        if (plan == null || plan.steps() == null || plan.steps().isEmpty()) {
            throw fail("Empty query plan");
        }
        List<PlanStep> steps = plan.steps();

        // pass 1: aggregation aliases (sort may refer to them)
        Set<String> aliases = new HashSet<>();
        for (PlanStep s : steps) {
            if ("aggregation".equals(s.type())) {
                validateAggregation(s);
                aliases.add(aliasOf(s));
            }
        }

        List<String> matches = new ArrayList<>();
        List<String> wheres = new ArrayList<>();
        Map<String, Object> params = new LinkedHashMap<>();
        Set<String> boundLabels = new LinkedHashSet<>();
        Set<String> usedLabels = new LinkedHashSet<>();
        String ret = "";
        String order = "";
        String limit = "";
        int p = 0;

        for (PlanStep s : steps) {
            String type = s.type() == null ? "" : s.type();
            switch (type) {
                case "traversal" -> {
                    requireLabel(s.from());
                    requireLabel(s.to());
                    if (s.rel() == null || !RELATIONSHIPS.contains(s.rel())) {
                        throw fail("Invalid relationship: " + s.rel());
                    }
                    matches.add("MATCH (%s:%s)-[:%s]->(%s:%s)"
                            .formatted(VAR.get(s.from()), s.from(), s.rel(), VAR.get(s.to()), s.to()));
                    boundLabels.add(s.from());
                    boundLabels.add(s.to());
                }
                case "filter" -> {
                    String[] f = parseField(s.field());
                    if (s.op() == null || !OPERATORS.contains(s.op().toUpperCase())) {
                        throw fail("Invalid operator: " + s.op());
                    }
                    if (s.value() == null) {
                        throw fail("Filter value missing for " + s.field());
                    }
                    String name = "p" + p++;
                    params.put(name, s.value());
                    wheres.add("%s.%s %s $%s".formatted(VAR.get(f[0]), f[1], s.op().toUpperCase(), name));
                    usedLabels.add(f[0]);
                }
                case "projection" -> {
                    if (s.fields() == null || s.fields().isEmpty()) {
                        throw fail("Projection needs fields");
                    }
                    List<String> cols = new ArrayList<>();
                    for (String field : s.fields()) {
                        String[] f = parseField(field);
                        cols.add(VAR.get(f[0]) + "." + f[1]);
                        usedLabels.add(f[0]);
                    }
                    ret = "RETURN " + (Boolean.TRUE.equals(s.distinct()) ? "DISTINCT " : "") + String.join(", ", cols);
                }
                case "aggregation" -> {
                    String alias = aliasOf(s);
                    String expr = aggregationExpr(s, usedLabels);
                    if (s.groupBy() != null && !s.groupBy().isBlank()) {
                        String[] g = parseField(s.groupBy());
                        usedLabels.add(g[0]);
                        ret = "RETURN %s.%s, %s AS %s".formatted(VAR.get(g[0]), g[1], expr, alias);
                    } else {
                        ret = "RETURN %s AS %s".formatted(expr, alias);
                    }
                }
                case "sort" -> {
                    String dir = s.direction() == null ? "" : s.direction().toUpperCase();
                    if (!dir.equals("ASC") && !dir.equals("DESC")) {
                        throw fail("Invalid direction: " + s.direction());
                    }
                    String[] parts = s.field() == null ? new String[0] : s.field().split("\\.");
                    if (parts.length == 2 && aliases.contains(parts[1])) {
                        order = "ORDER BY " + parts[1] + " " + dir;
                    } else {
                        String[] f = parseField(s.field());
                        order = "ORDER BY %s.%s %s".formatted(VAR.get(f[0]), f[1], dir);
                        usedLabels.add(f[0]);
                    }
                }
                case "limit" -> {
                    if (!(s.value() instanceof Number n) || n.intValue() < 1 || n.intValue() > 100) {
                        throw fail("Invalid limit (must be a number 1-100): " + s.value());
                    }
                    limit = "LIMIT " + n.intValue();
                }
                default -> throw fail("Unknown step type: " + s.type());
            }
        }

        if (ret.isEmpty()) {
            throw fail("Plan has no projection or aggregation step");
        }

        // labels that are used but never traversed
        if (matches.isEmpty()) {
            for (String label : usedLabels) {
                matches.add("MATCH (%s:%s)".formatted(VAR.get(label), label));
            }
        } else {
            for (String label : usedLabels) {
                if (!boundLabels.contains(label)) {
                    throw fail("Plan uses " + label + " without a traversal that reaches it");
                }
            }
        }

        List<String> parts = new ArrayList<>(matches);
        if (!wheres.isEmpty()) {
            parts.add("WHERE " + String.join(" AND ", wheres));
        }
        parts.add(ret);
        if (!order.isEmpty()) parts.add(order);
        if (!limit.isEmpty()) parts.add(limit);

        return new BuiltQuery(String.join("\n", parts), params);
    }

    // ---------- helpers ----------

    private void validateAggregation(PlanStep s) {
        if (s.function() == null || !AGGREGATIONS.contains(s.function().toLowerCase())) {
            throw fail("Invalid aggregation: " + s.function());
        }
        if (s.alias() != null && !s.alias().isBlank() && !ALIAS.matcher(s.alias()).matches()) {
            throw fail("Invalid alias: " + s.alias());
        }
    }

    private String aliasOf(PlanStep s) {
        return (s.alias() == null || s.alias().isBlank()) ? s.function().toLowerCase() + "_result" : s.alias();
    }

    private String aggregationExpr(PlanStep s, Set<String> usedLabels) {
        String fn = s.function().toLowerCase();
        if (s.field() == null || s.field().isBlank()) {
            if (!fn.equals("count")) {
                throw fail(fn + " needs a field");
            }
            return "count(*)";
        }
        String[] f = parseField(s.field());
        usedLabels.add(f[0]);
        String var = VAR.get(f[0]);
        return switch (fn) {
            case "count" -> "count(DISTINCT " + var + ")";   // DISTINCT: a movie with 2 Oscars counts once
            case "collect" -> "collect(DISTINCT " + var + "." + f[1] + ")";
            default -> fn + "(" + var + "." + f[1] + ")";
        };
    }

    private String[] parseField(String field) {
        String[] f = field == null ? new String[0] : field.split("\\.");
        if (f.length != 2 || !LABELS.contains(f[0]) || !PROPERTIES.get(f[0]).contains(f[1])) {
            throw fail("Invalid field: " + field);
        }
        return f;
    }

    private void requireLabel(String label) {
        if (label == null || !LABELS.contains(label)) {
            throw fail("Invalid label: " + label);
        }
    }

    private QueryProcessingException fail(String msg) {
        return new QueryProcessingException("Unsafe or invalid query plan: " + msg);
    }
}
