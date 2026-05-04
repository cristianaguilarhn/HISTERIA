using System.Security.Cryptography;
using System.Text;
using Npgsql;

var connectionString = Environment.GetEnvironmentVariable("ADMIN_DB_CONNECTION_STRING");
if (string.IsNullOrWhiteSpace(connectionString))
{
    Console.Error.WriteLine("Set ADMIN_DB_CONNECTION_STRING before running this script.");
    Environment.Exit(1);
}

if (args.Length < 3)
{
    Console.Error.WriteLine("Usage: dotnet run -- <username> <displayName> <password>");
    Environment.Exit(1);
}

var username = args[0];
var displayName = args[1];
var passwordHash = HashPassword(args[2]);

await using var connection = new NpgsqlConnection(connectionString);
await connection.OpenAsync();

await using var command = connection.CreateCommand();
command.CommandText = """
INSERT INTO "AdminUsers" ("Username", "DisplayName", "PasswordHash", "CreatedAt")
VALUES (@username, @displayName, @passwordHash, @createdAt)
ON CONFLICT ("Username") DO UPDATE SET
    "DisplayName" = @displayName,
    "PasswordHash" = @passwordHash,
    "CreatedAt" = @createdAt;
""";

command.Parameters.AddWithValue("@username", username);
command.Parameters.AddWithValue("@displayName", displayName);
command.Parameters.AddWithValue("@passwordHash", passwordHash);
command.Parameters.AddWithValue("@createdAt", DateTimeOffset.UtcNow);

var rowsAffected = await command.ExecuteNonQueryAsync();
Console.WriteLine($"Admin user upserted. Rows affected: {rowsAffected}");

static string HashPassword(string password)
{
    const int iterations = 310000;
    var salt = RandomNumberGenerator.GetBytes(16);
    var hash = Rfc2898DeriveBytes.Pbkdf2(
        Encoding.UTF8.GetBytes(password),
        salt,
        iterations,
        HashAlgorithmName.SHA256,
        32
    );

    return $"pbkdf2-sha256|{iterations}|{Convert.ToBase64String(salt)}|{Convert.ToBase64String(hash)}";
}
