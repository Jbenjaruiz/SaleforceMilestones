# Seguimiento de Desarrollo Salesforce

Tablero ejecutivo **de solo lectura** (React + Vite + SheetJS). Lee `public/data/seguimiento_salesforce.xlsx` al cargar y calcula avance y retrasos en el navegador. Sin backend, base de datos ni autenticación: es un sitio estático.

Identidad visual tomada de LucalzaLanding (`#005153`, `#1e3238`, `#ecab23`, Plus Jakarta Sans / Inter y el logotipo).

## Ejecutar

```sh
nvm use 24
npm install
npm run dev          # desarrollo
npm test             # pruebas (Vitest)
npm run build        # versión publicable en dist/
npm run preview      # probar dist/ localmente
```

El sitio usa rutas relativas (`base: './'`), por lo que funciona en la raíz o en una subruta del hosting.

## Actualizar los datos

1. Cierre el libro en Excel, edítelo y guárdelo **con el mismo nombre y ruta**: `public/data/seguimiento_salesforce.xlsx`.
2. En un sitio ya publicado, basta con reemplazar ese archivo: no hace falta recompilar. Los usuarios pulsan **Actualizar datos**.
3. La lectura usa `cache: 'no-store'` y un parámetro `?v=` único. Para el hosting, `public/_headers` pide `Cache-Control: no-store` en `/data/*` (Netlify/Cloudflare Pages); en otros servidores configure lo mismo.

`npm run build:data` regenera el libro inicial desde `scripts/workbook-data.mjs` y **sobrescribe** el existente (Excel debe tenerlo cerrado).

### Esquema del libro (tres hojas)

| Hoja | Columnas | Reglas |
|---|---|---|
| `Configuracion` | `NombreProyecto`, `FechaCorte`, `VersionDatos`, `ResponsableActualizacion` | Una fila. `FechaCorte` obligatoria. Si `VersionDatos` contiene «DEMO» o «BORRADOR» se muestra un aviso de datos provisionales. |
| `Hitos` | `HitoID`, `NombreHito`, `Descripcion`, `FechaEstimada`, `FechaFinalizacion`, `Estado`, `Responsable`, `Observaciones`, `Orden` | `HitoID` único. `Estado`: `Pendiente`, `En curso` o `Finalizado` (manual). Fechas como fecha de Excel o `AAAA-MM-DD`. `FechaFinalizacion` vacía mientras no finalice. |
| `Tareas` | `TareaID`, `HitoID`, `NombreTarea`, `Completada`, `Observaciones`, `Orden`, `ControlCambioOrigen`, `TipoTarea`, `FuenteHallazgo` | `TareaID` único. `HitoID` debe existir. `Completada`: `Sí` o `No`. `ControlCambioOrigen` admite varios códigos separados por coma (`CC-C03, CC-C13`). |

Columnas añadidas, opcionales (el libro funciona sin ellas): `TipoTarea` distingue Desarrollo, Dependencia externa, Decisión funcional, Documentación y Aprobación comercial; `FuenteHallazgo` indica el hallazgo del documento de origen.

No se guardan porcentajes ni días de retraso en el Excel.

### Reglas de cálculo

- **Avance del hito** = tareas completadas / tareas válidas × 100. Sin tareas válidas: «N/D» y aviso (nunca 0 % ni 100 %).
- **Avance global** = media simple de los hitos con avance disponible; se indica cuántos participan. Se muestra con un decimal.
- **Retraso** (días calendario, fecha actual del equipo, no la fecha de corte): finalizado → máx(0, real − estimada); no finalizado → días desde el vencimiento o 0. Sin fecha estimada, o finalizado sin fecha real, queda «No calculable».
- Los indicadores superiores siempre cubren el proyecto completo; los filtros solo acotan la tabla.
- Avisos (no modifican datos): finalizado con tareas incompletas, no finalizado con fecha real, finalizado sin fecha real, hito sin tareas, identificadores duplicados, referencias a hitos inexistentes, valores inválidos.
- Errores bloqueantes: archivo ausente o ilegible, hojas o columnas faltantes, `FechaCorte` vacía.

## Contenido actual del libro

Derivado de `Hallazgos-Revisión-CC01-08.10.2026.V3.xlsx`: 6 hitos y 28 tareas con sus códigos CC originales. **Es un borrador provisional**: todo está `Pendiente`/`No` porque no hay evidencia de ejecución, y no hay fechas ni responsables porque el documento no los respalda. Las exclusiones de Lucalza (promociones, encuestas y conteo de inventario en la app sin conexión) no son tareas activas. Las propuestas de negociación no son acuerdos.

## Pendiente de confirmar (Lucalza, Freeway, Inforum)

- Fechas estimadas de cada hito y responsables confirmados. Las fechas del CC V3 (construcción 8-oct a 27-nov, pruebas 30-nov a 4-dic, producción 11-dic) son propuesta de Freeway sin aprobar.
- Estado real de ejecución de cada tarea.
- Costo, responsable y fecha de los cambios en SAP (WhsCode, facturas, impuestos de direcciones): Inforum.
- Decisiones funcionales H001 (precio especial vs promoción, país/empresa, pedidos del sugerido, lista de precios en promociones, direcciones múltiples).
- Referencia `CC-C11` en la tarea de impuestos: inferida de las páginas citadas.
- Cifras económicas de la sección B (propuesta de negociación).

## Despliegue en GitHub Pages

El workflow `.github/workflows/deploy.yml` ejecuta pruebas, compila y publica `dist/` en cada push a `main`. En el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**. El sitio queda en `https://<usuario>.github.io/<repositorio>/`.

Para actualizar los datos en producción: reemplace `public/data/seguimiento_salesforce.xlsx`, haga commit y push a `main`; el workflow lo vuelve a publicar. Los usuarios ven el cambio al recargar o con **Actualizar datos** (la lectura evita la caché).
