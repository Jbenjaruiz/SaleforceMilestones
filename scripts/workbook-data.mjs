// Contenido inicial del libro, derivado de «Hallazgos-Revisión-CC01-08.10.2026.V3.xlsx»
// (hojas «Hallazgos reales» y «Revisión de Lucalza»).
//
// Reglas aplicadas:
// - Sin fechas estimadas ni reales: el documento no registra compromisos de ejecución.
//   Las fechas de construcción/pruebas/producción del CC V3 son una propuesta de
//   Freeway sin aprobar y no se usan como fechas del hito.
// - Sin responsables inventados: se deja vacío cuando el documento no lo confirma.
// - Todo queda «Pendiente» y «No»: no hay evidencia de ejecución. Es provisional.
// - Los estados históricos de la revisión (Resuelta, Sigue pendiente, …) no se
//   convierten en estado actual de las tareas.
// - Promociones, encuestas y conteo de inventario en la app sin conexión son
//   exclusiones de Lucalza y no generan tareas activas.

export const PROVISIONAL = 'Estado provisional: sin evidencia de ejecución.';

export const config = {
  NombreProyecto: 'Seguimiento de Desarrollo Salesforce',
  VersionDatos: 'BORRADOR 0.1 — derivado de Hallazgos CC V3 (8-oct-2026); fechas y responsables por confirmar',
  ResponsableActualizacion: 'Por confirmar',
};

export const milestones = [
  {
    id: 'H001',
    name: 'Validación funcional y cierre de reglas de negocio',
    description: 'Decisiones funcionales de Lucalza que deben quedar confirmadas por escrito.',
    notes: 'Decisiones y validaciones de Lucalza. Fecha estimada y responsable por confirmar.',
  },
  {
    id: 'H002',
    name: 'Integraciones y dependencias de SAP',
    description: 'Cambios en servicios de SAP y desarrollos de integración, con dependencia de Inforum.',
    notes: 'Depende de Inforum/SAP para varios cambios; costo y fecha no están declarados en el CC V3.',
  },
  {
    id: 'H003',
    name: 'Sincronización y disponibilidad de información',
    description: 'Periodicidad de la sincronización, botones de actualización a demanda y contactos con SAP.',
    notes: 'Fecha estimada y responsable por confirmar.',
  },
  {
    id: 'H004',
    name: 'Flujo comercial y experiencia del vendedor',
    description: 'Selección de bodega, stock multibodega, pedidos pendientes de facturar y vista de seguimiento.',
    notes: 'Fecha estimada y responsable por confirmar.',
  },
  {
    id: 'H005',
    name: 'Cierre del alcance y documentación funcional',
    description: 'Correcciones y precisiones que el CC V3 debe incluir para tener un alcance sin contradicciones.',
    notes: 'Las exclusiones de Lucalza (promociones, encuestas y conteo de inventario en la app sin conexión) no son tareas activas.',
  },
  {
    id: 'H006',
    name: 'Aprobación comercial y condiciones de ejecución',
    description: 'Condiciones de pago, cronograma, dependencias y cobros señalados en el análisis.',
    notes: 'Las posturas del análisis son propuestas de negociación, no acuerdos aprobados.',
  },
];

