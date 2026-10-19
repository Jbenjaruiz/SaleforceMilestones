# Prompt maestro: Seguimiento de Desarrollo Salesforce

## 1. Rol y objetivo

Actúa como un desarrollador frontend senior especializado en React, Vite, diseño de interfaces ejecutivas y visualización de información empresarial.

Debes construir un sitio web denominado **“Seguimiento de Desarrollo Salesforce”**, orientado a gerentes y responsables del proyecto que necesitan consultar de forma rápida y clara el estado de los entregables, el avance de las tareas y los retrasos.

La aplicación será una demo funcional de solo lectura, sin backend ni base de datos. Los datos se obtendrán de un archivo Excel que el equipo podrá actualizar y reemplazar manualmente.

El contenido debe ser realista y estar basado en los hallazgos del documento de revisión de Lucalza. No inventes fechas, responsables, avances ni compromisos que no estén respaldados por información disponible.

## 2. Inspección obligatoria antes de programar

Antes de modificar archivos:

1. Inspecciona el repositorio abierto en VS Code.
2. Identifica la estructura, las dependencias, los scripts disponibles, las convenciones de código y los componentes existentes.
3. Usa como referencia arquitectónica el repositorio:
   https://github.com/Jbenjaruiz/metas-indicadores
4. Usa como referencia visual el repositorio:
   https://github.com/Jbenjaruiz/LucalzaLanding
5. Si tienes acceso a ambos repositorios, inspecciona sus archivos relevantes antes de decidir la implementación.
6. Reutiliza las convenciones y dependencias existentes cuando sea razonable. No reemplaces configuraciones ni reconstruyas funcionalidades que ya estén resueltas.
7. Comprueba si el archivo `Hallazgos-Revisión-CC01-08.10.2026.V3.xlsx` está disponible en el workspace. Si no lo está, solicita que se copie al proyecto o utiliza la ruta que indique el usuario. No simules haber leído un archivo inaccesible.

Si encuentras una limitación que impida cumplir algún requerimiento, explícalo y propone la alternativa más sencilla. No te detengas por decisiones menores que puedas resolver de forma consistente con esta especificación.

## 3. Tecnología y arquitectura

Utiliza:

- React.
- Vite.
- JavaScript, respetando la tecnología y las convenciones existentes en el repositorio.
- CSS para los estilos, siguiendo las convenciones del proyecto.
- SheetJS (`xlsx`) para leer archivos Excel, si el proyecto no dispone ya de una solución equivalente.
- Componentes reutilizables y separación razonable de responsabilidades.

No incorpores backend, base de datos, API propia ni autenticación.

La aplicación debe funcionar como un sitio estático publicable en un hosting web.

No agregues bibliotecas de gráficos, iconos o componentes de interfaz si puedes resolver la necesidad con las dependencias existentes o con CSS.

## 4. Fuente de datos y actualización

El archivo de datos oficial será:

`public/data/seguimiento_salesforce.xlsx`

El equipo actualizará el contenido del Excel y reemplazará el archivo publicado, conservando su nombre y ruta. La página debe leer los datos al cargarse y calcular los indicadores en el navegador.

Requisitos:

- No modificar datos ni guardar cambios desde la interfaz.
- No exigir compilación de React cada vez que cambien únicamente los datos del Excel.
- Configurar la lectura del archivo con una ruta compatible con Vite y con posibles despliegues en subrutas.
- Evitar que el navegador presente una versión antigua del Excel por caché. Utiliza una política de caché apropiada para la fuente de datos y un mecanismo de recarga que permita obtener la versión actual.
- Mostrar la fecha de corte registrada en el archivo.
- Mostrar un mensaje de error comprensible si el Excel no existe, no puede leerse o tiene una estructura incorrecta.
- No presentar datos ficticios como si fueran datos reales.
- No utilizar una hoja de cálculo como base de datos ni implementar persistencia local de cambios.

Si el archivo no está disponible, puedes crear una plantilla de Excel con datos ilustrativos identificados expresamente como tales. No debes afirmar que la información real está cargada hasta comprobarlo.

## 5. Estructura del Excel

Define y documenta un formato de libro con tres hojas.

### Hoja `Configuracion`

Columnas o campos:

- `NombreProyecto`
- `FechaCorte`
- `VersionDatos`
- `ResponsableActualizacion`

