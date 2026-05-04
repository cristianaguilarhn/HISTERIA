using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables();

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection("Email"));
builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
builder.Services.AddHttpClient();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var isPostgreSqlConnection = !string.IsNullOrWhiteSpace(connectionString) &&
    connectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase);

builder.Services.AddDbContext<ContactDbContext>(options =>
{
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return;
    }

    if (isPostgreSqlConnection)
    {
        options.UseNpgsql(connectionString);
    }
    else if (builder.Environment.IsDevelopment())
    {
        options.UseSqlite(connectionString);
    }
    else
    {
        throw new InvalidOperationException(
            "Production requires ConnectionStrings__DefaultConnection pointing to PostgreSQL."
        );
    }
});

// Configure CORS with environment-specific origins
var allowedOrigins = builder.Configuration["AllowedOrigins"] ?? "http://localhost:5173";
var origins = allowedOrigins.Split(";", StringSplitOptions.RemoveEmptyEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Get admin settings from config or environment variables
// Fallback chain: Environment Variables > appsettings > hardcoded defaults (dev only)
var adminApiKey = Environment.GetEnvironmentVariable("ADMIN_API_KEY") 
    ?? builder.Configuration["Admin:ApiKey"] 
    ?? "";
var adminPassword = Environment.GetEnvironmentVariable("ADMIN_PASSWORD")
    ?? builder.Configuration["Admin:Password"] 
    ?? adminApiKey;
var adminTokenSecret = Environment.GetEnvironmentVariable("ADMIN_TOKEN_SECRET")
    ?? builder.Configuration["Admin:TokenSecret"] 
    ?? adminApiKey;
var defaultAdminUser = Environment.GetEnvironmentVariable("ADMIN_DEFAULT_USER")
    ?? builder.Configuration["Admin:DefaultUser"] 
    ?? "Cristian";

var app = builder.Build();

try
{
    await DatabaseBootstrapper.InitializeAsync(
        app.Services,
        app.Environment,
        connectionString,
        adminPassword,
        defaultAdminUser
    );
}
catch (Exception error)
{
    app.Logger.LogError(
        error,
        "Database bootstrap failed. The application will continue running; DB-backed endpoints may be unavailable."
    );
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

var forwardedHeadersOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
};
forwardedHeadersOptions.KnownIPNetworks.Clear();
forwardedHeadersOptions.KnownProxies.Clear();

app.UseForwardedHeaders(forwardedHeadersOptions);
app.UseHttpsRedirection();
app.UseCors("AllowFrontend");

app.MapGet("/live", () => Results.Ok(new { status = "ok" }))
.WithName("LivenessCheck");

app.MapGet("/health", async (ContactDbContext db) =>
{
    try
    {
        var canConnect = await db.Database.CanConnectAsync();
        return canConnect
            ? Results.Ok(new { status = "ok" })
            : Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Database unavailable");
    }
    catch
    {
        return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Health check failed");
    }
})
.WithName("HealthCheck");

app.MapPost("/auth/login", async (ContactDbContext db, AdminLoginRequest request) =>
{
    var username = string.IsNullOrWhiteSpace(request.MemberName)
        ? defaultAdminUser
        : request.MemberName.Trim();
    var adminUser = await db.AdminUsers
        .AsNoTracking()
        .FirstOrDefaultAsync(user => user.Username == username);

    if (adminUser == null ||
        string.IsNullOrWhiteSpace(request.Password) ||
        !AdminHelpers.VerifyPassword(request.Password, adminUser.PasswordHash))
    {
        return Results.Unauthorized();
    }

    var displayName = adminUser.DisplayName;
    var expiresAt = DateTimeOffset.UtcNow.AddHours(8);
    var token = AdminHelpers.CreateAdminToken(displayName, expiresAt, adminTokenSecret);

    return Results.Ok(new AdminLoginResponse(token, username, displayName, expiresAt));
})
.WithName("AdminLogin");

app.MapGet("/visits", async (ContactDbContext db) =>
{
    var counter = await db.VisitCounters.FirstOrDefaultAsync();
    return Results.Ok(new VisitCounterResponse(counter?.Count ?? 0));
})
.WithName("GetVisitCount");

app.MapPost("/visits", async (HttpContext context, ContactDbContext db, IHttpClientFactory httpClientFactory, VisitRequest? request) =>
{
    var now = DateTimeOffset.UtcNow;
    var path = string.IsNullOrWhiteSpace(request?.Path) ? "/" : request.Path;
    var sessionId = string.IsNullOrWhiteSpace(request?.SessionId)
        ? Guid.NewGuid().ToString("N")
        : request.SessionId.Trim();

    var counter = await db.VisitCounters.FirstOrDefaultAsync();
    if (counter == null)
    {
        counter = new VisitCounter { Count = 1 };
        db.VisitCounters.Add(counter);
    }
    else
    {
        counter.Count++;
    }

    db.VisitEvents.Add(new VisitEvent
    {
        VisitedAt = now,
        Path = path,
        SessionId = sessionId,
        UserAgent = context.Request.Headers.UserAgent.FirstOrDefault()
    });

    await AdminHelpers.UpsertVisitSessionAsync(context, db, httpClientFactory, sessionId, path, now);

    await db.SaveChangesAsync();
    return Results.Ok(new VisitCounterResponse(counter.Count, sessionId));
})
.WithName("RegisterVisit");

app.MapPost("/visits/heartbeat", async (HttpContext context, ContactDbContext db, IHttpClientFactory httpClientFactory, VisitHeartbeatRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.SessionId))
    {
        return Results.BadRequest(new { message = "SessionId requerido." });
    }

    var now = DateTimeOffset.UtcNow;
    var path = string.IsNullOrWhiteSpace(request.Path) ? "/" : request.Path;
    await AdminHelpers.UpsertVisitSessionAsync(context, db, httpClientFactory, request.SessionId.Trim(), path, now);
    await db.SaveChangesAsync();

    return Results.Ok(new VisitHeartbeatResponse(now));
})
.WithName("RegisterVisitHeartbeat");

