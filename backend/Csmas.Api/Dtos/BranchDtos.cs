namespace Csmas.Api.Dtos;

public record CreateBranchRequest(string Name, decimal GeoLat, decimal GeoLng, int GeoRadiusM);

public record UpdateBranchRequest(string Name, decimal GeoLat, decimal GeoLng, int GeoRadiusM);

public record BranchResponse(int Id, int InstituteId, string Name, decimal GeoLat, decimal GeoLng, int GeoRadiusM, string Status);
