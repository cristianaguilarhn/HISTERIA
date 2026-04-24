public interface IEmailSender
{
    Task SendContactRequestAsync(ContactSubmission request);
}
