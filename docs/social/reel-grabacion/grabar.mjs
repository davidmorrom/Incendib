import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:3200';
const OUT = 'C:/Users/ADMINI~1/AppData/Local/Temp/claude/C--Users-Administrador-Documents-Antigravity-Iberfuego/bfe4ef81-5746-4874-967b-84bfc8aaa774/scratchpad/clips';
fs.mkdirSync(OUT, { recursive: true });

const VW = 720, VH = 1280;

async function newCtx(browser) {
  const ctx = await browser.newContext({
    viewport: { width: VW, height: VH },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT, size: { width: VW, height: VH } },
  });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('incendib-theme', 'dark'); } catch (e) {}
  });
  return ctx;
}

async function smoothScroll(page, dist, ms) {
  await page.evaluate(({ dist, ms }) => new Promise((res) => {
    let scroller = document.scrollingElement || document.documentElement;
    const main = document.querySelector('main');
    const cands = [main, ...document.querySelectorAll('main *')].filter(Boolean);
    for (const el of cands) { if (el.scrollHeight - el.clientHeight > 40) { scroller = el; break; } }
    const start = scroller.scrollTop;
    const t0 = performance.now();
    function step(now) {
      const t = Math.min(1, (now - t0) / ms);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      scroller.scrollTop = start + dist * e;
      if (t < 1) requestAnimationFrame(step); else res();
    }
    requestAnimationFrame(step);
  }), { dist, ms });
}

async function save(ctx, page, name) {
  const vid = page.video();
  await ctx.close(); // flushes video
  const p = await vid.path();
  const dest = `${OUT}/${name}.webm`;
  fs.renameSync(p, dest);
  console.log(`saved ${dest}`);
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
{
  const ctx = await newCtx(browser);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/f/las-hurdes?e2e`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2200); // cabecera: nombre, Activo N2, superficie, meteo
  await smoothScroll(page, 900, 3200); // baja a medios / meteo / evolución
  await page.waitForTimeout(1500);
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
