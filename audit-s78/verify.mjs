import { chromium, devices } from '@playwright/test';
const BASE='https://www.carnet-de-peche.com';
const b = await chromium.launch();

// ---------- A. /carnet/nouvelle : redirection client ? ----------
for (const path of ['/carnet/nouvelle', '/carnet/nouvelle?spot_id=cap-de-la-croisette-osm8811707251']) {
  const ctx = await b.newContext({ ...devices['iPhone 13'], locale:'fr-FR' });
  const p = await ctx.newPage();
  const navs = [];
  p.on('framenavigated', f => { if (f === p.mainFrame()) navs.push(f.url()); });
  await p.goto(BASE+path, { waitUntil:'domcontentloaded', timeout:45000 });
  const t0 = await p.title();
  await p.waitForTimeout(6000);
  const t1 = await p.title();
  console.log(`\n[A] ${path}`);
  console.log(`    titre après SSR : ${t0}`);
  console.log(`    titre après 6 s : ${t1}`);
  console.log(`    URL finale      : ${p.url()}`);
  console.log(`    navigations     : ${JSON.stringify(navs)}`);
  const di = await p.evaluate(() => Array.from(document.querySelectorAll('input[type=date]')).map(e=>({value:e.value,max:e.getAttribute('max'),min:e.getAttribute('min'),valid:e.validity.valid,overflow:e.validity.rangeOverflow})));
  console.log(`    champs date     : ${JSON.stringify(di)}`);
  await ctx.close();
}