app.MapGet("/contact", async (HttpContext context, ContactDbContext db) =>
{
    if (!AdminHelpers.IsAdminRequest(context, adminApiKey, adminTokenSecret))
    {
        return Results.Unauthorized();
    }

    var requests = (await db.ContactRequests
        .AsNoTracking()
        .ToListAsync())
        .OrderByDescending(r => r.ReceivedAt)
        .ToList();
    return Results.Ok(requests);
})
.WithName("GetContactRequests");

app.MapGet("/admin/contacts", async (HttpContext context, ContactDbContext db) =>
{
    if (!AdminHelpers.IsAdminRequest(context, adminApiKey, adminTokenSecret))
    {
        return Results.Unauthorized();
    }

    var requests = (await db.ContactRequests
        .AsNoTracking()
        .ToListAsync())
        .OrderByDescending(r => r.ReceivedAt)
        .ToList();

    return Results.Ok(requests);
})
.WithName("GetAdminContactRequests");

app.MapDelete("/admin/contacts/{id:int}", async (HttpContext context, ContactDbContext db, int id) =>
{
    if (!AdminHelpers.IsAdminRequest(context, adminApiKey, adminTokenSecret))
    {
        return Results.Unauthorized();
    }

    var request = await db.ContactRequests.FirstOrDefaultAsync(item => item.Id == id);
    if (request == null)
    {
        return Results.NotFound(new { message = "Solicitud no encontrada." });
    }

    db.ContactRequests.Remove(request);
    await db.SaveChangesAsync();
    return Results.NoContent();
})
.WithName("DeleteAdminContactRequest");

app.MapGet("/admin/metrics", async (HttpContext context, ContactDbContext db) =>
{
    if (!AdminHelpers.IsAdminRequest(context, adminApiKey, adminTokenSecret))
    {
        return Results.Unauthorized();
    }

    var totalVisits = (await db.VisitCounters.FirstOrDefaultAsync())?.Count ?? 0;
    var totalContactRequests = await db.ContactRequests.CountAsync();
    var trackedVisits = await db.VisitEvents.CountAsync();
    var activeCutoff = DateTimeOffset.UtcNow.AddMinutes(-2);
    var recentActiveSessions = (await db.VisitSessions
        .AsNoTracking()
        .ToListAsync())
        .Where(session => session.LastSeenAt >= activeCutoff)
        .OrderByDescending(session => session.LastSeenAt)
        .ToList();
    var activeSessions = recentActiveSessions.Count;
    var activeSessionsByCountry = recentActiveSessions
        .GroupBy(session => string.IsNullOrWhiteSpace(session.Country) ? "Desconocido" : session.Country)
        .OrderByDescending(group => group.Count())
        .Select(group => new MetricPoint(group.Key, group.Count()))
        .ToList();
    var conversionRate = totalVisits == 0
        ? 0
        : Math.Round(totalContactRequests * 100m / totalVisits, 2);

    var visitEvents = await db.VisitEvents
        .AsNoTracking()
        .ToListAsync();

    var visitsByDay = visitEvents
        .GroupBy(v => v.VisitedAt.Date)
        .OrderBy(group => group.Key)
        .Select(group => new MetricPoint(
            group.Key.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            group.Count()
        ))
        .ToList();

    if (visitsByDay.Count == 0 && totalVisits > 0)
    {
        visitsByDay.Add(new MetricPoint(
            DateTimeOffset.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            totalVisits
        ));
    }

    var contactRequests = await db.ContactRequests
        .AsNoTracking()
        .ToListAsync();

    var contactRequestsByDay = contactRequests
        .GroupBy(r => r.ReceivedAt.Date)
        .OrderBy(group => group.Key)
        .Select(group => new MetricPoint(
            group.Key.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            group.Count()
        ))
        .ToList();

    return Results.Ok(new AdminMetricsResponse(
        totalVisits,
        trackedVisits,
        activeSessions,
        totalContactRequests,
        conversionRate,
        visitsByDay,
        contactRequestsByDay,
        activeSessionsByCountry,
        recentActiveSessions.Select(AdminActiveSession.From).ToList()
    ));
})
.WithName("GetAdminMetrics");

