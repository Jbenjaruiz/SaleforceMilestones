# F01 — Plan de desarrollo local

Cómo arrancar la implementación de [F01](F01-base-de-datos-y-backend.md) con **API y frontend en la máquina del desarrollador y solo la base de datos SQL Server remota**. Es un plan, no código.

## 1. Lo que necesito antes de empezar

| Dato | Para qué |
|---|---|
| Servidor, puerto (normalmente 1433) y nombre de la base | Cadena de conexión |
| Usuario y contraseña con permiso para **crear tablas e índices** en esa base | Migraciones. Se comparten fuera del repositorio |
| ¿La base ya existe o la crea el equipo de servidores? | Evita pedir permisos de más |
| ¿Hace falta VPN o abrir el firewall para tu IP? | Sin acceso de red no hay conexión desde local |
| Versión de SQL Server | Funciones disponibles (índices filtrados, `CHECK`, `datetime2`) |
| ¿Es una base **exclusiva de pruebas**? | Las migraciones y la carga inicial la modifican. Nunca apuntar a producción |

Comprobación previa (la haces tú): conectarte a esa base con Azure Data Studio o `sqlcmd` desde tu máquina. Si eso no funciona, la API tampoco.

## 2. Decisiones técnicas propuestas

| Tema | Propuesta | Por qué |
|---|---|---|
| ORM | **TypeORM** con migraciones | Soporta SQL Server y las migraciones versionadas que pide F01. Prisma exigiría SQL a mano para índices filtrados y restricciones `CHECK` |
| Contraseñas | `argon2` (o `bcrypt`) | Hash robusto |
| Autenticación | JWT con expiración (`@nestjs/jwt`, Passport) | F01 §9 |
| Permisos | Guard por `read/create/update/delete`; el Administrador pasa todo | F01 §4.2 |
| Validación | `class-validator` + `class-transformer` | Entradas validadas |
| Configuración | `@nestjs/config` con `.env` ignorado por git y `.env.example` sin secretos | Local ahora, Azure después |
| Excel | `xlsx` en la API | Importación con validación total |
| Adjuntos | Carpeta en disco configurable por variable de entorno | F01 §8 |
| Pruebas | Jest en la API; se mantiene Vitest en el frontend | |

## 3. Orden de trabajo (cortes verticales)

1. **Monorepo.** Mover el frontend a `apps/web` con `git mv`, crear el `package.json` raíz con npm workspaces y ajustar las rutas de Vite, Vitest y del workflow de GitHub Pages (o retirarlo). Esto va en un commit propio, sin cambios de lógica.
2. **Esqueleto de la API** en `apps/api`: NestJS, módulo de configuración, ruta de salud y comprobación de conexión a SQL Server.
3. **Esquema y migración inicial** desde el ER de F01 §5, más la **carga inicial**: permisos, roles Administrador y Revisor, y el usuario administrador leído de variables de entorno.
4. **Autenticación:** inicio de sesión, token, guard de permisos y administración de usuarios y roles.
5. **Core:** proyectos, hitos, tareas (con el botón de check y las fechas), cálculos derivados y comentarios.
6. **Adjuntos y auditoría.**
7. **Importación** del Excel (todo o nada) usando `docs/importacion/plantilla-importacion-CC-001-Rev3.xlsx` como primer caso real.
8. **Frontend:** inicio de sesión, selector de proyecto, pantallas conectadas a la API y retirada de la lectura del Excel.

Los cálculos de avance y retraso ya existen y están probados en el frontend (`src/utils`); se portan a la API con las nuevas reglas de F01 (el hito se deriva de sus tareas, el retraso global es la suma).

## 4. Cómo se trabaja en local

- Un solo comando levanta API y frontend (`npm run dev` en la raíz).
- Vite redirige `/api` hacia la API local, así que **no hace falta configurar CORS** en desarrollo.
- Los secretos viven en `apps/api/.env` (no se commitea). La cadena de conexión nunca va en el repositorio ni en los commits.
- Como la base es remota y compartida: no ejecutar reversiones de migraciones ni borrados masivos sin avisar; los datos actuales son de prueba, pero otros pueden estar usándola.
- La latencia hacia la base remota hará la API más lenta que con una base local; es esperable.

## 5. Primer hito concreto

Cuando tenga acceso a la base: pasos 1 a 3. Resultado verificable: la API arranca, se conecta a SQL Server, las migraciones crean las tablas y existe el usuario administrador.

## 6. Resultado de la prueba de conexión (19 oct 2026)

| Comprobación | Resultado |
|---|---|
| Red | El puerto 1433 del servidor responde desde la máquina de desarrollo |
| Cifrado | Con `DB_ENCRYPT=true` falla (`socket hang up`): el servidor no completa el cifrado TLS que exige Node 24. Con `DB_ENCRYPT=false` conecta |
| Versión | **SQL Server 2012 SP4**, fuera de soporte desde 2022. Admite lo que usa F01 (índices filtrados, `CHECK`, `datetime2`, `uniqueidentifier`, paginación), pero no `DROP … IF EXISTS` ni funciones JSON/`STRING_AGG` (2016+) |
| Base | `fw_project`, intercalación `SQL_Latin1_General_CP1_CI_AS` (sin distinguir mayúsculas ni acentos), 0 tablas |
| Permisos del usuario | **No puede crear tablas ni alterar** (`CREATE TABLE = 0`, `ALTER = 0`). Bloquea el paso 3 (migraciones) |

Consecuencias:
- La conexión sin cifrar envía credenciales en claro. Aceptable en red interna de pruebas; no para producción. Conviene pedir una versión de SQL Server soportada o un certificado/TLS compatible antes del despliegue.
- Las migraciones deben evitar sintaxis posterior a 2012.
- Para continuar, quien administre el servidor debe dar al usuario, sobre `fw_project`, al menos los roles `db_ddladmin`, `db_datareader` y `db_datawriter`.

