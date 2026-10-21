# Requerimientos

Este directorio recoge los requerimientos de las nuevas features. Por ahora **solo se documenta; no se implementa código**.

## Índice

| ID | Feature | Estado |
|---|---|---|
| [F01](F01-base-de-datos-y-backend.md) | Base de datos y backend en NestJS (usuarios, roles y permisos, core) | Aprobada; solo pendiente el despliegue en Azure |
| [F02](F02-asignacion-de-proyectos.md) | Asignación de proyectos a usuarios con permisos por proyecto | Implementada y verificada contra la base real |
| [F03](F03-validacion-del-cliente.md) | Marca «Validación del cliente» en las tareas | Implementada; falta ejecutar el script en la base |
| [F01-despliegue](F01-despliegue-azure.md) | Despliegue en una máquina virtual Windows de Azure (IIS + servicio de Windows) | Propuesta, pendiente de TI |

Preguntas sin resolver: [preguntas-abiertas.md](preguntas-abiertas.md).

## Estados

- **Propuesta:** redactada, sin validar.
- **Aclarar:** hay preguntas abiertas que cambian el diseño.
- **Aprobada:** lista para implementar.

## Convenciones

- Un archivo por feature: `Fnn-nombre.md`.
- Lo que no esté confirmado se marca como **pendiente**, no se asume.
- Los diagramas usan Mermaid, que GitHub renderiza directamente.
