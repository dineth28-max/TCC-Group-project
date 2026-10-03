using System.Diagnostics;
using System.Globalization;
using System.Text;
using Csmas.Api.Domain;
using Csmas.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Data;

/// <summary>
/// Seeds a production-scale demo dataset the first time `docker compose up` runs against an empty
/// database (see plan.md §4.4): 3 branches, 45 teachers, 70 parents and 2,000 students, with ~6
/// weeks of attendance history, 3 billing periods of invoices in every payment state, online
/// transactions with teacher earnings, timetables, announcements and notifications — so every
/// dashboard shows real numbers from the moment the stack is up.
/// All demo accounts use the password "Passw0rd!". Re-seeding is skipped if any institute already
/// exists; `docker compose down -v` wipes the volume and re-seeds on the next start.
/// AI risk scores are deliberately NOT seeded here — RiskBackfillBackgroundService computes them
/// through the real AI model once the ai-service container is reachable.
/// </summary>
public static class DbSeeder
{
    public const string DemoPassword = "Passw0rd!";

    public static async Task SeedAsync(
        AppDbContext db,
        IPasswordHasher<User> passwordHasher,
        SecretEncryptionService encryption,
        QrCodeService qrCodes,
        ILogger logger)
    {
        if (await db.Institutes.IgnoreQueryFilters().AnyAsync())
        {
            return; // already seeded
        }

        var stopwatch = Stopwatch.StartNew();
        logger.LogInformation("Empty database detected — seeding demo dataset (3 branches, 45 teachers, 70 parents, 2000 students)...");

        db.ChangeTracker.AutoDetectChangesEnabled = false;
        try
        {
            await new DemoDataBuilder(db, passwordHasher, encryption, qrCodes, logger).BuildAsync();
        }
        finally
        {
            db.ChangeTracker.Clear();
            db.ChangeTracker.AutoDetectChangesEnabled = true;
        }

        logger.LogInformation("Demo dataset seeded in {Seconds:0.0}s.", stopwatch.Elapsed.TotalSeconds);
    }
}

internal sealed class DemoDataBuilder
{
    private const int TotalParents = 70;
    private const int HistoryDays = 42;
    private const decimal CommissionPercent = 10m;
    private static readonly TimeSpan SriLankaOffset = TimeSpan.FromHours(5.5);

    private static readonly string[] MaleNames =
    {
        "Saman", "Kasun", "Nuwan", "Chamara", "Dinesh", "Tharindu", "Ravindu", "Isuru", "Pasindu", "Sahan",
        "Lahiru", "Dulaj", "Hasitha", "Kavindu", "Yasiru", "Sandun", "Chathura", "Malith", "Supun", "Thisara",
        "Janith", "Akila", "Dimuth", "Vihanga", "Ashen", "Sachith", "Nipun", "Oshada", "Pathum", "Kusal",
        "Avishka", "Dhananjaya", "Tharaka", "Ramesh", "Kavishka", "Hiruna", "Senal", "Minuka", "Thevindu", "Dulith",
    };

    private static readonly string[] FemaleNames =
    {
        "Nadeesha", "Dilani", "Sachini", "Kavindi", "Tharushi", "Nethmi", "Hiruni", "Imesha", "Sanduni", "Dinithi",
        "Pabasara", "Chamodi", "Ishara", "Malsha", "Hansika", "Piumi", "Senuri", "Yashodha", "Ruwini", "Anjali",
        "Thilini", "Sewwandi", "Nimesha", "Kaveesha", "Methmi", "Sithumini", "Dulmini", "Amaya", "Hasini", "Gayani",
        "Shehani", "Oshadi", "Vinuri", "Rashmi", "Nipuni",
    };

    private static readonly string[] ParentMaleNames =
    {
        "Kamal", "Sunil", "Ajith", "Mahinda", "Priyantha", "Chandana", "Rohan", "Lalith", "Upul", "Nalin",
        "Sarath", "Ranjith", "Asanka", "Prasad", "Ruwan", "Saman", "Gamini", "Jagath", "Nishantha", "Roshan",
    };

    private static readonly string[] ParentFemaleNames =
    {
        "Kumari", "Chandrika", "Dilrukshi", "Nirmala", "Shirani", "Anoma", "Damayanthi", "Sriyani", "Inoka", "Champika",
        "Sandya", "Nadeeka", "Malkanthi", "Ramani", "Thushari", "Lakmini", "Deepika", "Renuka", "Swarna", "Manel",
    };

    private static readonly string[] Surnames =
    {
        "Perera", "Fernando", "Silva", "Jayasuriya", "Bandara", "Wickramasinghe", "Gunawardena", "Dissanayake",
        "Herath", "Senanayake", "Jayawardena", "Ranasinghe", "Karunaratne", "Wijesinghe", "Abeysekera", "Gamage",
        "Kumara", "Liyanage", "Rathnayake", "Weerasinghe", "Samarawickrama", "Amarasinghe", "Ekanayake",
        "Hettiarachchi", "Kodikara", "Munasinghe", "Pathirana", "Siriwardena", "Weerakoon", "Mendis", "De Silva",
        "Peiris", "Kulatunga", "Nanayakkara", "Ratnayake", "Vithanage", "Jayaratne", "Edirisinghe",
    };

    private static readonly string[] Banks =
    {
        "Bank of Ceylon", "People's Bank", "Commercial Bank", "Hatton National Bank", "Sampath Bank", "Seylan Bank", "NDB Bank",
    };

    /// <summary>O/L subjects run as Grade 10 + Grade 11 classes; A/L subjects as two exam batches.</summary>
    private static readonly string[] OlSubjects =
    {
        "Mathematics", "Science", "English Language", "Sinhala", "History", "ICT", "Business & Accounting Studies", "Buddhism",
    };

    private static readonly string[] AlSubjects =
    {
        "Combined Mathematics", "Physics", "Chemistry", "Biology", "Accounting", "Economics", "Business Studies",
    };

    private static readonly string[][] AlStreams =
    {
        new[] { "Combined Mathematics", "Physics", "Chemistry" },
        new[] { "Biology", "Physics", "Chemistry" },
        new[] { "Accounting", "Economics", "Business Studies" },
    };

    private static readonly string[] Tracks = { "G10", "G11", "AL2027", "AL2028" };

    private static readonly DayOfWeek[] Days =
    {
        DayOfWeek.Saturday, DayOfWeek.Sunday, DayOfWeek.Monday, DayOfWeek.Tuesday,
        DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday,
    };

    private static readonly (TimeOnly Start, TimeOnly End)[] WeekendBlocks =
    {
        (new TimeOnly(8, 0), new TimeOnly(10, 0)),
        (new TimeOnly(10, 30), new TimeOnly(12, 30)),
        (new TimeOnly(13, 30), new TimeOnly(15, 30)),
        (new TimeOnly(16, 0), new TimeOnly(18, 0)),
    };

    private static readonly (TimeOnly Start, TimeOnly End)[] WeekdayBlocks =
    {
        (new TimeOnly(15, 0), new TimeOnly(17, 0)),
        (new TimeOnly(17, 30), new TimeOnly(19, 30)),
    };

    private static readonly string[] Rooms = { "Hall A", "Hall B", "Room 101", "Room 102", "Room 201", "Room 202", "Smart Lab" };

    private readonly AppDbContext _db;
    private readonly SecretEncryptionService _encryption;
    private readonly QrCodeService _qrCodes;
    private readonly ILogger _logger;
    private readonly string _passwordHash;
    private readonly Random _rng = new(20261003);
    private readonly DateTime _now = DateTime.UtcNow;
    private readonly DateOnly _today = DateOnly.FromDateTime(DateTime.UtcNow);
    private readonly HashSet<string> _usedEmails = new(StringComparer.OrdinalIgnoreCase);

