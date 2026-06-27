using System.Net.Http.Headers;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

public sealed class ResendEmailSender : IEmailSender
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly EmailOptions options;
    private readonly HttpClient httpClient;
    private readonly ILogger<ResendEmailSender> logger;

    public ResendEmailSender(
        IOptions<EmailOptions> options,
        HttpClient httpClient,
        ILogger<ResendEmailSender> logger
    )
    {
        this.options = options.Value;
        this.httpClient = httpClient;
        this.logger = logger;
    }

    public async Task SendContactRequestAsync(ContactSubmission request)
    {
        ValidateOptions();

        var senderName = string.IsNullOrWhiteSpace(options.FromName)
            ? "Histeria"
            : options.FromName.Trim();
        var senderEmail = string.IsNullOrWhiteSpace(options.Resend.FromEmail)
            ? options.FromEmail.Trim()
            : options.Resend.FromEmail.Trim();

        var payload = new
        {
            from = $"{senderName} <{senderEmail}>",
            to = new[] { options.RecipientEmail.Trim() },
            subject = $"Nueva solicitud de contratación - {request.NombreEvento}",
            html = BuildHtmlBody(request),
            reply_to = string.IsNullOrWhiteSpace(request.Correo)
                ? null
                : new[] { request.Correo.Trim() }
        };

        using var message = new HttpRequestMessage(
            HttpMethod.Post,
            options.Resend.ApiUrl.Trim()
        );
        message.Headers.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            options.Resend.ApiKey.Trim()
        );
        message.Headers.UserAgent.ParseAdd("Histeria/1.0");
        message.Headers.TryAddWithoutValidation(
            "Idempotency-Key",
            $"contact-request-{request.Id}"
        );
        message.Content = new StringContent(
            JsonSerializer.Serialize(payload, JsonOptions),
            Encoding.UTF8,
            "application/json"
        );

        using var response = await httpClient.SendAsync(message);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"Resend respondio {(int)response.StatusCode}: {Limit(responseBody, 500)}"
            );
        }

        logger.LogInformation(
            "Correo de solicitud #{Id} enviado a {RecipientEmail} mediante Resend.",
            request.Id,
            options.RecipientEmail
        );
    }

    private void ValidateOptions()
    {
        if (string.IsNullOrWhiteSpace(options.Resend.ApiKey) ||
            IsPlaceholder(options.Resend.ApiKey))
        {
            throw new InvalidOperationException(
                "Email:Resend:ApiKey no esta configurado."
            );
        }

        if (string.IsNullOrWhiteSpace(options.RecipientEmail))
        {
            throw new InvalidOperationException(
                "Email:RecipientEmail no esta configurado."
            );
        }

        if (string.IsNullOrWhiteSpace(options.Resend.FromEmail) &&
            string.IsNullOrWhiteSpace(options.FromEmail))
        {
            throw new InvalidOperationException(
                "Email:Resend:FromEmail no esta configurado."
            );
        }

        if (!Uri.TryCreate(options.Resend.ApiUrl, UriKind.Absolute, out var apiUri) ||
            apiUri.Scheme != Uri.UriSchemeHttps)
        {
            throw new InvalidOperationException(
                "Email:Resend:ApiUrl debe ser una direccion HTTPS valida."
            );
        }
    }

    private static bool IsPlaceholder(string value)
    {
        var normalized = value.Trim();
        return normalized.Equals("TU_RESEND_API_KEY_AQUI", StringComparison.OrdinalIgnoreCase) ||
            normalized.Equals("re_xxxxxxxxx", StringComparison.OrdinalIgnoreCase) ||
            normalized.Equals("your-resend-api-key", StringComparison.OrdinalIgnoreCase);
    }

    private static string BuildHtmlBody(ContactSubmission request)
    {
        var rows = new[]
        {
            Field("Nombre", request.NombreSolicitante),
            Field("Teléfono / WhatsApp", request.Telefono),
            Field("Correo", request.Correo),
            Field("Nombre del evento", request.NombreEvento),
            Field("Tipo de evento", request.TipoEvento),
            Field("Cantidad de personas", request.CantidadPersonas),
            Field("Ubicación", request.Ubicacion),
            Field("Fecha", request.FechaEvento),
            Field("Hora", request.HoraEstimada),
            Field("Duración", request.DuracionEsperada),
            Field("Presupuesto", request.PresupuestoAproximado),
            Field("Detalles", request.DetallesImportantes)
        };

        return $$"""
        <!doctype html>
        <html lang="es">
        <body style="margin:0;background:#100719;color:#fff;font-family:Segoe UI,Arial,sans-serif;">
          <div style="max-width:680px;margin:0 auto;padding:32px;">
            <div style="border:1px solid rgba(236,72,153,.35);border-radius:24px;padding:28px;background:#21102f;">
              <p style="margin:0 0 8px;color:#f472b6;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;">
                Histeria
              </p>
              <h1 style="margin:0 0 18px;color:#fff;font-size:28px;line-height:1.1;">
                Nueva solicitud de contratación
              </h1>
              <p style="margin:0 0 24px;color:#ddd0e8;line-height:1.6;">
                Recibida el {{Html(request.ReceivedAt.ToString("yyyy-MM-dd HH:mm 'UTC'"))}}.
              </p>
              <table style="width:100%;border-collapse:collapse;">
                {{string.Join("", rows)}}
              </table>
            </div>
          </div>
        </body>
        </html>
        """;
    }

    private static string Field(string label, string? value)
    {
        var displayValue = string.IsNullOrWhiteSpace(value) ? "No indicado" : value;

        return $$"""
        <tr>
          <td style="width:38%;padding:12px 10px;border-top:1px solid rgba(255,255,255,.1);color:#f472b6;font-weight:800;vertical-align:top;">
            {{Html(label)}}
          </td>
          <td style="padding:12px 10px;border-top:1px solid rgba(255,255,255,.1);color:#fff;vertical-align:top;">
            {{Html(displayValue)}}
          </td>
        </tr>
        """;
    }

    private static string Html(string value)
    {
        return HtmlEncoder.Default.Encode(value);
    }

    private static string Limit(string value, int maxLength)
    {
        return value.Length <= maxLength ? value : value[..maxLength];
    }
}
