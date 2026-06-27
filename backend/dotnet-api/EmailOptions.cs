public sealed class EmailOptions
{
    public ResendOptions Resend { get; init; } = new();
    public string RecipientEmail { get; init; } = "xtian.osx@gmail.com";
    public string FromEmail { get; init; } = "";
    public string FromName { get; init; } = "Histeria";
}

public sealed class ResendOptions
{
    public string ApiKey { get; init; } = "";
    public string ApiUrl { get; init; } = "https://api.resend.com/emails";
    public string FromEmail { get; init; } = "onboarding@resend.dev";
}