    private Institute _institute = null!;
    private User _systemAdmin = null!;
    private readonly List<BranchInfo> _branches = new();
    private readonly List<ClassInfo> _classes = new();
    private readonly List<StudentInfo> _students = new();
    private readonly List<ParentInfo> _parents = new();

    public DemoDataBuilder(
        AppDbContext db,
        IPasswordHasher<User> passwordHasher,
        SecretEncryptionService encryption,
        QrCodeService qrCodes,
        ILogger logger)
    {
        _db = db;
        _encryption = encryption;
        _qrCodes = qrCodes;
        _logger = logger;
        // PBKDF2 hashing 2,000+ accounts one by one would add minutes to first boot; the default
        // PasswordHasher's verify step never reads the user object, so one salted hash of the
        // shared demo password is valid for every seeded account.
        _passwordHash = passwordHasher.HashPassword(new User(), DbSeeder.DemoPassword);
    }

    public async Task BuildAsync()
    {
        await CreateInstituteAndStaff();
        await CreateClassesAndTimetable();
        BuildStudentRoster();
        AssignParents();
        await PersistStudentsAndParents();
        await CreateDiscounts();
        _logger.LogInformation("Seed: {Students} students, {Classes} classes, {Parents} parents created.", _students.Count, _classes.Count, _parents.Count);

        await CreateSessionsAndAttendance();
        _logger.LogInformation("Seed: attendance history created.");

        await CreateInvoicesAndPayments();
        _logger.LogInformation("Seed: invoices, payments and online transactions created.");

        await CreateTimetableRequests();
        await CreateAnnouncements();
        await CreateNotifications();
        await CreateLoginEvents();
        await CreateSettingsAndBankDetails();
        await CreateSecondInstitute();
    }

    // ------------------------------------------------------------------ institute & staff

    private async Task CreateInstituteAndStaff()
    {
        _institute = new Institute
        {
            Name = "Colombo Tuition Institute",
            Address = "123 Galle Road, Colombo 03",
            ContactEmail = "admin@colombotuition.lk",
            ThemeColor = "#0F766E",
            AttendanceThresholdPercent = 75,
            CreatedAt = _now.AddDays(-540),
        };
        _db.Institutes.Add(_institute);
        await _db.SaveChangesAsync();

        var branchSpecs = new[]
        {
            (Name: "Colombo Main Branch", Lat: 6.9271m, Lng: 79.8612m, Students: 800, Admin: "Nimal Silva", Email: "branchadmin@demo.csmas", Address: "123 Galle Road, Colombo 03"),
            (Name: "Nugegoda Branch", Lat: 6.8649m, Lng: 79.8997m, Students: 650, Admin: "Chandima Rathnayake", Email: "branchadmin2@demo.csmas", Address: "45 High Level Road, Nugegoda"),
            (Name: "Gampaha Branch", Lat: 7.0873m, Lng: 80.0144m, Students: 550, Admin: "Sunil Weerakoon", Email: "branchadmin3@demo.csmas", Address: "18 Colombo Road, Gampaha"),
        };

        foreach (var spec in branchSpecs)
        {
            var branch = new Branch
            {
                InstituteId = _institute.Id,
                Name = spec.Name,
                GeoLat = spec.Lat,
                GeoLng = spec.Lng,
                GeoRadiusM = 150,
            };
            _db.Branches.Add(branch);
            _branches.Add(new BranchInfo(branch, spec.Students));
        }
        await _db.SaveChangesAsync();

        _systemAdmin = NewUser(Role.SystemAdmin, "Asha Perera", "admin@demo.csmas", null, _now.AddDays(-540));
        _systemAdmin.PhoneNumber = "0771234567";

        for (var b = 0; b < _branches.Count; b++)
        {
            var spec = branchSpecs[b];
            var admin = NewUser(Role.BranchAdmin, spec.Admin, spec.Email, _branches[b].Branch.Id, _now.AddDays(-500 + b * 60));
            admin.PhoneNumber = Phone();
            admin.Address = spec.Address;
            _branches[b].Admin = admin;
        }

        // 45 teachers: 15 per branch, one per subject (8 O/L + 7 A/L).
        var teacherNumber = 0;
        foreach (var branchInfo in _branches)
        {
            var subjects = OlSubjects.Concat(AlSubjects).ToArray();
            foreach (var subject in subjects)
            {
                teacherNumber++;
                var isFemale = _rng.NextDouble() < 0.55;
                var fullName = teacherNumber == 1
                    ? "Dilani Fernando"
                    : $"{Pick(isFemale ? FemaleNames : MaleNames)} {Pick(Surnames)}";
                var email = teacherNumber == 1 ? "teacher@demo.csmas" : $"teacher{teacherNumber:D2}@demo.csmas";
                var joined = _today.AddDays(-_rng.Next(120, 2200));

                var teacher = NewUser(Role.Teacher, fullName, email, branchInfo.Branch.Id, joined.ToDateTime(new TimeOnly(9, 0)));
                teacher.PhoneNumber = Phone();
                teacher.NationalId = $"{_rng.Next(1970, 1998)}{_rng.Next(10000000, 99999999)}";
                teacher.Address = $"{_rng.Next(1, 250)}, {Pick(new[] { "Temple Road", "Station Road", "Lake Drive", "Flower Avenue", "Park Lane", "Kandy Road" })}, {branchInfo.Branch.Name.Replace(" Branch", "").Replace(" Main", "")}";
                teacher.DateOfJoining = joined;
                teacher.Subjects = subject;
                branchInfo.Teachers.Add((teacher, subject));
            }
        }

        await _db.SaveChangesAsync();
    }

    // ------------------------------------------------------------------ classes, fees, timetable

    private async Task CreateClassesAndTimetable()
    {
        foreach (var branchInfo in _branches)
        {
            foreach (var (teacher, subject) in branchInfo.Teachers)
            {
                var isAl = AlSubjects.Contains(subject);
                var tracks = isAl ? new[] { "AL2027", "AL2028" } : new[] { "G10", "G11" };
                foreach (var track in tracks)
                {
                    var name = isAl ? $"{subject} - A/L {track[2..]}" : $"Grade {track[1..]} {subject}";
                    var klass = new Class
                    {
                        InstituteId = _institute.Id,
                        BranchId = branchInfo.Branch.Id,
                        Subject = name,
                        TeacherUserId = teacher.Id,
                    };
                    _db.Classes.Add(klass);

                    var fee = isAl ? 4000m + 500m * _rng.Next(0, 5) : 2500m + 250m * _rng.Next(0, 5);
                    _classes.Add(new ClassInfo(klass, branchInfo, teacher, subject, track, fee));
                }
            }
        }
        await _db.SaveChangesAsync();

        foreach (var info in _classes)
        {
            _db.FeeStructures.Add(new FeeStructure
            {
                InstituteId = _institute.Id,
                ClassId = info.Class.Id,
                Amount = info.Fee,
                EffectiveFrom = _today.AddDays(-300),
                IsActive = true,
            });
        }

        // Conflict-free weekly grid: one room/teacher per (day, block). A/L classes meet twice a week.
        foreach (var branchInfo in _branches)
        {
            foreach (var info in _classes.Where(c => c.Branch == branchInfo).OrderBy(_ => _rng.Next()))
            {
                var slotsNeeded = info.Track.StartsWith("AL") ? 2 : 1;
                var usedDays = new HashSet<DayOfWeek>();
                for (var i = 0; i < slotsNeeded; i++)
                {
                    var cell = branchInfo.AllocateCell(info.Teacher.Id, usedDays, _rng);
                    if (cell is null) continue;
                    usedDays.Add(cell.Value.Day);
                    var slot = new TimetableSlot
                    {
                        InstituteId = _institute.Id,
                        BranchId = branchInfo.Branch.Id,
                        ClassId = info.Class.Id,
                        DayOfWeek = cell.Value.Day,
                        StartTime = cell.Value.Start,
                        EndTime = cell.Value.End,
                        Room = cell.Value.Room,
                    };
                    _db.TimetableSlots.Add(slot);
                    info.Slots.Add(slot);
                }
            }
        }

        await _db.SaveChangesAsync();
    }

