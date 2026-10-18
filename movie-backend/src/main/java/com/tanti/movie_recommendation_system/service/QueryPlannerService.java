package com.tanti.movie_recommendation_system.service;

import com.tanti.movie_recommendation_system.dto.internal.QueryPlan;
import com.tanti.movie_recommendation_system.exception.QueryProcessingException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/** Natural language -> JSON composition plan. Gemini never writes Cypher. */
@Slf4j
@Service
@RequiredArgsConstructor
public class QueryPlannerService {

    private static final String PROMPT = """
            You are a query planner for a movie knowledge graph.

            GRAPH SCHEMA:
            Nodes: Movie(title,year), Director(name), Actor(name), Genre(name), Theme(name), Award(name,category)
            Relationships: Director-DIRECTED->Movie, Actor-ACTED_IN->Movie, Movie-BELONGS_TO->Genre, Movie-EXPLORES->Theme, Movie-WON->Award

            OUTPUT a JSON plan using ONLY these step types:

            1. "traversal": {"type":"traversal","from":"Label","rel":"RELATIONSHIP","to":"Label"}
            2. "filter": {"type":"filter","field":"Label.property","op":"=","value":"some value"}
               Operators: =, <>, >, <, >=, <=, CONTAINS, STARTS WITH
            3. "projection": {"type":"projection","fields":["Label.property"],"distinct":true}
            4. "aggregation": {"type":"aggregation","function":"count","field":"Label.property","alias":"name","groupBy":"Label.property"}
            5. "sort": {"type":"sort","field":"Label.property","direction":"ASC/DESC"}
            6. "limit": {"type":"limit","value":number}

            RULES:
            - Award.name = type (e.g. "Oscar"), Award.category = category (e.g. "Best Picture")
            - Always include a projection or aggregation step
            - To sort by an aggregation alias use field "Label.alias" (alias must be a single word with letters, digits or underscore)
            - Output ONLY valid JSON. No markdown, no backticks.

            EXAMPLES:

            "Movies directed by James Cameron":
            {"steps":[
              {"type":"traversal","from":"Director","rel":"DIRECTED","to":"Movie"},
              {"type":"filter","field":"Director.name","op":"=","value":"James Cameron"},
              {"type":"projection","fields":["Movie.title","Movie.year"],"distinct":true}
            ]}

            "How many movies won an Oscar?":
            {"steps":[
              {"type":"traversal","from":"Movie","rel":"WON","to":"Award"},
              {"type":"filter","field":"Award.name","op":"=","value":"Oscar"},
              {"type":"aggregation","function":"count","field":"Movie.title","alias":"oscar_movies"}
            ]}

            "Actors in Oscar-winning sci-fi movies":
            {"steps":[
              {"type":"traversal","from":"Actor","rel":"ACTED_IN","to":"Movie"},
              {"type":"traversal","from":"Movie","rel":"WON","to":"Award"},
              {"type":"traversal","from":"Movie","rel":"BELONGS_TO","to":"Genre"},
              {"type":"filter","field":"Award.name","op":"=","value":"Oscar"},
              {"type":"filter","field":"Genre.name","op":"=","value":"Sci-Fi"},
              {"type":"projection","fields":["Actor.name"],"distinct":true}
            ]}
            """;

    private final GeminiService gemini;

    public QueryPlan createPlan(String query) {
        try {
            return gemini.chatForObject(PROMPT, query, QueryPlan.class);
        } catch (Exception e) {
            log.error("Failed to create plan: {}", e.getMessage());
            throw new QueryProcessingException("Query planning failed. Please rephrase your question.", e);
        }
    }
}
