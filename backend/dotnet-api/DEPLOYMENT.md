# Configuración de Producción - Tensionretro Backend

Esta guía deja claro cómo ejecutar el backend en AWS sin secretos en el repositorio.

## Variables de entorno para producción

El backend lee la configuración en este orden:

1. Variables de entorno
2. `appsettings.Production.json`
3. `appsettings.json`

### Variables requeridas

```bash
# Base de datos (RDS PostgreSQL)
ConnectionStrings__DefaultConnection=Host=<RDS_ENDPOINT>;Port=5432;Database=tensionretro;Username=<RDS_USER>;Password=<RDS_PASSWORD>

# Admin
ADMIN_DEFAULT_USER=Cristian
ADMIN_PASSWORD=<STRONG_PASSWORD>
ADMIN_TOKEN_SECRET=<LONG_RANDOM_SECRET>
ADMIN_API_KEY=<LONG_RANDOM_API_KEY>

# CORS
AllowedOrigins=https://tensionretro.com;https://www.tensionretro.com

# Email por API HTTPS
Email__Resend__ApiKey=<RESEND_API_KEY>
Email__Resend__FromEmail=<VERIFIED_SENDER_OR_ONBOARDING_ADDRESS>
Email__FromName=Histeria
Email__RecipientEmail=<NOTIFICATION_EMAIL>

# Aplicación
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:80
```

## AWS recomendado

- Frontend: S3 + CloudFront + ACM
- Backend: ECS Fargate + ALB
- Base de datos: RDS PostgreSQL
- Secretos: AWS Secrets Manager
- Logs: CloudWatch

## Importante sobre PostgreSQL

Hoy el proyecto ya puede usar PostgreSQL en runtime, pero todavía no tiene migraciones EF formales versionadas.

Comportamiento actual:

- SQLite: se inicializa con la lógica histórica local.
- PostgreSQL: se usa `EnsureCreated()` como bootstrap temporal.

Recomendación para el siguiente paso:

1. Agregar migraciones EF formales.
2. Reemplazar el bootstrap temporal por `dotnet ef database update` en el despliegue.

Mientras tanto, el proyecto ya no ejecuta SQL específico de SQLite cuando el provider es PostgreSQL.

## Secrets Manager

Ejemplos:

```bash
aws secretsmanager create-secret \
  --name tensionretro/admin \
  --secret-string '{"password":"<STRONG_PASSWORD>","tokenSecret":"<LONG_RANDOM_SECRET>","apiKey":"<LONG_RANDOM_API_KEY>"}'

aws secretsmanager create-secret \
  --name tensionretro/resend \
  --secret-string '{"apiKey":"<RESEND_API_KEY>"}'
```

En ECS Task Definition usa `valueFrom` para inyectar secretos.

## Health check

El backend expone:

```text
GET /health
```

Úsalo para:

- Docker healthcheck
- ALB health check
- monitoreo básico en ECS

## Verificación local con Docker

```bash
cd deploy/docker
docker compose config
docker compose build
docker compose up
```

Servicios esperados:

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:3000`
- PostgreSQL: `localhost:5432`

## Checklist antes de AWS

- [ ] RDS PostgreSQL creado
- [ ] Secrets en Secrets Manager
- [ ] Dominio y certificado ACM listos
- [ ] `AllowedOrigins` configurado con dominios reales
- [ ] Resend verificado con una API key
- [ ] Backend responde `GET /health`
- [ ] Frontend compilado con `VITE_API_URL` pública del backend
- [ ] Plan de migraciones EF definido