    // ------------------------------------------------------------------ students & parents (in memory first)

    private void BuildStudentRoster()
    {
        var sequence = 0;
        foreach (var branchInfo in _branches)
        {
            for (var i = 0; i < branchInfo.StudentCount; i++)
            {
                sequence++;
                var track = Tracks[_rng.Next(Tracks.Length)];
                var isFemale = _rng.NextDouble() < 0.5;
                var info = new StudentInfo
                {
                    Sequence = sequence,
                    Branch = branchInfo,
                    Track = track,
                    Gender = isFemale ? "Female" : "Male",
                    FirstName = Pick(isFemale ? FemaleNames : MaleNames),
                    Surname = Pick(Surnames),
                    Profile = RollProfile(),
                };

                // ~5% of active students joined in the last three weeks — they have little history yet.
                var isNew = info.Profile != StudentProfile.Inactive && _rng.NextDouble() < 0.05;
                info.EnrolledAt = isNew
                    ? _now.AddDays(-_rng.Next(3, 21)).Date.AddHours(4)
                    : _now.AddDays(-_rng.Next(75, 320)).Date.AddHours(4);
                if (info.Profile == StudentProfile.Inactive)
                {
                    info.LeftAt = _now.AddDays(-_rng.Next(8, 35)).Date;
                }

                info.Classes = PickClasses(branchInfo, track);
                _students.Add(info);
            }
        }

        // Primary demo student: Saman Jayasuriya, Colombo, Grade 11, taking teacher@demo's Mathematics.
        var saman = _students[0];
        saman.FirstName = "Saman";
        saman.Surname = "Jayasuriya";
        saman.Gender = "Male";
        saman.Track = "G11";
        saman.Profile = StudentProfile.Average;
        saman.LeftAt = null;
        saman.EnrolledAt = _now.AddDays(-240).Date.AddHours(4);
        saman.Classes = PickClasses(saman.Branch, "G11");
        var samanMaths = _classes.First(c => c.Branch == saman.Branch && c.Track == "G11" && c.SubjectKey == "Mathematics");
        if (!saman.Classes.Contains(samanMaths)) saman.Classes[0] = samanMaths;

        // Saman's younger sister, so the demo parent sees two children with different stories.
        var sister = _students[1];
        sister.FirstName = "Nadeesha";
        sister.Surname = "Jayasuriya";
        sister.Gender = "Female";
        sister.Track = "G10";
        sister.Profile = StudentProfile.Good;
        sister.LeftAt = null;
        sister.EnrolledAt = _now.AddDays(-200).Date.AddHours(4);
        sister.Classes = PickClasses(sister.Branch, "G10");

        foreach (var student in _students)
        {
            var age = student.Track switch { "G10" => 15, "G11" => 16, "AL2028" => 17, _ => 18 };
            student.Dob = new DateOnly(_today.Year - age, 1, 1).AddDays(_rng.Next(0, 365));
            (student.AbsentRate, student.LateRate) = student.Profile switch
            {
                StudentProfile.Good => (Between(0.0, 0.08), Between(0.02, 0.08)),
                StudentProfile.Average => (Between(0.12, 0.24), Between(0.08, 0.18)),
                StudentProfile.AtRisk => (Between(0.32, 0.55), Between(0.18, 0.32)),
                _ => (Between(0.30, 0.50), Between(0.10, 0.25)),
            };
        }
    }

    private List<ClassInfo> PickClasses(BranchInfo branch, string track)
    {
        var options = _classes.Where(c => c.Branch == branch && c.Track == track).ToList();
        if (track.StartsWith("AL"))
        {
            var stream = AlStreams[_rng.Next(AlStreams.Length)];
            var streamClasses = options.Where(c => stream.Contains(c.SubjectKey)).ToList();
            // Most A/L students take all three stream subjects; some only two.
            return _rng.NextDouble() < 0.8 ? streamClasses : streamClasses.OrderBy(_ => _rng.Next()).Take(2).ToList();
        }

        var count = _rng.Next(2, 5); // 2–4 O/L subjects
        // Mathematics and Science are the most popular tuition subjects.
        return options
            .OrderByDescending(c => (c.SubjectKey is "Mathematics" or "Science" ? 1.6 : 1.0) * _rng.NextDouble())
            .Take(count)
            .ToList();
    }

    private void AssignParents()
    {
        // Demo parent: Kamal Jayasuriya, linked to Saman and Nadeesha.
        _parents.Add(new ParentInfo
        {
            FullName = "Kamal Jayasuriya",
            Email = "parent@demo.csmas",
            Children = { _students[0], _students[1] },
        });

        var candidates = _students.Skip(2)
            .Where(s => s.Profile != StudentProfile.Inactive)
            .OrderBy(_ => _rng.Next())
            .ToList();
        var cursor = 0;

        for (var p = 2; p <= TotalParents; p++)
        {
            var child = candidates[cursor++];
            var isMother = _rng.NextDouble() < 0.5;
            var parent = new ParentInfo
            {
                FullName = $"{Pick(isMother ? ParentFemaleNames : ParentMaleNames)} {child.Surname}",
                Email = $"parent{p:D2}@demo.csmas",
                Children = { child },
            };

            // ~30% of parents have two children at the institute (same branch, sibling discount).
            if (_rng.NextDouble() < 0.3)
            {
                var sibling = candidates.Skip(cursor).FirstOrDefault(s => s.Branch == child.Branch && s.Track != child.Track);
                if (sibling is not null)
                {
                    candidates.Remove(sibling);
                    sibling.Surname = child.Surname;
                    parent.Children.Add(sibling);
                }
            }

            _parents.Add(parent);
        }

        // Every student row carries a parent name/contact, even if that parent has no login.
        foreach (var parent in _parents)
        {
            parent.Phone = Phone();
            foreach (var child in parent.Children)
            {
                child.ParentName = parent.FullName;
                child.ParentContact = parent.Phone;
            }
        }
        foreach (var student in _students.Where(s => s.ParentName is null))
        {
            student.ParentName = $"{Pick(_rng.NextDouble() < 0.5 ? ParentMaleNames : ParentFemaleNames)} {student.Surname}";
            student.ParentContact = Phone();
        }
    }

    private async Task PersistStudentsAndParents()
    {
        // Student login accounts first, so the roster rows can link to them.
        foreach (var info in _students)
        {
            var email = info.Sequence == 1 ? "student@demo.csmas" : $"student{info.Sequence:D4}@demo.csmas";
            info.User = NewUser(Role.Student, info.FullName, email, info.Branch.Branch.Id, info.EnrolledAt);
            if (info.Profile == StudentProfile.Inactive) info.User.Status = UserStatus.Inactive;
        }
        foreach (var parent in _parents)
        {
            var created = parent.Children.Min(c => c.EnrolledAt);
            parent.User = NewUser(Role.Parent, parent.FullName, parent.Email, null, created);
            parent.User.PhoneNumber = parent.Phone;
            parent.User.Address = $"{_rng.Next(1, 300)}, {Pick(new[] { "Temple Road", "Hospital Road", "Main Street", "School Lane", "Galle Road" })}";
        }
        await SaveAndClear();

        foreach (var info in _students)
        {
            info.Student = new Student
            {
                InstituteId = _institute.Id,
                BranchId = info.Branch.Branch.Id,
                StudentCode = $"STU-{_institute.Id:D2}-{info.Sequence:D5}",
                FullName = info.FullName,
                Dob = info.Dob,
                Gender = info.Gender,
                ContactPhone = Phone(),
                ParentName = info.ParentName,
                ParentContact = info.ParentContact,
                Status = info.Profile == StudentProfile.Inactive ? StudentStatus.Inactive : StudentStatus.Active,
                CreatedAt = info.EnrolledAt,
                LinkedUserId = info.User.Id,
            };
            _db.Students.Add(info.Student);
        }
        await SaveAndClear();

        foreach (var info in _students)
        {
            info.Student.QrPayload = _qrCodes.CreateStudentQrPayload(info.Student.Id, _institute.Id);
            _db.Students.Attach(info.Student);
            _db.Entry(info.Student).Property(s => s.QrPayload).IsModified = true;

            foreach (var klass in info.Classes)
            {
                _db.Enrollments.Add(new Enrollment
                {
                    InstituteId = _institute.Id,
                    StudentId = info.Student.Id,
                    ClassId = klass.Class.Id,
                    EnrolledAt = info.EnrolledAt,
                });
                klass.Students.Add(info);
            }
        }

        foreach (var parent in _parents)
        {
            foreach (var child in parent.Children)
            {
                _db.ParentLinks.Add(new ParentLink
                {
                    InstituteId = _institute.Id,
                    ParentUserId = parent.User.Id,
                    StudentId = child.Student.Id,
                    CreatedAt = child.EnrolledAt.AddDays(1),
                });
            }
        }
        await SaveAndClear();
    }

