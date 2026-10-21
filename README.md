# Seguimiento de Desarrollo Salesforce

Tablero de seguimiento de controles de cambio (hitos) y sus tareas, para el proyecto de Lucalza. Monorepo con un frontend en React y una API en NestJS sobre SQL Server.

> **Contexto completo del proyecto** (qué se hizo, decisiones, reglas de negocio, trampas conocidas y pendientes): [`docs/resumen-del-proyecto.md`](docs/resumen-del-proyecto.md). Requerimientos y decisiones: [`docs/requerimientos/`](docs/requerimientos/README.md).

```
apps/web/   frontend (React 19 + Vite 6)
apps/api/   API (NestJS 11 + TypeORM + SQL Server)
docs/       requerimientos, scripts SQL, plantilla de importación y resumen
scripts/    generador de la plantilla de importación
```

## Qué hace

- **Inicio de sesión** obligatorio. Los usuarios, roles y proyectos los crea un administrador desde la propia interfaz.
- **Proyectos** seleccionables, sin fecha de vencimiento y con varios activos a la vez. Archivar un proyecto lo oculta del selector sin borrar nada.
- **Hitos** (un control de cambio cada uno, con su código `CC-…`) y **tareas** con fecha de inicio y fecha estimada. El botón de check finaliza la tarea y fija su fecha real.
- El hito no guarda fechas ni estado: su avance, fechas, estado y retraso se **derivan de sus tareas**. El retraso global es la suma de los días de retraso de todas las tareas.
- **Comentarios** en hitos y tareas, y **adjuntos** (PNG, JPG, WebP y PDF, hasta 5 MB y 5 por tarea o comentario).
- **Permisos por proyecto:** un administrador asigna proyectos a cada usuario (**Usuarios → Editar**) con los permisos Ver, Crear, Modificar y Eliminar sobre el contenido de cada uno. Sin proyectos asignados, el usuario no ve ninguno. El rol Administrator ve y puede todo.
- **Importación** de un Excel (una fila por tarea) a un proyecto existente: todo o nada, con el detalle de cada problema.
- **Auditoría** de quién hizo cada cambio.

## Ejecutarlo en su computador

### 1. Requisitos

| Herramienta | Versión | Nota |
|---|---|---|
| **Node.js** | **24** | Con nvm: `nvm install 24` y `nvm use 24`. El proyecto exige Node ≥ 24 (`engines`) |
| **npm** | 11 (viene con Node 24) | Se usan *workspaces*: instale siempre desde la raíz |
| **Git** | cualquiera reciente | |
| **SQL Server** | Ver el paso 3 | Una base **vacía** a la que la API pueda conectarse |

Sistema operativo: probado en Windows 11. Debería funcionar igual en macOS y Linux (los comandos de abajo muestran la variante de Windows donde cambia).

### 2. Obtener el código e instalar

```sh
git clone https://github.com/Jbenjaruiz/SaleforceMilestones
cd SaleforceMilestones
git checkout development                # el sistema completo está en esta rama (main aún no se ha actualizado)
nvm use 24
npm install                              # instala la raíz, apps/web y apps/api
```

### 3. Tener una base de datos SQL Server

Elija **una** de las dos opciones. Es importante usar una base **exclusiva de pruebas**: las migraciones y el *seed* la modifican.

**Opción A: la base de pruebas del equipo.** Pida a quien la administre: servidor, puerto, nombre de la base, y un usuario propio con permisos de lectura y escritura (`db_datareader`, `db_datawriter`). Además, alguien con permisos de DDL debe haber creado el esquema con el script de [`docs/requerimientos/F01-script-creacion-tablas.md`](docs/requerimientos/F01-script-creacion-tablas.md) (partes 1 y 3). Si el esquema ya existe, no tiene que hacer nada más en este paso. Cuidado: es una base compartida; no ejecute reversiones de migraciones ni borrados masivos sin avisar.

