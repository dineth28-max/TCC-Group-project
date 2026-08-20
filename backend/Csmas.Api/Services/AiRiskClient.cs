using Csmas.Api.Dtos;

namespace Csmas.Api.Services;

/// <summary>
/// Thin HTTP wrapper around the AI service's existing /predict route (ai-service/app.py — a
/// pre-trained model, never retrained or modified by the backend). Returns null on any failure
/// (timeout, connection refused, non-2xx) instead of throwing, so RiskScoringService can degrade
/// gracefully — a slow/down AI service must never fail the request that triggered a recompute
/// (plan.md §11: "backend degrades gracefully ... if AI service is down").
/// </summary>
public class AiRiskClient
{
    private readonly HttpClient _http;
    private readonly ILogger<AiRiskClient> _logger;

    public AiRiskClient(HttpClient http, ILogger<AiRiskClient> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task<AiPredictResponse?> Predict(AiPredictRequest request)
    {
        try
        {
            using var response = await _http.PostAsJsonAsync("/predict", request);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("AI service returned {StatusCode} for student {StudentId}.", response.StatusCode, request.StudentId);
                return null;
            }

            return await response.Content.ReadFromJsonAsync<AiPredictResponse>();
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(ex, "AI service unreachable while scoring student {StudentId}.", request.StudentId);
            return null;
        }
    }
}