    private async Task CreateDiscounts()
    {
        foreach (var parent in _parents.Where(p => p.Children.Count > 1))
        {
            // Sibling discount on the second child.
            AddDiscount(parent.Children[1], DiscountType.Sibling, 10m);
        }

        foreach (var info in _students.Where(s => s.Profile != StudentProfile.Inactive && s.DiscountPercent == 0))
        {
            var roll = _rng.NextDouble();
            if (roll < 0.03) AddDiscount(info, DiscountType.Scholarship, _rng.NextDouble() < 0.5 ? 25m : 50m);
            else if (roll < 0.04) AddDiscount(info, DiscountType.Other, 15m);
        }

        await SaveAndClear();
    }

    private void AddDiscount(StudentInfo info, DiscountType type, decimal percent)
    {
        info.DiscountPercent = Math.Min(100, info.DiscountPercent + percent);
        _db.DiscountRules.Add(new DiscountRule
        {
            InstituteId = _institute.Id,
            StudentId = info.Student.Id,
            Type = type,
            PercentOff = percent,
            IsActive = true,
            CreatedAt = info.EnrolledAt.AddDays(2),
        });
    }

    // ------------------------------------------------------------------ sessions & attendance

    private async Task CreateSessionsAndAttendance()
    {
        var sessions = new List<(Session Session, ClassInfo Class)>();
        for (var offset = HistoryDays; offset >= 1; offset--)
        {
            var date = _today.AddDays(-offset);
            foreach (var info in _classes)
            {
                foreach (var slot in info.Slots.Where(s => s.DayOfWeek == date.DayOfWeek))
                {
                    var startedAt = date.ToDateTime(slot.StartTime) - SriLankaOffset;
                    if (!info.Students.Any(s => s.EnrolledAt <= startedAt)) continue;

                    var session = new Session
                    {
                        InstituteId = _institute.Id,
                        BranchId = info.Branch.Branch.Id,
                        ClassId = info.Class.Id,
                        TeacherUserId = info.Teacher.Id,
                        SessionDate = date,
                        StartedAt = startedAt,
                        ClosedAt = date.ToDateTime(slot.EndTime) - SriLankaOffset,
                        GraceMinutes = 10,
                        Status = SessionStatus.Closed,
                    };
                    _db.Sessions.Add(session);
                    sessions.Add((session, info));
                }
            }
        }
        await SaveAndClear();

        // Attendance is by far the largest table (~45k rows) — written as multi-row INSERTs
        // instead of tracked entities, which keeps first boot fast.
        var rows = new List<string>(1000);
        foreach (var (session, info) in sessions)
        {
            var branch = info.Branch.Branch;
            foreach (var student in info.Students)
            {
                if (student.EnrolledAt > session.StartedAt) continue;
                if (student.LeftAt is not null && session.StartedAt >= student.LeftAt) continue;

                var roll = _rng.NextDouble();
                AttendanceStatus status;
                AttendanceMethod method;
                DateTime? checkedInAt = null;
                string? overrideReason = null;
                decimal? lat = null, lng = null;

                if (roll < student.AbsentRate)
                {
                    status = AttendanceStatus.Absent;
                    method = AttendanceMethod.AutoAbsent;
                    if (session.SessionDate >= _today.AddDays(-10)) student.RecentAbsences.Add((session.SessionDate, info.Class.Subject));
                }
                else
                {
                    var isLate = roll < student.AbsentRate + student.LateRate;
                    status = isLate ? AttendanceStatus.Late : AttendanceStatus.Present;
                    checkedInAt = session.StartedAt.AddMinutes(isLate ? _rng.Next(11, 45) : _rng.Next(-10, 10)).AddSeconds(_rng.Next(0, 60));
                    if (_rng.NextDouble() < 0.05)
                    {
                        method = AttendanceMethod.ManualOverride;
                        overrideReason = Pick(new[] { "Phone battery dead — marked by teacher", "QR scanner not working on student's device", "Arrived with teacher after field visit" });
                    }
                    else
                    {
                        method = AttendanceMethod.QrScan;
                        lat = branch.GeoLat + (decimal)Between(-0.0006, 0.0006);
                        lng = branch.GeoLng + (decimal)Between(-0.0006, 0.0006);
                    }
                }

                student.SessionCount++;
                if (status != AttendanceStatus.Absent) student.PresentOrLateCount++;

                rows.Add(string.Create(CultureInfo.InvariantCulture,
                    $"({_institute.Id},{session.Id},{student.Student.Id},'{status}','{method}',{SqlDate(checkedInAt)},{SqlString(overrideReason)},{SqlDecimal(lat)},{SqlDecimal(lng)},{SqlDate(checkedInAt ?? session.ClosedAt)})"));

                if (rows.Count == 1000) await FlushAttendance(rows);
            }
        }
        await FlushAttendance(rows);

        foreach (var info in _students.Where(s => s.SessionCount > 0))
        {
            info.Student.AttendanceRate = Math.Round(100m * info.PresentOrLateCount / info.SessionCount, 1);
            info.Student.IsAttendanceFlagged = info.Student.AttendanceRate < _institute.AttendanceThresholdPercent;
            _db.Students.Attach(info.Student);
            _db.Entry(info.Student).Property(s => s.AttendanceRate).IsModified = true;
            _db.Entry(info.Student).Property(s => s.IsAttendanceFlagged).IsModified = true;
        }
        await SaveAndClear();
    }

    private async Task FlushAttendance(List<string> rows)
    {
        if (rows.Count == 0) return;
        var sql = new StringBuilder(
            "INSERT INTO Attendances (InstituteId, SessionId, StudentId, Status, Method, CheckedInAt, OverrideReason, GeoLat, GeoLng, CreatedAt) VALUES ");
        sql.AppendJoin(',', rows);
        // Every value in these rows is a number, enum name, fixed literal or escaped seed string.
        await _db.Database.ExecuteSqlRawAsync(sql.ToString());
        rows.Clear();
    }

    // ------------------------------------------------------------------ billing

