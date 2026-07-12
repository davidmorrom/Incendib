# Auditoría de seguridad — Incendib

> Fecha: **12 jul 2026** (trabajo nocturno, Agente C). Alcance: web app Next.js
> 15 desplegada en Vercel (`incendib.es`). Metodología: revisión de código de la
> superficie expuesta (API routes, webhooks push/cron, configuración, cabeceras,
> manejo de secretos, render de datos, dependencias). Sin acceso a producción en
> vivo para pentest activo; hallazgos derivados de lectura de código.

## Resumen ejecutivo

La base es **sólida**: los secretos de servidor no se filtran al cliente, no hay
`eval`, no hay SQL (sin base de datos relacional), el almacén de suscripciones es
*privacy-first* y las fuentes externas se consumen en el servidor. Los riesgos son
de **endurecimiento**, no vulnerabilidades críticas explotables de forma trivial.

Prioridades (detalle abajo):

| # | Hallazgo | Severidad | Estado |
|---|---|---|---|
| H1 | Faltan cabeceras de seguridad HTTP (CSP, X-Frame-Options, HSTS…) | **Media-Alta** | ✅ **Aplicado** (`next.config.mjs`) |
| H2 | `/api/push/cron` y `/api/boletin/generar` *fail-open* sin `CRON_SECRET` | **Media** | ⚠️ **Acción propietario** (documentado en `.env.example`) |
| H3 | `/api/push/test` es un *relay* de push abierto (sin auth ni límite) | **Media** | ✅ **Mitigado** (validación endpoint anti-SSRF) |
| H4 | `/api/push/subscribe`: sin validar endpoint ni acotar prefs (SSRF/abuso) | **Media** | ✅ **Mitigado** (validación + clamp) |
| H5 | JSON-LD del boletín sin escapar (`<`,`>`,`&`,U+2028/9) | **Baja** | ✅ **Corregido** (`jsonLdSafe`) |
| H6 | Sin límite de tamaño de cuerpo en endpoints POST | **Baja** | Pendiente (opcional) |
| H7 | Sin rate-limiting en endpoints públicos | **Baja-Media** | Pendiente (recomendación) |

> **Estado (12 jul 2026, madrugada):** H1, H3, H4 y H5 **aplicados, verificados**
> (typecheck + lint + build + 74 tests, 7 nuevos para el validador) y en `main`.
> H2 requiere una acción del propietario (definir `CRON_SECRET` en Vercel). H6/H7
> quedan como endurecimiento opcional posterior.

## Superficie expuesta (inventario)

**API routes:**
- `GET /api/fires` — público, datos agregados (incendios+focos). Cacheado 300 s.
  Correcto: dato público, sin secretos.
- `POST /api/push/subscribe` — alta/baja de suscripción Web Push + preferencias.
- `POST /api/push/test` — envía push de prueba a la suscripción dada.
- `GET|POST /api/push/cron` — motor de alertas (detecta cambios, envía push).
- `GET /api/boletin/generar` — genera la edición semanal desde dato en vivo.
- `GET /boletines/rss.xml` — estático, feed RSS. Correcto.

**Webhooks/scheduler:** Vercel Cron (`vercel.json` → `/api/push/cron` diario 08:00)
y GitHub Action semanal que llama a `/api/boletin/generar`.

**Cliente:** iframe de YouTube (`youtube-nocookie.com`) en Noticias; teselas de
mapa desde `tiles.openfreemap.org`; geolocalización del navegador ("localízame").

---

## Hallazgos detallados

### H1 — Faltan cabeceras de seguridad HTTP · Media-Alta

`next.config.mjs` solo define cabeceras para `/sw.js`. **No hay** Content-Security-
Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-
Policy ni Strict-Transport-Security. Consecuencias: clickjacking posible
(cualquier web puede enrutar la app en un `<iframe>`), MIME-sniffing, fuga de
`Referer` completo a terceros, y sin defensa en profundidad contra XSS.

**Fix (aplicado por Agente C, área `next.config.mjs` — transversal, no pisa
carriles de A/B):** bloque global `headers()` con:
- `Content-Security-Policy` acotada a los orígenes reales (self, `data:`,
  `blob:`, `tiles.openfreemap.org`, `www.youtube-nocookie.com`),
  `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`,
  `form-action 'self'`. `script-src`/`style-src` incluyen `'unsafe-inline'`
  (Next inyecta scripts de arranque sin nonce y hay estilos en línea del tema);
  se documenta como deuda para migrar a nonce.