app.MapGet("/admin/users", async (HttpContext context, ContactDbContext db) =>
{
    if (!AdminHelpers.IsAdminRequest(context, adminApiKey, adminTokenSecret))
    {
        return Results.Unauthorized();
    }

    var users = await db.AdminUsers
        .AsNoTracking()
        .OrderBy(user => user.Username)
        .Select(user => new AdminUserResponse(user.Id, user.Username, user.DisplayName, user.CreatedAt))
        .ToListAsync();

    return Results.Ok(users);
})
.WithName("GetAdminUsers");

app.MapPost("/admin/users", async (HttpContext context, ContactDbContext db, AdminCreateUserRequest request) =>
{
    if (!AdminHelpers.IsAdminRequest(context, adminApiKey, adminTokenSecret))
    {
        return Results.Unauthorized();
    }

    if (string.IsNullOrWhiteSpace(request.Username) ||
        string.IsNullOrWhiteSpace(request.DisplayName) ||
        string.IsNullOrWhiteSpace(request.Password) ||
        request.Password.Length < 10)
    {
        return Results.BadRequest(new { message = "Usuario, nombre y contraseña de al menos 10 caracteres son requeridos." });
    }

    var username = request.Username.Trim();
    var exists = await db.AdminUsers.AnyAsync(user => user.Username == username);
    if (exists)
    {
        return Results.Conflict(new { message = "Ya existe una cuenta con ese usuario." });
    }

    var user = new AdminUser
    {
        Username = username,
        DisplayName = request.DisplayName.Trim(),
        PasswordHash = AdminHelpers.HashPassword(request.Password),
        CreatedAt = DateTimeOffset.UtcNow
    };

    db.AdminUsers.Add(user);
    await db.SaveChangesAsync();
    return Results.Created($"/admin/users/{user.Id}", new AdminUserResponse(user.Id, user.Username, user.DisplayName, user.CreatedAt));
})
.WithName("CreateAdminUser");

app.MapPost("/admin/users/change-password", async (HttpContext context, ContactDbContext db, AdminChangePasswordRequest request) =>
{
    if (!AdminHelpers.IsAdminRequest(context, adminApiKey, adminTokenSecret))
    {
        return Results.Unauthorized();
    }

    if (string.IsNullOrWhiteSpace(request.Username) ||
        string.IsNullOrWhiteSpace(request.CurrentPassword) ||
        string.IsNullOrWhiteSpace(request.NewPassword) ||
        request.NewPassword.Length < 10)
    {
        return Results.BadRequest(new { message = "Completa la contraseña actual y una nueva contraseña de al menos 10 caracteres." });
    }

    var user = await db.AdminUsers.FirstOrDefaultAsync(item => item.Username == request.Username.Trim());
    if (user == null || !AdminHelpers.VerifyPassword(request.CurrentPassword, user.PasswordHash))
    {
        return Results.BadRequest(new { message = "La contraseña actual no es correcta." });
    }

    user.PasswordHash = AdminHelpers.HashPassword(request.NewPassword);
    await db.SaveChangesAsync();

    return Results.NoContent();
})
.WithName("ChangeAdminPassword");

app.MapDelete("/admin/users/{id:int}", async (HttpContext context, ContactDbContext db, int id) =>
{
    if (!AdminHelpers.IsAdminRequest(context, adminApiKey, adminTokenSecret))
    {
        return Results.Unauthorized();
    }

    var totalUsers = await db.AdminUsers.CountAsync();
    if (totalUsers <= 1)
    {
        return Results.BadRequest(new { message = "No se puede eliminar la ultima cuenta admin." });
    }

    var user = await db.AdminUsers.FirstOrDefaultAsync(item => item.Id == id);
    if (user == null)
    {
        return Results.NotFound(new { message = "Usuario no encontrado." });
    }

    db.AdminUsers.Remove(user);
    await db.SaveChangesAsync();
    return Results.NoContent();
})
.WithName("DeleteAdminUser");

app.MapGet("/admin/contacts/export", async (HttpContext context, ContactDbContext db) =>
{
    if (!AdminHelpers.IsAdminRequest(context, adminApiKey, adminTokenSecret))
    {
        return Results.Unauthorized();
    }

    var requests = (await db.ContactRequests
        .AsNoTracking()
        .ToListAsync())
        .OrderByDescending(r => r.ReceivedAt)
        .ToList();

    var csv = AdminHelpers.BuildContactCsv(requests);
    return Results.Text(csv, "text/csv", Encoding.UTF8);
})
.WithName("ExportAdminContactRequests");

app.MapGet("/events", async (ContactDbContext db) =>
{
    var today = DateTime.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    var events = (await db.PresentationEvents
        .AsNoTracking()
        .Where(item => item.Status == "upcoming")
        .OrderBy(item => item.EventDate)
        .ThenBy(item => item.EventTime)
        .ToListAsync())
        .Where(item => string.CompareOrdinal(item.EventDate, today) >= 0)
        .ToList();

    return Results.Ok(events.Select(PresentationEventResponse.From).ToList());
})
.WithName("GetUpcomingEvents");

