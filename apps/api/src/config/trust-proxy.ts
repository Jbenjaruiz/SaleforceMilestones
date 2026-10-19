/**
 * Detrás de un proxy inverso (IIS, Nginx) todas las peticiones llegan desde la IP del proxy: sin esto, el límite
 * de intentos de inicio de sesión y la auditoría verían un único cliente. TRUST_PROXY es el número de proxies de
 * confianza delante de la API (1 con IIS). Vacío o 0 lo desactiva. No se acepta «true»: confiaría en cualquier
 * cabecera X-Forwarded-For y un cliente podría falsear su IP.
 */
export function parseTrustProxy(value: string | undefined): number | false {
  const text = (value ?? '').trim();
  if (text === '' || text === '0') return false;
  if (!/^\d+$/.test(text) || Number(text) > 5) {
    throw new Error(`TRUST_PROXY must be the number of trusted proxies (1 to 5), got "${text}".`);
  }
  return Number(text);
}