    private async Task CreateInvoicesAndPayments()
    {
        var currentPeriodStart = new DateOnly(_today.Year, _today.Month, 1);
        var periods = new[] { currentPeriodStart.AddMonths(-2), currentPeriodStart.AddMonths(-1), currentPeriodStart };
        // How far into the current month we are — early in the month most invoices are still open.
        var monthProgress = Math.Clamp((_today.Day + 4) / 14.0, 0.3, 1.0);

        var invoices = new List<(Invoice Invoice, StudentInfo Student, ClassInfo Class)>();
        foreach (var periodStart in periods)
        {
            var periodEnd = periodStart.AddMonths(1).AddDays(-1).ToDateTime(new TimeOnly(23, 59));
            var dueDate = periodStart.AddDays(14);
            foreach (var klass in _classes)
            {
                foreach (var student in klass.Students)
                {
                    if (student.EnrolledAt > periodEnd) continue;
                    if (student.LeftAt is not null && student.LeftAt < periodStart.ToDateTime(TimeOnly.MinValue)) continue;

                    var discount = Math.Round(klass.Fee * student.DiscountPercent / 100m, 2);
                    var invoice = new Invoice
                    {
                        InstituteId = _institute.Id,
                        StudentId = student.Student.Id,
                        ClassId = klass.Class.Id,
                        BillingPeriod = $"{periodStart.Year:D4}-{periodStart.Month:D2}",
                        Amount = klass.Fee,
                        DiscountAmount = discount,
                        TotalDue = klass.Fee - discount,
                        DueDate = dueDate,
                        Status = InvoiceStatus.Pending,
                        CreatedAt = periodStart.ToDateTime(new TimeOnly(0, 30)),
                    };
                    if (invoice.TotalDue <= 0) continue;
                    _db.Invoices.Add(invoice);
                    invoices.Add((invoice, student, klass));
                }
            }
        }
        await SaveAndClear();

        // Decide every invoice's outcome, then write payments.
        var payments = new List<(Payment Payment, Invoice Invoice, StudentInfo Student, ClassInfo Class, bool Online)>();
        var failedAttempts = new List<(Invoice Invoice, StudentInfo Student)>();
        var pendingUpdates = 0;
        foreach (var (invoice, student, klass) in invoices)
        {
            var pastDue = invoice.DueDate < _today;
            var (paidP, partialP) = (student.Profile, pastDue) switch
            {
                (StudentProfile.Good, true) => (0.97, 0.02),
                (StudentProfile.Average, true) => (0.80, 0.10),
                (StudentProfile.AtRisk, true) => (0.45, 0.20),
                (StudentProfile.Inactive, true) => (0.50, 0.10),
                (StudentProfile.Good, false) => (0.65 * monthProgress, 0.08),
                (StudentProfile.Average, false) => (0.35 * monthProgress, 0.15),
                _ => (0.10 * monthProgress, 0.10),
            };

            var roll = _rng.NextDouble();
            var periodStartUtc = invoice.CreatedAt;
            var latestPayDate = pastDue ? invoice.DueDate.ToDateTime(new TimeOnly(18, 0)).AddDays(_rng.NextDouble() < 0.15 ? _rng.Next(1, 12) : 0) : _now;
            if (latestPayDate > _now) latestPayDate = _now.AddMinutes(-_rng.Next(30, 600));

            if (roll < paidP)
            {
                var online = _rng.NextDouble() < 0.32;
                if (!online && _rng.NextDouble() < 0.1)
                {
                    // Paid in two instalments at the counter.
                    var first = RoundTo100(invoice.TotalDue * (decimal)Between(0.4, 0.6));
                    var firstAt = RandomBetween(periodStartUtc, latestPayDate);
                    payments.Add((NewPayment(invoice, first, CounterMethod(), student, firstAt), invoice, student, klass, false));
                    payments.Add((NewPayment(invoice, invoice.TotalDue - first, CounterMethod(), student, RandomBetween(firstAt, latestPayDate)), invoice, student, klass, false));
                }
                else
                {
                    var paidAt = RandomBetween(periodStartUtc, latestPayDate);
                    var method = online ? "Online:MockPay" : CounterMethod();
                    payments.Add((NewPayment(invoice, invoice.TotalDue, method, student, paidAt), invoice, student, klass, online));
                }
                invoice.AmountPaid = invoice.TotalDue;
                invoice.Status = InvoiceStatus.Paid;
            }
            else if (roll < paidP + partialP)
            {
                var amount = Math.Min(invoice.TotalDue - 100, RoundTo100(invoice.TotalDue * (decimal)Between(0.3, 0.7)));
                if (amount > 0)
                {
                    payments.Add((NewPayment(invoice, amount, CounterMethod(), student, RandomBetween(periodStartUtc, latestPayDate)), invoice, student, klass, false));
                    invoice.AmountPaid = amount;
                }
                invoice.Status = pastDue ? InvoiceStatus.Overdue : invoice.AmountPaid > 0 ? InvoiceStatus.Partial : InvoiceStatus.Pending;
            }
            else
            {
                invoice.Status = pastDue ? InvoiceStatus.Overdue : InvoiceStatus.Pending;
                if (_rng.NextDouble() < 0.05) failedAttempts.Add((invoice, student));
            }

            if (pastDue && invoice.Status == InvoiceStatus.Overdue)
            {
                student.OverdueInvoices.Add((invoice, klass));
            }
            if (invoice.DueDate.AddDays(-7) <= _today && invoice.DueDate > _today) invoice.ReminderT7SentAt = invoice.DueDate.AddDays(-7).ToDateTime(new TimeOnly(3, 0));
            if (invoice.DueDate.AddDays(-1) <= _today && invoice.DueDate > _today) invoice.ReminderT1SentAt = invoice.DueDate.AddDays(-1).ToDateTime(new TimeOnly(3, 0));

            _db.Invoices.Attach(invoice);
            var entry = _db.Entry(invoice);
            entry.Property(i => i.AmountPaid).IsModified = true;
            entry.Property(i => i.Status).IsModified = true;
            entry.Property(i => i.ReminderT7SentAt).IsModified = true;
            entry.Property(i => i.ReminderT1SentAt).IsModified = true;
            if (++pendingUpdates % 4000 == 0) await SaveAndClear();
        }
        await SaveAndClear();

        foreach (var p in payments) _db.Payments.Add(p.Payment);
        await SaveAndClear();

        // Online payments: a successful gateway transaction + the teacher's earning split, exactly
        // like PaymentWebhookService would have produced.
        var currentMonthStart = currentPeriodStart.ToDateTime(TimeOnly.MinValue);
        var transactions = new List<(PaymentTransaction Tx, ClassInfo Class)>();
        foreach (var (payment, invoice, student, klass, online) in payments.Where(p => p.Online))
        {
            var tx = new PaymentTransaction
            {
                InstituteId = _institute.Id,
                InvoiceId = invoice.Id,
                StudentId = student.Student.Id,
                InitiatedByUserId = payment.RecordedByUserId,
                Amount = payment.Amount,
                Status = PaymentTransactionStatus.Success,
                GatewayProvider = "MockPay",
                GatewayReference = GatewayReference(),
                PaymentId = payment.Id,
                CreatedAt = payment.PaidAt.AddMinutes(-2),
                CompletedAt = payment.PaidAt,
            };
            _db.PaymentTransactions.Add(tx);
            transactions.Add((tx, klass));
        }
        foreach (var (invoice, student) in failedAttempts)
        {
            var at = RandomBetween(invoice.CreatedAt, invoice.DueDate < _today ? invoice.DueDate.ToDateTime(new TimeOnly(18, 0)) : _now.AddHours(-1));
            _db.PaymentTransactions.Add(new PaymentTransaction
            {
                InstituteId = _institute.Id,
                InvoiceId = invoice.Id,
                StudentId = student.Student.Id,
                InitiatedByUserId = PayerUserId(student),
                Amount = invoice.TotalDue - invoice.AmountPaid,
                Status = PaymentTransactionStatus.Failed,
                GatewayProvider = "MockPay",
                GatewayReference = GatewayReference(),
                CreatedAt = at,
                CompletedAt = at.AddMinutes(1),
            });
        }
        await SaveAndClear();

        foreach (var (tx, klass) in transactions)
        {
            var commission = Math.Round(tx.Amount * CommissionPercent / 100m, 2);
            _db.TeacherEarnings.Add(new TeacherEarning
            {
                InstituteId = _institute.Id,
                TeacherUserId = klass.Teacher.Id,
                PaymentTransactionId = tx.Id,
                GrossAmount = tx.Amount,
                CommissionPercent = CommissionPercent,
                CommissionAmount = commission,
                NetAmount = tx.Amount - commission,
                // Earlier months have been paid out; this month's earnings are still owed.
                PayoutStatus = tx.CompletedAt < currentMonthStart ? "Paid" : "Unpaid",
                CreatedAt = tx.CompletedAt ?? tx.CreatedAt,
            });
        }
        await SaveAndClear();
    }

