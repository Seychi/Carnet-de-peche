import { chromium, devices } from '@playwright/test';
import fs from 'fs';

const BASE = 'https://www.carnet-de-peche.com';
const OUT = 'audit-s78';
const PAGES = [
  ['home',        '/'],
  ['carte',       '/carte'],
  ['spots',       '/spots'],
  ['fiche-gen',   '/spots/cap-de-la-croisette-osm8811707251'],
  ['fiche-gen2',  '/spots/plage-de-bodri-osm113823751'],
  ['fiche-hist',  '/spots/pointe-des-chats-groix'],
  ['especes',     '/especes'],
  ['especes-bar', '/especes/bar'],
  ['tarifs',      '/tarifs'],
  ['register',    '/auth/register'],
  ['login',       '/auth/login'],
  ['nouvelle',    '/carnet/nouvelle'],
  ['declarer',    '/declarer-ses-prises'],
  ['fil',         '/fil'],
];

const results = [];

const probe = () => {
  const vw = window.innerWidth;
  const q = (s) => Array.from(document.querySelectorAll(s));
  const box = (el) => { const r = el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; };

  // fixed / sticky overlays (capped scan: getComputedStyle over a 100k-node DOM is O(minutes))
  const allEls = q('body *');
  const scanList = allEls.length > 5000 ? allEls.slice(0, 2500).concat(allEls.slice(-1500)) : allEls;
  const overlays = scanList.filter(el => {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'sticky') return false;
    const r = el.getBoundingClientRect();
    return r.width > 40 && r.height > 20 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05;
  }).map(el => ({
    tag: el.tagName.toLowerCase(),
    pos: getComputedStyle(el).position,
    z: getComputedStyle(el).zIndex,
    cls: (el.className && el.className.toString().slice(0,90)) || '',
    text: (el.innerText || '').replace(/\s+/g,' ').trim().slice(0,110),
    ...box(el),
  })).filter(o => o.h < window.innerHeight * 0.98);

  // interactive elements in first viewport + their tap size
  const inViewport = q('a,button,[role=button],input,select,textarea').slice(0, 3000).map(el => {
    const r = el.getBoundingClientRect();
    return { tag: el.tagName.toLowerCase(), href: el.getAttribute('href')||'', text:(el.innerText||el.value||el.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim().slice(0,70), x:r.x,y:r.y,w:r.width,h:r.height };
  }).filter(e => e.h > 0 && e.w > 0);

  const smallTaps = inViewport.filter(e => (e.h < 44 || e.w < 44) && e.y < 4000 && e.text);

  const dates = q('input[type=date]').map(el => ({ name: el.name||el.id, value: el.value, min: el.getAttribute('min'), max: el.getAttribute('max'), validity: el.validity ? {valid: el.validity.valid, rangeOverflow: el.validity.rangeOverflow, rangeUnderflow: el.validity.rangeUnderflow, badInput: el.validity.badInput} : null }));

  const headings = q('h1,h2').slice(0,14).map(h => h.tagName + ': ' + (h.innerText||'').replace(/\s+/g,' ').trim().slice(0,80));

  const links = q('a[href]').map(a => a.getAttribute('href'));

  const imgs = q('img').slice(0, 400);
  const imgNoDim = imgs.filter(i => !i.getAttribute('width') && !i.getAttribute('height') && !i.style.aspectRatio).length;
  const imgOversized = imgs.filter(i => i.naturalWidth > i.clientWidth * 2.5 && i.clientWidth > 0).map(i => ({src:(i.currentSrc||i.src).slice(-70), nat:i.naturalWidth, disp:i.clientWidth}));

  // horizontal overflow culprits
  const de = document.documentElement;
  const overflowers = de.scrollWidth > vw + 1 ? scanList.filter(el => { const r = el.getBoundingClientRect(); return r.right > vw + 2 && r.width > 8; }).slice(0,8).map(el => ({tag:el.tagName.toLowerCase(), cls:(el.className||'').toString().slice(0,70), right:Math.round(el.getBoundingClientRect().right)})) : [];

  const meta = (n) => (document.querySelector(`meta[name="${n}"]`)||{}).content || '';
  const og = (p) => (document.querySelector(`meta[property="${p}"]`)||{}).content || '';

  return {
    title: document.title,
    titleLen: document.title.length,
    description: meta('description'),
    descLen: meta('description').length,
    robots: meta('robots'),
    canonical: (document.querySelector('link[rel=canonical]')||{}).href || '',
    ogImage: og('og:image'),
    h1s: q('h1').map(h => (h.innerText||'').replace(/\s+/g,' ').trim().slice(0,90)),
    headings,
    docHeight: de.scrollHeight,
    scrollWidth: de.scrollWidth,
    viewportWidth: vw,
    hasHorizontalOverflow: de.scrollWidth > vw + 1,
    overflowers,
    domNodes: document.getElementsByTagName('*').length,
    htmlChars: document.documentElement.outerHTML.length,
    overlays,
    smallTapsCount: smallTaps.length,
    smallTaps: smallTaps.slice(0,12),
    dates,
    linkCount: links.length,
    linksToNouvelle: links.filter(h => h && h.includes('/carnet/nouvelle')).length,
    linksToRegister: links.filter(h => h && h.includes('/auth/register')).length,
    linksToLogin: links.filter(h => h && h.includes('/auth/login')).length,
    imgCount: imgs.length,
    imgNoDim,
    imgOversized: imgOversized.slice(0,6),
    jsonLd: q('script[type="application/ld+json"]').map(s => { try { const j = JSON.parse(s.textContent); return Array.isArray(j) ? j.map(x=>x['@type']).join('+') : j['@type']; } catch(e){ return 'PARSE_ERROR'; } }),
    bodyTextLen: (document.body.innerText||'').length,
  };
};