// Tipos: Desarrollo · Dependencia externa · Decisión funcional · Documentación · Aprobación comercial
export const tasks = [
  // H001 — Validación funcional y cierre de reglas de negocio
  {
    milestone: 'H001', type: 'Decisión funcional', cc: ['CC-C04'], source: 'Hallazgo 1; Revisión CC-C04',
    name: 'Confirmar por escrito la regla de precio especial frente a promoción',
    notes: 'V3 (págs. 32-33) dice que con precio especial la promoción no aplica; la regla explicada por Lucalza es la contraria. El análisis registra como observación un cambio de modelo comercial (promociones por lista de precios), sin acuerdo aprobado.',
  },
  {
    milestone: 'H001', type: 'Decisión funcional', cc: ['CC-C10'], source: 'Hallazgo 3; Revisión CC-C10',
    name: 'Confirmar si país y empresa se calculan desde el usuario o se eligen',
    notes: 'El texto (págs. 38-39) mantiene selección y validación; el mockup muestra un campo calculado. Confirmar también que la seguridad cubre todos los objetos.',
  },
  {
    milestone: 'H001', type: 'Decisión funcional', cc: ['CC-C03', 'CC-C13'], source: 'Hallazgo 15; Revisión CC-C03',
    name: 'Definir qué pedidos cuentan como últimos pedidos del sugerido de ventas',
    notes: 'Falta decidir si cuentan los pedidos de Inside Sales y los complementos. El análisis registra una indicación de usar 5 pedidos; falta confirmación escrita.',
  },
  {
    milestone: 'H001', type: 'Decisión funcional', cc: ['CC-C04'], source: 'Hallazgo 10; Revisión CC-C04',
    name: 'Confirmar si las promociones pueden cambiar la lista de precios del cliente',
    notes: 'V3 se contradice entre la pág. 15 y las págs. 30 y 32. El análisis anota que ya no se harán cambios de lista; falta la respuesta escrita en el CC.',
  },
  {
    milestone: 'H001', type: 'Decisión funcional', cc: ['CC-C11'], source: 'Hallazgo 12; Revisión CC-C11',
    name: 'Decidir cómo atender visitas de clientes con varias direcciones',
    notes: 'V3 presenta una dirección fija por visita como limitante de plataforma. Queda pendiente la decisión de Lucalza y una alternativa (por ejemplo, una cuenta por estación).',
  },

  // H002 — Integraciones y dependencias de SAP
  {
    milestone: 'H002', type: 'Dependencia externa', cc: ['CC-C01'], source: 'Hallazgo 13; Revisión CC-C01',
    name: 'Habilitar el campo WhsCode en el envío de pedidos a SAP',
    notes: 'Lucalza debe coordinar con el proveedor de Inforum la modificación del servicio de órdenes. V3 (pág. 3) no indica quién lo hace ni su costo.',
  },
  {
    milestone: 'H002', type: 'Dependencia externa', cc: ['CC-C02'], source: 'Hallazgo 4',
    name: 'Ampliar el servicio de facturas con detalle por producto y facturas ya pagadas',
    notes: 'Hoy devuelve solo la cabecera de facturas con saldo. El análisis indica coordinar con el proveedor de Inforum y confirmar con Freeway que considera los nuevos servicios.',
  },
  {
    milestone: 'H002', type: 'Dependencia externa', cc: ['CC-C02'], source: 'Hallazgo 5; Revisión CC-C02',
    name: 'Incluir el código de pedido y la fecha de pago en el servicio de facturas',
    notes: 'Sin el código no se liga el cobro al pedido; sin la fecha no se clasifica pronto pago o pago tardío. Falta declarar responsable y fecha del cambio en SAP.',
  },
  {
    milestone: 'H002', type: 'Desarrollo', cc: ['CC-C08'], source: 'Hallazgo 19; Revisión CC-C08',
    name: 'Integrar el registro de pagos desde Salesforce con el servicio de pagos de SAP',
    notes: 'El servicio de SAP ya existe; falta la integración desde Salesforce. El cobro de 34 horas del CC V3 está en negociación.',
  },
  {
    milestone: 'H002', type: 'Dependencia externa', cc: ['CC-C11'], source: 'Hallazgo 23',
    name: 'Corregir el CC sobre impuestos del servicio de direcciones y fijar fecha de los cambios del lado SAP',
    notes: 'V3 (págs. 40-41) dice que el servicio no devuelve código y porcentaje de impuesto; el análisis indica que sí los devuelve. Lucalza coordina con el proveedor de Inforum. Referencia CC inferida de las páginas citadas: pendiente de confirmar.',
  },

  // H003 — Sincronización y disponibilidad de información
  {
    milestone: 'H003', type: 'Desarrollo', cc: ['CC-C07', 'CC-C12'], source: 'Hallazgo 7; Revisión CC-C07 y CC-C12',
    name: 'Declarar el estado real de la sincronización y entregar la periodicidad acordada',
    notes: 'Hoy corre una vez al día y tarda unas 3 horas; V3 dice que es horaria. El análisis registra que se acordó sincronizar cada hora; la revisión menciona evaluar 30 minutos y separar procesos.',
  },
  {
    milestone: 'H003', type: 'Desarrollo', cc: ['CC-C07'], source: 'Revisión CC-C07',
    name: 'Incluir los límites de crédito en la sincronización y definir cómo llegan al vendedor',
    notes: 'No figuran en la tabla de las págs. 34 y 43, y no está claro si las cuentas se sincronizan en la app.',
  },
  {
    milestone: 'H003', type: 'Decisión funcional', cc: ['CC-C07', 'CC-C12'], source: 'Hallazgos 2, 8 y 22',
    name: 'Definir el alcance de los botones de actualización a demanda (precios, precios especiales y existencias)',
    notes: 'V3 quitó los precios especiales del botón de CC-C07; el botón actualiza Core pero no el celular del vendedor; C07 y C12 repiten el mecanismo. El análisis registra que los precios especiales saldrían del modelo de promociones y pide aclarar Core frente a la aplicación.',
  },
  {
    milestone: 'H003', type: 'Desarrollo', cc: [], source: 'Hallazgo 9; Revisión: sin control de cambio',
    name: 'Revisar y corregir la sincronización de contactos con SAP (creación, edición y eliminación)',
    notes: 'En las pruebas solo sincronizan nombre, teléfono y correo; ningún control de cambio lo cubre. Se pide corrección sin costo y con fecha.',
  },

  // H004 — Flujo comercial y experiencia del vendedor
  {
    milestone: 'H004', type: 'Decisión funcional', cc: ['CC-M01'], source: 'Hallazgo 14; Revisión CC-M01',
    name: 'Definir el flujo de selección y validación de bodega y su flujo de excepción',
    notes: 'El requisito 2 prohíbe elegir bodega y el 3 permite escribir el código; tras sincronizar se valida y se avisa al supervisor. Faltan plazo y responsable del flujo de excepción. El análisis registra que se indicó que sí pueden generar la lista de bodegas.',
  },
  {
    milestone: 'H004', type: 'Desarrollo', cc: ['CC-C01'], source: 'Hallazgo 17; Revisión CC-C01',
    name: 'Mostrar el stock de bodegas de venta y de visualización',
    notes: 'La revisión indica que V3 cubre el requisito en el documento; la ejecución no está acreditada. Las 78 horas cobradas como cambio se negocian aparte (Lucalza indica que estaba en el discovery).',
  },
  {
    milestone: 'H004', type: 'Decisión funcional', cc: ['CC-C02'], source: 'Revisión CC-C02',
    name: 'Definir cómo se muestra un pedido pendiente de facturar',
    notes: 'La factura puede emitirse entre 24 y 72 horas después y V3 no lo contempla; afecta lo que se ve como facturado.',
  },
  {
    milestone: 'H004', type: 'Decisión funcional', cc: [], source: 'Hallazgo 16; Revisión: sin control de cambio',
    name: 'Cerrar por escrito el alcance de la vista de seguimiento para supervisores e Inside Sales',
    notes: 'Requiere filtros por vendedor, supervisor y país, reglas Farmer y Hunter, días desde la última compra y respetar la ruta configurada. Según el análisis, Freeway aceptó una customización completa en la revisión del diseño y la minuta del 19 de agosto.',
  },

  // H005 — Cierre del alcance y documentación funcional
  {
    milestone: 'H005', type: 'Documentación', cc: ['CC-C04'], source: 'Hallazgo 11; Revisión CC-C04',
    name: 'Unificar en una sola lista lo que entra y lo que queda fuera en el documento de promociones',
    notes: 'El diagrama de la pág. 30 marca como fuera de alcance puntos que la pág. 32 lista como desarrollo y aún muestra pronto pago; los mockups siguen titulados Screen Flow.',
  },
  {
    milestone: 'H005', type: 'Documentación', cc: ['CC-C04', 'CC-M03'], source: 'Revisión: decisiones de Lucalza y CC-002/CC-M03',
    name: 'Registrar por escrito las exclusiones de Lucalza en la app sin conexión',
    notes: 'Promociones, encuestas y conteo de inventario son exclusiones, no trabajo activo. Pedir que V3 las declare como exclusión, corregir la pág. 14 y confirmar que CC-M03 no se cobra ni reaparece.',
  },
  {
    milestone: 'H005', type: 'Documentación', cc: ['CC-C03', 'CC-C13'], source: 'Revisión CC-C03; Hallazgo 15',
    name: 'Documentar el flujo paso a paso del sugerido para el vendedor de campo en la app',
    notes: 'V3 describe la configuración nativa pero dedica una frase al vendedor. Los parámetros de Core deben coincidir con los de la app y el catálogo de productos sugeridos lo carga Lucalza.',
  },
  {
    milestone: 'H005', type: 'Documentación', cc: ['CC-C07'], source: 'Revisión CC-C07; Revisión: multimoneda',
    name: 'Nombrar las listas de precios en dólares y la multimoneda en el CC',
    notes: 'La pág. 34 dice que soporta distintos tipos de moneda según lo que envíe SAP, pero no nombra las listas en dólares.',
  },
  {
    milestone: 'H005', type: 'Documentación', cc: ['CC-C02'], source: 'Revisión CC-C02',
    name: 'Incluir la serie de numeración del pago en el mockup de cobros',
    notes: 'La serie depende del vendedor y su sede; el mockup de la pág. 9 no la muestra.',
  },

  // H006 — Aprobación comercial y condiciones de ejecución
  {
    milestone: 'H006', type: 'Aprobación comercial', cc: [], source: 'Hallazgo 25; Revisión: Documentos',
    name: 'Acordar el pago por hitos en lugar del 100 % a la firma',
    notes: 'V3 (pág. 52) pide USD 51,271 a la firma. El análisis propone una parte a la firma, otra con las pruebas listas y el resto tras la aceptación y el soporte; es una propuesta, no un acuerdo.',
  },
  {
    milestone: 'H006', type: 'Aprobación comercial', cc: [], source: 'Hallazgo 26',
    name: 'Cerrar el cronograma y las dependencias de Lucalza con fecha y responsable',
    notes: 'V3 propone construcción del 8 de octubre al 27 de noviembre, pruebas del 30 de noviembre al 4 de diciembre y producción el 11 de diciembre, sujetas a ajustes. Son fechas propuestas por Freeway, no aprobadas, y no se usan como fechas del hito. Se pide que un cambio de fechas no suba el precio.',
  },
  {
    milestone: 'H006', type: 'Documentación', cc: [], source: 'Hallazgo 27',
    name: 'Actualizar el documento de diseño y arquitectura antes de la firma',
    notes: 'Pendiente desde la minuta del 19 de agosto; el CC lo cita como fuente única (págs. 44 y 52).',
  },
  {
    milestone: 'H006', type: 'Aprobación comercial', cc: ['CC-C13'], source: 'Hallazgo 24; Revisión: Documentos',
    name: 'Obtener el desglose de precio por control de cambio y una tarifa por hora homogénea',
    notes: 'CC-C13 son 160 horas por USD 13,154 (unos USD 82 por hora), frente a unos USD 49 por hora de los 11 controles del CC del 28 de septiembre.',
  },
  {
    milestone: 'H006', type: 'Aprobación comercial', cc: ['CC-C01', 'CC-C02', 'CC-C07', 'CC-C08', 'CC-C09', 'CC-C10', 'CC-C12', 'CC-C13'], source: 'Hallazgos 17 a 24',
    name: 'Resolver la postura económica de los cobros señalados como cambio',
    notes: 'El análisis cuantifica 446 horas y USD 27,202 cobrados en la sección B; la propuesta de Lucalza sería 257 horas y USD 12,624 (diferencia de USD 14,578). Son cifras de negociación, no acuerdos; CC-C01 al 50 % es un supuesto del análisis.',
  },
];
