using Csmas.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Data;

/// <summary>
/// Seeds one demo institute, one branch, and one user per role, so the system has something
/// real to log in as the moment `docker compose up` finishes (see plan.md §4.4).
/// All demo accounts use the password "Passw0rd!".
/// </summary>
public static class DbSeeder
{
    public const string DemoPassword = "Passw0rd!";

    public static async Task SeedAsync(AppDbContext db, IPasswordHasher<User> passwordHasher)
    {
        if (await db.Institutes.IgnoreQueryFilters().AnyAsync())
        {
            return; // already seeded
        }

        var institute = new Institute
        {
            Name = "Colombo Tuition Institute",
            Address = "123 Galle Road, Colombo",
            ContactEmail = "admin@colombotuition.lk",
        };
        db.Institutes.Add(institute);
        await db.SaveChangesAsync();

        var branch = new Branch
        {
            InstituteId = institute.Id,
            Name = "Main Branch",
            GeoLat = 6.9271m,
            GeoLng = 79.8612m,
            GeoRadiusM = 100,
        };
        db.Branches.Add(branch);
        await db.SaveChangesAsync();

        var demoUsers = new[]
        {
            new User { Role = Role.SystemAdmin, FullName = "Asha Perera", Email = "admin@demo.csmas" },
            new User { Role = Role.BranchAdmin, FullName = "Nimal Silva", Email = "branchadmin@demo.csmas", BranchId = branch.Id },
            new User { Role = Role.Teacher, FullName = "Dilani Fernando", Email = "teacher@demo.csmas", BranchId = branch.Id },
            new User { Role = Role.Parent, FullName = "Kamal Jayasuriya", Email = "parent@demo.csmas" },
            new User { Role = Role.Student, FullName = "Saman Jayasuriya", Email = "student@demo.csmas", BranchId = branch.Id },
        };

        foreach (var user in demoUsers)
        {
            user.InstituteId = institute.Id;
            user.PasswordHash = passwordHasher.HashPassword(user, DemoPassword);
            db.Users.Add(user);
        }

        await db.SaveChangesAsync();

        var teacherUser = demoUsers.First(u => u.Role == Role.Teacher);
        var studentUser = demoUsers.First(u => u.Role == Role.Student);
        var parentUser = demoUsers.First(u => u.Role == Role.Parent);

        var demoClass = new Class
        {
            InstituteId = institute.Id,
            BranchId = branch.Id,
            Subject = "Mathematics",
            TeacherUserId = teacherUser.Id,
        };
        db.Classes.Add(demoClass);
        await db.SaveChangesAsync();

        var demoStudent = new Student
        {
            InstituteId = institute.Id,
            BranchId = branch.Id,
            StudentCode = $"STU-{institute.Id:D2}-00001",
            FullName = "Saman Jayasuriya",
            Dob = new DateOnly(2012, 4, 15),
            Gender = "Male",
            ParentName = parentUser.FullName,
            LinkedUserId = studentUser.Id,
        };
        db.Students.Add(demoStudent);
        await db.SaveChangesAsync();
        demoStudent.QrPayload = $"STUDENT:{institute.Id}:{demoStudent.Id}:seed";

        db.Enrollments.Add(new Enrollment { InstituteId = institute.Id, StudentId = demoStudent.Id, ClassId = demoClass.Id });
        db.ParentLinks.Add(new ParentLink { InstituteId = institute.Id, ParentUserId = parentUser.Id, StudentId = demoStudent.Id });
        await db.SaveChangesAsync();

        // A second, unrelated institute exists purely so Phase 1's isolation rule is actually
        // provable: admin@demo.csmas (institute 1) must never be able to see anything below.
        var otherInstitute = new Institute
        {
            Name = "Kandy Tuition Institute",
            Address = "45 Peradeniya Road, Kandy",
            ContactEmail = "admin@kandytuition.lk",
        };
        db.Institutes.Add(otherInstitute);
        await db.SaveChangesAsync();

        var otherBranch = new Branch
        {
            InstituteId = otherInstitute.Id,
            Name = "Kandy Main Branch",
            GeoLat = 7.2906m,
            GeoLng = 80.6337m,
            GeoRadiusM = 100,
        };
        db.Branches.Add(otherBranch);
        await db.SaveChangesAsync();

        var otherAdmin = new User
        {
            InstituteId = otherInstitute.Id,
            Role = Role.SystemAdmin,
            FullName = "Ruwan Bandara",
            Email = "admin2@demo.csmas",
        };
        otherAdmin.PasswordHash = passwordHasher.HashPassword(otherAdmin, DemoPassword);
        db.Users.Add(otherAdmin);
        await db.SaveChangesAsync();
    }
}
