# Resumen del proyecto

Documento de contexto para quien se incorpore al proyecto: qué se hizo, por qué, cómo está construido, qué se decidió, qué falta y qué trampas conviene conocer. Las instrucciones para ponerlo en marcha están en el [README](../README.md).

> **Estado a la fecha de redacción:** el sistema funciona de extremo a extremo en local (API + base SQL Server remota de pruebas + frontend). Está en la rama **`development`** (la rama de trabajo `feat/f01-monorepo-api` se fusionó mediante el *pull request* #1 y se eliminó). `main` sigue en el commit inicial: no se ha actualizado. Falta el despliegue en Azure.

## 1. Qué es y para qué sirve

Un tablero de seguimiento para el proyecto de **Lucalza** con **Freeway Consulting** (implementación de Salesforce Consumer Goods Cloud, integrada con SAP Business One). Sigue el avance de los **controles de cambio** (CC) del documento `FWY-SF-LUCALZA-CC-001` Rev. 3 y de las **tareas** de cada uno: quién va retrasado, cuánto, y qué falta.

Nació como un tablero estático de solo lectura que leía un Excel (`context.md` es esa especificación original). Después se amplió a un sistema con **base de datos, autenticación, edición, comentarios, adjuntos e importación** (feature F01).

## 2. Contexto de negocio

Hay dos documentos de origen (resumidos en [`requerimientos/contexto-negocio.md`](requerimientos/contexto-negocio.md)):

- **`FWY-SF-Lucalza_CC01-08.10.2026.V3.pdf`**: la solicitud de cambios de Freeway (52 páginas, 12 controles de cambio, 936 horas, USD 51,271). Es un documento contractual que Lucalza debe firmar.
- **`Hallazgos-Revisión-CC01-08.10.2026.V3.xlsx`**: el análisis de Lucalza sobre ese PDF (27 hallazgos con postura de negociación y 43 puntos de revisión). De ahí salieron las 28 tareas iniciales.

Conceptos clave:

| Concepto | Significado |
|---|---|
| **Hito** | Un control de cambio, con código obligatorio (`CC-C01`, `CC-M01`…). `C` = Core, `M` = Modeler (app sin conexión). No hay hitos sin código |
| **Tarea** | Trabajo dentro de un hito: nombre, responsable (opcional, texto libre), fecha de inicio y fecha estimada (obligatorias), y un check de finalizado |
| **Proyecto** | Agrupa hitos (p. ej. una revisión del documento de cambios). Sin fecha de vencimiento; puede haber varios activos; se «elimina» archivándolo |
| `CC-GEN` | Hito marcador que agrupa las 5 tareas del análisis que no pertenecen a ningún CC. No es un control de cambio del PDF |

## 3. Reglas de negocio importantes

- **El hito no guarda nada derivado.** Su avance, fechas, estado y retraso se calculan de sus tareas:
  - inicio = el de la primera tarea; fecha estimada = la mayor de sus tareas; finalización = la de la última tarea finalizada (solo cuando todas lo están);
  - avance = tareas finalizadas ÷ total; un hito sin tareas muestra «N/D» y no cuenta en el avance global;
  - estado: *Finalizado* (todas las tareas), *En curso* (inicio ≤ hoy) o *Pendiente*.
- **Retraso (días calendario):** tarea sin finalizar = días desde su fecha estimada hasta hoy; finalizada = fecha real − estimada. El del hito y el **global del proyecto son la suma** del retraso de sus tareas.
- **Botón de check:** al marcar, la API fija la fecha real con **hoy** (en la zona `APP_TIMEZONE`); cada nuevo marcado fija una fecha nueva; al desmarcar se borra. La fecha real no se edita a mano.
- **Fechas** = días calendario `AAAA-MM-DD`, sin hora ni zona horaria.
- **Permisos por proyecto (F02):** Ver, Crear, Modificar y Eliminar **sobre el contenido** de cada proyecto (hitos, tareas, comentarios, adjuntos), asignados a cada usuario en **Usuarios → Editar**. «Ver» es lo mismo que tener el proyecto asignado; sin asignaciones, el usuario no ve ningún proyecto. **La asignación manda: los permisos del rol ya no se usan.** El rol **Administrator** (protegido) ve y puede todo, sin asignación, y es el único que gestiona usuarios, roles, contraseñas, proyectos e importaciones. Roles iniciales: Administrator y Reviewer (hoy solo clasifican). Detalle en [`requerimientos/F02-asignacion-de-proyectos.md`](requerimientos/F02-asignacion-de-proyectos.md).
- **Usuarios:** los crea un administrador; sin autoregistro ni «olvidé mi contraseña»; contraseña de 7 a 72 caracteres; siempre debe quedar un administrador activo; nadie puede desactivarse a sí mismo.
- **Comentarios:** en hitos y tareas; no se editan; los borra su autor o un administrador.
- **Adjuntos:** PNG, JPG, WebP y PDF (por contenido, no por extensión), máx. 5 MB y 5 por tarea o comentario; en disco; las tareas los admiten directamente, los hitos solo vía comentarios; los borra quien los subió o un administrador.
- **Auditoría:** cada cambio queda en `audit_logs` (quién, qué, cuándo, antes y después). Nunca contiene contraseñas.
- **Archivar un proyecto:** lo oculta del selector; solo los administradores lo ven, y es de solo lectura hasta reactivarlo.
- **Borrar un hito o una tarea** borra también sus comentarios y adjuntos (y los archivos del disco), en una transacción.

## 4. Arquitectura

Monorepo con npm workspaces (Node 24):

```
apps/web/    React 19 + Vite 6 (JavaScript). Rutas con HashRouter. Pruebas: Vitest + Testing Library
apps/api/    NestJS 11 + TypeORM + SQL Server. Pruebas: Jest
docs/        requerimientos, scripts SQL, plantilla de importación y este resumen
scripts/     generador de la plantilla de importación (usa scripts/workbook-data.mjs)
```

- El frontend habla con la API bajo `/api`. En desarrollo Vite redirige `/api` a `localhost:3000` (no hace falta CORS). En producción se espera el **mismo dominio** (IIS sirviendo la página y haciendo proxy a la API).
- Autenticación con **JWT**; un guard global recarga al usuario en cada petición (una cuenta desactivada pierde el acceso al instante). Otro guard aplica los permisos por ruta.
- La API tiene el esquema fuera de TypeORM `synchronize`: **el esquema cambia solo con migraciones o con el script SQL**.
- Identidad visual de Lucalza (`#005153`, `#1e3238`, `#ecab23`, Plus Jakarta Sans / Inter, logotipo).

### Modelo de datos (10 tablas)

`roles` · `permissions` (sin uso desde F02) · `users` · `projects` · `project_members` (F02) · `milestones` · `tasks` · `comments` · `attachments` · `audit_logs`. Diagrama ER y diccionario en [`requerimientos/F01-base-de-datos-y-backend.md`](requerimientos/F01-base-de-datos-y-backend.md); script de creación en [`requerimientos/F01-script-creacion-tablas.md`](requerimientos/F01-script-creacion-tablas.md).

Restricciones destacadas (en la base, no solo en el código): código de hito único **por proyecto**; `estimated_date >= start_date`; `actual_date` solo si la tarea está finalizada; un comentario o adjunto pertenece a un hito/tarea **o** a un comentario, nunca a ambos; adjuntos limitados a 4 tipos y 5 MB.

### Mapa de la API (`/api`)

| Ruta | Acceso |
|---|---|
| `GET /health` | Público |
| `POST /auth/login` (10 intentos/min), `GET /auth/me` | Público / sesión |
| `/users`, `/users/:id/password`, `/roles`, `/users/:id/projects` (asignación de proyectos) | Solo Administrator |
| `GET /projects`, `/projects/:id/dashboard` | Proyecto asignado (Ver) |
| `POST/PATCH /projects`, `/projects/:id/archive`, `/unarchive` | Solo Administrator |
| `/milestones`, `/tasks`, `PUT /tasks/:id/completion` | Crear / Modificar / Eliminar **en el proyecto asignado** |
| `/…/comments`, `/tasks/:id/attachments`, `GET /attachments/:id/download` | Ver / Crear (comentar) / Modificar (adjuntar a tareas) en el proyecto asignado |
| `DELETE /comments/:id`, `DELETE /attachments/:id` | Autor/quien subió, o Administrator |
| `GET /imports/template`, `POST /projects/:id/import` (`?dryRun=true`) | Solo Administrator |

Detalle completo por paso en [`requerimientos/F01-plan-desarrollo-local.md`](requerimientos/F01-plan-desarrollo-local.md).

### Frontend

Pantallas: inicio de sesión; tablero (selector de proyecto, indicadores, filtros, hitos con tareas, check, formularios, comentarios y adjuntos); y, solo para administradores, Usuarios, Roles y Proyectos (con importación en dos pasos: validar y luego importar). Los controles aparecen según los permisos y los errores de la API se traducen al español (`apps/web/src/api/messages.js`). La API responde en inglés; la interfaz y la documentación, en español; **el código, la API y la base van en inglés**.

## 5. Cómo se construyó (cronología)

1. Revisión y reconstrucción del tablero estático (React + Vite, lectura de Excel) y despliegue en GitHub Pages.
2. Fase de **requerimientos** (solo documentos, sin código): ER, decisiones y el registro de preguntas resueltas con el equipo.
3. Análisis de los dos documentos de origen y plantilla de importación con fechas de prueba.
4. **Paso 1** monorepo → **2** esqueleto de la API y conexión → **3** esquema, migración y carga inicial → **4** autenticación, permisos, usuarios y roles → **5** core (proyectos, hitos, tareas, comentarios) → **6** adjuntos → **7** importación del Excel → **8** frontend (inicio de sesión, tablero, edición, comentarios/adjuntos, administración).
5. Plan de despliegue en una máquina virtual Windows de Azure.
6. Cierre: fusión de la rama de trabajo en `development`, eliminación del workflow de GitHub Pages y actualización de la documentación.

Historial: `git log` en la rama `development` (un commit por paso lógico, más los de fusión).

## 6. Cómo se verificó

- **API:** 104 pruebas de Jest (guards con peticiones HTTP, reglas de servicios, cálculos, validación de archivos, importación…).
- **Frontend:** 53 pruebas de Vitest que recorren la aplicación completa con una API simulada (inicio de sesión, permisos, edición, comentarios, adjuntos, administración, importación).
- **Contra la base real**, con scripts desechables que dejaron la base como estaba: usuarios/roles (34 comprobaciones), core (49), adjuntos con archivos reales y disco (28) e importación con la plantilla (20).
- **Extremo a extremo en un navegador real** (Edge sin ventana contra la API y la base): ingreso, crear proyecto, importar 11 hitos y 28 tareas, marcar y reabrir, comentario con imagen, adjunto, hito y tarea a mano, un usuario revisor sin controles de edición, y vista móvil sin desplazamiento horizontal.

Los scripts de comprobación contra la base real **no están en el repositorio** (eran temporales). Si hacen falta, hay que reescribirlos.

## 7. Entorno y trampas conocidas

- **SQL Server 2012 SP4** (el servidor de pruebas, `fw_project`): fuera de soporte; **no completa el cifrado TLS** que exige Node 24 → `socket hang up`. En local se usa `DB_ENCRYPT=false`. Para producción hace falta otra versión o habilitar TLS 1.2. Las migraciones evitan sintaxis posterior a 2012 (`DROP … IF EXISTS`, JSON, `STRING_AGG`).
- **El usuario de la aplicación solo tenía lectura/escritura**: el esquema lo creó el administrador de la base con el script SQL. Por eso la tabla `migrations` de TypeORM **no está registrada**; antes de la próxima migración alguien con DDL debe ejecutar la parte 3 del script (o dar `db_ddladmin`).
- **Los GUID que genera SQL Server (`NEWSEQUENTIALID`) no son UUID válidos** según el estándar: la API valida GUID con un patrón propio (`apps/api/src/common/guid.ts`); `IsUUID`/`ParseUUIDPipe` los rechazarían.
- **Sin borrado en cascada** en hitos/tareas/comentarios (SQL Server rechaza varias rutas de cascada y hay que borrar archivos): el borrado en orden lo hace `apps/api/src/core/cascade.ts` dentro de una transacción.
- **Detrás de un proxy** hay que configurar `TRUST_PROXY=1`; si no, el límite de intentos de login afecta a todos los usuarios a la vez.
- **Importación:** se lee con `exceljs` y no con SheetJS (`xlsx`), cuya versión de npm tiene vulnerabilidades conocidas con archivos manipulados. `xlsx` sigue solo en la raíz, para el script que genera la plantilla.
- **Puertos:** si `npm run dev` dice `EADDRINUSE`, queda un proceso de una ejecución anterior en el 3000 o el 5173.
- **Fin de línea:** git avisa de «LF will be replaced by CRLF» en Windows; es inofensivo.
- `context.md` es la especificación **original** (Excel, solo lectura, sin backend). Ya no describe el sistema; se conserva como historia.
- `.claude/resume.md` quedó commiteado por error en el primer commit; se puede eliminar.

## 8. Pendiente

| Tema | Detalle |
|---|---|
| **Tabla `project_members` (F02)** | La asignación de proyectos está implementada pero la tabla **no existe todavía**: alguien con DDL debe ejecutar el script de [`requerimientos/F02-asignacion-de-proyectos.md`](requerimientos/F02-asignacion-de-proyectos.md) §5. Hasta entonces, las pantallas de asignación y los usuarios que no son administradores no funcionan; los administradores sí |
| **Despliegue en Azure** | Plan en [`requerimientos/F01-despliegue-azure.md`](requerimientos/F01-despliegue-azure.md): máquina virtual Windows, IIS + servicio de Windows. Faltan las respuestas de TI (§9 del plan) |
| **Cifrado de la base** | Resolver la versión/TLS de SQL Server antes de producción |
| **Registro de migraciones** | Parte 3 del script SQL (requiere DDL) |
| **`main` y CI** | `main` no se ha actualizado (sigue en el commit inicial). El workflow de GitHub Pages **se eliminó**; no hay integración continua automática. Decidir si se agrega un flujo que solo pruebe y compile, y cuándo fusionar `development` en `main` |
| **Datos reales** | La plantilla de importación es de **prueba**: fechas calculadas con supuestos (feriados de Guatemala, inicio 19-oct-2026, 2 días hábiles de pruebas entre tareas) y sin responsables. Debe revisarse. `CC-C09` y `CC-C12` no tienen tareas |
| **Vulnerabilidades de dependencias** | `npm install` reporta varias en herramientas de desarrollo; revisar con `npm audit` antes de desplegar |
| **Respaldos** | De la base y de la carpeta de adjuntos |
| **Posibles mejoras** | Tests automáticos de extremo a extremo versionados; auditoría visible en la interfaz (hoy solo en la tabla); mostrar el conteo de adjuntos en el tablero |

## 9. Mapa de la documentación

| Archivo | Contenido |
|---|---|
| [`../README.md`](../README.md) | Cómo ejecutar el proyecto en local |
| [`requerimientos/README.md`](requerimientos/README.md) | Índice de requerimientos |
| [`requerimientos/F01-base-de-datos-y-backend.md`](requerimientos/F01-base-de-datos-y-backend.md) | Requerimientos aprobados, ER y diccionario |
| [`requerimientos/preguntas-abiertas.md`](requerimientos/preguntas-abiertas.md) | Registro de decisiones y de lo pendiente |
| [`requerimientos/contexto-negocio.md`](requerimientos/contexto-negocio.md) | Los dos documentos de origen |
| [`requerimientos/F01-plan-desarrollo-local.md`](requerimientos/F01-plan-desarrollo-local.md) | Plan por pasos, estado y API de cada paso |
| [`requerimientos/F01-script-creacion-tablas.md`](requerimientos/F01-script-creacion-tablas.md) | Script SQL para el administrador de la base |
| [`requerimientos/F01-despliegue-azure.md`](requerimientos/F01-despliegue-azure.md) | Plan de despliegue en Azure |
| [`importacion/plantilla-importacion-CC-001-Rev3.xlsx`](importacion/plantilla-importacion-CC-001-Rev3.xlsx) | Plantilla de importación (datos de prueba) |

## 10. Cómo se trabajó con el asistente (prompts)

El proyecto se desarrolló en conversación con Claude Code. Estos son los mensajes ingresados, en orden, **tal como se escribieron** (se conservan los errores de tecleo). Sirven para entender el porqué de cada decisión; las decisiones ya consolidadas están en [`requerimientos/preguntas-abiertas.md`](requerimientos/preguntas-abiertas.md). Se omitieron datos personales y los registros de error que se pegaron.

### Fase 1: tablero estático y GitHub Pages

1. «Necesito que revises este proyecto, revisa context.md y luego verifica si el pryecto que está hecho con react para confirmar si se apega a las especificaciones, ya que yo pienso que debe mejorar mucho y quisiera que lo hicieras nuevamente desde cero. Para tu conocimiento, debes usar nvm use 24 para ejecutar comandos de node antes»
2. «corre el proyecto para visualizarlo»
3. «detenedlo por hoy»
4. «Levanta el seridor, vamos a hacer algunos cambios»
5. «necesito desplegar el proyecto en github pages, configúralo para poder hacerlo y dame los pasos para hacer configurar el repo en githb y poder ver el sitio publicado»
6. «configura mi git: user: … email: …» *(identidad de git del desarrollador)*
7. «revisa con git status, ya que el push está demorando demasiado»
8. «El despliegue en github pages falló» *(se pegó el registro: «Creating Pages deployment failed … HttpError: Not Found»)*
9. «estoy obtenendo un 404 en la url … donde encuentro la ruta real»
10. *(se pegó el error «Multiple artifacts named "github-pages"»)*

### Fase 2: requerimientos de la base de datos y el backend (solo documentos)

11. «Ya está publicado, ahora vamos a ver nuevas features que vamos a agregar, pero por el momento solo vas a tomar los requerimientos, no vas a escribir código aún. Debes dejas plasmado todo en archivos .md»
12. «Para comenzar, el sitio va a tener una base de datos, así que vamos a tener que crear un diagrama de entidad de relación y un backend en nest.js, Para la realización del ER vas a necesitar las especificaciones de los módulos, por lo cual proceso a mencionarlos: 1-usuarios: para autenticación 2:roles y persmisos: simple, de uno a muchos (un rol para varios permisos) 3- core: corazón del sitio (todo lo que ya contiene; hitos = control de cambios, tareas por cada hito, check de finalizado, fecha de inicio, fecha estimada de finalización, fecha real de entrega, aparte de notas o comentarios por cada tarea y cada hito. eso por el momento.»
13. «Los unicos que tienen código son los controles de cambio, y normalmente comienzan con CC-C+N, las tareas llevan de referencia ese código»
14. «las tareas se asignan a un único código. descarta H001-H006. Un rol por usuario, Las tareas tambien llevan fechas, solo check de finalizado es suficiente, Notas y comentarios puede ser una lista de comentarios de varios usuarios. Los campos actuales se descartan. Usaremos SqlServer, luego te comparto las credenciales de la db de prueba. Con respecto al backend, tu dime si podemos armar un monorepo donde vival el backend y el fronten juntos, ya que es un proyecto pequeño. El tablero ya no será público. Un admin crea los usuarios desde la misma interfaz y agregar los roles y permisos. Sí se necesita registrar quien hizo el cambio. Eliminar un hito solo lo bloquea juntos con sus tareas. al excel actual le faltan fechas, si se debe poder impotar, queda por impotación, pero lo que debería poder hacerse es que se pueda iniciar con un lote de nuevos hitos y tareas, como si fuera un sprint grande sin fecha de expiración. Por cierto, las notas deben tener opción de subir adjuntos, sobre todo imagenes»
15. «Los permisos son básicos, ver, crear, modificar y eliminar. El hosting va a ser un servidor de azure, pero de momento estará local, eso lo paga la empresa y ya hay servidores funcionando. el frontend no neguirá siempre en pages, debe subirse a servdidores. El usuario inicial lo puedes crear tu. Los comentarios se pueden borrar. no habrá opcion de contraseña ovlvidada en esta primera fase. Él código fuente debe ir en inglés. Hay mas preguntas pero despeja algunas con estas respuestas»
16. «las cuatro acciones valen igual en todo el sistema. En curso se deriva de las fechas.Los adjuntos se pueden guardar en disco. El admin administra las contraseñas, y no se obliga a cambiarla en el primer ingreso. Los comentarios los puede borrar el autor y el autor.»
17. «las tareas llevan un botón de check, al presionarlo, lo que hace es dar por finalizada una tarea, la cual tiene tambien; fecha de inicio y fecha de entrega estimada, esas fecha se usan para calcular el retraso de cada tarea y retraso global. el rol inicial es el de admin, los demas pueden ser creados a conveniencia, aunque puedes crear un rol "revisor" de solo lectura para comenzar. Eliminar un hito borra tambien sus tareas. Se mantienen como fechas de calendario sin hora las fechas. todo hito pertenece a un lote, se puede mostrar un lote en la inerfaz. no pueden haber varios lotes activos a la vez. Lo de las tareas con varios códigos lo aclararemos de úlimo»
18. «La fecha real de la tarea es como tú lo planteaste. cada que se marca, fija una fecha nueva. El retraso global es el acumulado en días de todas las tareas. la fecha de inicio del hito es la misma fecha de inicio de la primera tarea, y su fecha de finalización es la de finalizada la única tarea. Gestión de usuario: haz lo que propones. Borrar comentario si es autor y admin.»
19. «El lote se cierra con el último hito finalizado. contraseña con largo mínimo de 7. Comentarios no se editan. Que necesitas sabes del despliegue en azure y por que?»
20. «Si se desmarca una tarea de un lote cerrado, este vuelve a estar abierto. que necesitas después podemos definir eso, mientras do corre local. que necesitas saber de la importación de excel?. para los adjuntos tomemenos tus recomendaciones.»
21. «Antes de pasar al tema de las tareas, necesito que revises 2 archivos y entiendas el cotexto, aparte del excel, hay otro documento al que hace referencia el mismo: C:\Users\…\Downloads\FWY-SF-Lucalza_CC01-08.10.2026.V3»
22. «No se crea un hito para las tareas sin CC, no deben haber hitos sin código, y algo más, se deben poder crear nuevos hitos a manos y agregarle tareas, si deben llevar responsable pero este puede estar vacío (no obligatorio)»
23. «Sabes que, en lugar de un lote, será más un proyecto, seleccionable, en este caso se pueden tener varios proyectos activos y no tendrán fecha de vencimiento. las tareas pueden surgir de los hallazgos o de los requerimientos. El tipo de responable dejalo como texo libre por el momento. Datos del cc en hito; deja solo nombre y descripción»
24. «Si puede archivarse, si puede "eliminarse" para que no aparezca en el seleccionable. Solo el admin crea proyecytos. No hace una vista que sume todos. Cada importación no crea un proyecto. Se rechazan los códigos repetidos y filas inválidas. las fechas de inicio y fon son obligatorias, luego las agregaremos al excel con tu ayuda antes de importarlo. las tareas sin cc luego vemos como le agregamos un hito. Por cierto, una tarea no debe tener más de un hito, ya está confirmado, se tomará solo el primer código de la celda. El hito no tiene un check propio, depende de sus tareas para determinar su progreso porcentual y finalización. EL retraso del hito es la suma de sus tareas atrasadas.»
25. «Fecha estimada del hito; haz lo que propusiste. Filas inválidas, se cancela toda la importación hasta que se corrija todo. la pantilla que propone está bien. Solo el admin importa archivo excel. El admin puede ver proyectos archivados. Solo la tarea lleva responsable. Agrego algo más; las tareas tambien pueden llevar adjuntos, pero ninguna recibirá imagenes desde el excel, sino que una vez creadas (a mano o importadas) podran ajuntarse imágenes.»
26. «Los hitos no llevan adjuntos directos. El usuario que sube la imagen puede borrarla y el admin tambien, de hecho el admin puede hacer de todo. el límite puede ser de 5mb max por archivo y 5 por tarea tal cual sugieres. Cuando tengamos el excel listo lo cargaremos.»

*(Respuestas a preguntas con opciones: administrador inicial → «Los escribo yo en el .env»; alcance de Azure AD → «Solo el servidor»; tipo de servidor → «Máquina virtual Windows».)*

### Fase 3: plantilla de importación y desarrollo

27. «Prepara la plantilla del Excel con las 23 tareas, las fechas excluyen fines de semana y feriados, y se deben dejar 2 días hábiles entre una tarea y otra porque son para pruebas.»
28. «Si, continua y haz commit»
29. «Los supuestos están bien, regenera la plantilla, nos van a servir como prueba, de todas formas pasarán por una revisión»
30. «Genera un hito para esas tareas y agregalo al excel. Luego dime como iniciamos con el desarrollo a nivel local, ya que de momento solo la db estará remota»
31. «inicia con esa ruta de desarrollo, agrega un example.env para saber donde puedo poner los datos de conexión a la DB»
32. «El .env está listo, puedes probar la conexión»
33. «El db manager afirma conceder permisos, intenta de nuevo la conexión, si falla, continua co la creación de las entidades y la migración para probarlas cuando haya permisos.»
34. «Genera un .md con el script de creación de las tablas necesarias»
35. «Ya le pasé el script al administrador, solo la creación de las tablas, ejecuta los demás scripts tu mismo»
36. «Ya puse el correo y la contraseña, ejecuta el seed»
37. «Sí, empieza con el paso 4»
38. «si» *(paso 5)*
39. «El servicio está detenido, no puedo ver la página»
40. «sigamos en orden, continúa con paso 6 y así sucesivamente»
41. «levanta el servicio»
42. «Excelente, crea el excel paa la importación de los hitos y tareas»
43. «He estado probando la plataforma y todo funciona correctamente. A nivel de UI; en la pantalla de usuarios, los botones de Editar y Eliminar no están alineados, uno está más arriba que el otro»

### Fase 4: despliegue

44. «Puede este monorepo funcionar en githubpages?»
45. «Entonces comencemos a ver cómo debería desplegarse este proyeto en un servidor de azureAD»
46. «Haz un resumen de lo realizado en este proyecto, en un archivo de la carpeta docs, agrega los promps ingresados y lo que creas necesario para contexto de otro desarrollador. Igualmente incluye en el readme todo lo necesario para que otro desarrollador pueda correr el proyecto en su computador local.»

### Fase 5: cierre

47. «hice merge de esta rama a la rama development, cambia a esa rama y revisa que todos los cambios estén ahí, luego elimina el flujo de github pages en esa rama (developmemt) actualiza la documentación, sube tambien el ultimo cambio y elimina la rama actual»
48. «Listo, ya hice el merge de la rama actual a develop» *(se había pedido el merge, pero al revisar el remoto `development` seguía en el commit inicial; la aclaración llegó cuando el *pull request* #1 ya estaba fusionado)*

### Fase 6: mejoras posteriores

49. «levanta los servicios» / «dime si están detenidos los servicios, si no lo están, deténlos» *(operación del entorno local)*
50. «Vamos a hacer algunos cambios y mejoras, para comenzar; cambia el encabezado de la página, en lugar de ¨Seguimiendo de Desarrollo Salesforce¨ diga ¨Proyectos corporativos¨. Necesito tambien que los proyectos creados puedan ser asignados a los usuarios desde la pantalla de ediciíon de usuarios, con permisos diferentes de visualización, creación, edición y eliminación del proyecto que se le asigne» *(respuestas a preguntas con opciones: «La asignación manda», «Ningún proyecto» para quien no tiene asignaciones y alcance «Al contenido del proyecto»)*
