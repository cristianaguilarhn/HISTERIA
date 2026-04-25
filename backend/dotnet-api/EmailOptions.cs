public sealed class EmailOptions
{
    public SmtpOptions Smtp { get; init; } = new();
    public string RecipientEmail { get; init; } = "xtian.osx@gmail.com";
    public string FromEmail { get; init; } = "";
    public string FromName { get; init; } = "Tensión Retro";
}

public sealed class SmtpOptions
{
    public string Host { get; init; } = "";
    public int Port { get; init; } = 587;
    public bool EnableSsl { get; init; } = true;
    public string Username { get; init; } = "";
    public string Password { get; init; } = "";
    public string FromEmail { get; init; } = "";
    public string FromName { get; init; } = "";
    public string RecipientEmail { get; init; } = "";
}