app.MapGet("/admin/events", async (HttpContext context, ContactDbContext db) =>
{
    if (!AdminHelpers.IsAdminRequest(context, adminApiKey, adminTokenSecret))
    {
        return Results.Unauthorized();
    }

    var events = (await db.PresentationEvents
        .AsNoTracking()
        .OrderBy(item => item.EventDate)
        .ThenBy(item => item.EventTime)
        .ToListAsync())
        .OrderBy(item => item.EventDate)
        .ThenBy(item => item.EventTime)
        .ThenByDescending(item => item.CreatedAt)
        .ToList();

    return Results.Ok(events.Select(PresentationEventResponse.From).ToList());
})
.WithName("GetAdminEvents");

app.MapPost("/admin/events", async (HttpContext context, ContactDbContext db, PresentationEventRequest request) =>
{
    if (!AdminHelpers.IsAdminRequest(context, adminApiKey, adminTokenSecret))
    {
        return Results.Unauthorized();
    }

    if (!AdminHelpers.TryNormalizePresentationEvent(request, out var normalized, out var validationMessage))
    {
        return Results.BadRequest(new { message = validationMessage });
    }

    var entity = new PresentationEventEntity
    {
        Title = normalized.Title,
        Venue = normalized.Venue,
        City = normalized.City,
        EventDate = normalized.EventDate,
        EventTime = normalized.EventTime,
        Description = normalized.Description,
        FacebookUrl = normalized.FacebookUrl,
        Status = normalized.Status,
        CreatedAt = DateTimeOffset.UtcNow
    };

    db.PresentationEvents.Add(entity);
    await db.SaveChangesAsync();

    return Results.Created($"/admin/events/{entity.Id}", PresentationEventResponse.From(entity));
})
.WithName("CreateAdminEvent");

app.MapDelete("/admin/events/{id:int}", async (HttpContext context, ContactDbContext db, int id) =>
{
    if (!AdminHelpers.IsAdminRequest(context, adminApiKey, adminTokenSecret))
    {
        return Results.Unauthorized();
    }

    var entity = await db.PresentationEvents.FirstOrDefaultAsync(item => item.Id == id);
    if (entity == null)
    {
        return Results.NotFound(new { message = "Evento no encontrado." });
    }

    db.PresentationEvents.Remove(entity);
    await db.SaveChangesAsync();
    return Results.NoContent();
})
.WithName("DeleteAdminEvent");

app.MapPost("/contact", async (ContactRequest request, IEmailSender emailSender, ContactDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.NombreSolicitante) ||
        string.IsNullOrWhiteSpace(request.Telefono) ||
        string.IsNullOrWhiteSpace(request.NombreEvento) ||
        string.IsNullOrWhiteSpace(request.TipoEvento) ||
        string.IsNullOrWhiteSpace(request.Ubicacion) ||
        string.IsNullOrWhiteSpace(request.FechaEvento))
    {
        return Results.BadRequest(new ContactResponse(
            false,
            false,
            "Completa los campos requeridos de la solicitud."
        ));
    }

    var submission = new ContactRequestEntity
    {
        NombreSolicitante = request.NombreSolicitante,
        Telefono = request.Telefono,
        Correo = request.Correo,
        NombreEvento = request.NombreEvento,
        TipoEvento = request.TipoEvento,
        CantidadPersonas = request.CantidadPersonas,
        Ubicacion = request.Ubicacion,
        FechaEvento = request.FechaEvento,
        HoraEstimada = request.HoraEstimada,
        DuracionEsperada = request.DuracionEsperada,
        PresupuestoAproximado = request.PresupuestoAproximado,
        DetallesImportantes = request.DetallesImportantes,
        ReceivedAt = DateTimeOffset.UtcNow
    };

    db.ContactRequests.Add(submission);
    await db.SaveChangesAsync();

    try
    {
        await emailSender.SendContactRequestAsync(submission.ToContactSubmission());
    }
    catch (Exception error)
    {
        app.Logger.LogError(
            error,
            "Fallo SMTP al enviar la solicitud #{Id}. Tipo={ErrorType}. Mensaje={ErrorMessage}. Host={Host}. Port={Port}. Recipient={RecipientEmail}.",
            submission.Id,
            error.GetType().Name,
            error.Message,
            builder.Configuration["Email:Smtp:Host"] ?? "",
            builder.Configuration["Email:Smtp:Port"] ?? "",
            builder.Configuration["Email:RecipientEmail"] ?? ""
        );

        return Results.Ok(new ContactResponse(
            true,
            false,
            "Solicitud recibida. El correo no pudo enviarse, pero quedo registrada."
        ));
    }

    return Results.Ok(new ContactResponse(
        true,
        true,
        "Solicitud recibida. Tension Retro se pondra en contacto pronto."
    ));
})
.WithName("SendContactMessage");

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast = Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast");

app.Run();

// Database Context
public class ContactDbContext : DbContext
{
    public ContactDbContext(DbContextOptions<ContactDbContext> options) : base(options) { }
    
