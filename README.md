# Tensionretro - Fullstack Web Application

**Estado**: 🟡 En preparación para AWS (Abril 2026)

## 🎯 Descripción

**Tensionretro** es una aplicación fullstack moderna para gestionar eventos, contactos y métricas de visitas.

- **Frontend**: React 19 + Vite + TypeScript
- **Backend**: ASP.NET Core 10 Web API
- **Base de Datos**: SQLite (dev) / PostgreSQL RDS (prod)
- **Deploy**: Docker + AWS (ECS Fargate, CloudFront, RDS)

---

## 📋 Requisitos

- **.NET SDK** 10.0+
- **Node.js** 20+
- **npm** 10+
- **Docker** & **Docker Compose** (para desarrollo con PostgreSQL)
- **AWS CLI** (opcional, para despliegue)

---

## 🚀 Desarrollo Local - Opción Rápida (SQLite)

```powershell
# Backend
cd backend/dotnet-api
dotnet restore
dotnet run --launch-profile http
# → http://localhost:5198

# Frontend (otra terminal)
cd frontend/web-admin
npm install
npm run dev
# → http://localhost:5173
```

---

## 🐳 Desarrollo con Docker (PostgreSQL - Recomendado para Pruebas)

```bash
cd deploy/docker
docker-compose up

# Backend:  http://localhost:5000
# Frontend: http://localhost:3000
# Database: PostgreSQL en localhost:5432
```

**Credenciales por defecto:**
- Admin User: `Cristian`
- Admin Password: (ver docker-compose.yml)
- SMTP: Gmail (configurar en env vars)

---

## 📁 Estructura del Proyecto

```
Tensionretro/
├── backend/
│   └── dotnet-api/           # ASP.NET Core API
│       ├── Dockerfile         # ← NEW: Multi-stage build
│       ├── Program.cs         # ← UPD: Flexible DB + env vars
│       ├── appsettings.json
│       ├── appsettings.Production.json  # ← NEW: Sin secretos
│       ├── DEPLOYMENT.md      # ← NEW: Guía de despliegue
│       └── .env.example       # ← NEW: Variables requeridas
├── frontend/
│   └── web-admin/
│       ├── Dockerfile         # ← NEW: Vite + nginx
│       ├── src/
│       │   ├── services/api.ts
│       │   └── ...
│       └── vite.config.ts
├── deploy/
│   └── docker/
│       └── docker-compose.yml # ← UPD: PostgreSQL
├── AWS-DEPLOYMENT-PLAN.md     # ← NEW: Plan de despliegue
└── scripts/
    ├── validate-deployment.ps1 # ← NEW: Validación (Windows)
    └── validate-deployment.sh  # ← NEW: Validación (Linux/Mac)
```

---

## ⚙️ Configuración

### Variables de Entorno (Desarrollo)

Crear `backend/dotnet-api/.env.local`:

```bash
ASPNETCORE_ENVIRONMENT=Development
ADMIN_PASSWORD=dev-password
ADMIN_TOKEN_SECRET=dev-token
Email__Smtp__Username=your-email@gmail.com
Email__Smtp__Password=your-gmail-app-password
```

Ver `backend/dotnet-api/.env.example` para la lista completa.

### Base de Datos

| Entorno | BD | Archivo | Default |
|---------|-----|---------|---------|
| Development | SQLite | tensionretro.db | Automático |
| Production | PostgreSQL | RDS | Env var requerida |

---

## 🔑 Endpoints Principales

### Públicos
- `GET /visits` - Contador de visitas
- `POST /visits` - Registrar visita
- `GET /events` - Eventos públicos
- `POST /contact` - Solicitud de contacto

### Admin (requieren autenticación)
- `POST /auth/login` - Login
- `GET /admin/metrics` - Métricas
- `GET /admin/contacts` - Solicitudes de contacto
- `POST /admin/events` - Crear evento
- `GET /admin/users` - Gestión de usuarios

---

## 🧪 Validación

Ejecutar script de validación:

**Windows (PowerShell):**
```powershell
.\scripts\validate-deployment.ps1
```

**Linux/Mac (Bash):**
```bash
./scripts/validate-deployment.sh
```

Esto verifica:
- ✅ Archivos configuración
- ✅ Sin secretos en control de versión
- ✅ Soporte BD (SQLite + PostgreSQL)
- ✅ Docker files
- ✅ .gitignore

---

## 📦 Despliegue

### Local Docker

```bash
cd deploy/docker
docker-compose up
```

### AWS (En Preparación)

