# F01 — Despliegue en una máquina virtual Windows de Azure

**Estado:** propuesta para revisar con el equipo de TI. No se ha desplegado nada.
**Decisiones previas:** servidor Azure de la empresa (ya existe y paga la empresa); máquina virtual **Windows**; Azure se usa **solo como alojamiento** (los usuarios y contraseñas se siguen administrando en la plataforma; el inicio de sesión con Azure AD / Entra ID no se plantea por ahora); el frontend ya no se publica en GitHub Pages.

## 1. Arquitectura recomendada

```
Navegador ──HTTPS──▶ IIS (puerto 443)
                      ├─ /            → archivos estáticos del frontend (apps/web/dist)
                      └─ /api/*       → proxy inverso a http://localhost:3000  (API NestJS, servicio de Windows)
                                              ├─▶ SQL Server (puerto 1433, red interna)
                                              └─▶ carpeta de adjuntos en disco (fuera del sitio web)
```

- **Un solo origen** (el mismo dominio sirve la página y la API): no hace falta CORS y el frontend usa `/api` sin configuración. Es la razón principal de esta forma.
- **IIS** termina HTTPS, comprime, aplica cabeceras de seguridad y es lo que TI ya sabe operar. La API escucha solo en `localhost`, sin exponerse.
- **La API corre como servicio de Windows**, con reinicio automático y bajo una cuenta sin privilegios.
- Alternativa más simple (no recomendada para producción): que NestJS sirva también los archivos del frontend y se publique directamente. Se pierde la terminación HTTPS y las cabeceras de IIS.

## 2. Qué se instala en la máquina

| Componente | Para qué | Nota |
|---|---|---|
| IIS con **URL Rewrite** y **Application Request Routing (ARR)** | Servir el frontend y redirigir `/api` | Habilitar el proxy en ARR |
| **Node.js 24** (instalación para todos los usuarios) | Ejecutar la API | Misma versión que en desarrollo |
| **NSSM** o **WinSW** | Registrar la API como servicio de Windows | NSSM es lo más rápido; WinSW es un archivo de configuración versionable |
| Certificado TLS | HTTPS | Autoridad interna de la empresa o pública, según el nombre de dominio |

No se instala SQL Server aquí: la base ya existe en otro servidor.

## 3. Estructura de carpetas

```
D:\apps\seguimiento\
  web\            ← contenido de apps/web/dist (lo sirve IIS)
  api\            ← apps/api/dist + node_modules de producción + package.json
  config\         ← .env de producción (solo lectura para la cuenta del servicio)
  logs\           ← salida de la API y rotación
D:\data\seguimiento\
  attachments\    ← STORAGE_DIR: adjuntos, FUERA de web\ y del sitio de IIS
```

La carpeta de adjuntos **no** debe estar dentro de lo que sirve IIS: los archivos solo se entregan a través de la API con sesión. Permisos NTFS: solo la cuenta del servicio (modificar) y administradores.

## 4. Configuración

Variables de entorno de producción (archivo `.env` de la API; ver `apps/api/.env.example`):

| Variable | Valor en producción |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Base de producción y un usuario propio de la aplicación (ver §6) |
| `DB_ENCRYPT` | Ver §6: depende de la versión de SQL Server |
| `JWT_SECRET` | Un secreto **nuevo**, de 32 caracteres o más, distinto al de desarrollo |
| `JWT_EXPIRES_IN` | `8h` (o lo que defina la empresa) |
| `PORT` | `3000` (solo escucha en la máquina) |
| `TRUST_PROXY` | `1` (un proxy de confianza: IIS). Sin esto, todos los usuarios comparten IP y el límite de 10 intentos de login por minuto los bloquea a todos a la vez |
| `STORAGE_DIR` | `D:\data\seguimiento\attachments` |
| `APP_TIMEZONE` | `America/Guatemala` (o la zona de negocio) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Solo para la carga inicial; se pueden quitar del archivo después |

El frontend **no necesita variables**: usa `/api` en el mismo dominio.

