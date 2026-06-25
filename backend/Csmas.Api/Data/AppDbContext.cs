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
    public DbSet<TimetableSlotRequest> TimetableSlotRequests => Set<TimetableSlotRequest>();
    public DbSet<PaymentAccountSettings> PaymentAccountSettings => Set<PaymentAccountSettings>();
    public DbSet<RevenueSplitSettings> RevenueSplitSettings => Set<RevenueSplitSettings>();
    public DbSet<PaymentTransaction> PaymentTransactions => Set<PaymentTransaction>();
    public DbSet<TeacherEarning> TeacherEarnings => Set<TeacherEarning>();
    public DbSet<TeacherBankDetail> TeacherBankDetails => Set<TeacherBankDetail>();
    public DbSet<InstituteBankDetail> InstituteBankDetails => Set<InstituteBankDetail>();
    public DbSet<AuditLogEntry> AuditLogEntries => Set<AuditLogEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Institute>(e =>
        {
            e.Property(i => i.AttendanceThresholdPercent).HasPrecision(5, 2);
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
            e.Property(b => b.GeoLat).HasPrecision(9, 6);
            e.Property(b => b.GeoLng).HasPrecision(9, 6);
            e.HasIndex(b => b.InstituteId);
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
            e.Property(s => s.AttendanceRate).HasPrecision(5, 2);
            e.HasIndex(s => s.InstituteId);
            // A branch should never be hard-deleted out from under its students — financial and
            // attendance history would be unrecoverable. The app only ever soft-deletes (Status),
            // but the schema shouldn't rely on that being the only way in.
            e.HasOne(s => s.Branch).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(s => _tenantProvider.BypassTenantFilter || s.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<StudentDocument>(e =>
        {
            e.Property(d => d.DocType).HasConversion<string>().HasMaxLength(20);
            e.HasQueryFilter(d => _tenantProvider.BypassTenantFilter || d.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<Class>(e =>
        {
            e.HasIndex(c => c.InstituteId);
            e.HasQueryFilter(c => _tenantProvider.BypassTenantFilter || c.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<Enrollment>(e =>
        {
            e.HasIndex(en => new { en.StudentId, en.ClassId }).IsUnique();
            e.HasIndex(en => en.InstituteId);
            // Billing (BillingService) and attendance-rate history join through Enrollments — a
            // hard-deleted Student/Class must never silently cascade-wipe that history, same
            // Restrict invariant already applied to Invoice/PaymentTransaction/TeacherEarning.
            e.HasOne(en => en.Student).WithMany(s => s.Enrollments).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(en => en.Class).WithMany(c => c.Enrollments).OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(en => _tenantProvider.BypassTenantFilter || en.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<Session>(e =>
        {
            e.Property(s => s.Status).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(s => s.InstituteId);
            e.HasQueryFilter(s => _tenantProvider.BypassTenantFilter || s.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<Attendance>(e =>
        {
            e.Property(a => a.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(a => a.Method).HasConversion<string>().HasMaxLength(20);
            e.Property(a => a.GeoLat).HasPrecision(9, 6);
            e.Property(a => a.GeoLng).HasPrecision(9, 6);
            e.HasIndex(a => new { a.SessionId, a.StudentId }).IsUnique();
            e.HasIndex(a => a.InstituteId);
            // A student's attendance history is exactly the kind of record the codebase's existing
            // invariant protects elsewhere (Invoice/PaymentTransaction/TeacherEarning) — a
            // hard-deleted Student must never silently cascade-wipe it.
            e.HasOne(a => a.Student).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(a => _tenantProvider.BypassTenantFilter || a.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<ParentLink>(e =>
        {
            e.HasIndex(p => new { p.ParentUserId, p.StudentId }).IsUnique();
            e.HasIndex(p => p.InstituteId);
            e.HasQueryFilter(p => _tenantProvider.BypassTenantFilter || p.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<NotificationQueueItem>(e =>
        {
            e.Property(n => n.EventType).HasConversion<string>().HasMaxLength(30);
            e.Property(n => n.Channel).HasConversion<string>().HasMaxLength(20);
            e.Property(n => n.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(n => n.RecipientEmail).HasMaxLength(255);
            e.HasIndex(n => n.InstituteId);
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
            e.HasIndex(a => a.InstituteId);
            e.HasQueryFilter(a => _tenantProvider.BypassTenantFilter || a.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<TimetableSlot>(e =>
        {
            e.Property(t => t.DayOfWeek).HasConversion<string>().HasMaxLength(10);
            e.HasIndex(t => t.InstituteId);
            e.HasQueryFilter(t => _tenantProvider.BypassTenantFilter || t.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<TimetableSlotRequest>(e =>
        {
            e.Property(t => t.DayOfWeek).HasConversion<string>().HasMaxLength(10);
            e.Property(t => t.Status).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(t => t.InstituteId);
            e.HasOne(t => t.RequestedByUser).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(t => _tenantProvider.BypassTenantFilter || t.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<FeeStructure>(e =>
        {
            e.Property(f => f.Amount).HasPrecision(18, 2);
            e.HasIndex(f => f.InstituteId);
            e.HasQueryFilter(f => _tenantProvider.BypassTenantFilter || f.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<DiscountRule>(e =>
        {
            e.Property(d => d.Type).HasConversion<string>().HasMaxLength(20);
            e.Property(d => d.PercentOff).HasPrecision(5, 2);
            e.HasIndex(d => d.InstituteId);
            // Same Restrict invariant as Invoice/Attendance/Enrollment — a discount's billing
            // history must outlive a hard-deleted Student, not silently vanish with it.
            e.HasOne(d => d.Student).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(d => _tenantProvider.BypassTenantFilter || d.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<Invoice>(e =>
        {
            e.Property(i => i.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(i => i.Amount).HasPrecision(18, 2);
            e.Property(i => i.DiscountAmount).HasPrecision(18, 2);
            e.Property(i => i.TotalDue).HasPrecision(18, 2);
            e.Property(i => i.AmountPaid).HasPrecision(18, 2);
            e.HasIndex(i => new { i.StudentId, i.ClassId, i.BillingPeriod }).IsUnique();
            e.HasIndex(i => i.InstituteId);
            // Invoices/Payments are financial records — a student must never be hard-deletable out
            // from under them. The app only ever soft-deletes (Status), this just makes the schema
            // agree with that invariant instead of silently destroying billing history.
            e.HasOne(i => i.Student).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(i => _tenantProvider.BypassTenantFilter || i.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<Payment>(e =>
        {
            e.Property(p => p.Amount).HasPrecision(18, 2);
            e.Property(p => p.Method).HasMaxLength(20);
            e.HasIndex(p => p.InstituteId);
            e.HasQueryFilter(p => _tenantProvider.BypassTenantFilter || p.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<PaymentAccountSettings>(e =>
        {
            e.HasIndex(p => p.InstituteId).IsUnique();
            e.HasQueryFilter(p => _tenantProvider.BypassTenantFilter || p.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<RevenueSplitSettings>(e =>
        {
            e.Property(r => r.CommissionPercent).HasPrecision(5, 2);
            e.HasIndex(r => r.InstituteId).IsUnique();
            e.HasQueryFilter(r => _tenantProvider.BypassTenantFilter || r.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<PaymentTransaction>(e =>
        {
            e.Property(t => t.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(t => t.Amount).HasPrecision(18, 2);
            e.HasIndex(t => t.InstituteId);
            e.HasIndex(t => t.StudentId);
            e.HasIndex(t => t.InvoiceId);
            // Financial records — none of these must ever be hard-deletable out from under a transaction.
            e.HasOne(t => t.Invoice).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.Student).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.InitiatedByUser).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.Payment).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(t => _tenantProvider.BypassTenantFilter || t.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<TeacherEarning>(e =>
        {
            e.Property(t => t.GrossAmount).HasPrecision(18, 2);
            e.Property(t => t.CommissionPercent).HasPrecision(5, 2);
            e.Property(t => t.CommissionAmount).HasPrecision(18, 2);
            e.Property(t => t.NetAmount).HasPrecision(18, 2);
            e.Property(t => t.PayoutStatus).HasMaxLength(20);
            e.HasIndex(t => t.PaymentTransactionId).IsUnique();
            e.HasIndex(t => t.InstituteId);
            e.HasIndex(t => t.TeacherUserId);
            e.HasOne(t => t.PaymentTransaction).WithMany().OnDelete(DeleteBehavior.Restrict);
            // Financial ledger — a teacher account must never cascade-delete their earnings history.
            e.HasOne(t => t.TeacherUser).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(t => _tenantProvider.BypassTenantFilter || t.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<TeacherBankDetail>(e =>
        {
            e.HasIndex(t => t.TeacherUserId).IsUnique();
            e.HasIndex(t => t.InstituteId);
            // Same Restrict invariant as TeacherEarning — payout details must outlive a teacher
            // account being removed, not silently vanish with it.
            e.HasOne(t => t.TeacherUser).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(t => _tenantProvider.BypassTenantFilter || t.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<InstituteBankDetail>(e =>
        {
            e.HasIndex(i => i.InstituteId).IsUnique();
            e.HasQueryFilter(i => _tenantProvider.BypassTenantFilter || i.InstituteId == _tenantProvider.InstituteId);
        });

        modelBuilder.Entity<AuditLogEntry>(e =>
        {
            e.HasIndex(a => new { a.InstituteId, a.CreatedAt });
            e.HasOne(a => a.ActorUser).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(a => _tenantProvider.BypassTenantFilter || a.InstituteId == _tenantProvider.InstituteId);
        });

        base.OnModelCreating(modelBuilder);
    }
}