    public DbSet<ContactRequestEntity> ContactRequests { get; set; } = null!;
    public DbSet<VisitCounter> VisitCounters { get; set; } = null!;
    public DbSet<VisitEvent> VisitEvents { get; set; } = null!;
    public DbSet<VisitSession> VisitSessions { get; set; } = null!;
    public DbSet<AdminUser> AdminUsers { get; set; } = null!;
    public DbSet<PresentationEventEntity> PresentationEvents { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AdminUser>()
            .HasIndex(item => item.Username)
            .IsUnique();

        modelBuilder.Entity<VisitSession>()
            .HasIndex(item => item.SessionId)
            .IsUnique();
    }
}

public static class DatabaseBootstrapper
{
    public static async Task InitializeAsync(
        IServiceProvider services,
        IHostEnvironment environment,
        string? connectionString,
        string adminPassword,
        string defaultAdminUser)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return;
        }

        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ContactDbContext>();

        if (db.Database.IsSqlite())
        {
            InitializeSqlite(db);
        }
        else
        {
            // Temporary PostgreSQL bootstrap until formal EF migrations are added.
            await db.Database.EnsureCreatedAsync();
        }

        await EnsureDefaultAdminAsync(db, environment, adminPassword, defaultAdminUser);
    }

    private static void InitializeSqlite(ContactDbContext db)
    {
        db.Database.EnsureCreated();
        db.Database.ExecuteSqlRaw("""
            CREATE TABLE IF NOT EXISTS "VisitEvents" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_VisitEvents" PRIMARY KEY AUTOINCREMENT,
                "VisitedAt" TEXT NOT NULL,
                "Path" TEXT NULL,
                "SessionId" TEXT NULL,
                "UserAgent" TEXT NULL
            );
            """);

        TryExecuteSqliteAlter(db, """ALTER TABLE "VisitEvents" ADD COLUMN "SessionId" TEXT NULL;""");

        db.Database.ExecuteSqlRaw("""
            CREATE TABLE IF NOT EXISTS "VisitSessions" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_VisitSessions" PRIMARY KEY AUTOINCREMENT,
                "SessionId" TEXT NOT NULL,
                "FirstSeenAt" TEXT NOT NULL,
                "LastSeenAt" TEXT NOT NULL,
                "Path" TEXT NULL,
                "UserAgent" TEXT NULL
            );
            """);
        db.Database.ExecuteSqlRaw("""
            CREATE TABLE IF NOT EXISTS "AdminUsers" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_AdminUsers" PRIMARY KEY AUTOINCREMENT,
                "Username" TEXT NOT NULL,
                "DisplayName" TEXT NOT NULL,
                "PasswordHash" TEXT NOT NULL,
                "CreatedAt" TEXT NOT NULL
            );
            """);
        db.Database.ExecuteSqlRaw("""
            CREATE TABLE IF NOT EXISTS "PresentationEvents" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_PresentationEvents" PRIMARY KEY AUTOINCREMENT,
                "Title" TEXT NOT NULL,
                "Venue" TEXT NOT NULL,
                "City" TEXT NOT NULL,
                "EventDate" TEXT NOT NULL,
                "EventTime" TEXT NOT NULL,
                "Description" TEXT NOT NULL,
                "FacebookUrl" TEXT NULL,
                "Status" TEXT NOT NULL,
                "CreatedAt" TEXT NOT NULL
            );
            """);
        db.Database.ExecuteSqlRaw("""
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_AdminUsers_Username"
            ON "AdminUsers" ("Username");
            """);
        db.Database.ExecuteSqlRaw("""
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_VisitSessions_SessionId"
            ON "VisitSessions" ("SessionId");
            """);

        foreach (var statement in new[]
        {
            """ALTER TABLE "VisitSessions" ADD COLUMN "IpAddress" TEXT NULL;""",
            """ALTER TABLE "VisitSessions" ADD COLUMN "Country" TEXT NULL;"""
        })
        {
            TryExecuteSqliteAlter(db, statement);
        }
    }

    private static void TryExecuteSqliteAlter(ContactDbContext db, string statement)
    {
        try
        {
            db.Database.ExecuteSqlRaw(statement);
        }
        catch
        {
            // Existing local SQLite databases may already have this lightweight migration.
        }
    }

    private static async Task EnsureDefaultAdminAsync(
        ContactDbContext db,
        IHostEnvironment environment,
        string adminPassword,
        string defaultAdminUser)
    {
        if (string.IsNullOrWhiteSpace(adminPassword))
        {
            return;
        }

        var defaultUsername = defaultAdminUser.Trim();
        var defaultUser = await db.AdminUsers.FirstOrDefaultAsync(user => user.Username == defaultUsername);

        if (defaultUser == null)
        {
            db.AdminUsers.Add(new AdminUser
            {
                Username = defaultUsername,
                DisplayName = defaultUsername,
                PasswordHash = AdminHelpers.HashPassword(adminPassword),
                CreatedAt = DateTimeOffset.UtcNow
            });
        }
        else if (environment.IsDevelopment() &&
            !AdminHelpers.VerifyPassword(adminPassword, defaultUser.PasswordHash))
        {
            defaultUser.PasswordHash = AdminHelpers.HashPassword(adminPassword);
        }

        await db.SaveChangesAsync();
    }
}

