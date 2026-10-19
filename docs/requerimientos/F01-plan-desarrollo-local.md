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