// ---------- B. /carte : bandeau consentement vs barre CTA ----------
{
  const ctx = await b.newContext({ ...devices['iPhone 13'], locale:'fr-FR' });
  const p = await ctx.newPage();
  await p.goto(BASE+'/carte', { waitUntil:'domcontentloaded', timeout:45000 });
  await p.waitForTimeout(5000);
  const r = await p.evaluate(() => {
    const vh = window.innerHeight, vw = window.innerWidth;
    const fixed = Array.from(document.querySelectorAll('body *')).filter(el=>{
      const cs=getComputedStyle(el); const b=el.getBoundingClientRect();
      return cs.position==='fixed' && b.height>20 && b.width>40 && cs.visibility!=='hidden' && parseFloat(cs.opacity)>0.05;
    }).map(el=>{const b=el.getBoundingClientRect();const cs=getComputedStyle(el);
      return {cls:(el.className||'').toString().slice(0,70), z:+cs.zIndex||0, top:Math.round(b.top), bottom:Math.round(b.bottom), h:Math.round(b.height), w:Math.round(b.width), text:(el.innerText||'').replace(/\s+/g,' ').slice(0,70)};});
    // le CTA cliquable de la barre d'inscription
    const ctas = Array.from(document.querySelectorAll('a,button')).map(el=>{const b=el.getBoundingClientRect();
      return {tag:el.tagName, text:(el.innerText||'').replace(/\s+/g,' ').trim().slice(0,45), href:el.getAttribute('href')||'', top:Math.round(b.top),bottom:Math.round(b.bottom),left:Math.round(b.left),right:Math.round(b.right),w:Math.round(b.width),h:Math.round(b.height)};})
      .filter(c=>c.h>0 && c.text && /gratuit|carnet|cr[ée]e|inscri/i.test(c.text));
    return {vh, vw, fixed, ctas};
  });
  console.log(`\n[B] /carte — viewport ${r.vw}x${r.vh}`);
  r.fixed.forEach(f=>console.log(`    fixe z=${String(f.z).padStart(3)} ${f.top}→${f.bottom} (h=${f.h}) | ${f.text}`));
  r.ctas.forEach(c=>console.log(`    CTA "${c.text}" ${c.w}x${c.h} @ ${c.top}→${c.bottom} href=${c.href}`));
  // test réel : le point central du CTA reçoit-il le clic ?
  const hit = await p.evaluate(() => {
    const el = Array.from(document.querySelectorAll('a,button')).find(e=>/c'est gratuit|cr[ée]e ton carnet/i.test(e.innerText||''));
    if(!el) return 'CTA introuvable';
    const b = el.getBoundingClientRect();
    const cx = b.left+b.width/2, cy = b.top+b.height/2;
    const top = document.elementFromPoint(cx, cy);
    return { cta:(el.innerText||'').trim().slice(0,40), pointCentral:[Math.round(cx),Math.round(cy)],
      elementQuiRecoitLeClic: top ? top.tagName+'.'+(top.className||'').toString().slice(0,55) : 'null',
      estLeCTA: !!(top && (el===top || el.contains(top) || top.contains(el))) };
  });
  console.log(`    TEST CLIC: ${JSON.stringify(hit)}`);
  await p.screenshot({ path:'audit-s78/PREUVE-carte-bandeau.png' });
  await ctx.close();
}

// ---------- C. /carte : après acceptation du consentement ----------
{
  const ctx = await b.newContext({ ...devices['iPhone 13'], locale:'fr-FR' });
  await ctx.addCookies([{name:'cdp-analytics-consent',value:'granted',domain:'www.carnet-de-peche.com',path:'/'}]);
  const p = await ctx.newPage();
  await p.goto(BASE+'/carte', { waitUntil:'domcontentloaded', timeout:45000 });
  await p.waitForTimeout(5000);
  await p.screenshot({ path:'audit-s78/PREUVE-carte-sans-bandeau.png' });
  const hit = await p.evaluate(() => {
    const el = Array.from(document.querySelectorAll('a,button')).find(e=>/c'est gratuit|cr[ée]e ton carnet/i.test(e.innerText||''));
    if(!el) return 'CTA introuvable';
    const b = el.getBoundingClientRect(); const cx=b.left+b.width/2, cy=b.top+b.height/2;
    const top=document.elementFromPoint(cx,cy);
    return { cta:(el.innerText||'').trim().slice(0,40), taille:`${Math.round(b.width)}x${Math.round(b.height)}`, href:el.getAttribute('href'), estLeCTA: !!(top&&(el===top||el.contains(top)||top.contains(el))) };
  });
  console.log(`\n[C] /carte consentement accordé — ${JSON.stringify(hit)}`);
  await ctx.close();
}

// ---------- D. fiche spot : chemin réel du CTA ----------
{
  const ctx = await b.newContext({ ...devices['iPhone 13'], locale:'fr-FR' });
  await ctx.addCookies([{name:'cdp-analytics-consent',value:'granted',domain:'www.carnet-de-peche.com',path:'/'}]);
  const p = await ctx.newPage();
  await p.goto(BASE+'/spots/pointe-des-chats-groix', { waitUntil:'domcontentloaded', timeout:45000 });
  await p.waitForTimeout(4000);
  const ctas = await p.evaluate(() => Array.from(document.querySelectorAll('a')).filter(a=>/prise|carnet|gratuit|conditions/i.test(a.innerText||'')).map(a=>{const b=a.getBoundingClientRect();return {text:(a.innerText||'').replace(/\s+/g,' ').trim().slice(0,55), href:a.getAttribute('href'), taille:`${Math.round(b.width)}x${Math.round(b.height)}`};}));
  console.log(`\n[D] fiche spot — CTA:`); ctas.forEach(c=>console.log(`    "${c.text}" [${c.taille}] -> ${c.href}`));
  await p.screenshot({ path:'audit-s78/PREUVE-fiche-bas.png' });
  // suivre le CTA vers /carnet/nouvelle
  const target = ctas.find(c=>c.href && c.href.includes('/carnet/nouvelle'));
  if (target) {
    await p.goto(BASE+target.href, { waitUntil:'domcontentloaded', timeout:45000 });
    const t0=await p.title(); await p.waitForTimeout(6000);
    console.log(`    suivi ${target.href} : SSR="${t0}" → après 6s="${await p.title()}" url=${p.url()}`);
    await p.screenshot({ path:'audit-s78/PREUVE-nouvelle-depuis-fiche.png' });
  }
  await ctx.close();
}

// ---------- E. maptiler sur l'accueil ----------
{
  const ctx = await b.newContext({ ...devices['iPhone 13'], locale:'fr-FR' });
  const p = await ctx.newPage();
  const bad=[];
  p.on('response', r=>{ if(r.url().includes('maptiler') && r.status()>=400) bad.push(r.status()+' '+r.url().slice(0,110)); });
  p.on('requestfailed', r=>{ if(r.url().includes('maptiler')) bad.push('FAIL '+r.url().slice(0,110)+' :: '+(r.failure()?.errorText||'')); });
  await p.goto(BASE+'/', { waitUntil:'domcontentloaded', timeout:45000 });
  await p.waitForTimeout(6000);
  console.log(`\n[E] MapTiler sur / : ${bad.length} problème(s)`); bad.slice(0,6).forEach(x=>console.log('    '+x));
  await p.screenshot({ path:'audit-s78/PREUVE-accueil-haut.png' });
  await ctx.close();
}
await b.close();
console.log('\nDONE');
