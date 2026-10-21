# F03 — Marca «Validación del cliente» en las tareas

**Estado:** implementado en el código; **falta ejecutar el script de la §4** en la base (requiere DDL). Hasta entonces la API no puede leer las tareas.

## 1. Qué cambia

Una persona que trabaja en el proyecto (por ejemplo un desarrollador) puede marcar una tarea como **lista para que el cliente la valide**. La marca se queda hasta que alguien la quite o la tarea se finalice. Los estados actuales (Pendiente, En curso, Finalizado) **no cambian**: la marca es una etiqueta adicional.

## 2. Decisiones

| Tema | Decisión |
|---|---|
| Quién | Quien tenga el permiso **Modificar** en el proyecto (y el administrador) |
| Efecto | Solo la etiqueta «Validación del cliente». No fija fechas, no finaliza la tarea y **no cambia el retraso** (sigue contando hasta el check) |
| Al finalizar | El check **quita** la marca: la validación ya terminó |
| Tarea finalizada | No se puede marcar (la API responde 400). Si se reabre, queda sin marca |
| Rechazo del cliente | Se quita la marca a mano y la tarea sigue «en curso» |
| Avance del hito | Sin cambios: cuenta como avance solo lo finalizado |
| Auditoría | Se registran `request_validation` y `cancel_validation` |
| Estado «En revisión» | No se implementa; si hace falta se añade después |

## 3. API

| Ruta (`/api`) | Acceso | Qué hace |
|---|---|---|
| `PUT /tasks/:id/validation` | Permiso Modificar en el proyecto | `{ "ready": true }` marca; `{ "ready": false }` quita. Repetir el estado no hace nada |

Las tareas devuelven el campo nuevo `readyForValidation`.

## 4. Script de creación de la columna (para quien administra la base)

Compatible con SQL Server 2012. Las tareas existentes quedan sin marca.

```sql
USE fw_project;
GO

ALTER TABLE tasks
  ADD ready_for_validation BIT NOT NULL
  CONSTRAINT DF_tasks_ready_for_validation DEFAULT 0;
GO
```

**Si la tabla `migrations` ya existe**, registrar la migración:

```sql
USE fw_project;
GO
IF OBJECT_ID(N'dbo.migrations', N'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM migrations WHERE [timestamp] = 1792692000000)
  INSERT INTO migrations ([timestamp], name) VALUES (1792692000000, 'AddTaskValidation1792692000000');
GO
```

**Verificación:**

```sql
SELECT COUNT(*) AS marcadas FROM tasks WHERE ready_for_validation = 1;   -- 0 al inicio
```

**Reversión** (solo en pruebas):

```sql
USE fw_project;
GO
ALTER TABLE tasks DROP CONSTRAINT DF_tasks_ready_for_validation;
ALTER TABLE tasks DROP COLUMN ready_for_validation;
GO
```