    private Payment NewPayment(Invoice invoice, decimal amount, string method, StudentInfo student, DateTime paidAt) => new()
    {
        InstituteId = _institute.Id,
        InvoiceId = invoice.Id,
        Amount = amount,
        Method = method,
        RecordedByUserId = method.StartsWith("Online") ? PayerUserId(student) : student.Branch.Admin.Id,
        PaidAt = paidAt,
    };

    private int PayerUserId(StudentInfo student)
    {
        var parent = _parents.FirstOrDefault(p => p.Children.Contains(student));
        return parent is not null && _rng.NextDouble() < 0.8 ? parent.User.Id : student.User.Id;
    }

    private string CounterMethod()
    {
        var roll = _rng.NextDouble();
        return roll < 0.6 ? "Cash" : roll < 0.78 ? "CounterCard" : roll < 0.92 ? "BankDeposit" : "CounterQR";
    }

    // ------------------------------------------------------------------ timetable requests

    private async Task CreateTimetableRequests()
    {
        var plan = new[]
        {
            TimetableRequestStatus.Pending, TimetableRequestStatus.Pending, TimetableRequestStatus.Pending,
            TimetableRequestStatus.Pending, TimetableRequestStatus.Pending, TimetableRequestStatus.Pending,
            TimetableRequestStatus.Approved, TimetableRequestStatus.Approved, TimetableRequestStatus.Approved, TimetableRequestStatus.Approved,
            TimetableRequestStatus.Rejected, TimetableRequestStatus.Rejected, TimetableRequestStatus.Rejected,
        };

        // teacher@demo gets the first (pending) request so it's visible on their dashboard.
        var candidates = _classes.Take(1).Concat(_classes.Skip(1).OrderBy(_ => _rng.Next())).Take(plan.Length).ToList();
        var approvedSlots = new List<(TimetableSlotRequest Request, TimetableSlot Slot, ClassInfo Class)>();

        for (var i = 0; i < plan.Length; i++)
        {
            var info = candidates[i];
            var usedDays = info.Slots.Select(s => s.DayOfWeek).ToHashSet();
            var cell = info.Branch.AllocateCell(info.Teacher.Id, usedDays, _rng);
            if (cell is null) continue;

            var requestedAt = _now.AddDays(-_rng.Next(1, 20)).AddHours(-_rng.Next(0, 10));
            var request = new TimetableSlotRequest
            {
                InstituteId = _institute.Id,
                BranchId = info.Branch.Branch.Id,
                ClassId = info.Class.Id,
                RequestedByUserId = info.Teacher.Id,
                DayOfWeek = cell.Value.Day,
                StartTime = cell.Value.Start,
                EndTime = cell.Value.End,
                Room = cell.Value.Room,
                Status = plan[i],
                RequestedAt = requestedAt,
            };

            if (plan[i] != TimetableRequestStatus.Pending)
            {
                request.ReviewedByUserId = info.Branch.Admin.Id;
                request.ReviewedAt = requestedAt.AddHours(_rng.Next(2, 30));
                request.ReviewNote = plan[i] == TimetableRequestStatus.Approved
                    ? "Approved — extra revision class before term test."
                    : Pick(new[] { "Room is reserved for the term-test seminar that week.", "Please combine with the existing weekend class instead.", "Clashes with the branch parent-teacher meeting." });
            }

            if (plan[i] == TimetableRequestStatus.Approved)
            {
                var slot = new TimetableSlot
                {
                    InstituteId = _institute.Id,
                    BranchId = info.Branch.Branch.Id,
                    ClassId = info.Class.Id,
                    DayOfWeek = cell.Value.Day,
                    StartTime = cell.Value.Start,
                    EndTime = cell.Value.End,
                    Room = cell.Value.Room,
                };
                _db.TimetableSlots.Add(slot);
                info.Slots.Add(slot);
                approvedSlots.Add((request, slot, info));
            }
            else if (plan[i] == TimetableRequestStatus.Rejected)
            {
                // A rejected cell stays bookable for future requests.
                info.Branch.ReleaseCell(cell.Value, info.Teacher.Id);
            }

            _db.TimetableSlotRequests.Add(request);
        }
        await _db.SaveChangesAsync();

        foreach (var (request, slot, info) in approvedSlots)
        {
            request.ResultingSlotId = slot.Id;
            _db.Entry(request).Property(r => r.ResultingSlotId).IsModified = true;

            var (subject, body) = NotificationTemplateService.Default(NotificationEventType.ClassScheduleApproved);
            var placeholders = new Dictionary<string, string>
            {
                ["Subject"] = info.Class.Subject,
                ["DayOfWeek"] = slot.DayOfWeek.ToString(),
                ["StartTime"] = slot.StartTime.ToString("HH:mm"),
                ["EndTime"] = slot.EndTime.ToString("HH:mm"),
                ["RoomSuffix"] = slot.Room is null ? "" : $" in {slot.Room}",
            };
            foreach (var student in info.Students.Where(s => s.Profile != StudentProfile.Inactive))
            {
                AddInSystemNotification(NotificationEventType.ClassScheduleApproved, student.User.Id, subject, body, placeholders, request.ReviewedAt!.Value, _rng.NextDouble() < 0.5);
            }
        }
        await SaveAndClear();
    }

    // ------------------------------------------------------------------ announcements, notifications, logins

    private async Task CreateAnnouncements()
    {
        var items = new (string Title, string Body, int? BranchIndex, int DaysAgo)[]
        {
            ("Term test timetable released", "The third-term test timetable for Grade 10, Grade 11 and A/L batches is now available at the front office and on the student portal. Tests begin in three weeks.", null, 2),
            ("Online fee payments now available", "Parents and students can now pay monthly class fees online from the portal using any Visa or Mastercard. Counter payments remain available at every branch.", null, 9),
            ("Poya day — no classes", "All branches will be closed on the upcoming Poya day. Classes scheduled for that day will be rescheduled by your teachers.", null, 16),
            ("A/L 2027 seminar series", "Free paper-discussion seminars for the A/L 2027 batch start this Saturday in Hall A. Bring your past-paper booklets.", 0, 4),
            ("Parking update", "Due to road works on High Level Road, please use the rear entrance for drop-offs this month.", 1, 6),
            ("Parent-teacher meeting", "The Gampaha branch parent-teacher meeting will be held on Sunday at 10:00 AM. Progress reports will be issued.", 2, 3),
            ("New Smart Lab opened", "Our new Smart Lab with 30 computers is now open for ICT practicals at the Colombo Main Branch.", 0, 21),
            ("Fee reminder", "Monthly fees are due by the 15th of each month. Overdue invoices may affect access to term-test papers.", null, 1),
        };

        foreach (var (title, body, branchIndex, daysAgo) in items)
        {
            var branch = branchIndex is null ? null : _branches[branchIndex.Value];
            _db.Announcements.Add(new Announcement
            {
                InstituteId = _institute.Id,
                BranchId = branch?.Branch.Id,
                Title = title,
                Body = body,
                CreatedByUserId = branch?.Admin.Id ?? _systemAdmin.Id,
                CreatedAt = _now.AddDays(-daysAgo).AddHours(-_rng.Next(1, 8)),
            });
        }
        await _db.SaveChangesAsync();
    }