### IIS: `web.config` del sitio (frontend + proxy a la API)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Redirigir a HTTPS" stopProcessing="true">
          <match url="(.*)" />
          <conditions><add input="{HTTPS}" pattern="off" /></conditions>
          <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
        </rule>
        <rule name="API" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:3000/api/{R:1}" />
          <serverVariables>
            <set name="HTTP_X_FORWARDED_PROTO" value="https" />
          </serverVariables>
        </rule>
      </rules>
    </rewrite>
    <security>
      <requestFiltering>
        <!-- 5 archivos de 5 MB = 25 MB de subida como máximo; se deja margen -->
        <requestLimits maxAllowedContentLength="41943040" />
      </requestFiltering>
    </security>
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="DENY" />
        <add name="Referrer-Policy" value="same-origin" />
        <add name="Strict-Transport-Security" value="max-age=31536000" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
```

Con ARR hay que permitir las variables de servidor `HTTP_X_FORWARDED_PROTO` y `HTTP_X_FORWARDED_FOR` en *URL Rewrite → View Server Variables*, y activar el proxy en ARR. La página usa rutas con `#`, así que no necesita reglas de reescritura para el frontend.

### Servicio de Windows (con NSSM)

```powershell
nssm install SeguimientoApi "C:\Program Files\nodejs\node.exe" "dist\main.js"
nssm set SeguimientoApi AppDirectory D:\apps\seguimiento\api
nssm set SeguimientoApi AppEnvironmentExtra NODE_ENV=production
nssm set SeguimientoApi AppStdout D:\apps\seguimiento\logs\api.log
nssm set SeguimientoApi AppStderr D:\apps\seguimiento\logs\api.err.log
nssm set SeguimientoApi AppRotateFiles 1
nssm set SeguimientoApi AppRotateBytes 10485760
nssm set SeguimientoApi Start SERVICE_AUTO_START
nssm set SeguimientoApi ObjectName ".\svc-seguimiento" "<contraseña>"
```

La API lee su `.env` de su carpeta de trabajo; si se prefiere, las variables se pueden definir en el propio servicio (`AppEnvironmentExtra`) en lugar de un archivo.

## 5. Cómo se construye y se publica

1. **Construir fuera del servidor** (en un equipo de desarrollo o en un flujo de CI): `npm ci`, `npm test`, `npm run build`. El servidor no necesita herramientas de compilación ni acceso a internet.
2. **Empaquetar:** `apps/web/dist` → `web\`; `apps/api/dist`, `apps/api/package.json` y `node_modules` de producción (`npm ci --omit=dev` en el espacio de trabajo de la API) → `api\`.
3. **Publicar** con un script de PowerShell versionado: respaldar la versión actual, detener el servicio, copiar, iniciar el servicio y comprobar `https://<dominio>/api/health` (debe responder `ok` y `database: up`). Si falla, restaurar el respaldo.
4. Para la primera vez: ejecutar el script SQL de `docs/requerimientos/F01-script-creacion-tablas.md` (lo corre quien administre la base) y luego, desde la carpeta `api`, `node distdatabaseseed.js` (con `ADMIN_EMAIL` y `ADMIN_PASSWORD` definidos) para crear los roles y el administrador inicial. Se usa el seed ya compilado: en el servidor no hay herramientas de desarrollo (`ts-node`).
5. **GitHub Pages:** el workflow `.github/workflows/deploy.yml` debe reemplazarse por uno que solo pruebe y compile (CI), porque publicar el frontend solo en Pages deja un sitio que no puede iniciar sesión.

La forma de transferir el paquete (copia manual, recurso compartido, Azure DevOps, ejecutor autohospedado de GitHub) depende de la política de TI; ver las preguntas de §9.

## 6. Base de datos

- **Ambientes separados:** la base `fw_project` actual es de **pruebas**. Producción debe ser otra base, con su propio usuario.
- **Usuario de la aplicación:** solo lectura y escritura (`db_datareader`, `db_datawriter`). **No** necesita `db_ddladmin` en producción: el esquema lo crea el administrador de la base con el script. Así la aplicación no puede alterar ni borrar tablas.
- **Registro de migraciones:** crear la tabla `migrations` y registrar la migración inicial (parte 3 del script SQL) para que futuras migraciones no intenten recrear el esquema.
- **Cifrado de la conexión — punto crítico.** El SQL Server de pruebas es la **versión 2012 SP4**, que no completa el cifrado TLS que exige Node 24; por eso hoy se usa `DB_ENCRYPT=false`, y las credenciales viajan sin cifrar. Opciones, de mejor a peor:
  1. Que producción use una versión soportada de SQL Server (2016 o posterior) y conectar con `DB_ENCRYPT=true`.
  2. Habilitar TLS 1.2 en el servidor 2012 (requiere parches y configuración de Windows; TI debe evaluarlo).
  3. Aceptar `DB_ENCRYPT=false` **solo** si la máquina virtual y la base están en la misma red privada de Azure y no hay otra ruta; dejarlo documentado como riesgo.
