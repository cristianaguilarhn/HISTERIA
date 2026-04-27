# 🚀 Quick Reference - Tensionretro Despliegue

## 🎯 Desarrollo Local

### Opción 1: Rápido (SQLite)
```bash
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

### Opción 2: Producción-like (PostgreSQL + Docker)
```bash
cd deploy/docker
docker-compose up
# Backend:  http://localhost:5000
# Frontend: http://localhost:3000
# DB:       localhost:5432
```

---

## 🔧 Configuración Local

### Variables de Entorno
```bash
# backend/dotnet-api/.env.local (no se commitea)
ADMIN_PASSWORD=dev-password
ADMIN_TOKEN_SECRET=dev-token
Email__Smtp__Password=your-gmail-app-password
```

### Ver template
```bash
cat backend/dotnet-api/.env.example
```

---

## ✅ Validación

### Windows (PowerShell)
```powershell
cd Tensionretro
.\scripts\validate-deployment.ps1
```

### Linux/Mac (Bash)
```bash
cd Tensionretro
./scripts/validate-deployment.sh
```

---

## 🐳 Docker Localmente

### Levantar servicios
```bash
cd deploy/docker
docker-compose up --build
```

### Ver logs
```bash
# Backend
docker logs -f tensionretro-api

# Frontend
docker logs -f tensionretro-web

# Database
docker logs -f tensionretro-db
```

### Acceder a PostgreSQL
```bash
docker exec -it tensionretro-db psql -U tensionretro -d tensionretro
```

### Parar servicios
```bash
cd deploy/docker
docker-compose down
```

### Limpiar todo
```bash
docker-compose down -v  # También borra volúmenes
```

---

## 🔨 Build & Deploy

### Build Backend Docker Image
```bash
cd backend/dotnet-api
docker build -t tensionretro-api:latest .
```

### Test Image Localmente
```bash
docker run -e ASPNETCORE_ENVIRONMENT=Development \
           -e ADMIN_PASSWORD=test \
           -p 5000:80 \
           tensionretro-api:latest
# → http://localhost:5000/visits
```

### Build Frontend
```bash
cd frontend/web-admin
npm run build
# → ./dist/
```

---

## 📊 Test Endpoints

### Sin autenticación
```bash
# Visitas
curl http://localhost:5000/visits
curl -X POST http://localhost:5000/visits -H "Content-Type: application/json"

# Eventos
curl http://localhost:5000/events

# Contacto
curl -X POST http://localhost:5000/contact \
  -H "Content-Type: application/json" \
  -d '{"nombreSolicitante":"Test",...}'
```

### Con autenticación
```bash
# Login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"memberName":"Cristian","password":"PASSWORD"}'

# Usar token
TOKEN="eyJ..."
curl http://localhost:5000/admin/metrics \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📚 Documentación

| Cuando quieras | Ver archivo |
|---|---|
| Guía de desarrollo | `backend/dotnet-api/README-DEPLOYMENT.md` |
| Despliegue en AWS | `backend/dotnet-api/DEPLOYMENT.md` |
| Plan general AWS | `AWS-DEPLOYMENT-PLAN.md` |
| Variables env | `backend/dotnet-api/.env.example` |
| Cambios realizados | `CAMBIOS-REALIZADOS.md` |

---

## 🔐 Seguridad

### Verificar que no haya secretos
```bash
git status  # Ver archivos sin commit
cat .gitignore  # Ver qué está protegido
grep -r "twyn xuaf" .  # Buscar app password viejo
```

### Crear archivo local con secretos (no commitear)
```bash
# backend/dotnet-api/.env.local
ADMIN_PASSWORD=mi-super-contraseña-secreta
Email__Smtp__Password=mi-app-password-gmail
```

---

## 🚨 Troubleshooting

### "Port already in use"
```bash
# Cambiar puerto en docker-compose.yml:
ports:
  - "5001:80"  # Cambiar 5000 a 5001

# O matar proceso
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### "Connection refused" en BD
```bash
# Esperar a que PostgreSQL esté listo
docker-compose down
docker-compose up db
# Esperar 5-10 segundos
docker-compose up
```

### "CORS error" en frontend
1. Verificar AllowedOrigins en docker-compose.yml
2. Debe incluir http://localhost:5173
3. O cambiar config en appsettings.json

### "Database not found"
```bash
# Inicializar BD con migrations (futuro)
dotnet ef database update
```

---

## 📦 Tamaño de Imágenes

```bash
docker image ls | grep tensionretro
# Backend:  ~300 MB (SDK) + 50 MB (runtime)
# Frontend: ~150 MB (node) + 5 MB (dist)
```

---

## 🌐 Endpoints Referencia

```
GET  /visits                    # Contador público
POST /visits                    # Registrar visita
GET  /events                    # Eventos públicos
POST /contact                   # Solicitud contacto

POST /auth/login                # Login admin (retorna token)

GET  /admin/metrics             # Métricas (requiere auth)
GET  /admin/contacts            # Solicitudes
DELETE /admin/contacts/{id}     # Eliminar solicitud
GET  /admin/users               # Usuarios
POST /admin/users               # Crear usuario
POST /admin/users/change-password
DELETE /admin/users/{id}        # Eliminar usuario
```

---

## 💾 Backup de BD Local

```bash
# Backup SQLite
cp backend/dotnet-api/tensionretro.db \
   backend/dotnet-api/tensionretro.db.backup

# Backup PostgreSQL (desde container)
docker exec tensionretro-db pg_dump -U tensionretro tensionretro > backup.sql
```

---

## 🔄 Workflow Típico

1. **Modificar código** → `git add . && git commit -m "feat: ..."`
2. **Probar local** → `dotnet run` o `docker-compose up`
3. **Validar** → `.\scripts\validate-deployment.ps1`
4. **Push** → `git push origin feature/...`
5. **Deploy (futuro)** → ECR + ECS

---

## 🎯 AWS - Primeros Pasos

### 1. Crear RDS PostgreSQL
```bash
aws rds create-db-instance \
  --db-instance-identifier tensionretro-db \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --master-username admin
```

### 2. Crear ECR
```bash
aws ecr create-repository --repository-name tensionretro-api
```

### 3. Push imagen
```bash
docker tag tensionretro-api:latest ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/tensionretro-api:latest
docker push ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/tensionretro-api:latest
```

---

**Ver AWS-DEPLOYMENT-PLAN.md para pasos completos de despliegue**
