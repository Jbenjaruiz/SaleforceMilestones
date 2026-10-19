# Contexto de negocio

Resumen de los dos documentos que originan los datos del tablero, para que los requerimientos de `F01` partan de la realidad y no de supuestos.

## 1. Los dos documentos

| Documento | Qué es | Autor / uso |
|---|---|---|
| `FWY-SF-Lucalza_CC01-08.10.2026.V3.pdf` | **Solicitud de Cambios** `FWY-SF-LUCALZA-CC-001`, **revisión 3** (8 oct 2026; emisión 9 sep 2026). 52 páginas. Proyecto **FWY-CO-132**: implementación de Salesforce Consumer Goods Cloud (Core y App Offline) para Lucalza, integrado con SAP Business One. | Freeway Consulting (proveedor). Documento contractual a firmar por Lucalza y Freeway; **hasta que se firme no se inicia ningún cambio**. |
| `Hallazgos-Revisión-CC01-08.10.2026.V3.xlsx` | Análisis de Lucalza (cliente) de ese documento. Hoja **Hallazgos reales** (27 hallazgos con postura y ahorro) y hoja **Revisión de Lucalza** (43 puntos contra los CC). | Lucalza / equipo de revisión. Es la base de la negociación, no un plan de ejecución. |

## 2. Qué es un «control de cambio» (CC)

El PDF formaliza **12 controles de cambio**, cada uno con la misma estructura: justificación, descripción, requerimientos numerados, alcance (etapa y criterio de éxito), riesgo/impacto en calidad y **esfuerzo estimado en horas**.

| Código | Cambio | Horas | Etapa |
|---|---|---|---|
| CC-C01 | Stock por bodega durante la cotización en Core | 78 | Construcción |
| CC-C02 | Integración de facturación | 66 | Construcción |
| CC-C03 | Evaluación sugerido vs. pedido en Core (vista Farmer) | 126 | Construcción |
| CC-C04 | Captura de promociones y carga masiva en Core | 184 | Construcción |
| CC-C07 | Sincronización de precios a demanda | 30 | Diseño |
| CC-C08 | Integración de creación de pagos | 34 | Construcción |
| CC-C09 | Límite de débito alineado al de crédito | 2 | Construcción |
| CC-C10 | Validación de país/empresa por usuario | 20 | Diseño |
| CC-C11 | Captura de impuesto del prospecto | 16 | Construcción |
| CC-C12 | Sincronización de existencias a demanda | 40 | Diseño |
| CC-C13 | Pedido sugerido nativo en la App Offline | 160 | Construcción |
| CC-M01 | Stock por bodega en la App Offline (Modeler) | 180 | Construcción |
| **Total** | | **936** | USD 51,271 |

- Hay **huecos en la numeración** (C05, C06, M02): no existen en esta revisión. `CC-M03` (promociones en la app) fue retirado; `CC-002` es otro documento ya excluido.
- Prefijos: `CC-C…` = Core; `CC-M…` = Modeler (App Offline). Por eso el formato del código **no puede validarse como solo `CC-C` + número**.
- Dependencias entre CC: C03 depende de C13; M01 depende de C01; C08 depende de C02; C10 se relaciona con C11; C07 y C12 son el mismo mecanismo (botón a demanda).

## 3. Qué dice el análisis de Lucalza

- **Hallazgos reales:** 27 observaciones agrupadas en A (cambia la forma de operar el negocio), B (cobros que no corresponden) y C (condiciones de pago y plazo). Cada una lleva una **postura**: `SOLTAR`, `NEGOCIAR`, `HACER LUCALZA` o `ACEPTAR`.
- **Revisión de Lucalza:** 43 puntos, cada uno ligado a un CC (o a «sin control de cambio» / «decisión de Lucalza» / «documentos»), con estado: resuelta (14), resuelta en parte (7), sigue pendiente (12), cerrada por decisión (6), fuera de alcance (4).
- **Responsables mezclados:** el trabajo no es solo de Freeway. Hay tareas de **Lucalza** y de **Inforum** (el proveedor de SAP), p. ej. habilitar `WhsCode` en pedidos, ampliar el servicio de facturas, nodos de impuestos en `SET_CLIENTE_XML`.
- **Exclusiones de Lucalza:** promociones, encuestas y conteo de inventario en la app sin conexión.

## 4. Cronograma y pago (del PDF)

- Construcción desde el **8 de octubre**; fin el **18 de diciembre**; duración **10 semanas** (el texto del PDF; el cronograma por fases está en una imagen que no se pudo leer y el análisis de Lucalza cita construcción 8-oct a 27-nov, pruebas 30-nov a 4-dic, producción 11-dic). **Confirmar con el PDF original.**
- Pago: **100 % a la firma** (USD 51,271). Lucalza propone pago por hitos.
- Las fechas del PDF son una **propuesta no aprobada**; no se usan como fechas del tablero.

## 5. Qué significa para el diseño de F01

| Observación | Efecto en el modelo |
|---|---|
| El proyecto natural es **una revisión del documento de cambios** (`FWY-SF-LUCALZA-CC-001`, Rev. 3). | Nombre sugerido del primer proyecto: «CC-001 Rev. 3 (8 oct 2026)». Un CC-002 u otra revisión sería otro proyecto. |
| Cada hito (CC) tiene **código, título, horas estimadas y etapa** en el documento. | **Decidido:** el hito solo guarda código, nombre y descripción; las horas y la etapa no se incluyen. |
| Los CC tienen **requerimientos numerados** (p. ej. C01 tiene 5, C04 tiene 6). | **Decidido:** las tareas pueden surgir de los hallazgos o de los requerimientos. |
| **5 de las 28 tareas actuales no pertenecen a ningún CC** (contactos que no sincronizan, vista de seguimiento de supervisores, pago por hitos, cronograma, actualizar documento de diseño). | Con «código obligatorio» no tendrían hito. **Decidido:** van a un hito general con código marcador `CC-GEN`. |
| **6 tareas citan varios CC** (hasta 8). | **Decidido:** se toma solo el primer código de la celda. |
| Una tarea cita `CC-M03`, que ya no existe. | Se debe cambiar o descartar al importar. |
| Hay tareas de **Lucalza e Inforum**, no solo de Freeway. | **Decidido:** `Responsable` se conserva como campo opcional de texto libre en la tarea. |
