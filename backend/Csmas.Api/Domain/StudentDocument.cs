namespace Csmas.Api.Domain;

public class StudentDocument
{
    public int Id { get; set; }
    public int InstituteId { get; set; }
    public int StudentId { get; set; }
    public Student? Student { get; set; }

    public DocumentType DocType { get; set; }
    public string FileUrl { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public int FileSizeKb { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
