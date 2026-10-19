// Los problemas de una importación llegan con un código estable; aquí se redactan en español.

const TEXT = {
  required: (issue) => `${issue.column} es obligatorio.`,
  too_long: (issue) => `${issue.column} supera el largo permitido.`,
  invalid_date: (issue) => `${issue.column} no es una fecha válida. Use una fecha de Excel o el formato AAAA-MM-DD.`,
  date_order: () => 'La fecha estimada es anterior a la fecha de inicio.',
  code_exists: () => 'Ya existe un hito con ese código en el proyecto.',
  name_conflict: () => 'El mismo hito aparece con nombres distintos en varias filas. Use el mismo NombreHito en todas.',
  description_conflict: () => 'El mismo hito aparece con descripciones distintas en varias filas.',
  duplicate_task: () => 'La tarea está repetida dentro del mismo hito.',
  missing_column: (issue) => `Falta la columna ${issue.column} en la fila de encabezados.`,
  unreadable_file: () => 'No se pudo leer el archivo como un libro de Excel (.xlsx).',
  no_sheet: () => 'El libro no tiene hojas.',
  no_rows: () => 'La hoja no tiene filas de tareas debajo del encabezado.',
  too_many_rows: () => 'El archivo tiene demasiadas filas (máximo 2000).',
};

export const describeIssue = (issue) => (TEXT[issue.code] ? TEXT[issue.code](issue) : issue.message);
