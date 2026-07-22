# Playbook de LinkedIn — Incendib

> Cómo convertir el [briefing](00-briefing-proyecto.md) en publicaciones de
> LinkedIn. Léelo junto a la [guía de voz](01-guia-de-voz.md). Las publicaciones
> ya redactadas y verificadas están en
> [`03-linkedin-publicaciones.md`](03-linkedin-publicaciones.md).

---

## 1. Contexto del canal

- **Perfil emisor:** cuenta personal de **David Moreno Romero** (autor). El
  proyecto no tiene todavía página propia de empresa; se puede crear más adelante.
  Mientras tanto, primera persona.
- **Objetivo:** dar a conocer Incendib, ganar credibilidad técnica y cívica, y
  atraer a periodistas, profesionales de emergencias y comunidad de datos/GIS.
  **No** es marketing de captación; es difusión de un servicio público.
- **Tono LinkedIn:** profesional, sobrio, útil. Ver guía de voz.

---

## 2. Formatos que funcionan (de mayor a menor esfuerzo)

1. **Post de texto + 1 imagen** (captura del mapa/ficha). El caballo de batalla.
2. **Carrusel (PDF/imágenes)** para «cómo funciona» o «las tres capas de datos».
   Muy adecuado al material del proyecto (leyenda color+forma, capas de fuentes).
3. **Post de texto solo** para reflexión (honestidad del dato, diseño responsable).
4. **Vídeo corto** reutilizando el reel ya producido (ver `docs/social/reel-lanzamiento.md`).

**Regla de imagen:** usa capturas reales del producto. Estética coherente con la
web (sobria, panel de control). Nada de *stock* de fuego/humo ni mapas realistas
decorativos. Ver ideas de visual en cada publicación de `03-…`.

---

## 3. Anatomía de un post de LinkedIn

- **Longitud:** 120-220 palabras (≈ 900-1 500 caracteres). Lo justo para aportar
  sin cansar.
- **Gancho:** la 1.ª línea es lo único visible antes de «…ver más». Que sea una
  afirmación concreta y verdadera.
- **Legibilidad:** párrafos de 1-3 líneas, con aire. Puedes usar una lista corta.
- **Enlace:** LinkedIn penaliza los enlaces en el cuerpo. Opciones: (a) enlace en
  el **primer comentario** y avisar en el post («enlace en comentarios»); o
  (b) `incendib.es` como texto plano al final. Elige una y sé consistente.
- **CTA:** sobrio. «Está en incendib.es — es público y sin ánimo de lucro.»
- **Hashtags:** 3-6, al final.

---

## 4. Pilares de contenido (ángulos)

Rota entre estos ejes para no repetir. Cada uno tiene una publicación lista en
`03-…`.

| Pilar | Idea central | Audiencia principal |
|---|---|---|
| **Lanzamiento** | «He publicado Incendib» | General / red del autor |
| **Transparencia de datos** | Las tres capas y las fuentes oficiales | Datos abiertos / Copernicus / GIS |
| **Honestidad del dato** | Detección ≠ confirmación; informar sin alarmar | Emergencias / diseño / periodismo |
| **Misión / servicio público** | Gratis, sin ánimo de lucro, ES + PT | Cívico / ONG / administración |
| **Making-of** | Stack, accesibilidad AA, i18n, 282 tests | Devs / diseñadores |
| **Producto** | Mapa, ficha, informe, alertas | Usuario general / periodistas |

---

## 5. Hashtags recomendados

Combina **1-2 de tema** + **1-2 técnicos/sectoriales** + **1 geográfico**.
No más de 6.

- **Tema:** `#IncendiosForestales` `#Wildfires` `#ProtecciónCivil` `#Emergencias`
- **Datos / tecnología:** `#DatosAbiertos` `#OpenData` `#Copernicus` `#SIG` `#GIS`
  `#NextJS` `#Accesibilidad` `#TechForGood`
- **Geográfico:** `#España` `#Portugal` `#PenínsulaIbérica`

Ejemplo equilibrado: `#IncendiosForestales #DatosAbiertos #Copernicus #España #Portugal`.

---

## 6. Calendario editorial sugerido (2 semanas)

Sobrio: no saturar. 2-3 publicaciones por semana.

| Día | Pilar | Nota |
|---|---|---|
| Semana 1 · día 1 | **Lanzamiento** | El primero. Imagen: mapa en vivo. |
| Semana 1 · día 3 | **Transparencia de datos** | Carrusel «tres capas». |
| Semana 1 · día 5 | **Honestidad del dato** | Post de reflexión, sin imagen o con captura de la leyenda. |
| Semana 2 · día 1 | **Producto** | Captura de la ficha compartible. |
| Semana 2 · día 3 | **Making-of** | Para la comunidad técnica. |
| Semana 2 · día 5 | **Misión / servicio público** | Cierre cívico; 112 destacado. |

> Ajusta el ritmo a la actualidad: en plena campaña de incendios, prioriza
> utilidad y sobriedad; evita capitalizar tragedias.

---

## 7. Cómo pedírselo a Claude (chat)

Pega el [briefing](00-briefing-proyecto.md) y la [guía de voz](01-guia-de-voz.md)
y usa un encargo como:

```
Con el briefing y la guía de voz de Incendib que te acabo de dar, escríbeme una
publicación de LinkedIn desde el ángulo «[pilar]». 150-200 palabras, en español,
voz sobria y cívica, sin lenguaje comercial. Primera línea = gancho concreto.
No inventes cifras: usa solo datos del briefing/banco de datos. Incluye el
disclaimer 112 si procede. Termina con un CTA sobrio a incendib.es y 4-5
hashtags. Añade una sugerencia de imagen.
```

Para variantes: «dame 3 versiones con ganchos distintos» o «adáptalo a un
carrusel de 6 diapositivas».

---

## 8. Errores a evitar en LinkedIn

- Enlace en el cuerpo sin avisar (baja el alcance) → usa comentario o texto plano.
- Gancho en forma de pregunta hueca («¿Sabías que…?»).
- Muro de texto sin saltos.
- *Hashtag stuffing* (más de 6).
- Capitalizar una tragedia en curso para promocionar.
- Presentar un foco satelital como incendio confirmado (línea roja del proyecto).