**Opción B: su propia instancia.** Cualquier SQL Server reciente sirve. Por ejemplo, con Docker *(no se probó en este proyecto; el servidor real es SQL Server 2012, así que valide ahí cualquier cambio de esquema)*:

```sh
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=<contraseña-fuerte>" -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest
# cree la base (con sqlcmd, Azure Data Studio o SSMS):  CREATE DATABASE seguimiento;
```

Con esa instancia use en el `.env` `DB_USER=sa`, `DB_ENCRYPT=true` y `DB_TRUST_SERVER_CERTIFICATE=true` (certificado autofirmado). Como `sa` tiene permisos de DDL, el esquema se crea con las migraciones (paso 5, opción 1).

### 4. Configurar la API

```sh
# macOS / Linux / Git Bash
cp apps/api/.env.example apps/api/.env
# Windows (PowerShell)
Copy-Item apps/api/.env.example apps/api/.env
```

Edite `apps/api/.env` (**nunca lo suba al repositorio**: está en `.gitignore` y contiene credenciales):

| Variable | Obligatoria | Qué poner |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Sí | Los datos de su base (puerto 1433 por defecto) |
| `DB_ENCRYPT` | No (por defecto `true`) | Ponga **`false`** si el servidor es antiguo (SQL Server 2012: con `true` falla con `socket hang up`). Solo en redes internas de prueba |
| `DB_TRUST_SERVER_CERTIFICATE` | No | `true` solo si el servidor usa un certificado propio/autofirmado |
| `JWT_SECRET` | Sí | Cadena aleatoria de **32 caracteres o más** (cámbiela en cada entorno) |
| `JWT_EXPIRES_IN` | No | Duración de la sesión, p. ej. `8h` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Para el *seed* | Correo y contraseña (mínimo 7 caracteres) del primer administrador |
| `PORT` | No | Puerto de la API (3000 por defecto) |
| `STORAGE_DIR` | No | Carpeta de adjuntos (por defecto `./storage/attachments`, relativa a `apps/api`; está ignorada por git) |
| `TRUST_PROXY` | No | Déjela vacía en local. Solo detrás de un proxy (IIS/Nginx): `1` |
| `APP_TIMEZONE` | No | Zona que define «hoy» al calcular retrasos (`America/Guatemala` por defecto) |

Para generar un `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

### 5. Crear el esquema y los datos iniciales

**Esquema** (omítalo si ya existe, opción A del paso 3). Hay **dos** partes: el esquema inicial y la tabla `project_members` de la asignación de proyectos (F02, script en [`docs/requerimientos/F02-asignacion-de-proyectos.md`](docs/requerimientos/F02-asignacion-de-proyectos.md)). Sin ella, los usuarios que no son administradores no ven proyectos y la edición de usuarios falla.

- *Opción 1, con migraciones* (el usuario de la base necesita permisos de DDL): `npm run migration:run -w @seguimiento/api`
  Aviso: la migración se validó con el analizador de SQL Server 2012 y la herramienta se comprobó hasta el punto de conectarse, pero **aún no se ha ejecutado de verdad contra una base** (el usuario de pruebas no tiene DDL; el esquema real se creó con el script SQL). Si falla, use la opción 2 y avise.
- *Opción 2, con el script SQL* que ejecuta quien administre la base: [`docs/requerimientos/F01-script-creacion-tablas.md`](docs/requerimientos/F01-script-creacion-tablas.md).

**Datos iniciales** (roles Administrator y Reviewer, sus permisos y el administrador). Se puede repetir sin duplicar nada:

```sh
npm run seed -w @seguimiento/api
```

Debe responder `administrator created: <su correo>` (o «Nothing to do» si ya estaban).

### 6. Arrancar

```sh
npm run dev          # API en http://localhost:3000/api  y  frontend en http://localhost:5173
```

- Compruebe la API: `http://localhost:3000/api/health` debe responder `{"status":"ok","database":"up",…}`.
- Abra **http://localhost:5173** e ingrese con `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
- Solo el frontend: `npm run dev:web`. Solo la API: `npm run dev:api`.
- En desarrollo Vite redirige `/api` a `localhost:3000`, por lo que no hay que configurar CORS ni URLs.

