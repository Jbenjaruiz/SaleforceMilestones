// La API responde en inglés con mensajes estables; aquí se traducen para la interfaz.

const EXACT = {
  'Invalid email or password.': 'Correo o contraseña incorrectos.',
  'Missing access token.': 'Su sesión no es válida. Inicie sesión de nuevo.',
  'Invalid or expired access token.': 'Su sesión expiró. Inicie sesión de nuevo.',
  'This account is not active.': 'Esta cuenta no está activa.',
  'Only an administrator can do this.': 'Solo un administrador puede hacer esto.',
  'A user with this email already exists.': 'Ya existe un usuario con ese correo.',
  'You cannot deactivate your own account.': 'No puede desactivar su propia cuenta.',
  'There must always be at least one active administrator.': 'Siempre debe quedar al menos un administrador activo.',
  'User not found.': 'No se encontró el usuario.',
  'Role not found.': 'No se encontró el rol.',
  'Project not found.': 'No se encontró el proyecto.',
  'Milestone not found.': 'No se encontró el hito.',
  'Task not found.': 'No se encontró la tarea.',
  'Comment not found.': 'No se encontró el comentario.',
  'Attachment not found.': 'No se encontró el adjunto.',
  'A role with this name already exists.': 'Ya existe un rol con ese nombre.',
  'A protected role cannot be modified.': 'Un rol protegido no se puede modificar.',
  'A protected role cannot be deleted.': 'Un rol protegido no se puede eliminar.',
  'This role still has users. Reassign them before deleting it.': 'Este rol todavía tiene usuarios. Reasígnelos antes de eliminarlo.',
  'This project is archived. Reactivate it to make changes.': 'Este proyecto está archivado. Reactívelo para hacer cambios.',
  'The project is already archived.': 'El proyecto ya está archivado.',
  'The project is not archived.': 'El proyecto no está archivado.',
  'The estimated date cannot be earlier than the start date.': 'La fecha estimada no puede ser anterior a la de inicio.',
  'Only the author or an administrator can delete a comment.': 'Solo el autor o un administrador puede borrar un comentario.',
  'Only whoever uploaded the file or an administrator can delete it.': 'Solo quien subió el archivo o un administrador puede borrarlo.',
  'Each file can be at most 5 MB.': 'Cada archivo puede pesar 5 MB como máximo.',
  'Only PNG, JPG, WebP and PDF files are allowed.': 'Solo se permiten archivos PNG, JPG, WebP y PDF.',
  'Attach at least one file in the "files" field.': 'Adjunte al menos un archivo.',
  'Attach the Excel file in the "file" field.': 'Adjunte el archivo de Excel.',
  'The file must be an Excel workbook (.xlsx).': 'El archivo debe ser un libro de Excel (.xlsx).',
  'The file can be at most 5 MB.': 'El archivo puede pesar 5 MB como máximo.',
};

const PATTERNS = [
  [/^Your role does not allow the "(\w+)" action\.$/, () => 'Su rol no permite esta acción.'],
  [/^A milestone with code (.+) already exists in this project\.$/, (m) => `Ya existe un hito con el código ${m[1]} en este proyecto.`],
  [/^At most (\d+) attachments are allowed here \((\d+) already attached\)\.$/, (m) => `Se permiten como máximo ${m[1]} adjuntos (ya hay ${m[2]}).`],
  [/^The file has errors\./, () => 'El archivo tiene errores. No se importó nada.'],
  [/^Too Many Requests|ThrottlerException/i, () => 'Demasiados intentos. Espere un momento e intente de nuevo.'],
];

const VALIDATION = [
  [/^(\w+) must be longer than or equal to (\d+) characters$/, (m) => `${field(m[1])} debe tener al menos ${m[2]} caracteres`],
  [/^(\w+) must be shorter than or equal to (\d+) characters$/, (m) => `${field(m[1])} admite como máximo ${m[2]} caracteres`],
  [/^(\w+) should not be empty$/, (m) => `${field(m[1])} es obligatorio`],
  [/^(\w+) must be an email$/, (m) => `${field(m[1])} no es un correo válido`],
  [/^(\w+) must be a valid date/, (m) => `${field(m[1])} no es una fecha válida`],
  [/^(\w+) must be a (string|boolean value)$/, (m) => `${field(m[1])} no es válido`],
];

const FIELDS = {
  email: 'El correo', password: 'La contraseña', fullName: 'El nombre', name: 'El nombre', code: 'El código', body: 'El comentario',
  startDate: 'La fecha de inicio', estimatedDate: 'La fecha estimada', roleId: 'El rol', description: 'La descripción', responsible: 'El responsable',
};
const field = (key) => FIELDS[key] ?? 'El campo';

const BY_STATUS = {
  0: 'No se pudo conectar con el servidor. Revise su conexión e intente de nuevo.',
  400: 'Los datos enviados no son válidos.',
  401: 'Su sesión no es válida. Inicie sesión de nuevo.',
  403: 'No tiene permiso para realizar esta acción.',
  404: 'No se encontró lo que busca.',
  409: 'Ya existe un registro con esos datos.',
  413: 'El archivo es demasiado grande (máximo 5 MB).',
  422: 'Los datos no se pudieron procesar.',
  429: 'Demasiados intentos. Espere un momento e intente de nuevo.',
};

function translateOne(message) {
  if (EXACT[message]) return EXACT[message];
  for (const [pattern, build] of PATTERNS) {
    const match = pattern.exec(message);
    if (match) return build(match);
  }
  for (const [pattern, build] of VALIDATION) {
    const match = pattern.exec(message);
    if (match) return build(match);
  }
  return null;
}

/** Texto en español para un error de la API (mensaje simple, lista de validaciones o solo el código HTTP). */
export function messageFor(status, data) {
  const raw = data?.message;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const translated = list.map(translateOne).filter(Boolean);
  if (translated.length > 0) return `${translated.join('. ')}${translated.length > 0 && !/[.!]$/.test(translated.at(-1)) ? '.' : ''}`;
  if (status >= 500) return 'Ocurrió un error en el servidor. Intente de nuevo en unos minutos.';
  return BY_STATUS[status] ?? 'Ocurrió un error inesperado.';
}