public class ContactRequestEntity
{
    public int Id { get; set; }
    public string NombreSolicitante { get; set; } = "";
    public string Telefono { get; set; } = "";
    public string? Correo { get; set; }
    public string NombreEvento { get; set; } = "";
    public string TipoEvento { get; set; } = "";
    public string? CantidadPersonas { get; set; }
    public string Ubicacion { get; set; } = "";
    public string FechaEvento { get; set; } = "";
    public string? HoraEstimada { get; set; }
    public string? DuracionEsperada { get; set; }
    public string? PresupuestoAproximado { get; set; }
    public string? DetallesImportantes { get; set; }
    public DateTimeOffset ReceivedAt { get; set; }
    
    public ContactSubmission ToContactSubmission() => new(
        Id, ReceivedAt, NombreSolicitante, Telefono, Correo, NombreEvento, 
        TipoEvento, CantidadPersonas, Ubicacion, FechaEvento, HoraEstimada,
        DuracionEsperada, PresupuestoAproximado, DetallesImportantes
    );
}

public class VisitCounter
{
    public int Id { get; set; }
    public int Count { get; set; }
}

public class VisitEvent
{
    public int Id { get; set; }
    public DateTimeOffset VisitedAt { get; set; }
    public string? Path { get; set; }
    public string? SessionId { get; set; }
    public string? UserAgent { get; set; }
}

public class VisitSession
{
    public int Id { get; set; }
    public string SessionId { get; set; } = "";
    public DateTimeOffset FirstSeenAt { get; set; }
    public DateTimeOffset LastSeenAt { get; set; }
    public string? Path { get; set; }
    public string? UserAgent { get; set; }
    public string? IpAddress { get; set; }
    public string? Country { get; set; }
}

public class AdminUser
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
}

public class PresentationEventEntity
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Venue { get; set; } = "";
    public string City { get; set; } = "";
    public string EventDate { get; set; } = "";
    public string EventTime { get; set; } = "";
    public string Description { get; set; } = "";
    public string? FacebookUrl { get; set; }
    public string Status { get; set; } = "upcoming";
    public DateTimeOffset CreatedAt { get; set; }

    public DateOnly EventDateValue => DateOnly.ParseExact(EventDate, "yyyy-MM-dd", CultureInfo.InvariantCulture);
}

public record VisitCounterResponse(int Count, string? SessionId = null);

public record VisitRequest(string? Path, string? SessionId);

public record VisitHeartbeatRequest(string SessionId, string? Path);

public record VisitHeartbeatResponse(DateTimeOffset LastSeenAt);

public record AdminLoginRequest(string? MemberName, string Password);

public record AdminLoginResponse(string Token, string Username, string MemberName, DateTimeOffset ExpiresAt);

public record MetricPoint(string Date, int Count);

public record AdminActiveSession(
    string SessionId,
    string? Country,
    string? IpAddress,
    string? Path,
    DateTimeOffset FirstSeenAt,
    DateTimeOffset LastSeenAt
)
{
    public static AdminActiveSession From(VisitSession session) => new(
        session.SessionId,
        session.Country,
        session.IpAddress,
        session.Path,
        session.FirstSeenAt,
        session.LastSeenAt
    );
}

public record AdminMetricsResponse(
    int TotalVisits,
    int TrackedVisits,
    int ActiveSessions,
    int TotalContactRequests,
    decimal ConversionRate,
    IReadOnlyList<MetricPoint> VisitsByDay,
    IReadOnlyList<MetricPoint> ContactRequestsByDay,
    IReadOnlyList<MetricPoint> ActiveSessionsByCountry,
    IReadOnlyList<AdminActiveSession> RecentActiveSessions
);

public record AdminUserResponse(int Id, string Username, string DisplayName, DateTimeOffset CreatedAt);

public record AdminCreateUserRequest(string Username, string DisplayName, string Password);

public record AdminChangePasswordRequest(string Username, string CurrentPassword, string NewPassword);

public record PresentationEventRequest(
    string Title,
    string Venue,
    string City,
    string EventDate,
    string EventTime,
    string Description,
    string? FacebookUrl,
    string Status
);

public record PresentationEventResponse(
    int Id,
    string Title,
    string Venue,
    string City,
    string EventDate,
    string EventTime,
    string Description,
    string? FacebookUrl,
    string Status,
    DateTimeOffset CreatedAt
)
{
    public static PresentationEventResponse From(PresentationEventEntity entity) => new(
        entity.Id,
        entity.Title,
        entity.Venue,
        entity.City,
        entity.EventDate,
        entity.EventTime,
        entity.Description,
        entity.FacebookUrl,
        entity.Status,
        entity.CreatedAt
    );
}

public sealed record IpApiCountryResponse(
    [property: JsonPropertyName("country_name")] string? CountryName
);

public record ContactRequest(
    string NombreSolicitante,
    string Telefono,
    string? Correo,
    string NombreEvento,
    string TipoEvento,
    string? CantidadPersonas,
    string Ubicacion,
    string FechaEvento,
    string? HoraEstimada,
    string? DuracionEsperada,
    string? PresupuestoAproximado,
    string? DetallesImportantes
);

