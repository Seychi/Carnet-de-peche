import { chromium, devices } from '@playwright/test';
const BASE='https://www.carnet-de-peche.com';
const SPOT='092bf5a4-7099-4deb-9e79-710c23b87076';
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], locale:'fr-FR', timezoneId:'Europe/Paris' });
await ctx.addCookies([{name:'cdp-analytics-consent',value:'granted',domain:'www.carnet-de-peche.com',path:'/'}]);
const p = await ctx.newPage();

// --- Bloc 1 #2 : le champ date est-il valide au chargement ? ---
await p.goto(`${BASE}/carnet/nouvelle?spot_id=${SPOT}`, {waitUntil:'domcontentloaded', timeout:45000});
await p.waitForTimeout(5000);
console.log('[1] URL:', p.url(), '| titre:', await p.title());
const form = await p.evaluate(() => {
  const f = document.querySelector('form');
  const inputs = Array.from(document.querySelectorAll('input,select,textarea')).map(e=>{
    const r=e.getBoundingClientRect();
    return {type:e.type||e.tagName, name:e.name||e.id, value:(e.value||'').slice(0,30), min:e.getAttribute('min'), max:e.getAttribute('max'),
            required:e.required, valid:e.validity?e.validity.valid:null, overflow:e.validity?e.validity.rangeOverflow:null,
            taille:`${Math.round(r.width)}x${Math.round(r.height)}`};
  });
  const submit = Array.from(document.querySelectorAll('button')).map(x=>{const r=x.getBoundingClientRect();return {t:(x.innerText||'').trim().slice(0,40), type:x.type, disabled:x.disabled, taille:`${Math.round(r.width)}x${Math.round(r.height)}`};});
  return {formValid: f? f.checkValidity(): null, inputs, submit,
          h1: (document.querySelector('h1')||{}).innerText,
          texteVisible: (document.body.innerText||'').replace(/\s+/g,' ').slice(0,700)};
});
console.log('[1] h1:', form.h1);
console.log('[1] form.checkValidity() =', form.formValid);
form.inputs.forEach(i=>console.log('    ', JSON.stringify(i)));
form.submit.forEach(s=>console.log('    btn', JSON.stringify(s)));
console.log('[1] texte:', form.texteVisible.slice(0,420));

// --- Bloc 1 #4 : /auth/register rappelle-t-il le brouillon ? ---
// on remplit un début de brouillon puis on va sur register
const filled = await p.evaluate(() => {
  const out=[];
  document.querySelectorAll('input,select,textarea').forEach(e=>{
    if(e.type==='text' && !e.value){ e.value='Bar'; e.dispatchEvent(new Event('input',{bubbles:true})); out.push('texte rempli'); }
    if(e.type==='number' && !e.value){ e.value='45'; e.dispatchEvent(new Event('input',{bubbles:true})); out.push('nombre rempli'); }
  });
  return out;
});
console.log('[2] champs remplis:', JSON.stringify(filled));
await p.waitForTimeout(2500);
const ls = await p.evaluate(() => { const o={}; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i); o[k]=(localStorage.getItem(k)||'').slice(0,120);} return o; });
console.log('[2] localStorage:', JSON.stringify(ls));
await p.goto(`${BASE}/auth/register`, {waitUntil:'domcontentloaded', timeout:45000});
await p.waitForTimeout(4000);
const reg = await p.evaluate(() => (document.body.innerText||'').replace(/\s+/g,' ').slice(0,600));
console.log('[2] /auth/register texte:', reg);
await p.screenshot({path:'audit-s78/PREUVE-register.png'});

// --- promesse : /tarifs et accueil ---
for (const [n,u] of [['tarifs','/tarifs'],['accueil','/']]) {
  await p.goto(BASE+u,{waitUntil:'domcontentloaded',timeout:45000}); await p.waitForTimeout(2500);
  const t = await p.evaluate(()=> (document.body.innerText||'').replace(/\s+/g,' '));
  const motifs=['3 spots','carte compl','score','par département','gratuit pour toujours','0 €'];
  console.log(`\n[3] ${n} — motifs trouvés :`);
  motifs.forEach(m=>{ const i=t.toLowerCase().indexOf(m.toLowerCase()); if(i>=0) console.log(`    "${m}" → …${t.slice(Math.max(0,i-70), i+110)}…`); });
}
await b.close(); console.log('\nDONE');
