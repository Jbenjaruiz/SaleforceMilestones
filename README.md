# Seguimiento de Desarrollo Salesforce

Tablero de seguimiento de controles de cambio (hitos) y sus tareas, para el proyecto de Lucalza. Monorepo con un frontend en React y una API en NestJS sobre SQL Server. Requerimientos y decisiones en [`docs/requerimientos/`](docs/requerimientos/README.md).

```
apps/web/   frontend (React + Vite)
apps/api/   API (NestJS + TypeORM + SQL Server)
docs/       requerimientos, scripts SQL y plantilla de importación
scripts/    generador de la plantilla de importación
```

## Qué hace

- **Inicio de sesión** obligatorio. Los usuarios, roles y proyectos los crea un administrador desde la propia interfaz.
- **Proyectos** seleccionables, sin fecha de vencimiento y con varios activos a la vez. Archivar un proyecto lo oculta del selector sin borrar nada.
- **Hitos** (un control de cambio cada uno, con su código `CC-…`) y **tareas** con fecha de inicio y fecha estimada. El botón de check finaliza la tarea y fija su fecha real.
- El hito no guarda fechas ni estado: su avance, fechas, estado y retraso se **derivan de sus tareas**. El retraso global es la suma de los días de retraso de todas las tareas.
- **Comentarios** en hitos y tareas, y **adjuntos** (PNG, JPG, WebP y PDF, hasta 5 MB y 5 por tarea o comentario).
- **Permisos** simples por rol: Ver, Crear, Modificar y Eliminar. El rol Administrator puede todo.
- **Importación** de un Excel (una fila por tarea) a un proyecto existente: todo o nada, con el detalle de cada problema.
- **Auditoría** de quién hizo cada cambio.

## Poner en marcha (local)

Requiere Node 24 (`nvm use 24`) y acceso a una base SQL Server.

```sh
npm install
cp apps/api/.env.example apps/api/.env     # complete los datos de la base, JWT_SECRET y el administrador inicial
npm run seed -w @seguimiento/api           # roles, permisos y administrador (la base ya debe tener las tablas)
npm run dev                                # API en :3000 y frontend en :5173
```

- El esquema de la base se crea con las migraciones (`npm run migration:run -w @seguimiento/api`) o con el script de [`docs/requerimientos/F01-script-creacion-tablas.md`](docs/requerimientos/F01-script-creacion-tablas.md), pensado para quien administra la base.
- Si el servidor SQL Server es antiguo y no admite el cifrado moderno, use `DB_ENCRYPT=false` en el `.env` (solo en redes internas de prueba).
- `npm run dev:web` levanta solo el frontend y `npm run dev:api` solo la API. En desarrollo Vite redirige `/api` a `localhost:3000`, así que no hace falta configurar CORS.

## Comandos

```sh
npm test            # pruebas de la API (Jest) y del frontend (Vitest)
npm run build       # compila ambos
npm run build:import-template   # regenera docs/importacion/plantilla-importacion-CC-001-Rev3.xlsx
```

## Importar desde Excel

En **Proyectos** (solo administradores): *Descargar plantilla*, completarla y *Importar* en el proyecto elegido. Columnas: `CodigoHito`, `NombreHito`, `DescripcionHito`, `Tarea`, `Responsable` (opcional), `FechaInicio`, `FechaEstimada`. Primero se **valida** y solo un archivo sin errores se puede importar. Se rechazan los códigos de hito que ya existen en el proyecto.

## Despliegue

Pendiente: se hará en un servidor Azure de la empresa y se define cuando el sistema funcione en local (ver `docs/requerimientos/preguntas-abiertas.md`). El workflow de GitHub Pages (`.github/workflows/deploy.yml`) solo publica el frontend, que necesita la API para funcionar; no sirve como despliegue completo.

## Variables de entorno de la API

Ver [`apps/api/.env.example`](apps/api/.env.example). Nunca suba `apps/api/.env`: contiene credenciales.
