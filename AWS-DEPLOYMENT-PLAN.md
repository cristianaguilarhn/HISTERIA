# Tensionretro - Plan de Despliegue AWS 2026

**Versión**: 1.0  
**Fecha**: Abril 24, 2026  
**Estado**: En Preparación

---

## 📊 Índice

1. [Estado Actual](#estado-actual)
2. [Cambios Realizados](#cambios-realizados)
3. [Próximas Fases](#próximas-fases)
4. [Guía de Despliegue](#guía-de-despliegue)
5. [Checklist de Seguridad](#checklist-de-seguridad)

---

## 🔍 Estado Actual

### Completado ✅

- [x] Backend preparado para PostgreSQL (sin cambios en desarrollo)
- [x] Configuración segura (env vars + Secrets Manager ready)
- [x] Dockerfile para backend (multi-stage)
- [x] Dockerfile para frontend (Vite + nginx)
- [x] docker-compose.yml actualizado (PostgreSQL)
- [x] appsettings.Production.json creado
- [x] Documentación de despliegue
- [x] CORS configurable por entorno
- [x] Soporte para desarrollo local (SQLite) y producción (PostgreSQL)

### En Progreso 🟡

- Pruebas con docker-compose local
- Validación de conexión PostgreSQL
- Configuración de AWS Secrets Manager

### Por Hacer 🔴

- Crear RDS PostgreSQL en AWS
- Crear ECR registry
- Configurar ECS Fargate
- Crear ALB + HTTPS
- Migrar datos SQLite → PostgreSQL (si aplica)
- Configurar CloudFront para frontend

---

## 📝 Cambios Realizados

### 1. Backend - Program.cs

**Antes:**
```csharp
// Hardcoded SQLite
options.UseSqlite(connectionString ?? "Data Source=tensionretro.db");

// CORS hardcoded
.WithOrigins("http://localhost:5173")

// Secretos solo desde config
var adminPassword = builder.Configuration["Admin:Password"] ?? adminApiKey;
```

**Después:**
```csharp
// Flexible: PostgreSQL en prod, SQLite en dev
if (environment == "Production" && !string.IsNullOrEmpty(connectionString))
{
    options.UseNpgsql(connectionString);  // PostgreSQL
}
else
{
    options.UseSqlite(devConnectionString);  // SQLite (default)
}

// CORS desde env var
var allowedOrigins = builder.Configuration["AllowedOrigins"] ?? "http://localhost:5173";
var origins = allowedOrigins.Split(";", StringSplitOptions.RemoveEmptyEntries);
.WithOrigins(origins)

// Secretos desde env vars (con fallback)
var adminPassword = Environment.GetEnvironmentVariable("ADMIN_PASSWORD")
    ?? builder.Configuration["Admin:Password"] 
    ?? adminApiKey;
```

### 2. Nuevos Archivos

#### Backend
- **Dockerfile** - Multi-stage build ASP.NET Core
- **appsettings.Production.json** - Config limpia sin secretos
- **DEPLOYMENT.md** - Guía completa de despliegue
- **README-DEPLOYMENT.md** - Guía rápida
- **.env.example** - Referencia de variables

#### Frontend
- **Dockerfile** - Vite + nginx

#### DevOps
- **docker-compose.yml** - Actualizado a PostgreSQL

### 3. Cambios en dependencias

**dotnet-api.csproj**
```xml
<!-- Agregado -->
<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="10.0.0" />
```

### 4. Seguridad

- ✅ `appsettings.json` limpiado (sin secretos reales)
- ✅ `.gitignore` ya protege secretos locales
- ✅ Variables de entorno para producción
- ✅ AWS Secrets Manager ready

---

## 📋 Próximas Fases

### Fase 1: Validación Local (Esta Semana)

```bash
# 1. Restore y build
cd backend/dotnet-api
dotnet restore
dotnet build

# 2. Probar con docker-compose + PostgreSQL
cd ../../deploy/docker
docker-compose up

# 3. Validar endpoints
curl http://localhost:5000/visits
```

### Fase 2: Setup AWS (Próxima Semana)

1. **RDS PostgreSQL**
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier tensionretro-db \
     --db-instance-class db.t4g.micro \
     --engine postgres
   ```

2. **ECR Registry**
   ```bash
   aws ecr create-repository --repository-name tensionretro-api
   ```

3. **Secrets Manager**
   ```bash
   aws secretsmanager create-secret \
     --name tensionretro/admin-password \
     --secret-string 'StrongPassword'
   ```

4. **ECS + ALB**
   - Crear cluster ECS
   - Task definition para backend
   - Application Load Balancer
   - Target group

5. **CloudFront + S3**
   - S3 bucket para frontend
   - CloudFront distribution
   - ACM certificate

### Fase 3: Deploy (Semana 3)

1. Build y push a ECR
2. Actualizar ECS service
3. Health checks
4. Validar CORS
5. Pruebas de integración

---

## 🚀 Guía de Despliegue

### Local Development

```bash
# Opción 1: SQLite rápido
cd backend/dotnet-api
dotnet run --launch-profile http
# http://localhost:5198

# Opción 2: PostgreSQL + Docker
cd deploy/docker
docker-compose up
# API: http://localhost:5000
# Web: http://localhost:3000
```

### AWS Despliegue

#### Step 1: Preparar imagen

```bash
cd backend/dotnet-api
docker build -t tensionretro-api:latest .

# Login a ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Tag y push
docker tag tensionretro-api:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/tensionretro-api:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/tensionretro-api:latest
```

#### Step 2: ECS Task Definition

```json
{
  "family": "tensionretro-api",
  "containerDefinitions": [
    {
      "name": "tensionretro-api",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/tensionretro-api:latest",
      "portMappings": [{"containerPort": 80, "hostPort": 80}],
      "environment": [
        {"name": "ASPNETCORE_ENVIRONMENT", "value": "Production"},
        {"name": "AllowedOrigins", "value": "https://tensionretro.com"}
      ],
      "secrets": [
        {
          "name": "ADMIN_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:tensionretro/admin-password"
        }
      ]
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512"
}
```

#### Step 3: ALB + HTTPS

```bash
# ALB listener en puerto 443 (HTTPS)
# Certificate: ACM (gratuito)
# Redirect HTTP → HTTPS
# Health check: GET /visits
```

---

## ☑️ Checklist de Seguridad

### Antes de Desplegar

- [ ] No hay secretos en appsettings.json
- [ ] .gitignore protege .Development.json
- [ ] Variables de entorno documentadas
- [ ] AWS Secrets Manager configurado
- [ ] RDS en subnet privada
- [ ] ALB con HTTPS + redirect
- [ ] CORS configurado correctamente
- [ ] Backups de BD habilitados
- [ ] CloudWatch Logs habilitado
- [ ] WAF en CloudFront (opcional)
- [ ] Rate limiting (futuro)

### Después de Desplegar

- [ ] Health check pasando
- [ ] Logs en CloudWatch
- [ ] Alertas configuradas
- [ ] Backups funcionando
- [ ] Certificates renovándose automáticamente

---

## 📞 Documentación Relacionada

- [Backend Deployment Guide](./backend/dotnet-api/DEPLOYMENT.md)
- [Quick Start](./backend/dotnet-api/README-DEPLOYMENT.md)
- [Environment Variables](./.env.example)
- [Docker Compose Config](./deploy/docker/docker-compose.yml)

---

## 🔄 Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 24-04-2026 | Preparación inicial: DB flexible, env vars, Dockerfiles |

---

**Responsable**: DevOps Lead  
**Próxima Revisión**: 28-04-2026
