using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Csmas.Api.Services;

public interface IEmailSender
{
    Task SendAsync(string toAddress, string subject, string body, CancellationToken cancellationToken = default);
}

/// <summary>Real SMTP delivery via MailKit. With the dummy config defaults this will always throw,
/// which is intentional until real credentials are supplied — see SmtpOptions.</summary>
public class SmtpEmailSender : IEmailSender
{
    private readonly SmtpOptions _options;

    public SmtpEmailSender(IOptions<SmtpOptions> options)
    {
        _options = options.Value;
    }

    public async Task SendAsync(string toAddress, string subject, string body, CancellationToken cancellationToken = default)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_options.FromName, _options.FromAddress));
        message.To.Add(MailboxAddress.Parse(toAddress));
        message.Subject = subject;
        message.Body = new TextPart("plain") { Text = body };

        using var client = new SmtpClient();
        await client.ConnectAsync(_options.Host, _options.Port,
            _options.UseSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.None, cancellationToken);
        await client.AuthenticateAsync(_options.User, _options.Pass, cancellationToken);
        await client.SendAsync(message, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);
    }
}
