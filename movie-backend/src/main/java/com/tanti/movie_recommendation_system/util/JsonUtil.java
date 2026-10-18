package com.tanti.movie_recommendation_system.util;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/** Small helper: LLM text (maybe wrapped in ```json fences) -> Java objects. (Jackson 3 = Spring Boot 4) */
public final class JsonUtil {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private JsonUtil() {
    }

    public static <T> T parse(String raw, Class<T> type) {
        return MAPPER.readValue(clean(raw), type);
    }

    public static <T> T parse(String raw, TypeReference<T> type) {
        return MAPPER.readValue(clean(raw), type);
    }

    public static String pretty(Object value) {
        return MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(value);
    }

    /** Remove markdown fences and any text before the first / after the last JSON bracket. */
    static String clean(String raw) {
        if (raw == null) {
            throw new IllegalArgumentException("Empty LLM response");
        }
        String s = raw.replace("```json", "").replace("```", "").trim();
        int start = firstIndexOfAny(s, '{', '[');
        int end = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
        if (start >= 0 && end > start) {
            s = s.substring(start, end + 1);
        }
        return s;
    }

    private static int firstIndexOfAny(String s, char a, char b) {
        int i = s.indexOf(a);
        int j = s.indexOf(b);
        if (i < 0) return j;
        if (j < 0) return i;
        return Math.min(i, j);
    }
}
