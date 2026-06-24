using Csmas.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Data;

public class AppDbContext : DbContext
{
    private readonly ITenantProvider _tenantProvider;

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantProvider tenantProvider)
        : base(options)
    {
        _tenantProvider = tenantProvider;
    }

    public DbSet<Institute> Institutes => Set<Institute>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Student> Students => Set<Student>();
    public DbSet<StudentDocument> StudentDocuments => Set<StudentDocument>();
    public DbSet<Class> Classes => Set<Class>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<Attendance> Attendances => Set<Attendance>();
    public DbSet<ParentLink> ParentLinks => Set<ParentLink>();
    public DbSet<NotificationQueueItem> NotificationQueueItems => Set<NotificationQueueItem>();
    public DbSet<FeeStructure> FeeStructures => Set<FeeStructure>();
    public DbSet<DiscountRule> DiscountRules => Set<DiscountRule>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<NotificationTemplate> NotificationTemplates => Set<NotificationTemplate>();
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<TimetableSlot> TimetableSlots => Set<TimetableSlot>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Institute>(e =>
        {
            e.HasQueryFilter(i => _tenantProvider.BypassTenantFilter || i.Id == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Role).HasConversion<string>().HasMaxLength(20);
            e.Property(u => u.Status).HasConversion<string>().HasMaxLength(20);
            e.HasQueryFilter(u => _tenantProvider.BypassTenantFilter || u.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<Branch>(e =>
        {
            e.Property(b => b.Status).HasConversion<string>().HasMaxLength(20);
            e.HasQueryFilter(b => _tenantProvider.BypassTenantFilter || b.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.HasIndex(r => r.TokenHash).IsUnique();
        });

        modelBuilder.Entity<Student>(e =>
        {
            e.HasIndex(s => s.StudentCode).IsUnique();
            e.Property(s => s.Status).HasConversion<string>().HasMaxLength(20);
            e.HasQueryFilter(s => _tenantProvider.BypassTenantFilter || s.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<StudentDocument>(e =>
        {
            e.Property(d => d.DocType).HasConversion<string>().HasMaxLength(20);
            e.HasQueryFilter(d => _tenantProvider.BypassTenantFilter || d.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<Class>(e =>
        {
            e.HasQueryFilter(c => _tenantProvider.BypassTenantFilter || c.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<Enrollment>(e =>
        {
            e.HasIndex(en => new { en.StudentId, en.ClassId }).IsUnique();
            e.HasQueryFilter(en => _tenantProvider.BypassTenantFilter || en.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<Session>(e =>
        {
            e.Property(s => s.Status).HasConversion<string>().HasMaxLength(20);
            e.HasQueryFilter(s => _tenantProvider.BypassTenantFilter || s.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<Attendance>(e =>
        {
            e.Property(a => a.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(a => a.Method).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(a => new { a.SessionId, a.StudentId }).IsUnique();
            e.HasQueryFilter(a => _tenantProvider.BypassTenantFilter || a.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<ParentLink>(e =>
        {
            e.HasIndex(p => new { p.ParentUserId, p.StudentId }).IsUnique();
            e.HasQueryFilter(p => _tenantProvider.BypassTenantFilter || p.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<NotificationQueueItem>(e =>
        {
            e.Property(n => n.EventType).HasConversion<string>().HasMaxLength(30);
            e.Property(n => n.Channel).HasConversion<string>().HasMaxLength(20);
            e.Property(n => n.Status).HasConversion<string>().HasMaxLength(20);
            e.HasQueryFilter(n => _tenantProvider.BypassTenantFilter || n.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<NotificationTemplate>(e =>
        {
            e.Property(n => n.EventType).HasConversion<string>().HasMaxLength(30);
            e.HasIndex(n => new { n.InstituteId, n.EventType }).IsUnique();
            e.HasQueryFilter(n => _tenantProvider.BypassTenantFilter || n.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<Announcement>(e =>
        {
            e.HasQueryFilter(a => _tenantProvider.BypassTenantFilter || a.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<TimetableSlot>(e =>
        {
            e.Property(t => t.DayOfWeek).HasConversion<string>().HasMaxLength(10);
            e.HasQueryFilter(t => _tenantProvider.BypassTenantFilter || t.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<FeeStructure>(e =>
        {
            e.HasQueryFilter(f => _tenantProvider.BypassTenantFilter || f.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<DiscountRule>(e =>
        {
            e.Property(d => d.Type).HasConversion<string>().HasMaxLength(20);
            e.HasQueryFilter(d => _tenantProvider.BypassTenantFilter || d.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<Invoice>(e =>
        {
            e.Property(i => i.Status).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(i => new { i.StudentId, i.ClassId, i.BillingPeriod }).IsUnique();
            e.HasQueryFilter(i => _tenantProvider.BypassTenantFilter || i.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<Payment>(e =>
        {
            e.HasQueryFilter(p => _tenantProvider.BypassTenantFilter || p.InstituteId == _tenantProvider.InstituteId);
        });

        base.OnModelCreating(modelBuilder);
    }
}
