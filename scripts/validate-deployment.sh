#!/bin/bash
# Validation Script for Tensionretro AWS Deployment
# Ejecutar desde la raíz del proyecto: ./scripts/validate-deployment.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Tensionretro - Validación de Configuración de Despliegue   ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Color output helper
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
    fi
}

# 1. Verificar archivos de configuración
echo -e "${YELLOW}1. Verificando archivos de configuración...${NC}"

files_to_check=(
    "backend/dotnet-api/Dockerfile"
    "backend/dotnet-api/appsettings.json"
    "backend/dotnet-api/appsettings.Production.json"
    "backend/dotnet-api/Program.cs"
    "backend/dotnet-api/dotnet-api.csproj"
    "frontend/web-admin/Dockerfile"
    "deploy/docker/docker-compose.yml"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        print_status 0 "Encontrado: $file"
    else
        print_status 1 "Faltante: $file"
    fi
done

echo ""

# 2. Verificar secretos en appsettings.json
echo -e "${YELLOW}2. Verificando seguridad (sin secretos reales en archivos)...${NC}"

if grep -q "twyn xuaf ggao jhks" backend/dotnet-api/appsettings.json 2>/dev/null; then
    print_status 1 "ALERTA: Secretos reales en appsettings.json!"
else
    print_status 0 "Secretos no están en appsettings.json"
fi

if grep -q "change-this" backend/dotnet-api/appsettings.json; then
    print_status 0 "appsettings.json contiene placeholders (correcto)"
else
    print_status 1 "Placeholders no encontrados"
fi

echo ""

# 3. Verificar que Program.cs tiene env var support
echo -e "${YELLOW}3. Verificando soporte de variables de entorno...${NC}"

if grep -q "Environment.GetEnvironmentVariable" backend/dotnet-api/Program.cs; then
    print_status 0 "Program.cs lee variables de entorno"
else
    print_status 1 "Program.cs NO lee variables de entorno"
fi

if grep -q "UseNpgsql" backend/dotnet-api/Program.cs; then
    print_status 0 "Program.cs soporta PostgreSQL"
else
    print_status 1 "Program.cs NO soporta PostgreSQL"
fi

if grep -q "UseSqlite" backend/dotnet-api/Program.cs; then
    print_status 0 "Program.cs soporta SQLite (desarrollo)"
else
    print_status 1 "Program.cs NO soporta SQLite"
fi

echo ""

# 4. Verificar Npgsql en csproj
echo -e "${YELLOW}4. Verificando dependencias...${NC}"

if grep -q "Npgsql.EntityFrameworkCore.PostgreSQL" backend/dotnet-api/dotnet-api.csproj; then
    print_status 0 "Npgsql agregado en csproj"
else
    print_status 1 "Npgsql NO está en csproj"
fi

echo ""

# 5. Verificar .gitignore
echo -e "${YELLOW}5. Verificando .gitignore...${NC}"

if grep -q "appsettings.Development.json" .gitignore; then
    print_status 0 "appsettings.Development.json está en .gitignore"
else
    print_status 1 "appsettings.Development.json NO está en .gitignore"
fi

if grep -q "\.env" .gitignore; then
    print_status 0 ".env está en .gitignore"
else
    print_status 1 ".env NO está en .gitignore"
fi

echo ""

# 6. Verificar Docker
echo -e "${YELLOW}6. Verificando Docker availability...${NC}"

if command -v docker &> /dev/null; then
    version=$(docker --version)
    print_status 0 "Docker instalado: $version"
else
    print_status 1 "Docker NO instalado"
fi

echo ""

# 7. Verificar docker-compose
echo -e "${YELLOW}7. Verificando docker-compose...${NC}"

if grep -q "postgres:17-alpine" deploy/docker/docker-compose.yml; then
    print_status 0 "docker-compose.yml usa PostgreSQL"
else
    print_status 1 "docker-compose.yml NO usa PostgreSQL"
fi

if grep -q "ConnectionStrings__DefaultConnection" deploy/docker/docker-compose.yml; then
    print_status 0 "docker-compose.yml configura connection string"
else
    print_status 1 "docker-compose.yml NO configura connection string"
fi

echo ""

# 8. Verificar Dockerfiles
echo -e "${YELLOW}8. Verificando Dockerfiles...${NC}"

if grep -q "FROM mcr.microsoft.com/dotnet/sdk:10.0" backend/dotnet-api/Dockerfile; then
    print_status 0 "Backend Dockerfile: build stage configurado"
else
    print_status 1 "Backend Dockerfile: build stage NO configurado"
fi

if grep -q "FROM node:22-alpine" frontend/web-admin/Dockerfile; then
    print_status 0 "Frontend Dockerfile: node build stage configurado"
else
    print_status 1 "Frontend Dockerfile: node build stage NO configurado"
fi

echo ""

# 9. Resumen y próximos pasos
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║                    VALIDACIÓN COMPLETADA                    ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✓ Próximos pasos:${NC}"
echo "1. Probar localmente con docker-compose:"
echo "   cd deploy/docker && docker-compose up"
echo ""
echo "2. Validar endpoints:"
echo "   curl http://localhost:5000/visits"
echo ""
echo "3. Revisar logs:"
echo "   docker logs tensionretro-api"
echo ""
echo "4. Preparar AWS (ver AWS-DEPLOYMENT-PLAN.md):"
echo "   - Crear RDS PostgreSQL"
echo "   - Crear ECR registry"
echo "   - Configurar ECS Fargate"
echo ""
