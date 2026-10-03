using System.Text.Json.Serialization;
using Csmas.Api.Dtos;

namespace Csmas.Api.Services;

/// <summary>
/// Thin HTTP wrapper around the AI service (ai-service/app.py): /predict, /predict/batch, /train
/// and /model-info. Returns null on any failure (timeout, connection refused, non-2xx) instead of
/// throwing, so callers can degrade gracefully — a slow/down AI service must never fail the
/// request that triggered a recompute (plan.md §11: "backend degrades gracefully ... if AI
/// service is down").
/// </summary>
public class AiRiskClient
{
    // Single predictions run inline with attendance/payment actions, so they keep a short budget;
    // the HttpClient's own timeout is longer to allow training and large batches.
    private static readonly TimeSpan PredictTimeout = TimeSpan.FromSeconds(5);

    private readonly HttpClient _http;
    private readonly ILogger<AiRiskClient> _logger;

    public AiRiskClient(HttpClient http, ILogger<AiRiskClient> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task<AiPredictResponse?> Predict(AiPredictRequest request)
    {
        using var cts = new CancellationTokenSource(PredictTimeout);
        return await PostAsync<AiPredictResponse>("/predict", request, $"student {request.StudentId}", cts.Token);
    }

    public async Task<List<AiPredictResponse>?> PredictBatch(IReadOnlyCollection<AiPredictRequest> requests)
    {
        var response = await PostAsync<AiBatchResponse>("/predict/batch", new { students = requests }, $"batch of {requests.Count}");
        return response?.Results;
    }

    public Task<AiModelInfo?> Train(IReadOnlyCollection<AiTrainingRow> rows) =>
        PostAsync<AiModelInfo>("/train", new { rows }, $"training on {rows.Count} rows");

    public async Task<AiModelInfo?> GetModelInfo()
    {
        try
        {
            using var response = await _http.GetAsync("/model-info");
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadFromJsonAsync<AiModelInfo>();
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(ex, "AI service unreachable while reading model info.");
            return null;
        }
    }

    private async Task<T?> PostAsync<T>(string path, object body, string what, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _http.PostAsJsonAsync(path, body, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var detail = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("AI service returned {StatusCode} for {What}: {Detail}", response.StatusCode, what, detail);
                return default;
            }

            return await response.Content.ReadFromJsonAsync<T>(cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(ex, "AI service unreachable for {What}.", what);
            return default;
        }
    }

    private sealed class AiBatchResponse
    {
        [JsonPropertyName("results")]
        public List<AiPredictResponse> Results { get; set; } = new();
    }
}