- `X-Frame-Options: SAMEORIGIN` (anti-clickjacking, respaldo de `frame-ancestors`).
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=()…`
  (la app usa geolocalización propia; el resto se deniega).
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- `Cross-Origin-Opener-Policy: same-origin`.

> Nota: la CSP se scoped con cuidado para **no romper** el mapa (workers `blob:`,
> teselas) ni el embed de YouTube. Verificado con `build` + carga. Si aparece una
> violación en producción, ampliar el origen concreto (no `*`).

### H2 — Endpoints *fail-open* sin `CRON_SECRET` · Media

`/api/push/cron` y `/api/boletin/generar` solo exigen `Authorization: Bearer
$CRON_SECRET` **si la variable está definida**. Si no lo está, quedan **abiertos**:
cualquiera puede disparar el cron (enviar push a los suscriptores, reescribir la
línea base `lastseen`) o forzar la generación del boletín (coste de cómputo,
llamadas a NASA/EFFIS → posible agotamiento de rate-limit / mini-DoS).

No se aplica *fail-closed* automático para **no romper** el Vercel Cron legítimo,
que solo adjunta el `Bearer` si `CRON_SECRET` existe en el entorno.

**Acción del propietario (recomendada, prioritaria):** definir `CRON_SECRET` en
las variables de entorno de Vercel (y el mismo secreto en el repo para la GitHub
Action del boletín). Con la variable puesta, ambos endpoints quedan protegidos por
el código ya existente. Documentado también en `.env.example` y `COORDINACION.md`.

### H3 — `/api/push/test` es un relay de push abierto · Media

No requiere autenticación ni límite de frecuencia y acepta una `subscription`
arbitraria. Un atacante puede usar el servidor para **emitir push firmadas con
nuestras VAPID** a cualquier endpoint de servicio de push que controle, o
martillear el endpoint (abuso/coste). Además, `subscription.endpoint` es una URL
controlada por el cliente que el servidor consulta (`web-push` hace POST) →
vector **SSRF** si no se valida el destino.

**Fix (mitigación aplicada):** validar `subscription.endpoint` antes de enviar —
exigir `https:` y **rechazar destinos internos/privados** (localhost, `127.0.0.0/8`,
`10/8`, `172.16/12`, `192.168/16`, `169.254/16`, IPv6 ULA/loopback). Se comparte el
validador con `subscribe`. (Rate-limiting real requiere almacén; queda como
recomendación H7.)

### H4 — `/api/push/subscribe`: endpoint sin validar y prefs sin acotar · Media

Mismos riesgos de SSRF que H3 (el endpoint guardado se consulta luego desde el
cron). Además, `radiusKm`/`minLevel` se aceptan sin límites (`Number(...)` admite
`Infinity`, negativos o valores enormes) — no es crítico, pero conviene **acotar**
para robustez y evitar comportamientos raros del matcher de alertas.

**Fix (aplicado):** validar endpoint (igual que H3) y **clamp** de prefs a rangos
sanos (`minLevel` 0–3, `radiusKm` 1–500, `zone` con lat/lon numéricos en rango).

### H5 — JSON-LD del boletín sin escapar · Baja

`src/app/(app)/boletin/[id]/page.tsx` inyecta `JSON.stringify(jsonLd)` en un
`<script type="application/ld+json">` vía `dangerouslySetInnerHTML`. `JSON.stringify`
**no** escapa `<`, `>`, `&`, ni `U+2028/U+2029`; si algún día un campo del boletín
contuviera `</script>` se rompería el documento (XSS teórico). Hoy los datos son
propios (semana, fechas ISO, «España y Portugal») → explotabilidad baja, pero es
una mala práctica conocida.

**Fix (mínimo, coordinado con Agente B):** escapar la salida del JSON-LD con un
helper (`<`→`<`, `>`→`>`, `&`→`&`, `U+2028/9`). No cambia la lógica
ni el contenido renderizado por buscadores.

### H6 — Sin límite de tamaño de cuerpo en POST · Baja

Los `req.json()` no acotan el tamaño. Next/Vercel imponen un límite de plataforma,
pero conviene rechazar cuerpos anómalos pronto. Riesgo bajo. Recomendación, no
bloqueante.

### H7 — Sin rate-limiting · Baja-Media

Ningún endpoint público tiene límite de frecuencia. Con Upstash ya disponible
para push, se podría añadir un limitador por IP (`@upstash/ratelimit`) a
`/api/push/*`. Recomendación para una fase posterior (no se implementa ahora para
no introducir dependencia/priorizar cambios verificables).

---

## Lo que YA está bien (no tocar)

- **Secretos de servidor** (`VAPID_PRIVATE_KEY`, `CRON_SECRET`, tokens Upstash) no
  llevan prefijo `NEXT_PUBLIC_` → no llegan al bundle del cliente. ✅
- **Clave VAPID pública** es `NEXT_PUBLIC_` **a propósito** (debe ser pública). ✅
- **Sin `eval`/`new Function`** en el código propio. ✅
- **Script inline de tema** (`layout.tsx`) es una constante estática, sin dato de
  usuario. ✅
- **Almacén de push** *privacy-first*: solo suscripción + preferencias mínimas,
  región `fra1` (UE). ✅
- **Fuentes externas** (FIRMS, EFFIS, fogos, Open-Meteo, Google News) se consultan
  **en el servidor**, no exponen claves al cliente. ✅
- **`.env` fuera de git** (solo `.env.example` con valores vacíos). ✅

## Plan de aplicación (esta sesión)

1. **H1** — cabeceras de seguridad en `next.config.mjs` (transversal). ← primero.
2. **H3/H4** — validador de endpoint (anti-SSRF) + clamp de prefs (`src/lib/push`).
3. **H5** — escape del JSON-LD (coordinado con B).
4. **H2/H6/H7** — documentar acción del propietario y recomendaciones.

Cada cambio: `typecheck` + `lint` + `build` en verde, commit por ruta explícita,
rebase antes de push, y anotación en `COORDINACION.md`. **Sin romper** la app ni
los carriles de los Agentes A (datos/UI) y B (boletín).