- **Red:** la máquina virtual debe llegar al puerto 1433 del servidor SQL (reglas del grupo de seguridad de red y del firewall de Windows).
- **Respaldos:** los hace quien administre la base; hay que acordar frecuencia, retención y una prueba de restauración.

## 7. Seguridad (lista de comprobación)

- [ ] HTTPS con certificado válido y redirección de HTTP a HTTPS; HSTS activo.
- [ ] Solo los puertos 80 y 443 abiertos hacia afuera; el 3000 solo en `localhost`.
- [ ] `JWT_SECRET` y credenciales de la base solo en el servidor (no en el repositorio, no en correos ni chats).
- [ ] Cuenta de servicio sin privilegios y sin inicio de sesión interactivo; permisos NTFS mínimos.
- [ ] `TRUST_PROXY=1` configurado (si no, el límite de intentos de login afecta a todos).
- [ ] Carpeta de adjuntos fuera del sitio web; antivirus del servidor configurado para esa carpeta.
- [ ] Usuario de base de datos de la aplicación sin permisos de DDL.
- [ ] Contraseña del administrador inicial cambiada tras el primer ingreso y sin dejar `ADMIN_PASSWORD` en el archivo de configuración.
- [ ] Acceso de administración al servidor (escritorio remoto) restringido y con registro.
- [ ] Vulnerabilidades de dependencias revisadas (`npm audit`) antes de la primera publicación.

## 8. Operación

- **Salud:** `GET /api/health` (público; no revela detalles). Conviene un monitoreo que lo consulte cada pocos minutos y avise si no responde `ok`.
- **Registros:** `logs\api.log` y `api.err.log` con rotación; la auditoría de negocio (quién cambió qué) vive en la tabla `audit_logs`.
- **Respaldos:** base de datos (TI/DBA) y carpeta `D:\data\seguimiento\attachments` (misma política y mismo momento, para que adjuntos y base queden coherentes).
- **Actualizaciones:** el script de publicación; las migraciones de base de datos las ejecuta quien tenga permisos de DDL antes de publicar la versión que las necesita.
- **Hora:** la zona de negocio se fija con `APP_TIMEZONE`; no depende de la zona de la máquina virtual (Azure suele usar UTC).

## 9. Lo que necesito saber de TI

1. **Dominio** donde se publicará (p. ej. `seguimiento.lucalza.com`) y **quién emite el certificado**. ¿Es accesible solo desde la red de la empresa/VPN o desde internet?
2. **Versión de Windows Server** y si **IIS ya está instalado** (y si se puede instalar URL Rewrite y ARR).
3. ¿Se puede instalar **Node.js 24** y **NSSM/WinSW** en la máquina? ¿La máquina tiene salida a internet (para actualizar) o no?
4. **¿Es una máquina compartida con otras aplicaciones?** (afecta puertos, IIS y cuentas).
5. **Base de datos de producción:** ¿qué servidor y versión de SQL Server? ¿Hay una versión soportada? ¿Quién la administra y quién ejecutará el script SQL?
6. **Red entre la máquina y la base** (misma red virtual, reglas del firewall) y si el cifrado se podrá activar.
7. **Cómo se publicará:** copia manual, recurso compartido, Azure DevOps o un ejecutor de GitHub dentro de la red.
8. **Respaldos:** política de la base y de la carpeta de adjuntos; espacio disponible en disco (los adjuntos crecen; tope de 5 MB por archivo y 5 por tarea o comentario).
9. **Acceso:** quién tendrá escritorio remoto o acceso para publicar, y quién recibe las alertas si el servicio cae.
10. **Entorno de pruebas:** ¿se usará la misma máquina u otra para validar versiones antes de producción?

## 10. Cambio de código incluido en este paso

`apps/api/src/main.ts` ahora respeta `TRUST_PROXY` (número de proxies de confianza). Sin él, detrás de IIS el límite de intentos de login habría tratado a todos los usuarios como una sola persona. Acepta solo un número del 1 al 5, nunca «true», para que nadie pueda falsear su IP con cabeceras.