    private async Task CreateNotifications()
    {
        foreach (var parent in _parents)
        {
            foreach (var child in parent.Children)
            {
                var (absentSubject, absentBody) = NotificationTemplateService.Default(NotificationEventType.AttendanceAbsent);
                foreach (var (date, subjectName) in child.RecentAbsences)
                {
                    var placeholders = new Dictionary<string, string>
                    {
                        ["StudentName"] = child.FullName,
                        ["Subject"] = subjectName,
                        ["Date"] = date.ToString("yyyy-MM-dd"),
                        ["AttendanceRate"] = (child.Student.AttendanceRate ?? 100).ToString("0.0", CultureInfo.InvariantCulture),
                    };
                    var at = date.ToDateTime(new TimeOnly(14, 0));
                    AddInSystemNotification(NotificationEventType.AttendanceAbsent, parent.User.Id, absentSubject, absentBody, placeholders, at, date < _today.AddDays(-3));
                    AddEmailNotification(NotificationEventType.AttendanceAbsent, parent, absentSubject, absentBody, placeholders, at);
                }

                var (overdueSubject, overdueBody) = NotificationTemplateService.Default(NotificationEventType.FeeOverdue);
                foreach (var (invoice, klass) in child.OverdueInvoices)
                {
                    var placeholders = new Dictionary<string, string>
                    {
                        ["StudentName"] = child.FullName,
                        ["Subject"] = klass.Class.Subject,
                        ["BillingPeriod"] = invoice.BillingPeriod,
                        ["TotalDue"] = invoice.TotalDue.ToString("0.00", CultureInfo.InvariantCulture),
                        ["DueDate"] = invoice.DueDate.ToString("yyyy-MM-dd"),
                    };
                    var at = invoice.DueDate.AddDays(1).ToDateTime(new TimeOnly(3, 0));
                    AddInSystemNotification(NotificationEventType.FeeOverdue, parent.User.Id, overdueSubject, overdueBody, placeholders, at, _rng.NextDouble() < 0.6);
                    AddEmailNotification(NotificationEventType.FeeOverdue, parent, overdueSubject, overdueBody, placeholders, at);
                }
            }
        }
        await SaveAndClear();
    }

    private void AddInSystemNotification(NotificationEventType type, int userId, string subject, string body,
        IReadOnlyDictionary<string, string> placeholders, DateTime at, bool isRead)
    {
        _db.NotificationQueueItems.Add(new NotificationQueueItem
        {
            InstituteId = _institute.Id,
            EventType = type,
            Channel = NotificationChannel.InSystem,
            RecipientUserId = userId,
            Subject = Render(subject, placeholders),
            Message = Render(body, placeholders),
            Status = NotificationStatus.Sent,
            AttemptCount = 1,
            LastAttemptAt = at,
            SentAt = at,
            IsRead = isRead,
            CreatedAt = at,
        });
    }

    private void AddEmailNotification(NotificationEventType type, ParentInfo parent, string subject, string body,
        IReadOnlyDictionary<string, string> placeholders, DateTime at)
    {
        // Never seed Queued email rows — the delivery worker would try to send them via SMTP.
        var failed = _rng.NextDouble() < 0.08;
        _db.NotificationQueueItems.Add(new NotificationQueueItem
        {
            InstituteId = _institute.Id,
            EventType = type,
            Channel = NotificationChannel.Email,
            RecipientUserId = parent.User.Id,
            RecipientEmail = parent.Email,
            Subject = Render(subject, placeholders),
            Message = Render(body, placeholders),
            Status = failed ? NotificationStatus.Failed : NotificationStatus.Sent,
            AttemptCount = failed ? 2 : 1,
            LastAttemptAt = at.AddMinutes(failed ? 6 : 1),
            SentAt = failed ? null : at.AddMinutes(1),
            FailureReason = failed ? "Mailbox unavailable (550 5.1.1 recipient rejected)" : null,
            CreatedAt = at,
        });
    }

    private async Task CreateLoginEvents()
    {
        void AddLogins(User user, int count, int withinDays)
        {
            for (var i = 0; i < count; i++)
            {
                _db.UserLoginEvents.Add(new UserLoginEvent
                {
                    InstituteId = _institute.Id,
                    UserId = user.Id,
                    LoggedInAt = _now.AddDays(-Between(0, withinDays)).AddMinutes(-_rng.Next(0, 600)),
                });
            }
        }

        AddLogins(_systemAdmin, 25, 30);
        foreach (var branch in _branches)
        {
            AddLogins(branch.Admin, 20, 30);
            foreach (var (teacher, _) in branch.Teachers) AddLogins(teacher, _rng.Next(4, 16), 30);
        }

        // Parent portal activity feeds the AI engagement feature — at-risk families log in less.
        foreach (var parent in _parents)
        {
            var worstProfile = parent.Children.Max(c => c.Profile);
            var count = worstProfile switch
            {
                StudentProfile.Good => _rng.Next(6, 15),
                StudentProfile.Average => _rng.Next(2, 8),
                _ => _rng.Next(0, 3),
            };
            AddLogins(parent.User, count, 30);
        }

        foreach (var student in _students.Where(s => s.Profile != StudentProfile.Inactive && _rng.NextDouble() < 0.35))
        {
            AddLogins(student.User, _rng.Next(1, 6), 30);
        }

        await SaveAndClear();
    }

    // ------------------------------------------------------------------ settings & bank details

    private async Task CreateSettingsAndBankDetails()
    {
        _db.PaymentAccountSettings.Add(new PaymentAccountSettings
        {
            InstituteId = _institute.Id,
            GatewayProvider = "MockPay",
            AccountIdentifier = "CTI-MERCHANT-0001",
            ApiKeyEncrypted = _encryption.Encrypt("mock_pk_demo_colombo_tuition"),
            ApiSecretEncrypted = _encryption.Encrypt("mock_sk_demo_colombo_tuition"),
            UpdatedAt = _now.AddDays(-60),
        });
        _db.RevenueSplitSettings.Add(new RevenueSplitSettings
        {
            InstituteId = _institute.Id,
            CommissionPercent = CommissionPercent,
            UpdatedAt = _now.AddDays(-60),
        });
        _db.InstituteBankDetails.Add(new InstituteBankDetail
        {
            InstituteId = _institute.Id,
            AccountHolderName = "Colombo Tuition Institute (Pvt) Ltd",
            BankName = "Commercial Bank",
            AccountNumberEncrypted = _encryption.Encrypt("8001234567"),
            BranchName = "Kollupitiya",
            RoutingOrSwiftCode = "CCEYLKLX",
            UpdatedAt = _now.AddDays(-90),
        });

        var teachers = _branches.SelectMany(b => b.Teachers.Select(t => t.Teacher)).ToList();
        // A handful of teachers haven't submitted payout details yet.
        foreach (var teacher in teachers.Where((_, i) => i % 9 != 8))
        {
            _db.TeacherBankDetails.Add(new TeacherBankDetail
            {
                InstituteId = _institute.Id,
                TeacherUserId = teacher.Id,
                AccountHolderName = teacher.FullName,
                BankName = Pick(Banks),
                AccountNumberEncrypted = _encryption.Encrypt($"{_rng.Next(100, 999)}{_rng.Next(1000000, 9999999)}"),
                UpdatedAt = _now.AddDays(-_rng.Next(10, 200)),
            });
        }

        var audit = new (string Action, string? Target, int DaysAgo, int ActorUserId)[]
        {
            ("PaymentAccount.Updated", "MockPay", 60, _systemAdmin.Id),
            ("RevenueSplit.Updated", "10.00%", 60, _systemAdmin.Id),
            ("InstituteBankDetails.Updated", "Commercial Bank ****4567", 90, _systemAdmin.Id),
            ("TeacherBankDetail.Updated", teachers[3].FullName, 40, _systemAdmin.Id),
            ("TeacherBankDetail.SelfUpdated", teachers[0].FullName, 25, teachers[0].Id),
            ("Teacher.PasswordReset", $"{teachers[7].FullName} ({teachers[7].Email})", 12, _branches[0].Admin.Id),
            ("Parent.PasswordReset", $"{_parents[5].FullName} ({_parents[5].Email})", 8, _branches[1].Admin.Id),
            ("TeacherEarning.MarkedPaid", teachers[1].FullName, 3, _systemAdmin.Id),
        };
        foreach (var (action, target, daysAgo, actor) in audit)
        {
            _db.AuditLogEntries.Add(new AuditLogEntry
            {
                InstituteId = _institute.Id,
                ActorUserId = actor,
                Action = action,
                TargetDescription = target,
                CreatedAt = _now.AddDays(-daysAgo),
            });
        }

        await SaveAndClear();
    }