const browser = await chromium.launch();
for (const [name, path] of PAGES) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const page = await ctx.newPage();
  const errors = [], failed = [];
  let bytes = 0, reqCount = 0, jsBytes = 0, imgBytes = 0;
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0,200)); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + String(e).slice(0,200)));
  page.on('requestfailed', r => failed.push(r.url().slice(0,120) + ' :: ' + (r.failure()?.errorText||'')));
  page.on('response', async res => {
    reqCount++;
    try { const h = res.headers(); const len = parseInt(h['content-length']||'0',10) || 0; bytes += len;
      const ct = h['content-type']||''; if (ct.includes('javascript')) jsBytes += len; if (ct.startsWith('image/')) imgBytes += len;
    } catch(e){}
  });
  const t0 = Date.now();
  let status = null, err = null;
  try {
    const r = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
    status = r ? r.status() : null;
  } catch (e) { err = String(e).slice(0,200); }
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(3000);
  page.setDefaultTimeout(40000);

  let data = {};
  try { data = await page.evaluate(probe); } catch(e) { data = { probeError: String(e).slice(0,200) }; }

  let perf = {};
  try {
    perf = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      const lcp = performance.getEntriesByType('largest-contentful-paint').pop();
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      return { ttfb: Math.round(nav.responseStart||0), domContentLoaded: Math.round(nav.domContentLoadedEventEnd||0), loadEvent: Math.round(nav.loadEventEnd||0), transferSize: nav.transferSize||0, fcp: fcp?Math.round(fcp.startTime):null, lcp: lcp?Math.round(lcp.startTime):null, resources: performance.getEntriesByType('resource').length, resourceBytes: performance.getEntriesByType('resource').reduce((a,r)=>a+(r.transferSize||0),0) };
    });
  } catch(e){}

  try { await page.screenshot({ path: `${OUT}/shot-${name}-top.png` }); } catch(e){}
  try { await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(1200); await page.screenshot({ path: `${OUT}/shot-${name}-bottom.png` }); } catch(e){}

  results.push({ name, path, status, err, loadMs, reqCount, headerBytes: bytes, jsBytes, imgBytes, perf, errors: errors.slice(0,10), errorCount: errors.length, failed: failed.slice(0,6), ...data });
  console.log(`${name.padEnd(12)} ${String(status).padEnd(4)} ${String(loadMs).padStart(6)}ms  h=${data.docHeight||'?'} dom=${data.domNodes||'?'} err=${errors.length} overflow=${data.hasHorizontalOverflow}`);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
console.log('DONE');
