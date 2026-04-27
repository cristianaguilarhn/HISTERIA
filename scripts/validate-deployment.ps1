# Validation Script for Tensionretro AWS Deployment (Windows)
# Ejecutar desde PowerShell: .\scripts\validate-deployment.ps1

$ErrorActionPreference = "Stop"

function Write-Status {
    param(
        [bool]$Success,
        [string]$Message
    )
    if ($Success) {
        Write-Host "✓ $Message" -ForegroundColor Green
    } else {
        Write-Host "✗ $Message" -ForegroundColor Red
    }
}

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  Tensionretro - Validación de Configuración de Despliegue   ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Yellow

# 1. Verificar archivos de configuración
Write-Host "1. Verificando archivos de configuración..." -ForegroundColor Yellow

$filesToCheck = @(
    "backend/dotnet-api/Dockerfile",
    "backend/dotnet-api/appsettings.json",
    "backend/dotnet-api/appsettings.Production.json",
    "backend/dotnet-api/Program.cs",
    "backend/dotnet-api/dotnet-api.csproj",
    "frontend/web-admin/Dockerfile",
    "deploy/docker/docker-compose.yml"
)

foreach ($file in $filesToCheck) {
    $exists = Test-Path $file
    Write-Status $exists "$(if($exists) { 'Encontrado' } else { 'Faltante' }): $file"
}

Write-Host ""

# 2. Verificar secretos en appsettings.json
Write-Host "2. Verificando seguridad (sin secretos reales en archivos)..." -ForegroundColor Yellow

$appsettingsPath = "backend/dotnet-api/appsettings.json"
$content = Get-Content $appsettingsPath -Raw
$hasRealSecrets = $content -match "twyn xuaf ggao jhks"
Write-Status (-not $hasRealSecrets) "Secretos no están en appsettings.json"

$hasPlaceholders = $content -match "change-this"
Write-Status $hasPlaceholders "appsettings.json contiene placeholders (correcto)"

Write-Host ""

# 3. Verificar que Program.cs tiene env var support
Write-Host "3. Verificando soporte de variables de entorno..." -ForegroundColor Yellow

$programPath = "backend/dotnet-api/Program.cs"
$programContent = Get-Content $programPath -Raw

$hasEnvVars = $programContent -match "Environment.GetEnvironmentVariable"
Write-Status $hasEnvVars "Program.cs lee variables de entorno"

$hasPostgres = $programContent -match "UseNpgsql"
Write-Status $hasPostgres "Program.cs soporta PostgreSQL"

$hasSqlite = $programContent -match "UseSqlite"
Write-Status $hasSqlite "Program.cs soporta SQLite (desarrollo)"

Write-Host ""

# 4. Verificar Npgsql en csproj
Write-Host "4. Verificando dependencias..." -ForegroundColor Yellow

$csprojPath = "backend/dotnet-api/dotnet-api.csproj"
$csprojContent = Get-Content $csprojPath -Raw
$hasNpgsql = $csprojContent -match "Npgsql.EntityFrameworkCore.PostgreSQL"
Write-Status $hasNpgsql "Npgsql agregado en csproj"

Write-Host ""

# 5. Verificar .gitignore
Write-Host "5. Verificando .gitignore..." -ForegroundColor Yellow

$gitignorePath = ".gitignore"
$gitignoreContent = Get-Content $gitignorePath -Raw

$hasDevelopmentIgnore = $gitignoreContent -match "appsettings.Development.json"
Write-Status $hasDevelopmentIgnore "appsettings.Development.json está en .gitignore"

$hasEnvIgnore = $gitignoreContent -match "\.env"
Write-Status $hasEnvIgnore ".env está en .gitignore"

Write-Host ""

# 6. Verificar Docker
Write-Host "6. Verificando Docker availability..." -ForegroundColor Yellow

$dockerExists = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)
if ($dockerExists) {
    $version = docker --version
    Write-Status $true "Docker instalado: $version"
} else {
    Write-Status $false "Docker NO instalado"
}

Write-Host ""

# 7. Verificar docker-compose
Write-Host "7. Verificando docker-compose..." -ForegroundColor Yellow

$dockerComposePath = "deploy/docker/docker-compose.yml"
$dockerComposeContent = Get-Content $dockerComposePath -Raw

$hasPostgresCompose = $dockerComposeContent -match "postgres:17-alpine"
Write-Status $hasPostgresCompose "docker-compose.yml usa PostgreSQL"

$hasConnString = $dockerComposeContent -match "ConnectionStrings__DefaultConnection"
Write-Status $hasConnString "docker-compose.yml configura connection string"

Write-Host ""

# 8. Verificar Dockerfiles
Write-Host "8. Verificando Dockerfiles..." -ForegroundColor Yellow

$backendDockerfilePath = "backend/dotnet-api/Dockerfile"
$backendDockerfileContent = Get-Content $backendDockerfilePath -Raw
$hasBackendBuild = $backendDockerfileContent -match "FROM mcr.microsoft.com/dotnet/sdk:10.0"
Write-Status $hasBackendBuild "Backend Dockerfile: build stage configurado"

$frontendDockerfilePath = "frontend/web-admin/Dockerfile"
$frontendDockerfileContent = Get-Content $frontendDockerfilePath -Raw
$hasFrontendBuild = $frontendDockerfileContent -match "FROM node:22-alpine"
Write-Status $hasFrontendBuild "Frontend Dockerfile: node build stage configurado"

Write-Host ""

# 9. Resumen
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║                    VALIDACIÓN COMPLETADA                    ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Yellow

Write-Host "✓ Próximos pasos:" -ForegroundColor Green
Write-Host "1. Probar localmente con docker-compose:"
Write-Host "   cd deploy/docker && docker-compose up"
Write-Host ""
Write-Host "2. Validar endpoints:"
Write-Host "   curl http://localhost:5000/visits"
Write-Host ""
Write-Host "3. Revisar logs:"
Write-Host "   docker logs tensionretro-api"
Write-Host ""
Write-Host "4. Preparar AWS (ver AWS-DEPLOYMENT-PLAN.md):"
Write-Host "   - Crear RDS PostgreSQL"
Write-Host "   - Crear ECR registry"
Write-Host "   - Configurar ECS Fargate"
Write-Host ""