Nombre inicial del proyecto: `Seguimiento de Desarrollo Salesforce`.

### Hoja `Hitos`

Cada fila representa un entregable de seguimiento.

Campos:

- `HitoID`: identificador único, por ejemplo `H001`.
- `NombreHito`: nombre breve del entregable.
- `Descripcion`: alcance resumido.
- `FechaEstimada`: fecha estimada de entrega.
- `FechaFinalizacion`: fecha real de finalización, vacía mientras no haya finalizado.
- `Estado`: únicamente `Pendiente`, `En curso` o `Finalizado`.
- `Responsable`: responsable o equipo confirmado.
- `Observaciones`: aclaraciones relevantes.
- `Orden`: orden de presentación.

### Hoja `Tareas`

Cada fila representa una tarea.

Campos:

- `TareaID`: identificador único.
- `HitoID`: referencia a un hito existente.
- `NombreTarea`: descripción de la actividad.
- `Completada`: `Sí` o `No`.
- `Observaciones`: contexto, dependencia o criterio de aceptación.
- `Orden`: orden de presentación.

Añade a las tareas un campo `ControlCambioOrigen` para conservar la nomenclatura original, por ejemplo `CC-C01`, `CC-C02`, `CC-C13` o `CC-M01`. Permite varias referencias cuando una tarea esté respaldada por más de un control de cambio.

Si necesitas un campo adicional para distinguir una decisión contractual de una tarea técnica, puedes añadirlo siempre que lo documentes.

No mantengas manualmente en el Excel los porcentajes calculados ni los días de retraso.

Documenta el esquema de las hojas, los valores permitidos y las reglas de validación en un archivo README o documento equivalente.

## 6. Reglas de negocio y cálculos

Implementa los cálculos en funciones independientes, con pruebas cuando sea viable.

### Avance de un hito

Porcentaje de tareas completadas entre el total de tareas del hito, multiplicado por 100.

Cada tarea tiene el mismo peso dentro de su hito.

Si un hito no contiene tareas, no lo consideres automáticamente completado: presenta su avance como no disponible y muestra una advertencia.

### Avance global del proyecto

Cada hito tiene el mismo peso, independientemente del número de tareas que contenga.

Fórmula:

Avance global = suma de los porcentajes de avance válidos de los hitos / número de hitos con avance válido.

Redondea el resultado a un máximo de un decimal para presentarlo en pantalla. Conserva la precisión interna para los cálculos.

Muestra cuántos hitos participan en el cálculo si existen hitos sin tareas o con datos inválidos. No los contabilices como 0 % silenciosamente.

### Días de retraso

Usa días calendario, normalizando las fechas para evitar errores derivados de las horas y zonas horarias.

Para un hito finalizado:

- Retraso = máximo entre cero y la diferencia en días calendario entre la fecha real y la fecha estimada.

Para un hito no finalizado:

- Si la fecha actual supera la fecha estimada, calcula los días transcurridos desde el vencimiento.
- Si la fecha estimada es hoy o futura, el retraso es cero.

No utilices la fecha de corte del Excel como fecha de cálculo del retraso. La fecha actual del sistema es la referencia acordada.

### Coherencia de datos

El estado del hito es manual y no debe modificarse automáticamente a partir de las tareas.

Sin embargo, identifica y presenta advertencias cuando:

- Un hito esté marcado como `Finalizado` y tenga tareas incompletas.
- Un hito no finalizado tenga fecha real de finalización.
- Un hito finalizado carezca de fecha real.
- Un hito no tenga tareas.
- Existan identificadores duplicados o referencias inválidas.

Las advertencias no deben modificar los datos ni ocultar los errores.

## 7. Contenido real y trazabilidad de los controles de cambio

El documento de referencia es:

`Hallazgos-Revisión-CC01-08.10.2026.V3.xlsx`

Contiene las hojas `Hallazgos reales` y `Revisión de Lucalza`.

La hoja `Revisión de Lucalza` registra 43 puntos de revisión y distingue los estados históricos:

- Resuelta.
- Resuelta en parte.
- Sigue pendiente.
- Cerrada por decisión de Lucalza.
- Fuera de alcance.

