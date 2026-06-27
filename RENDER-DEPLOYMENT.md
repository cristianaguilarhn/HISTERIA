# Desplegar la API de Histeria en Render

El archivo `render.yaml` crea dos recursos conectados:

- `histeria-api`: API ASP.NET Core.
- `histeria-db`: PostgreSQL persistente para formularios, usuarios, eventos y visitas.

## 1. Crear el Blueprint

1. Inicia sesión en [Render](https://dashboard.render.com/).
2. Abre **New > Blueprint**.
3. Conecta GitHub y selecciona el repositorio `cristianaguilarhn/HISTERIA`.
4. Render detectará automáticamente `render.yaml`.
5. Cuando Render solicite `ADMIN_PASSWORD`, escribe una contraseña segura para el usuario `Cristian`.
6. Confirma la creación de la API y la base de datos.

Render generará automáticamente los secretos usados para firmar las sesiones privadas.

## 2. Esperar la publicación

Cuando el despliegue termine, abre:

```text
https://histeria-api.onrender.com/health
```

El nombre exacto puede variar. La respuesta debe indicar `status: ok`.

## 3. Conectar Vercel

En el proyecto `histeria` de Vercel:

1. Abre **Settings > Environment Variables**.
2. Crea `VITE_API_URL`.
3. Usa como valor la URL HTTPS entregada por Render, sin `/` al final.
4. Activa la variable para **Production**.
5. Abre **Deployments** y vuelve a desplegar la última versión.

Ejemplo:

```text
VITE_API_URL=https://histeria-api.onrender.com
```

## 4. Verificar

1. Visita `https://histeria.vercel.app/#inicio`.
2. Envía una solicitud desde el formulario público.
3. Entra a `https://histeria.vercel.app/#admin`.
4. Inicia sesión con el usuario `Cristian` y la contraseña definida en Render.
5. Revisa **Solicitudes** y **Métricas**.

El contador registra visitas totales, visitas por día y sesiones activas. Toda la información queda almacenada en PostgreSQL.

## Correo SMTP opcional

Los formularios se guardan aunque el correo no esté configurado. Para recibir además una notificación por correo, agrega estas variables en la API de Render:

```text
Email__Smtp__Username
Email__Smtp__Password
Email__FromEmail
Email__RecipientEmail
```
