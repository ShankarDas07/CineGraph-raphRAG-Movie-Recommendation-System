package com.tanti.movie_recommendation_system.dto.response;

import java.util.Map;

public record ConnectionStatusResponse(boolean allOk, Map<String, ServiceStatus> services) {

    public record ServiceStatus(boolean ok, String detail) {
    }
}
