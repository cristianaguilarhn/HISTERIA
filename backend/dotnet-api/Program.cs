var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
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
var contactRecipient = "xtian.osx@gmail.com";
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

app.MapPost("/contact", async (ContactRequest request) =>
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

    await SendContactMessageAsync(submission, contactRecipient, app.Logger);

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

static Task SendContactMessageAsync(ContactSubmission request, string recipient, ILogger logger)
{
    // Email sending is intentionally prepared here without external dependencies.
    // Replace this log with SMTP, SendGrid, Mailgun, or another provider when credentials are available.
    logger.LogInformation(
        "Nueva solicitud #{Id} para {Recipient}: Solicitante={NombreSolicitante}, Telefono={Telefono}, Correo={Correo}, Evento={NombreEvento}, Tipo={TipoEvento}, Personas={CantidadPersonas}, Ubicacion={Ubicacion}, Fecha={FechaEvento}, Hora={HoraEstimada}, Duracion={DuracionEsperada}, Presupuesto={PresupuestoAproximado}, Detalles={DetallesImportantes}",
        request.Id,
        recipient,
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

    return Task.CompletedTask;
}

record VisitCounterResponse(int Count);

record ContactRequest(
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

record ContactSubmission(
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

record ContactResponse(bool Success, string Message);

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
