package com.tanti.movie_recommendation_system.service;

import com.tanti.movie_recommendation_system.util.JsonUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

/**
 * Thin wrapper around ChatClient.
 * NOTE: prompts contain JSON with { } so we pass them as template *parameters*
 * (not as the template text) - otherwise Spring AI would treat {..} as placeholders.
 */
@Service
@RequiredArgsConstructor
public class GeminiService {

    private final ChatClient chatClient;

    public String chat(String system, String user) {
        ChatClient.ChatClientRequestSpec spec = chatClient.prompt();
        if (system != null && !system.isBlank()) {
            spec = spec.system(s -> s.text("{sys}").param("sys", system));
        }
        return spec.user(u -> u.text("{usr}").param("usr", user)).call().content();
    }

    public String chat(String user) {
        return chat(null, user);
    }

    public <T> T chatForObject(String system, String user, Class<T> type) {
        return JsonUtil.parse(chat(system, user), type);
    }
}
