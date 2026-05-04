# Create or update an admin user in PostgreSQL.
# Provide the DB connection through -ConnectionString or ADMIN_DB_CONNECTION_STRING.

param(
    [string]$ConnectionString = $env:ADMIN_DB_CONNECTION_STRING,
    [Parameter(Mandatory = $true)]
    [string]$Username,
    [Parameter(Mandatory = $true)]
    [string]$DisplayName,
    [Parameter(Mandatory = $true)]
    [string]$Password
)

if ([string]::IsNullOrWhiteSpace($ConnectionString)) {
    Write-Error "Provide -ConnectionString or set ADMIN_DB_CONNECTION_STRING."
    exit 1
}

function New-PBKDF2Hash {
    param([string]$PlainTextPassword)

    $iterations = 310000
    $salt = New-Object byte[] 16
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($salt)
    } finally {
        $rng.Dispose()
    }

    $hash = [System.Security.Cryptography.Rfc2898DeriveBytes]::Pbkdf2(
        [System.Text.Encoding]::UTF8.GetBytes($PlainTextPassword),
        $salt,
        $iterations,
        [System.Security.Cryptography.HashAlgorithmName]::SHA256,
        32
    )

    return "pbkdf2-sha256|$iterations|$([Convert]::ToBase64String($salt))|$([Convert]::ToBase64String($hash))"
}

$npgsqlDll = Get-ChildItem "$env:USERPROFILE\.nuget\packages\npgsql\*\lib\*\Npgsql.dll" -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending |
    Select-Object -First 1

if (-not $npgsqlDll) {
    Write-Error "Npgsql.dll not found in NuGet cache. Restore a project that references Npgsql first."
    exit 1
}

Add-Type -Path $npgsqlDll.FullName

$passwordHash = New-PBKDF2Hash -PlainTextPassword $Password
$connection = New-Object Npgsql.NpgsqlConnection($ConnectionString)

try {
    $connection.Open()

    $command = $connection.CreateCommand()
    $command.CommandText = @"
INSERT INTO "AdminUsers" ("Username", "DisplayName", "PasswordHash", "CreatedAt")
VALUES (@username, @displayName, @passwordHash, @createdAt)
ON CONFLICT ("Username") DO UPDATE SET
    "DisplayName" = @displayName,
    "PasswordHash" = @passwordHash,
    "CreatedAt" = @createdAt;
"@

    $command.Parameters.AddWithValue("@username", $Username) | Out-Null
    $command.Parameters.AddWithValue("@displayName", $DisplayName) | Out-Null
    $command.Parameters.AddWithValue("@passwordHash", $passwordHash) | Out-Null
    $command.Parameters.AddWithValue("@createdAt", [System.DateTimeOffset]::UtcNow) | Out-Null

    $rowsAffected = $command.ExecuteNonQuery()
    Write-Host "Admin user upserted. Rows affected: $rowsAffected"
} finally {
    $connection.Dispose()
}
