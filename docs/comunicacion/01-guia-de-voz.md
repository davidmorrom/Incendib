# Guía de voz y estilo — Incendib

> Cómo suena Incendib. Vale para LinkedIn, notas, web, boletín y cualquier texto
> público. Es coherente con las convenciones del producto (`CLAUDE.md`,
> `docs/HANDOFF.md`): **sobrio, específico, cívico. Informar sin alarmar.**

---

## 1. Principios de voz

**Somos:** claros, técnicos cuando toca, honestos con la incertidumbre,
respetuosos con la emergencia, útiles.

**No somos:** comerciales, alarmistas, grandilocuentes, «tech-bro», ni salvadores.

| En vez de… | Decimos… |
|---|---|
| «La plataforma **revolucionaria** de incendios» | «Un mapa público de incendios activos en España y Portugal» |
| «Datos **en tiempo real** al instante» | «Datos casi en tiempo real (los focos satelitales llegan con ~3 h de latencia)» |
| «Detectamos **todos** los incendios» | «Reunimos focos satelitales y estado operativo oficial donde existe» |
| «**Nunca más** te pillará por sorpresa un incendio» | «Alertas por zona; recuerda: no sustituye al 112» |
| «Incendio detectado en X» (sobre un foco) | «Foco satelital sin confirmar cerca de X (detección térmica)» |

---

## 2. Las cinco reglas de oro

1. **Honestidad del dato.** Distingue siempre lo **confirmado** de lo
   **detectado**. Un foco es una señal, no un incendio. Si un dato es estimación,
   dilo («~», «estimación satélite»).
2. **Informar, no alarmar.** El objetivo es que la gente entienda, no que se
   asuste. «Vacío = buena noticia». Nada de dramatización.
3. **Sobriedad.** Frases cortas. Cero *hype*. Cero promesas. El dato habla; el
   adjetivo estorba.
4. **Atribución.** Cita las fuentes por su nombre y licencia exactos. La
   transparencia es parte del mensaje.
5. **El 112 primero.** Siempre que el texto roce el uso ciudadano en emergencia,
   aparece: *«No sustituye a los canales oficiales de emergencia. Emergencias: 112.»*

---

## 3. Reglas mecánicas

- **Idioma:** español por defecto. Los estados portugueses se pueden citar en PT
  cuando aporten (*em curso, em resolução, vigilância*). La web está también en
  PT y EN.
- **Cifras:** miles separados por **espacio** (`3 241`, `12 512`), no por punto.
  Es la convención del producto (`formatNumber`).
- **Superficie:** «ha» (hectáreas). Estimación → «~3 241 ha». Sin dato → «sin dato»,
  nunca `0`.
- **Tiempo:** «actualizado hace 6 min», «latencia ~3 h». Nunca «al instante».
- **Nombres propios exactos** (ver [banco de datos](04-banco-de-datos.md)):
  «NASA FIRMS», «EFFIS / Copernicus EMS», «Sentinel-2», «fogos.pt / ANEPC»,
  «INFORCYL», «INFOCA», «Bombers de la Generalitat», «OpenStreetMap»,
  «OpenFreeMap». No abreviar «Copernicus» ni tocar «CC BY 4.0».
- **Marca:** «Incendib» (no «IncendiB», no «Incendib.es» en cuerpo de texto salvo
  como URL). Web: `incendib.es`.
- **Emojis:** en la interfaz, **ninguno**. En redes, evitarlos; como mucho **uno**
  con función de escaneabilidad. Nunca ristras ni emojis de fuego/alarma.
- **Mayúsculas y signos:** sin CLICKBAIT en mayúsculas, sin «!!!», sin
  interrogaciones-gancho vacías.

---

## 4. Tono según formato

- **Anuncio / lanzamiento:** primera persona (David, el autor). Cercano pero
  contenido. «He construido y publicado Incendib…».
- **Divulgación técnica (datos, GIS, código):** tercera persona o primera del
  autor; preciso, con nombres de fuente y licencias. Es donde luce la seriedad.
- **Servicio público / cívico:** sereno, de utilidad. Aquí el 112 es obligatorio.
- **Detrás del código (*making-of*):** honesto sobre el alcance real; sin
  exagerar plazos ni méritos. Verificable siempre.

---

## 5. Estructura de un buen post (patrón)

1. **Gancho** (1 línea): una afirmación concreta y verdadera, no una pregunta
   hueca. Se lee antes del «ver más».
2. **Contexto** (2-4 líneas): qué es, qué problema resuelve.
3. **Prueba** (2-4 líneas): el dato honesto que da credibilidad (tres capas,
   fuentes, accesibilidad, color+forma…).
4. **Aviso** (si aplica): 112 / satélite ≠ confirmado.
5. **CTA sobrio:** «Está en incendib.es. Es público y sin ánimo de lucro.»
6. **Hashtags:** 3-6, relevantes (ver playbook).

---

## 6. Autocontrol antes de publicar (checklist)

- [ ] ¿Toda cifra o afirmación está en el briefing / banco de datos?
- [ ] ¿Distingo detección de confirmación? ¿Ningún foco presentado como incendio?
- [ ] ¿Cito bien fuente y licencia?
- [ ] ¿Aparece el 112 si hablo de uso en emergencia?
- [ ] ¿He evitado *hype*, promesas y alarmismo?
- [ ] ¿Dejo claro que es público y sin ánimo de lucro?
- [ ] ¿Emojis bajo control (0-1)?