Estos estados describen la revisión del Control de Cambios V3 del 8 de octubre de 2026. No equivalen automáticamente al estado actual de ejecución del proyecto.

La hoja `Hallazgos reales` contiene el análisis de hallazgos vigentes, impactos funcionales, propuestas de negociación y observaciones económicas.

Utiliza el documento para proponer hitos y tareas verificables, pero distingue entre:

1. Entregables de desarrollo.
2. Dependencias de Inforum, SAP u otros proveedores.
3. Decisiones y validaciones funcionales de Lucalza.
4. Aprobaciones comerciales o contractuales.
5. Asuntos cerrados o fuera de alcance.

No conviertas automáticamente cada punto de la revisión en una tarea activa.

### Agrupación inicial propuesta

Utiliza estos seis hitos como propuesta inicial, revisándolos contra el contenido real del Excel:

- `H001`: Validación funcional y cierre de reglas de negocio.
- `H002`: Integraciones y dependencias de SAP.
- `H003`: Sincronización y disponibilidad de información.
- `H004`: Flujo comercial y experiencia del vendedor.
- `H005`: Cierre del alcance y documentación funcional.
- `H006`: Aprobación comercial y condiciones de ejecución.

Los nombres y agrupaciones pueden ajustarse si el contenido real demuestra que otra organización es más coherente. No añadas compromisos que el documento no respalde.

### Referencias concretas que deben conservarse

Entre los asuntos relevantes que deben considerarse al preparar las tareas están:

- `CC-C01`: bodegas de venta y visualización, existencias y dependencia del campo `WhsCode` solicitado a Inforum.
- `CC-C02`: pagos, relación entre pedidos y facturas, campos del servicio y pedidos pendientes de facturación.
- `CC-C03` y `CC-C13`: flujo del sugerido de ventas, configuración y decisiones pendientes sobre los pedidos que se toman como referencia.
- `CC-C04`: reglas comerciales de promociones y precios especiales, junto con las contradicciones documentales todavía pendientes.
- `CC-C07` y `CC-C12`: sincronización, límites de crédito, multimoneda, precios especiales, periodicidad y separación de procesos.
- `CC-C08`: integración de pagos.
- `CC-C09`: límites de débito y su aplicación a prospectos.
- `CC-C10`: determinación del país y la empresa del usuario.
- `CC-C11`: visitas y múltiples direcciones.
- `CC-M01`: flujo de selección y validación de bodega.
- Hallazgo sin control de cambio: contactos que no sincronizan correctamente con SAP, incluyendo edición y eliminación.
- Condiciones de ejecución: pagos por hitos, cronograma, dependencias y actualización del documento de diseño.

Esta lista es orientativa y no sustituye la lectura del archivo. Comprueba las referencias y el texto original antes de asociarlos a tareas.

### Reglas de integridad de la información

- Conserva los códigos de control de cambio originales.
- No conviertas el estado histórico de una revisión en el estado actual de una tarea.
- No inventes fechas estimadas ni reales.
- No inventes nombres de personas responsables.
- Si el documento identifica a un equipo o proveedor, utiliza esa referencia únicamente cuando corresponda.
- No uses como fechas de ejecución las fechas históricas de elaboración del documento.
- No presentes las propuestas de negociación como acuerdos aprobados.
- Mantén fuera de las tareas activas las exclusiones expresas de Lucalza, como promociones y encuestas en la aplicación sin conexión y conteo de inventario en ese flujo.
- Si una actividad requiere validación del usuario para convertirse en un compromiso de ejecución, identifícala en la documentación como pendiente de confirmar.

Como el esquema operativo permite únicamente tres estados, utiliza `Pendiente` para las acciones cuya ejecución aún no esté acreditada, pero identifica en las observaciones del Excel que el estado es provisional cuando corresponda. No declares una tarea `Finalizado` o `En curso` sin evidencia.

## 8. Diseño de la interfaz

Construye una interfaz ejecutiva, corporativa, limpia y fácil de consultar.

Toma como referencia visual:

https://github.com/Jbenjaruiz/LucalzaLanding

Inspecciona sus archivos CSS, Sass, tipografías, logotipo, imágenes y variables de color si están disponibles. Extrae los colores y estilos reales en lugar de inventarlos.

Adapta la identidad visual al contexto de un dashboard gerencial; no reproduzcas la landing page como si fuera el tablero.