Ver **[AWS-DEPLOYMENT-PLAN.md](./AWS-DEPLOYMENT-PLAN.md)** para:
1. Crear RDS PostgreSQL
2. Configurar ECR + ECS Fargate
3. CloudFront + HTTPS
4. Migración de datos
5. Health checks y monitoreo

**Documentación Complementaria:**
- [Backend Deployment Guide](./backend/dotnet-api/DEPLOYMENT.md)
- [Backend Quick Start](./backend/dotnet-api/README-DEPLOYMENT.md)

---

## 🔐 Seguridad

### ✅ Implementado

- [x] Variables de entorno para secretos
- [x] `appsettings.Production.json` limpio
- [x] CORS configurable por entorno
- [x] SQLite ignorado en git
- [x] `.Development.json` en .gitignore
- [x] Soporte AWS Secrets Manager

### 📋 Por Implementar (AWS)

- [ ] RDS en subnet privada
- [ ] WAF en CloudFront
- [ ] Rate limiting
- [ ] Monitoreo centralizado

---

## 🛠️ Desarrollo

### Build

```bash
# Backend
cd backend/dotnet-api
dotnet build

# Frontend
cd frontend/web-admin
npm run build
```

### Tests

```bash
# Backend (cuando estén configurados)
dotnet test

# Frontend (cuando estén configurados)
npm run test
```

---

## 📊 Logs y Debugging

### Backend Local

```bash
# Con SQLite
dotnet run --launch-profile http

# Con PostgreSQL (Docker)
docker logs -f tensionretro-api
```

### Frontend

```bash
npm run dev
# Abre dev tools en http://localhost:5173
```

### Base de Datos (Docker)

```bash
# Conectarse a PostgreSQL
docker exec -it tensionretro-db psql -U tensionretro -d tensionretro
```

---

## 🐛 Troubleshooting

### Error: "Connection refused" en BD

```bash
# Esperar a que PostgreSQL esté listo
docker-compose down
docker-compose up db
# (esperar 5-10 segundos)
docker-compose up
```

### Error: "Port already in use"

```bash
# Cambiar puerto en docker-compose.yml
# O:
docker ps  # ver qué container está usando el puerto
docker stop <container_id>
```

### Error: CORS en frontend

- Verificar `AllowedOrigins` en backend
- En dev: debe incluir `http://localhost:5173`
- En prod: debe incluir dominio fronted

---

## 📚 Documentación

| Documento | Contenido |
|-----------|----------|
| [AWS-DEPLOYMENT-PLAN.md](./AWS-DEPLOYMENT-PLAN.md) | Plan de despliegue en AWS |
| [backend/dotnet-api/DEPLOYMENT.md](./backend/dotnet-api/DEPLOYMENT.md) | Guía de producción (variables, secretos) |
| [backend/dotnet-api/README-DEPLOYMENT.md](./backend/dotnet-api/README-DEPLOYMENT.md) | Quick start de despliegue |
| [.env.example](./backend/dotnet-api/.env.example) | Variables requeridas |

---

## 🤝 Contribución

1. Crear rama: `git checkout -b feature/mi-feature`
2. Cambios: editar código
3. Commit: `git commit -m "feat: descripción"`
4. Push: `git push origin feature/mi-feature`
5. PR: abrir pull request

---

## 📝 Changelog

### v1.1 - Abril 24, 2026 (Preparación AWS)
- ✅ Soporte PostgreSQL agregado
- ✅ Variables de entorno para configuración
- ✅ Dockerfiles para backend y frontend
- ✅ docker-compose.yml actualizado
- ✅ Documentación de despliegue

### v1.0 - Inicial
- Template fullstack ASP.NET Core + React

---

## 📞 Soporte

Para problemas con despliegue o configuración:

1. Revisar [Troubleshooting](#troubleshooting)
2. Ver documentación en `backend/dotnet-api/DEPLOYMENT.md`
3. Ejecutar validation script
4. Revisar logs: `docker logs`

---

## 📄 Licencia

[Especificar licencia]

---

**Última actualización**: Abril 24, 2026  
**Estado**: 🟡 Desarrollo + Preparación AWS


```text
http://localhost:5173
```

## Variables De Entorno

El frontend usa Vite, por lo que las variables expuestas al cliente deben iniciar con `VITE_`.

Crea un archivo `frontend/web-admin/.env` basado en `frontend/web-admin/.env.example`:

```env
VITE_API_URL=http://localhost:5198
```

`frontend/web-admin/.env` no debe versionarse. Usa `.env.example` como referencia segura para la plantilla.

## Validacion

Backend:

```powershell
cd backend/dotnet-api
dotnet build
```

Frontend:

```powershell
cd frontend/web-admin
npm run build
```
