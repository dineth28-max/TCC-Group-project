namespace Csmas.Api.Domain;

public class Branch
{
    public int Id { get; set; }
    public int InstituteId { get; set; }
    public Institute? Institute { get; set; }

    public string Name { get; set; } = string.Empty;
    public decimal GeoLat { get; set; }
    public decimal GeoLng { get; set; }
    public int GeoRadiusM { get; set; } = 100;
    public BranchStatus Status { get; set; } = BranchStatus.Active;
}
