import { chromium } from 'playwright';
import fs from 'node:fs';

// Servidor local en modo oscuro + mock (ver README). Ajusta el puerto si hace falta.
const BASE = process.env.BASE || 'http://localhost:3200';
const OUT = new URL('./clips', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
fs.mkdirSync(OUT, { recursive: true });

const VW = 720, VH = 1280;

function ctxOpts(record) {
  return {
    viewport: { width: VW, height: VH },
    deviceScaleFactor: 1,
    ...(record ? { recordVideo: { dir: OUT, size: { width: VW, height: VH } } } : {}),
  };
}
async function newCtx(browser, record = true) {
  const ctx = await browser.newContext(ctxOpts(record));
  await ctx.addInitScript(() => { try { localStorage.setItem('incendib-theme', 'dark'); } catch (e) {} });
  return ctx;
}

async function smoothScroll(page, dist, ms) {
  await page.evaluate(({ dist, ms }) => new Promise((res) => {
    let scroller = document.scrollingElement || document.documentElement;
    const cands = [document.querySelector('main'), ...document.querySelectorAll('main *')].filter(Boolean);
    for (const el of cands) { if (el.scrollHeight - el.clientHeight > 40) { scroller = el; break; } }
    const start = scroller.scrollTop, t0 = performance.now();
    (function step(now) {
      const t = Math.min(1, (now - t0) / ms);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      scroller.scrollTop = start + dist * e;
      if (t < 1) requestAnimationFrame(step); else res();
    })(performance.now());
  }), { dist, ms });
}

// Las teselas del mapa se piden DESPUÉS de montar el componente cliente, así que
// el primer networkidle no basta: espera al canvas + un segundo networkidle +
// asentado. El mapa de la ficha (FireMiniMap) NO expone window.__ibermap.
async function waitMapReady(page) {
  await page.waitForSelector('canvas.maplibregl-canvas', { timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3500);
}

async function save(ctx, page, name) {
  const vid = page.video();
  await ctx.close();
  fs.renameSync(await vid.path(), `${OUT}/${name}.webm`);
  console.log(`saved ${OUT}/${name}.webm`);
}

const browser = await chromium.launch();

// ---- Clip 2 · MAPA (flyTo hacia Las Hurdes / Cáceres) ----
{
  const ctx = await newCtx(browser);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?e2e`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => !!window.__ibermap, null, { timeout: 30000 });
  await page.waitForTimeout(2500); // plano abierto: península completa
  await page.evaluate(() => window.__ibermap.flyTo({ center: [-6.29, 40.36], zoom: 7.6, duration: 3600, essential: true }));
  await page.waitForTimeout(4200); // acompaña el vuelo + reposo
  await save(ctx, page, 'clip2-mapa');
}

// ---- Clip 3 · FICHA (las-hurdes) ----
// Pre-calienta la ruta (compilación de Next) y espera a que el mapa de la ficha
// cargue teselas + perímetro ANTES de grabar, para que no salga en gris.
{
  const warm = await newCtx(browser, false);
  const wp = await warm.newPage();
  await wp.goto(`${BASE}/f/las-hurdes?e2e`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitMapReady(wp);
  await warm.close();

  const ctx = await newCtx(browser);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/f/las-hurdes?e2e`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitMapReady(page); // mapa con perímetro cargado
  await page.waitForTimeout(2200); // hero: mapa + cabecera (Activo N2, meteo)
  await smoothScroll(page, 900, 3200); // baja a medios / meteo / evolución
  await page.waitForTimeout(1600);
  await save(ctx, page, 'clip3-ficha');
}

// ---- Clip 4 · INFORME (KPIs + chips país) ----
{
  const ctx = await newCtx(browser);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/informe?e2e`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1800); // rejilla KPIs 2x2
  await smoothScroll(page, 380, 1600); // asoma la tabla
  await page.waitForTimeout(700);
  for (const label of ['España', 'Portugal', 'Todos']) {
    const btn = page.getByRole('button', { name: new RegExp(`^${label}`) }).first();
    if (await btn.count()) { await btn.click().catch(() => {}); await page.waitForTimeout(1200); }
  }
  await save(ctx, page, 'clip4-informe');
}

await browser.close();
console.log('DONE');