Lineamientos:

- Cabecera corporativa con título y fecha de corte.
- Fondo claro para facilitar la lectura.
- Contraste y jerarquía visual adecuados.
- Tarjetas ejecutivas con cifras destacadas.
- Acentos de marca coherentes con la referencia.
- Colores semánticos para los estados, diferenciados de la paleta de marca.
- Tabla legible, compacta y con buena alineación de fechas y porcentajes.
- Diseño adaptable a escritorio, tableta y móvil.
- Estados vacíos, carga y error bien resueltos.
- Accesibilidad básica: contraste, foco visible, etiquetas y navegación por teclado.

### Indicadores superiores

Muestra como mínimo:

1. Avance global del proyecto.
2. Hitos finalizados respecto del total.
3. Cantidad de hitos retrasados.

El indicador de hitos retrasados debe considerar los días de retraso calculados y excluir aquellos que estén dentro del plazo.

### Tabla de hitos

Incluye:

- Identificador.
- Nombre del hito.
- Responsable.
- Estado.
- Avance porcentual.
- Fecha estimada de entrega.
- Fecha real de finalización.
- Días de retraso.
- Acceso al detalle de tareas.

Permite expandir y contraer las tareas de cada hito. Las tareas mostrarán su nombre, estado de cumplimiento, observaciones y código de control de cambio de origen.

### Filtros

Implementa filtros por:

- Estado del hito.
- Situación de retraso: todos, retrasados y dentro del plazo.

Los filtros deben funcionar sin modificar el conjunto de datos original ni distorsionar los indicadores globales. Los indicadores de cabecera siempre deben representar el proyecto completo, salvo que se documente explícitamente otra regla.

### Comportamiento de solo lectura

No implementes controles para marcar tareas, cambiar estados, editar fechas ni guardar modificaciones desde la página.

La interfaz refleja exclusivamente los datos del Excel.

## 9. Organización del código

Adapta la organización a la estructura existente, evitando crear archivos innecesarios. Como referencia, separa responsabilidades similares a las siguientes:

- `components/`: cabecera, tarjetas ejecutivas, tabla, filas expandibles, tareas y estados.
- `services/`: lectura y transformación del Excel.
- `utils/`: cálculos de avance, retrasos, fechas y validaciones.
- `styles/`: estilos del dashboard.
- `App.jsx` y `main.jsx`: composición e inicialización de la aplicación.

No es obligatorio utilizar exactamente esos nombres si el repositorio ya dispone de una estructura equivalente.

## 10. Validación y pruebas

Antes de dar por terminado el trabajo:

1. Ejecuta las pruebas disponibles.
2. Añade pruebas para los cálculos de avance y retraso, si el proyecto dispone de infraestructura de pruebas o puedes incorporarla sin complejidad innecesaria.
3. Verifica que la lectura de las tres hojas del Excel funciona.
4. Comprueba que los identificadores se relacionan correctamente.
5. Prueba hitos sin tareas, fechas vacías, datos inválidos y estados contradictorios.
6. Comprueba los filtros y el despliegue de tareas.
7. Verifica el comportamiento con una ruta base distinta de `/`, si el despliegue previsto lo requiere.
8. Ejecuta el proceso de compilación de producción y corrige los errores que encuentres.
9. Revisa que no existan errores de consola que afecten la experiencia.
10. Comprueba que la interfaz no permite editar los datos.

No declares que las pruebas pasaron si no las ejecutaste realmente.

## 11. Entregables

Al terminar, proporciona:

- La implementación funcional en el repositorio actual.
- El Excel estructurado y validado, si puede construirse con la información disponible.
- Datos de demostración claramente identificados cuando no existan datos reales suficientes.
- Una guía breve de actualización del Excel.
- Instrucciones para ejecutar localmente el proyecto y construir la versión de producción.
- Una lista de archivos creados o modificados.
- Un resumen de las pruebas realizadas y sus resultados.
- Una lista explícita de datos que todavía requieren confirmación de Lucalza, Freeway o Inforum.

No te limites a describir cómo construirlo: implementa la solución dentro del workspace actual.

La prioridad es entregar una demo ejecutiva funcional, consistente con los datos reales, sencilla de actualizar y sin complejidad de infraestructura innecesaria.