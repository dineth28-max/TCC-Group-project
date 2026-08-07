using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Csmas.Api.Data;

/// <summary>
/// Lets `dotnet ef migrations add` / `dotnet ef database update` build an AppDbContext without
/// needing the full Program.cs host (and without needing a live database connection just to
/// generate a migration file).
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Default")
            ?? "Server=localhost;Database=csmas;User=root;Password=root;";
        optionsBuilder.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 35)));

        return new AppDbContext(optionsBuilder.Options, new DesignTimeTenantProvider());
    }

    private class DesignTimeTenantProvider : ITenantProvider
    {
        public int? InstituteId => null;
        public bool BypassTenantFilter => true;
    }
}
