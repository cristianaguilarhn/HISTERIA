var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection("Email"));
builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();
var visitCount = 0;
var visitLock = new object();
var contactRequests = new List<ContactSubmission>();
var contactLock = new object();
var nextContactId = 1;

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");

app.MapGet("/visits", () =>
{
    lock (visitLock)
    {
        return Results.Ok(new VisitCounterResponse(visitCount));
    }
})
.WithName("GetVisitCount");

app.MapPost("/visits", () =>
{
    lock (visitLock)
    {
        visitCount++;
        return Results.Ok(new VisitCounterResponse(visitCount));
    }
})
.WithName("RegisterVisit");

app.MapGet("/contact", () =>
{
    lock (contactLock)
    {
        return Results.Ok(contactRequests.OrderByDescending(request => request.ReceivedAt).ToArray());
    }
})
.WithName("GetContactRequests");

app.MapPost("/contact", async (ContactRequest request, IEmailSender emailSender) =>
{
    if (string.IsNullOrWhiteSpace(request.NombreSolicitante) ||
        string.IsNullOrWhiteSpace(request.Telefono) ||
        string.IsNullOrWhiteSpace(request.NombreEvento) ||
        string.IsNullOrWhiteSpace(request.TipoEvento) ||
        string.IsNullOrWhiteSpace(request.Ubicacion) ||
        string.IsNullOrWhiteSpace(request.FechaEvento))
    {
        return Results.BadRequest(new ContactResponse(false, "Completa los campos requeridos de la solicitud."));
    }

    ContactSubmission submission;
    lock (contactLock)
    {
        submission = new ContactSubmission(
            nextContactId++,
            DateTimeOffset.UtcNow,
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
        );

        contactRequests.Add(submission);
    }

    try
    {
        await emailSender.SendContactRequestAsync(submission);
    }
    catch (Exception error)
    {
        app.Logger.LogError(error, "No se pudo enviar el correo de la solicitud #{Id}.", submission.Id);

        return Results.Json(
            new ContactResponse(false, "No se pudo enviar la solicitud por correo. Inténtalo de nuevo."),
            statusCode: StatusCodes.Status500InternalServerError
        );
    }

    return Results.Ok(new ContactResponse(
        true,
        "Solicitud recibida. Tensión Retro se pondrá en contacto pronto."
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

public record VisitCounterResponse(int Count);

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

public record ContactResponse(bool Success, string Message);

public record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