public record ContactSubmission(
    int Id,
    DateTimeOffset ReceivedAt,
    string NombreSolicitante,
    string Telefono,
    string? Correo,
    string NombreEvento,
    string TipoEvento,
    string? CantidadPersonas,
    string Ubicacion,
    string FechaEvento,
    string? HoraEstimada,
    string? DuracionEsperada,
    string? PresupuestoAproximado,
    string? DetallesImportantes
);

public record ContactResponse(bool Success, bool EmailSent, string Message);

public record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}

public static class AdminHelpers
{
    public static bool TryNormalizePresentationEvent(
        PresentationEventRequest request,
        out PresentationEventRequest normalized,
        out string message)
    {
        normalized = request;

        if (string.IsNullOrWhiteSpace(request.Title) ||
            string.IsNullOrWhiteSpace(request.Venue) ||
            string.IsNullOrWhiteSpace(request.City) ||
            string.IsNullOrWhiteSpace(request.EventDate) ||
            string.IsNullOrWhiteSpace(request.EventTime) ||
            string.IsNullOrWhiteSpace(request.Description))
        {
            message = "Completa título, venue, ciudad, fecha, hora y descripción.";
            return false;
        }

        if (!DateOnly.TryParseExact(
                request.EventDate.Trim(),
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var eventDate))
        {
            message = "La fecha del evento debe usar el formato YYYY-MM-DD.";
            return false;
        }

        if (!TimeOnly.TryParseExact(
                request.EventTime.Trim(),
                "HH:mm",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var eventTime))
        {
            message = "La hora del evento debe usar el formato HH:mm.";
            return false;
        }

        if (!TryParsePresentationStatus(request.Status, out var status))
        {
            message = "El estado del evento debe ser upcoming o completed.";
            return false;
        }

        var facebookUrl = string.IsNullOrWhiteSpace(request.FacebookUrl)
            ? null
            : request.FacebookUrl.Trim();

        if (!string.IsNullOrWhiteSpace(facebookUrl) &&
            !Uri.TryCreate(facebookUrl, UriKind.Absolute, out _))
        {
            message = "La URL de Facebook no es válida.";
            return false;
        }

        normalized = request with
        {
            Title = request.Title.Trim(),
            Venue = request.Venue.Trim(),
            City = request.City.Trim(),
            EventDate = eventDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            EventTime = eventTime.ToString("HH:mm", CultureInfo.InvariantCulture),
            Description = request.Description.Trim(),
            FacebookUrl = facebookUrl,
            Status = status.ToString().ToLowerInvariant()
        };

        message = "";
        return true;
    }

    private static bool TryParsePresentationStatus(
        string? value,
        out string status)
    {
        switch (value?.Trim().ToLowerInvariant())
        {
            case "upcoming":
                status = "upcoming";
                return true;
            case "completed":
                status = "completed";
                return true;
            default:
                status = "upcoming";
                return false;
        }
    }

    public static async Task UpsertVisitSessionAsync(
        HttpContext context,
        ContactDbContext db,
        IHttpClientFactory httpClientFactory,
        string sessionId,
        string path,
        DateTimeOffset now)
    {
        var userAgent = context.Request.Headers.UserAgent.FirstOrDefault();
        var ipAddress = GetClientIpAddress(context);
        var session = await db.VisitSessions.FirstOrDefaultAsync(item => item.SessionId == sessionId);

        if (session == null)
        {
            var country = await ResolveCountryAsync(context, httpClientFactory, ipAddress);
            db.VisitSessions.Add(new VisitSession
            {
                SessionId = sessionId,
                FirstSeenAt = now,
                LastSeenAt = now,
                Path = path,
                UserAgent = userAgent,
                IpAddress = ipAddress,
                Country = country
            });
            return;
        }

        session.LastSeenAt = now;
        session.Path = path;
        session.UserAgent = userAgent;
        session.IpAddress = ipAddress;

        if (string.IsNullOrWhiteSpace(session.Country))
        {
            session.Country = await ResolveCountryAsync(context, httpClientFactory, ipAddress);
        }
    }

