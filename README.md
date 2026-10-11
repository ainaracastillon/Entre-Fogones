# Entre Fogones

Recetario para guardar tus recetas en carpetas que se ven como libros, compartirlas con amigos y chatear con ellos.

## Qué hace

- **Biblioteca en forma de estantería**: cada carpeta es un libro. Al abrirlo ves el índice y cada receta a doble página, con foto, ingredientes y preparación.
- **Nueva receta** desde un enlace de cualquier web de cocina (el servidor lee la página y saca los datos), desde una foto (se lee entera), en un chat con IA (Groq, gratis) donde pides la receta, pides cambios y la apruebas, o escribiéndola a mano.
- **Raciones ajustables**: las cantidades de los ingredientes se recalculan.
- **Compartir** recetas y carpetas con un enlace público o por el chat. Quien la recibe puede guardarse una copia.
- **Sin registro** para usarla: tus recetas se guardan ligadas a tu dispositivo. El perfil (usuario y contraseña) solo hace falta para tener amigos, chat y tus recetas en varios dispositivos.

## Tecnología

- Node.js 20 + Express
- PostgreSQL en [Neon](https://neon.tech) (proyecto `entre-fogones`, región Frankfurt)
- Frontend en HTML, CSS y JavaScript sin compilación (`public/`)

## Variables de entorno

| Variable | Obligatoria | Para qué |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Conexión a PostgreSQL (la de Neon, con `?sslmode=require`) |
| `GROQ_API_KEY` | No | Activa la IA gratis con [Groq](https://console.groq.com/keys): el chat de recetas, «Desde foto» y la lectura de webs sin datos de receta |
| `GROQ_MODEL` | No | Modelo para el chat (por defecto `llama-3.3-70b-versatile`; si falla se prueba `openai/gpt-oss-120b`) |
| `GROQ_VISION_MODEL` | No | Modelo que lee fotos (por defecto `qwen/qwen3.8-27b`) |
| `OPENAI_API_KEY` | No | Alternativa de pago: la misma IA con ChatGPT |
| `OPENAI_MODEL` | No | Modelo de ChatGPT (por defecto `gpt-4o-mini`) |
| `ANTHROPIC_API_KEY` | No | Alternativa: la misma IA con Claude (se usa si no hay clave de OpenAI) |
| `ANTHROPIC_MODEL` | No | Modelo de Claude (por defecto `claude-sonnet-5-5`) |
| `NODE_ENV` | No | `production` para cookies seguras |

## Ejecutar en local

```bash
npm install
DATABASE_URL=postgres://usuario:clave@localhost:5432/entrefogones npm start
```

Abre http://localhost:3000. Las tablas se crean solas al arrancar.

## Desplegar en Render

El archivo `render.yaml` crea el servicio web en Frankfurt. La base de datos vive en Neon: pon su cadena de conexión en `DATABASE_URL`. Para activar la IA gratis, añade `GROQ_API_KEY` (o, de pago, `OPENAI_API_KEY` o `ANTHROPIC_API_KEY`) en las variables de entorno del servicio.
