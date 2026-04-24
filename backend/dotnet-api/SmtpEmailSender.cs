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

        var fromEmail = string.IsNullOrWhiteSpace(options.FromEmail)
            ? options.Smtp.Username
            : options.FromEmail;

        using var message = new MailMessage
        {
            From = new MailAddress(fromEmail, options.FromName, Encoding.UTF8),
            Subject = $"Nueva solicitud de contratación - {request.NombreEvento}",
            Body = BuildHtmlBody(request),
            IsBodyHtml = true,
            BodyEncoding = Encoding.UTF8,
            SubjectEncoding = Encoding.UTF8
        };

        message.To.Add(new MailAddress(options.RecipientEmail));

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
            "Correo de solicitud #{Id} enviado a {RecipientEmail}.",
            request.Id,
            options.RecipientEmail
        );
    }

    private void ValidateOptions()
    {
        if (string.IsNullOrWhiteSpace(options.RecipientEmail))
        {
            throw new InvalidOperationException("Email:RecipientEmail no está configurado.");
        }

        if (string.IsNullOrWhiteSpace(options.Smtp.Host) ||
            string.IsNullOrWhiteSpace(options.Smtp.Username) ||
            string.IsNullOrWhiteSpace(options.Smtp.Password))
        {
            throw new InvalidOperationException(
                "Configura Email:Smtp:Host, Email:Smtp:Username y Email:Smtp:Password para enviar correos."
            );
        }
    }

    private static string BuildHtmlBody(ContactSubmission request)
    {
        var rows = new[]
        {
            Field("Nombre", request.NombreSolicitante),
            Field("Teléfono", request.Telefono),
            Field("Correo", request.Correo),
            Field("Nombre del local o evento", request.NombreEvento),
            Field("Tipo de evento", request.TipoEvento),
            Field("Tamaño o personas aproximadas", request.CantidadPersonas),
            Field("Ubicación", request.Ubicacion),
            Field("Fecha", request.FechaEvento),
            Field("Hora", request.HoraEstimada),
            Field("Duración", request.DuracionEsperada),
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
                Tensión Retro
              </p>
              <h1 style="margin:0 0 18px;color:#fff8ec;font-size:28px;line-height:1.1;">
                Nueva solicitud de contratación
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
