using System.Net;
using System.Net.Mail;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.Extensions.Options;

public sealed class SmtpEmailSender : IEmailSender
{
    private readonly EmailOptions options;
    private readonly ILogger<SmtpEmailSender> logger;

    public SmtpEmailSender(IOptions<EmailOptions> options, ILogger<SmtpEmailSender> logger)
    {
        this.options = options.Value;
        this.logger = logger;
    }

    public async Task SendContactRequestAsync(ContactSubmission request)
    {
        ValidateOptions();

        var fromEmail = string.IsNullOrWhiteSpace(options.Smtp.FromEmail)
            ? (string.IsNullOrWhiteSpace(options.FromEmail)
                ? options.Smtp.Username
                : options.FromEmail)
            : options.Smtp.FromEmail;
        var fromName = string.IsNullOrWhiteSpace(options.Smtp.FromName)
            ? options.FromName
            : options.Smtp.FromName;
        var recipientEmail = string.IsNullOrWhiteSpace(options.Smtp.RecipientEmail)
            ? options.RecipientEmail
            : options.Smtp.RecipientEmail;

        using var message = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName, Encoding.UTF8),
            Subject = $"Nueva solicitud de contratacion - {request.NombreEvento}",
            Body = BuildHtmlBody(request),
            IsBodyHtml = true,
            BodyEncoding = Encoding.UTF8,
            SubjectEncoding = Encoding.UTF8
        };

        message.To.Add(new MailAddress(recipientEmail));

        if (MailAddress.TryCreate(request.Correo, out var replyTo))
        {
            message.ReplyToList.Add(replyTo);
        }

        using var client = new SmtpClient(options.Smtp.Host, options.Smtp.Port)
        {
            EnableSsl = options.Smtp.EnableSsl,
            Credentials = new NetworkCredential(options.Smtp.Username, options.Smtp.Password)
        };

        await client.SendMailAsync(message);

        logger.LogInformation(
            "Correo de solicitud #{Id} enviado a {RecipientEmail} usando {Host}:{Port}.",
            request.Id,
            recipientEmail,
            options.Smtp.Host,
            options.Smtp.Port
        );
    }

    private void ValidateOptions()
    {
        var recipientEmail = string.IsNullOrWhiteSpace(options.Smtp.RecipientEmail)
            ? options.RecipientEmail
            : options.Smtp.RecipientEmail;

        if (string.IsNullOrWhiteSpace(recipientEmail))
        {
            throw new InvalidOperationException("Email:RecipientEmail o Email:Smtp:RecipientEmail no esta configurado.");
        }

        if (string.IsNullOrWhiteSpace(options.Smtp.Host))
        {
            throw new InvalidOperationException("Email:Smtp:Host no esta configurado.");
        }

        if (string.IsNullOrWhiteSpace(options.Smtp.Username))
        {
            throw new InvalidOperationException("Email:Smtp:Username no esta configurado.");
        }

        if (IsPlaceholder(options.Smtp.Username))
        {
            throw new InvalidOperationException(
                "Email:Smtp:Username sigue con un valor de ejemplo."
            );
        }

        if (string.IsNullOrWhiteSpace(options.Smtp.Password))
        {
            throw new InvalidOperationException(
                "Email:Smtp:Password no esta configurado. Gmail requiere un App Password, no la contrasena normal."
            );
        }

        if (IsPlaceholder(options.Smtp.Password))
        {
            throw new InvalidOperationException(
                "Email:Smtp:Password sigue con un valor de ejemplo. Reemplazalo por un Gmail App Password real."
            );
        }
    }

    private static bool IsPlaceholder(string value)
    {
        var normalized = value.Trim();
        return normalized.Equals("TU_APP_PASSWORD_AQUI", StringComparison.OrdinalIgnoreCase) ||
            normalized.Equals("xxxx xxxx xxxx xxxx", StringComparison.OrdinalIgnoreCase) ||
            normalized.Equals("your-email@gmail.com", StringComparison.OrdinalIgnoreCase) ||
            normalized.Equals("your-app-password", StringComparison.OrdinalIgnoreCase) ||
            normalized.Equals("your-app-password-here", StringComparison.OrdinalIgnoreCase);
    }

    private static string BuildHtmlBody(ContactSubmission request)
    {
        var rows = new[]
        {
            Field("Nombre", request.NombreSolicitante),
            Field("Telefono", request.Telefono),
            Field("Correo", request.Correo),
            Field("Nombre del local o evento", request.NombreEvento),
            Field("Tipo de evento", request.TipoEvento),
            Field("Tamano o personas aproximadas", request.CantidadPersonas),
            Field("Ubicacion", request.Ubicacion),
            Field("Fecha", request.FechaEvento),
            Field("Hora", request.HoraEstimada),
            Field("Duracion", request.DuracionEsperada),
            Field("Presupuesto", request.PresupuestoAproximado),
            Field("Detalles importantes", request.DetallesImportantes)
        };

        return $$"""
        <!doctype html>
        <html lang="es">
        <body style="margin:0;background:#14110f;color:#fff8ec;font-family:Segoe UI,Arial,sans-serif;">
          <div style="max-width:680px;margin:0 auto;padding:32px;">
            <div style="border:1px solid rgba(245,192,83,.28);border-radius:24px;padding:28px;background:#1f1915;">
              <p style="margin:0 0 8px;color:#f5c053;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;">
                Tension Retro
              </p>
              <h1 style="margin:0 0 18px;color:#fff8ec;font-size:28px;line-height:1.1;">
                Nueva solicitud de contratacion
              </h1>
              <p style="margin:0 0 24px;color:#d8cabc;line-height:1.6;">
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
          <td style="width:38%;padding:12px 10px;border-top:1px solid rgba(255,255,255,.1);color:#f5c053;font-weight:800;vertical-align:top;">
            {{Html(label)}}
          </td>
          <td style="padding:12px 10px;border-top:1px solid rgba(255,255,255,.1);color:#fff8ec;vertical-align:top;">
            {{Html(displayValue)}}
          </td>
        </tr>
        """;
    }

    private static string Html(string value)
    {
        return HtmlEncoder.Default.Encode(value);
    }
}