## 7. Estado de avance

| Paso | Estado |
|---|---|
| 1. Monorepo | Hecho |
| 2. Esqueleto de la API y conexión | Hecho |
| 3. Esquema, migración y carga inicial | Hecho (esquema creado por el administrador de la base con el script; migración sin registrar en `migrations`, requiere DDL) |
| 4. Autenticación, permisos, usuarios y roles | Hecho y probado contra la base real (34 comprobaciones) |
| 5. Core: proyectos, hitos, tareas, cálculos, comentarios | Hecho y probado contra la base real (49 comprobaciones) |
| 6. Adjuntos y auditoría completa | Hecho y probado contra la base real y el disco (28 comprobaciones) |
| 7. Importación del Excel | Pendiente |
| 8. Frontend conectado a la API | Pendiente |

### API del paso 4 (prefijo `/api`)

| Ruta | Acceso | Qué hace |
|---|---|---|
| `GET /health` | Público | Estado de la API y de la base |
| `POST /auth/login` | Público (10 intentos/min) | Devuelve el token y el usuario con sus permisos |
| `GET /auth/me` | Sesión | Usuario actual |
| `GET/POST /users`, `GET/PATCH /users/:id`, `POST /users/:id/password` | Solo Administrator | Gestión de usuarios y contraseñas |
| `GET/POST /roles`, `GET/PATCH/DELETE /roles/:id` | Solo Administrator | Gestión de roles y permisos |

Reglas implementadas: sin autoregistro; el email se guarda en minúsculas; contraseña de 7 a 72 caracteres; el hash nunca se devuelve; el rol Administrator es protegido; siempre debe quedar un administrador activo y nadie puede desactivarse a sí mismo; un rol con usuarios no se borra; una cuenta desactivada pierde acceso al instante, aunque su token siga vigente; los mensajes de error de login no revelan si el email existe.

Nota técnica: los identificadores que genera SQL Server (`NEWSEQUENTIALID`) no son UUID RFC 4122, por eso la API valida GUID con un patrón propio en lugar de `IsUUID`.

### API del paso 5 (prefijo `/api`)

| Ruta | Permiso | Qué hace |
|---|---|---|
| `GET /projects` (`?includeArchived=true` solo admin) | read | Selector de proyectos |
| `GET /projects/:id`, `GET /projects/:id/dashboard` | read | Proyecto; tablero completo (resumen, hitos con tareas y alertas) |
| `POST /projects`, `PATCH /projects/:id`, `POST /projects/:id/archive`, `POST /projects/:id/unarchive` | Solo Administrator | Crear, editar, archivar y reactivar |
| `POST /projects/:projectId/milestones` | create | Crear hito (código en mayúsculas, único por proyecto) |
| `GET /milestones/:id` / `PATCH` / `DELETE` | read / update / delete | Ver, editar, borrar con sus tareas y comentarios |
| `POST /milestones/:milestoneId/tasks` | create | Crear tarea (fechas de inicio y estimada obligatorias) |
| `GET /tasks/:id` / `PATCH` / `DELETE` | read / update / delete | Ver, editar, borrar |
| `PUT /tasks/:id/completion` `{ "completed": true|false }` | update | El botón de check: fija o borra la fecha real |
| `GET/POST /milestones/:id/comments`, `GET/POST /tasks/:id/comments` | read / create | Comentarios |
| `DELETE /comments/:id` | Autor o Administrator | Borrar un comentario |

Reglas implementadas: el hito no guarda fechas ni estado (se derivan de sus tareas: inicio = primera, estimada = mayor, finalización = última tarea finalizada); retraso de la tarea = días de atraso respecto a la fecha estimada (finalizada: contra su fecha real; sin finalizar: contra hoy); retraso del hito y del proyecto = suma; avance global = media simple de los hitos con tareas; «hoy» se calcula en la zona `APP_TIMEZONE` (por defecto America/Guatemala); un proyecto archivado es invisible para los no administradores y de solo lectura para el administrador; el borrado de un hito o tarea elimina comentarios y adjuntos en orden dentro de una transacción (y devuelve las rutas de archivo para borrarlas del disco en el paso 6).

### API del paso 6 (prefijo `/api`)

| Ruta | Permiso | Qué hace |
|---|---|---|
| `POST /tasks/:id/attachments` (multipart, campo `files`, hasta 5) | update | Adjuntar archivos directamente a una tarea |
| `GET /tasks/:id/attachments` | read | Listar los adjuntos de una tarea |
| `POST /milestones/:id/comments`, `POST /tasks/:id/comments` | create | Aceptan JSON, o multipart con `body` y hasta 5 `files` |
| `GET /attachments/:id/download` | read | Descargar (la imagen se muestra en línea, el PDF como descarga) |
| `DELETE /attachments/:id` | Quien lo subió o Administrator | Borrar un adjunto |

Reglas: solo PNG, JPG, WebP y PDF, **identificados por el contenido del archivo** (no por la extensión ni por el tipo que declare el navegador); máximo 5 MB por archivo y 5 por tarea o por comentario (contando los que ya tiene); los archivos se guardan en `STORAGE_DIR` con un nombre generado (el nombre original solo se guarda como dato, sin rutas ni caracteres de control); solo se descargan con sesión, con `X-Content-Type-Options: nosniff` y una política `sandbox`; no se pueden añadir archivos a un comentario ya creado; si algo falla al guardar, no quedan archivos huérfanos ni comentarios a medias; al borrar un comentario, tarea o hito se borran sus archivos del disco una vez confirmada la transacción; un proyecto archivado no admite subidas y es invisible para quien no es administrador.