### 7. Primer uso

1. **Proyectos → Nuevo proyecto** (p. ej. «CC-001 Rev. 3 (8 oct 2026)»).
2. **Importar** en ese proyecto: elija [`docs/importacion/plantilla-importacion-CC-001-Rev3.xlsx`](docs/importacion/plantilla-importacion-CC-001-Rev3.xlsx) → **Validar archivo** → **Importar**. Carga 11 hitos y 28 tareas. Las fechas son **de prueba**.
3. Vuelva al **Tablero**: verá los indicadores, los hitos y sus tareas. Pruebe el botón de check, los comentarios y los adjuntos.
4. **Usuarios** y **Roles** (menú superior, solo administradores): cree un usuario con el rol *Reviewer*, en **Usuarios → Editar** asígnele el proyecto con los permisos que quiera (solo *Ver* para solo lectura) y entre con él.

### Comandos útiles

```sh
npm test                                   # pruebas de la API (Jest) y del frontend (Vitest)
npm run build                              # compila ambos
npm test -w @seguimiento/api               # solo la API
npm test -w @seguimiento/web               # solo el frontend
npm run build:import-template              # regenera la plantilla de importación (docs/importacion/)
npm run migration:show -w @seguimiento/api # estado de las migraciones
```

### Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `Missing environment variables: …` al arrancar la API | Falta `apps/api/.env` o alguna variable obligatoria (paso 4) |
| `Failed to connect … socket hang up` | El servidor no admite el cifrado moderno: `DB_ENCRYPT=false` en el `.env` |
| `Failed to connect … ECONNREFUSED` / tiempo agotado | Servidor o puerto incorrectos, firewall o VPN. Pruebe la conexión con Azure Data Studio o `sqlcmd` |
| `Login failed for user` | Usuario o contraseña de la base incorrectos |
| El *seed* falla con permisos / `CREATE TABLE permission denied` | El esquema aún no existe y su usuario no tiene DDL: pida a quien administre la base que ejecute el script SQL |
| `EADDRINUSE` (3000 o 5173) | Queda un proceso de una ejecución anterior; ciérrelo o cambie `PORT` |
| La página muestra «sesión expirada» al cambiar de `.env` | Cambiar `JWT_SECRET` invalida las sesiones: vuelva a iniciar sesión |
| Git avisa «LF will be replaced by CRLF» | Solo en Windows; es inofensivo |

## Importar desde Excel

En **Proyectos** (solo administradores): *Descargar plantilla*, completarla y *Importar* en el proyecto elegido. Columnas: `CodigoHito`, `NombreHito`, `DescripcionHito`, `Tarea`, `Responsable` (opcional), `FechaInicio`, `FechaEstimada`. Primero se **valida** y solo un archivo sin errores se puede importar. Se rechazan los códigos de hito que ya existen en el proyecto.

## Despliegue

Pendiente: se hará en una máquina virtual Windows de Azure de la empresa (IIS + servicio de Windows). El plan, la configuración y las preguntas para TI están en [`docs/requerimientos/F01-despliegue-azure.md`](docs/requerimientos/F01-despliegue-azure.md). No se usa GitHub Pages: el frontend necesita la API para funcionar, y su workflow se eliminó. Tampoco hay integración continua automática por ahora; ejecute `npm test` y `npm run build` antes de subir cambios.

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/resumen-del-proyecto.md`](docs/resumen-del-proyecto.md) | Resumen, reglas de negocio, arquitectura, trampas conocidas, pendientes y los *prompts* con que se construyó |
| [`docs/requerimientos/`](docs/requerimientos/README.md) | Requerimientos, ER, decisiones, plan por pasos, script SQL y plan de despliegue |
| [`apps/api/.env.example`](apps/api/.env.example) | Variables de entorno de la API |
| [`context.md`](context.md) | Especificación **original** del tablero estático (histórica; ya no describe el sistema) |
