import { chromium, devices } from '@playwright/test';
const BASE='https://www.carnet-de-peche.com';
const b=await chromium.launch();
const ctx=await b.newContext({...devices['iPhone 13'],locale:'fr-FR',timezoneId:'Europe/Paris'});
await ctx.addCookies([{name:'cdp-analytics-consent',value:'granted',domain:'www.carnet-de-peche.com',path:'/'}]);
const p=await ctx.newPage();
await p.goto(`${BASE}/carnet/nouvelle?spot_id=092bf5a4-7099-4deb-9e79-710c23b87076`,{waitUntil:'domcontentloaded',timeout:45000});
await p.waitForTimeout(4000);
await p.getByRole('button',{name:'Bar',exact:true}).click();
await p.waitForTimeout(800);
try { await p.locator('input[name=size_cm]').first().fill('52', {timeout:5000}); } catch(e){ console.log('  (champ taille indisponible apres selection espece)'); }
await p.waitForTimeout(2500);
const ls=await p.evaluate(()=>{const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k.includes('posthog')&&!k.includes('__ph'))o[k]=(localStorage.getItem(k)||'').slice(0,200);}return o;});
console.log('[brouillon] localStorage:',JSON.stringify(ls,null,1));
await p.screenshot({path:'audit-s78/PREUVE-nouvelle-remplie.png'});
// clic sur le bouton d'enregistrement
await p.getByRole('button',{name:/Garder ma prise en brouillon|Enregistrer/i}).click();
await p.waitForTimeout(5000);
console.log('[après clic] url:',p.url(),'| titre:',await p.title());
console.log('[après clic] texte:',(await p.evaluate(()=> (document.body.innerText||'').replace(/\s+/g,' ').slice(0,650))));
await p.screenshot({path:'audit-s78/PREUVE-apres-enregistrement.png'});
// puis /auth/register direct
await p.goto(`${BASE}/auth/register`,{waitUntil:'domcontentloaded',timeout:45000});
await p.waitForTimeout(4000);
console.log('\n[/auth/register] texte:',(await p.evaluate(()=> (document.body.innerText||'').replace(/\s+/g,' ').slice(0,650))));
await p.screenshot({path:'audit-s78/PREUVE-register-avec-brouillon.png'});
await b.close(); console.log('\nDONE');