    // ------------------------------------------------------------------ second tenant

    private async Task CreateSecondInstitute()
    {
        // A second, unrelated institute exists purely so Phase 1's isolation rule is actually
        // provable: admin@demo.csmas (institute 1) must never be able to see anything below.
        var otherInstitute = new Institute
        {
            Name = "Kandy Tuition Institute",
            Address = "45 Peradeniya Road, Kandy",
            ContactEmail = "admin@kandytuition.lk",
        };
        _db.Institutes.Add(otherInstitute);
        await _db.SaveChangesAsync();

        var otherBranch = new Branch
        {
            InstituteId = otherInstitute.Id,
            Name = "Kandy Main Branch",
            GeoLat = 7.2906m,
            GeoLng = 80.6337m,
            GeoRadiusM = 100,
        };
        _db.Branches.Add(otherBranch);
        await _db.SaveChangesAsync();

        var otherAdmin = NewUser(Role.SystemAdmin, "Ruwan Bandara", "admin2@demo.csmas", null, _now.AddDays(-200));
        otherAdmin.InstituteId = otherInstitute.Id;
        await SaveAndClear();
    }

    // ------------------------------------------------------------------ helpers

    private User NewUser(Role role, string fullName, string email, int? branchId, DateTime createdAt)
    {
        if (!_usedEmails.Add(email)) throw new InvalidOperationException($"Duplicate seed email {email}.");
        var user = new User
        {
            InstituteId = _institute.Id,
            BranchId = branchId,
            Role = role,
            FullName = fullName,
            Email = email,
            PasswordHash = _passwordHash,
            Status = UserStatus.Active,
            CreatedAt = createdAt,
        };
        _db.Users.Add(user);
        return user;
    }

    private async Task SaveAndClear()
    {
        await _db.SaveChangesAsync();
        _db.ChangeTracker.Clear();
    }

    private StudentProfile RollProfile()
    {
        var roll = _rng.NextDouble();
        return roll < 0.68 ? StudentProfile.Good
            : roll < 0.88 ? StudentProfile.Average
            : roll < 0.96 ? StudentProfile.AtRisk
            : StudentProfile.Inactive;
    }

    private T Pick<T>(IReadOnlyList<T> items) => items[_rng.Next(items.Count)];

    private double Between(double min, double max) => min + _rng.NextDouble() * (max - min);

    private DateTime RandomBetween(DateTime from, DateTime to) =>
        to <= from ? from : from.AddSeconds(_rng.NextDouble() * (to - from).TotalSeconds);

    private string Phone() => $"07{Pick(new[] { 0, 1, 2, 5, 6, 7, 8 })}{_rng.Next(1000000, 9999999)}";

    private string GatewayReference() => $"MOCK-{Guid.NewGuid():N}"[..17].ToUpperInvariant();

    private static decimal RoundTo100(decimal value) => Math.Max(100, Math.Round(value / 100m) * 100m);

    private static string Render(string template, IReadOnlyDictionary<string, string> placeholders)
    {
        foreach (var (key, value) in placeholders) template = template.Replace($"{{{key}}}", value);
        return template;
    }

    private static string SqlDate(DateTime? value) =>
        value is null ? "NULL" : $"'{value.Value.ToString("yyyy-MM-dd HH:mm:ss.ffffff", CultureInfo.InvariantCulture)}'";

    private static string SqlDecimal(decimal? value) =>
        value is null ? "NULL" : Math.Round(value.Value, 6).ToString(CultureInfo.InvariantCulture);

    private static string SqlString(string? value) =>
        value is null ? "NULL" : $"'{value.Replace("\\", "\\\\").Replace("'", "''")}'";

    // ------------------------------------------------------------------ in-memory model

    private enum StudentProfile
    {
        Good,
        Average,
        AtRisk,
        Inactive,
    }

    private sealed class BranchInfo
    {
        private readonly HashSet<(DayOfWeek, TimeOnly, string)> _roomsTaken = new();
        private readonly HashSet<(DayOfWeek, TimeOnly, int)> _teachersBusy = new();

        public BranchInfo(Branch branch, int studentCount)
        {
            Branch = branch;
            StudentCount = studentCount;
        }

        public Branch Branch { get; }
        public int StudentCount { get; }
        public User Admin { get; set; } = null!;
        public List<(User Teacher, string Subject)> Teachers { get; } = new();

        public (DayOfWeek Day, TimeOnly Start, TimeOnly End, string Room)? AllocateCell(int teacherId, ISet<DayOfWeek> avoidDays, Random rng)
        {
            var cells =
                from day in Days
                from block in day is DayOfWeek.Saturday or DayOfWeek.Sunday ? WeekendBlocks : WeekdayBlocks
                from room in Rooms
                select (Day: day, block.Start, block.End, Room: room);

            foreach (var cell in cells.OrderBy(_ => rng.Next()))
            {
                if (avoidDays.Contains(cell.Day)) continue;
                if (_roomsTaken.Contains((cell.Day, cell.Start, cell.Room))) continue;
                if (_teachersBusy.Contains((cell.Day, cell.Start, teacherId))) continue;

                _roomsTaken.Add((cell.Day, cell.Start, cell.Room));
                _teachersBusy.Add((cell.Day, cell.Start, teacherId));
                return cell;
            }

            return null;
        }

        public void ReleaseCell((DayOfWeek Day, TimeOnly Start, TimeOnly End, string Room) cell, int teacherId)
        {
            _roomsTaken.Remove((cell.Day, cell.Start, cell.Room));
            _teachersBusy.Remove((cell.Day, cell.Start, teacherId));
        }
    }

    private sealed class ClassInfo
    {
        public ClassInfo(Class klass, BranchInfo branch, User teacher, string subjectKey, string track, decimal fee)
        {
            Class = klass;
            Branch = branch;
            Teacher = teacher;
            SubjectKey = subjectKey;
            Track = track;
            Fee = fee;
        }

        public Class Class { get; }
        public BranchInfo Branch { get; }
        public User Teacher { get; }
        public string SubjectKey { get; }
        public string Track { get; }
        public decimal Fee { get; }
        public List<TimetableSlot> Slots { get; } = new();
        public List<StudentInfo> Students { get; } = new();
    }

    private sealed class StudentInfo
    {
        public int Sequence { get; init; }
        public BranchInfo Branch { get; init; } = null!;
        public string Track { get; set; } = "";
        public string Gender { get; set; } = "";
        public string FirstName { get; set; } = "";
        public string Surname { get; set; } = "";
        public string FullName => $"{FirstName} {Surname}";
        public StudentProfile Profile { get; set; }
        public DateOnly Dob { get; set; }
        public DateTime EnrolledAt { get; set; }
        public DateTime? LeftAt { get; set; }
        public List<ClassInfo> Classes { get; set; } = new();
        public string? ParentName { get; set; }
        public string? ParentContact { get; set; }
        public decimal DiscountPercent { get; set; }
        public double AbsentRate { get; set; }
        public double LateRate { get; set; }

        public User User { get; set; } = null!;
        public Student Student { get; set; } = null!;

        public int SessionCount { get; set; }
        public int PresentOrLateCount { get; set; }
        public List<(DateOnly Date, string Subject)> RecentAbsences { get; } = new();
        public List<(Invoice Invoice, ClassInfo Class)> OverdueInvoices { get; } = new();
    }

    private sealed class ParentInfo
    {
        public string FullName { get; init; } = "";
        public string Email { get; init; } = "";
        public string Phone { get; set; } = "";
        public List<StudentInfo> Children { get; } = new();
        public User User { get; set; } = null!;
    }
}
