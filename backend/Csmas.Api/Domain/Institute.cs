namespace Csmas.Api.Domain;

public class Institute
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? ContactEmail { get; set; }
    public string? LogoUrl { get; set; }
    public string? ThemeColor { get; set; }
    public decimal AttendanceThresholdPercent { get; set; } = 75;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Branch> Branches { get; set; } = new List<Branch>();
    public ICollection<User> Users { get; set; } = new List<User>();
}
