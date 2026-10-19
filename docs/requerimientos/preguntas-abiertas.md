# Preguntas abiertas

Cada punto afecta al diseño; hasta resolverlo, el documento de la feature lo trata como pendiente.

## F01 — Base de datos y backend

### Decisiones tomadas

| # | Tema | Decisión |
|---|---|---|
| 1 | Hitos | Un hito por control de cambio. Se descartan H001–H006. Todo hito tiene código obligatorio; no hay hitos sin código ni hito general. Los hitos también se crean a mano y se les agregan tareas. |
| 2 | Permisos | Ver, crear, modificar y eliminar, con el mismo valor en todo el sistema. La gestión de usuarios, roles y contraseñas es exclusiva del rol protegido Administrador. |
| 3 | Rol por usuario | Uno. |
| 4 | Tareas | Fecha de inicio y fecha de entrega estimada **obligatorias**, y un botón de check que las finaliza. La fecha real la fija el sistema al marcar; cada marcado fija una fecha nueva; no se edita a mano. |
| 5 | «En curso» | Se deriva de las fechas (F01 §4.3). |
| 6 | Comentarios | Lista de comentarios de varios usuarios, por hito y por tarea; los borra su autor o un administrador; no se editan. |
| 7 | Campos del Excel | `TipoTarea`, `FuenteHallazgo`, `ControlCambioOrigen` (salvo el primer código para asignar el hito) y `Observaciones` se descartan. `Responsable` se conserva como campo opcional de la tarea. |
| 8 | Motor | SQL Server. Las credenciales de la base de prueba las compartirá el usuario. |
| 9 | Hosting | Servidor Azure de la empresa, ya existente y pagado por ella. Por ahora todo en local. El frontend ya no se queda en GitHub Pages. |
| 10 | Repositorio | Monorepo (F01 §3). |
| 11 | Acceso | Privado: se exige iniciar sesión. |
| 12 | Alta de usuarios | Los crea un administrador desde la interfaz, que también crea roles. |
| 13 | Roles iniciales | Administrador (protegido, todos los permisos) y **Revisor** (solo lectura). Los demás los crea el administrador. Usuario inicial: lo crea el equipo de desarrollo con una carga inicial, por variables de entorno. |
| 14 | Autoría | Sí se registra quién hizo cada cambio (F01 §5). |
| 15 | Eliminar hito | Se elimina junto con sus tareas, comentarios y adjuntos. |
| 16–17 | Excel | Queda como importación, además de poder crear proyectos nuevos sin fecha de vencimiento. |
| 18 | Contraseñas | El administrador las administra; largo mínimo de 7 caracteres; no se obliga a cambiarlas en el primer ingreso; no hay «olvidé mi contraseña». |
| 19 | Adjuntos | Los comentarios admiten archivos, sobre todo imágenes; se guardan en disco. Tipos PNG, JPG, WebP y PDF; máximo 5 MB por archivo y 5 por comentario. |
| 21 | Proyecto (antes «lote») | Todo hito pertenece a un proyecto; el proyecto es seleccionable; **puede haber varios activos a la vez**; sin fecha de vencimiento. **Solo el Administrador los crea.** «Eliminar» = **archivar**: deja de aparecer en el selector y conserva sus datos. **No hay vista que sume todos los proyectos.** |
| 21e | Proyectos archivados | El Administrador puede verlos (y reactivarlos); los demás usuarios no. |
| 29c | Fecha estimada del hito | La mayor fecha estimada de sus tareas. Inicio = primera tarea; finalización = última tarea finalizada. |
| 33b | Responsable | Solo la tarea lo lleva; el hito no. |
| 34 | Adjuntos de tarea | Las tareas también llevan adjuntos directos, no solo comentarios. Ninguna recibe imágenes desde el Excel: se adjuntan una vez creada la tarea (a mano o importada). Máximo 5 MB por archivo y 5 por tarea, mismos tipos que en comentarios. Los hitos no llevan adjuntos directos. Lo borra quien lo subió o el Administrador. |
| 36 | Administrador | Puede hacer todo sobre cualquier dato. |
| 22 | Importación | **No crea proyectos**: carga en un proyecto existente, y **solo el Administrador importa**. Plantilla de una hoja (`CodigoHito`, `NombreHito`, `DescripcionHito`, `Tarea`, `Responsable`, `FechaInicio`, `FechaEstimada`). Si hay **cualquier** error se **cancela toda la importación** hasta corregirlo todo. Se rechazan los códigos repetidos y las filas inválidas. Fecha de inicio y fecha estimada obligatorias en cada tarea; el Excel se completa con ayuda de Claude antes de importar. |
| 23 | Tareas con varios códigos | Una tarea pertenece a un solo hito; del Excel se toma **solo el primer código** de la celda. |
| 24 | Idioma | Código fuente, API y base de datos en inglés; interfaz y docs en español. |
| 25 | Fechas | De calendario, sin hora ni zona horaria. |
| 29 | Hito | Sin check propio: su porcentaje de avance y su finalización dependen de sus tareas. Su retraso es la suma de los días de retraso de sus tareas atrasadas. El retraso global es la suma de todas las tareas. |
| 30 | Datos del CC en el hito | Solo nombre y descripción (además del código). Sin horas ni etapa. |
| 31 | Origen de las tareas | Pueden surgir de los hallazgos o de los requerimientos del CC. |
| 32 | Tareas sin CC | Se decidirá después cómo agregarles un hito. Mientras tanto no se importan. |
| 33 | Responsable | Opcional, texto libre por ahora, en la tarea. |

### Siguen abiertas

22g. **Nombre del proyecto que recibe el Excel.** Se cargará cuando esté listo con sus fechas. Nombre propuesto: «CC-001 Rev. 3 (8 oct 2026)»; el Administrador crea antes ese proyecto.
26. **Despliegue en Azure** (pospuesto: por ahora todo corre en local). Se definirá cuando el sistema funcione: tipo de servidor, dominio y HTTPS, qué servidor sirve el frontend, base de datos de producción, disco de adjuntos, quién despliega y secretos.
