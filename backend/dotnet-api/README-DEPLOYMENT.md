# Tensionretro - Backend listo para despliegue

## Qué quedó preparado

- Soporte para SQLite en desarrollo
- Soporte para PostgreSQL para despliegues en AWS
- CORS configurable por entorno
- Secretos leídos desde variables de entorno
- Dockerfile listo para contenedor de producción
- Endpoint `GET /health` para health checks

## Qué no se hizo de forma destructiva

- No se tocaron datos locales existentes
- No se eliminaron features del backend
- No se cambiaron endpoints del admin, eventos, métricas o formulario

## Flujo recomendado

### Desarrollo rápido

```bash
cd backend/dotnet-api
dotnet run --launch-profile http
```

### Validación tipo producción

```bash
cd deploy/docker
docker compose build
docker compose up
```

## Variables clave

Usa estas en lugar de secretos en archivos:

```bash
ConnectionStrings__DefaultConnection=Host=<RDS_ENDPOINT>;Port=5432;Database=tensionretro;Username=<RDS_USER>;Password=<RDS_PASSWORD>
ADMIN_PASSWORD=<STRONG_PASSWORD>
ADMIN_TOKEN_SECRET=<LONG_RANDOM_SECRET>
ADMIN_API_KEY=<LONG_RANDOM_API_KEY>
Email__Resend__ApiKey=<RESEND_API_KEY>
Email__RecipientEmail=<NOTIFICATION_EMAIL>
```

## Nota sobre base de datos

El proyecto ya separa SQLite y PostgreSQL correctamente.

- SQLite sigue usando la inicialización ligera histórica.
- PostgreSQL ya no ejecuta SQL específico de SQLite.

Pendiente recomendado para una fase posterior:

- crear migraciones EF formales para reemplazar el bootstrap temporal de PostgreSQL.

## Siguiente paso en AWS

1. Subir imagen a ECR
2. Crear servicio en ECS Fargate
3. Conectar RDS PostgreSQL
4. Inyectar secretos con Secrets Manager
5. Publicar frontend con S3 + CloudFront
6. Apuntar `VITE_API_URL` al dominio público del backend