    public static string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            310_000,
            HashAlgorithmName.SHA256,
            32
        );

        return $"pbkdf2-sha256|310000|{Convert.ToBase64String(salt)}|{Convert.ToBase64String(hash)}";
    }

    public static bool VerifyPassword(string password, string storedHash)
    {
        var parts = storedHash.Split('|');
        if (parts.Length != 4 ||
            parts[0] != "pbkdf2-sha256" ||
            !int.TryParse(parts[1], out var iterations))
        {
            return false;
        }

        var salt = Convert.FromBase64String(parts[2]);
        var expectedHash = Convert.FromBase64String(parts[3]);
        var actualHash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            iterations,
            HashAlgorithmName.SHA256,
            expectedHash.Length
        );

        return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
    }

    private static string? GetClientIpAddress(HttpContext context)
    {
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwardedFor))
        {
            return forwardedFor.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        }

        var realIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(realIp))
        {
            return realIp;
        }

        return context.Connection.RemoteIpAddress?.ToString();
    }

    private static async Task<string?> ResolveCountryAsync(
        HttpContext context,
        IHttpClientFactory httpClientFactory,
        string? ipAddress)
    {
        var headerCountry = context.Request.Headers["CF-IPCountry"].FirstOrDefault()
            ?? context.Request.Headers["X-Vercel-IP-Country"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(headerCountry))
        {
            return headerCountry;
        }

        if (string.IsNullOrWhiteSpace(ipAddress) ||
            ipAddress is "::1" or "127.0.0.1" ||
            ipAddress.StartsWith("10.", StringComparison.Ordinal) ||
            ipAddress.StartsWith("192.168.", StringComparison.Ordinal) ||
            ipAddress.StartsWith("172.16.", StringComparison.Ordinal))
        {
            return "Local";
        }

        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
            var client = httpClientFactory.CreateClient();
            var response = await client.GetAsync($"https://ipapi.co/{ipAddress}/json/", cts.Token);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cts.Token);
            var data = await JsonSerializer.DeserializeAsync<IpApiCountryResponse>(stream, cancellationToken: cts.Token);
            return string.IsNullOrWhiteSpace(data?.CountryName) ? null : data.CountryName;
        }
        catch
        {
            return null;
        }
    }

    public static bool IsAdminRequest(HttpContext context, string adminApiKey, string tokenSecret)
    {
        var providedKey = context.Request.Headers["X-Api-Key"].FirstOrDefault() ?? "";
        if (!string.IsNullOrEmpty(adminApiKey) && FixedTimeEquals(providedKey, adminApiKey))
        {
            return true;
        }

        var authHeader = context.Request.Headers.Authorization.FirstOrDefault() ?? "";
        const string bearerPrefix = "Bearer ";
        if (!authHeader.StartsWith(bearerPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var token = authHeader[bearerPrefix.Length..].Trim();
        return ValidateAdminToken(token, tokenSecret);
    }

    public static string CreateAdminToken(string memberName, DateTimeOffset expiresAt, string secret)
    {
        var payload = $"{memberName}|{expiresAt.ToUnixTimeSeconds()}";
        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        var encodedPayload = Base64UrlEncode(payloadBytes);
        var signature = Sign(encodedPayload, secret);
        return $"{encodedPayload}.{signature}";
    }

    public static bool ValidateAdminToken(string token, string secret)
    {
        if (string.IsNullOrWhiteSpace(secret))
        {
            return false;
        }

        var parts = token.Split('.', 2);
        if (parts.Length != 2)
        {
            return false;
        }

        var expectedSignature = Sign(parts[0], secret);
        if (!FixedTimeEquals(parts[1], expectedSignature))
        {
            return false;
        }

        var payload = Encoding.UTF8.GetString(Base64UrlDecode(parts[0]));
        var payloadParts = payload.Split('|', 2);
        return payloadParts.Length == 2 &&
            long.TryParse(payloadParts[1], out var expiresAtUnix) &&
            DateTimeOffset.FromUnixTimeSeconds(expiresAtUnix) > DateTimeOffset.UtcNow;
    }

    private static string Sign(string value, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return Base64UrlEncode(hmac.ComputeHash(Encoding.UTF8.GetBytes(value)));
    }

    public static bool FixedTimeEquals(string left, string right)
    {
        var leftBytes = Encoding.UTF8.GetBytes(left);
        var rightBytes = Encoding.UTF8.GetBytes(right);
        return leftBytes.Length == rightBytes.Length &&
            CryptographicOperations.FixedTimeEquals(leftBytes, rightBytes);
    }

    private static string Base64UrlEncode(byte[] bytes)
    {
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static byte[] Base64UrlDecode(string value)
    {
        var padded = value.Replace('-', '+').Replace('_', '/');
        padded = padded.PadRight(padded.Length + (4 - padded.Length % 4) % 4, '=');
        return Convert.FromBase64String(padded);
    }

    public static string BuildContactCsv(IEnumerable<ContactRequestEntity> requests)
    {
        var builder = new StringBuilder();
        builder.AppendLine("Id,Recibido,Nombre,Telefono,Correo,Evento,Tipo,Cantidad,Ubicacion,Fecha,Hora,Duracion,Presupuesto,Detalles");

        foreach (var request in requests)
        {
            var values = new[]
            {
                request.Id.ToString(CultureInfo.InvariantCulture),
                request.ReceivedAt.ToString("u", CultureInfo.InvariantCulture),
                request.NombreSolicitante,
                request.Telefono,
                request.Correo,
                request.NombreEvento,
                request.TipoEvento,
                request.CantidadPersonas,
                request.Ubicacion,
                request.FechaEvento,
                request.HoraEstimada,
                request.DuracionEsperada,
                request.PresupuestoAproximado,
                request.DetallesImportantes
            };

            builder.AppendLine(string.Join(",", values.Select(EscapeCsv)));
        }

        return builder.ToString();
    }

    private static string EscapeCsv(string? value)
    {
        var normalized = value?.Replace("\r", " ").Replace("\n", " ") ?? "";
        return $"\"{normalized.Replace("\"", "\"\"")}\"";
    }
}
