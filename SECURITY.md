# Política de seguridad — Incendib

Incendib es un proyecto **sin ánimo de lucro** de interés público. Agradecemos el
reporte responsable de vulnerabilidades.

## Cómo reportar

- Escribe a **contacto@incendib.es** (ver también
  [`/.well-known/security.txt`](public/.well-known/security.txt)).
- Describe el problema, el impacto y, si puedes, un paso a paso para reproducirlo.
- Por favor **no** realices pruebas que degraden el servicio, envíen spam de
  notificaciones a terceros o accedan a datos de otras personas.

Intentaremos responder con prontitud. Al ser un proyecto voluntario, los tiempos
pueden variar.

## Alcance

- La web app (`incendib.es`) y sus endpoints (`/api/*`).
- El service worker y la PWA.

Fuera de alcance: las fuentes de datos de terceros (NASA FIRMS, EFFIS/Copernicus,
fogos.pt, AEMET/IPMA, INFORCYL, INFOCA, Bombers, Open-Meteo), que tienen sus
propios canales.

## Modelo de seguridad (resumen)

- **Secretos de servidor** (VAPID privada, `CRON_SECRET`, tokens de almacén) nunca
  se exponen al cliente (sin prefijo `NEXT_PUBLIC_`).
- **Cabeceras de seguridad** (CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy) en todas las respuestas
  (`next.config.mjs`).
- **Endpoints de push** validan el destino (anti-SSRF: solo `https` a hosts
  públicos), acotan preferencias y aplican rate-limiting por IP.
- **Web Push**: las notificaciones solo navegan dentro del propio origen.
- **Datos personales** (suscripciones): mínimos, tratados en la UE (`fra1`).

Detalle técnico y auditoría en
[`docs/security/AUDITORIA-2026-07-12.md`](docs/security/AUDITORIA-2026-07-12.md).

## Recordatorio

Incendib **no sustituye a los canales oficiales de emergencia**. Ante peligro
inmediato, llama al **112**.
