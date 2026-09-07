/**
 * Auth regressions using the built frontend and mocked authentication responses.
 * No real account is used, created, changed, or contacted. Every request is intercepted.
 * npm run build
 * TOP7_PLAYWRIGHT_MODULE=/tmp/top7-auth-tests/node_modules/playwright/index.mjs node src/tests/auth-regression.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const {chromium} = await import(process.env.TOP7_PLAYWRIGHT_MODULE || 'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dist=path.join(root,'dist');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const web='https://top-7.app', native='https://top-7.base44.app';
const androidUA='Mozilla/5.0 (Linux; Android 15; Pixel 9 Pro Build/AP4A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36';
const fakeToken='QA_FIXTURE_ONLY_NOT_A_REAL_TOKEN';
const user={id:'fixture-existing-user',email:'existing@example.invalid',role:'user',user_type:'athlete',full_name:'Existing QA User'};
const results=[];
async function fixture(opts={}) {
 const context=await browser.newContext({viewport:{width:412,height:915},...(opts.native?{userAgent:androidUA}:{})});
 if(opts.init) await context.addInitScript(opts.init);
 const page=await context.newPage();page.setDefaultTimeout(7500);
 const errors=[],consoleErrors=[],requests=[];let meCount=0;
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error') consoleErrors.push(m.text());});
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.pathname.includes('/api/')) {
   requests.push({path:u.pathname,method:req.method(),body:req.postDataJSON?.()});
   const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'};
   if(req.method()==='OPTIONS') return route.fulfill({status:204,headers});
   if(u.pathname==='/api/apps/auth/login') {
    opts.onGoogle?.(u);
    // Simulate the callback result, NOT native Android Auth Tab itself.
    const callback = new URL('/?access_token='+fakeToken,u.searchParams.get('from_url')).href;
    // A new document navigation is intercepted again. HTTP redirect chains in
    // Playwright may bypass a route handler on the redirected request.
    return route.fulfill({status:200,contentType:'text/html',body:'<script>location.replace('+JSON.stringify(callback)+')</script>'});
   }
   if(u.pathname.endsWith('/entities/User/me')) {
    const n=++meCount;
    const reply=await opts.me?.(n,req) || {status:200,data:user};
    if(reply.delay) await new Promise(r=>setTimeout(r,reply.delay));
    return route.fulfill({status:reply.status,headers,body:JSON.stringify(reply.data)}).catch(()=>{});
   }
   if(u.pathname.endsWith('/auth/login')) {
    const reply=opts.login || {status:200,data:{access_token:fakeToken,user}};
    return route.fulfill({status:reply.status,headers,body:JSON.stringify(reply.data)});
   }
   if(u.pathname.endsWith('/auth/register')) {
    const reply=opts.register || {status:200,data:{success:true}};
    return route.fulfill({status:reply.status,headers,body:JSON.stringify(reply.data)});
   }
   if(u.pathname.endsWith('/auth/verify-otp')) {
    return route.fulfill({status:200,headers,body:JSON.stringify(opts.otp || {verified:true})});
   }
   if(u.pathname.endsWith('/auth/reset-password-request')) {
    return route.fulfill({status:opts.resetStatus || 200,headers,body:JSON.stringify(opts.resetBody || {})});
   }
   return route.fulfill({status:200,headers,body:u.pathname.includes('/entities/')?'[]':'{}'});
  }
  if([web,native].includes(u.origin)) {
   const relative=u.pathname.startsWith('/assets/')?u.pathname.slice(1):'index.html';
   const filename=path.join(dist,relative);
   if(!filename.startsWith(dist+path.sep)) return route.abort();
   try {
    const body=await fs.readFile(filename);
    const type=filename.endsWith('.js')?'application/javascript':filename.endsWith('.css')?'text/css':'text/html';
    return route.fulfill({status:200,contentType:type,body});
   } catch { return route.fulfill({status:404,body:''}); }
  }
  return route.abort();
 });
 return {context,page,errors,consoleErrors,requests,get meCount(){return meCount;}};
}
async function test(name,opts,fn){
 if(process.env.TOP7_TEST_FILTER && !name.includes(process.env.TOP7_TEST_FILTER)) return;
 const f=await fixture(opts);
 try {
  await fn(f);
  assert.deepEqual(f.errors,[],'Unexpected browser exception');
  assert.ok(!f.consoleErrors.some(s=>/liveToken is not defined|Maximum update depth|unexpected error/.test(s)), 'Internal session error');
  results.push({test:name,status:'PASS'});
 } catch(e){
  results.push({test:name,status:'FAIL',error:e.message,browserErrors:f.errors,consoleErrors:f.consoleErrors.slice(0,5),body:(await f.page.locator('body').innerText().catch(()=>'' )).slice(0,800)});
 } finally {await f.context.close();}
}
async function dashboard(f){await f.page.getByRole('heading',{name:'My Progress',exact:true}).waitFor();}
async function loginForm(f,email='existing@example.invalid') {
 await f.page.getByLabel('Email',{exact:true}).fill(email);
 await f.page.getByLabel('Password',{exact:true}).fill('  Exact password with spaces  ');
 await f.page.getByRole('button',{name:'Log in',exact:true}).click();
}
const meDenied={status:401,data:{detail:'Invalid session'}};

await test('Existing email login never registers; password bytes are preserved',{},async f=>{
 await f.page.goto(web+'/login');await loginForm(f,' existing@example.invalid ');await dashboard(f);
 const req=f.requests.find(r=>r.path.endsWith('/auth/login'));
 assert.equal(req.body.email,'existing@example.invalid');assert.equal(req.body.password,'  Exact password with spaces  ');
 assert.ok(!f.requests.some(r=>r.path.endsWith('/auth/register')));
});
await test('Invalid password stays on login with guidance, not signup',{login:{status:401,data:{detail:'Invalid email or password'}}},async f=>{
 await f.page.goto(web+'/login');await loginForm(f);
 await f.page.getByRole('alert').filter({hasText:'Top 7 could not verify'}).waitFor();
 assert.equal(new URL(f.page.url()).pathname,'/login');assert.ok(!f.requests.some(r=>r.path.endsWith('/auth/register')));
});
await test('Credential acceptance does not bypass failed session verification',{me:()=>meDenied},async f=>{
 await f.page.goto(web+'/login');await loginForm(f);
 await f.page.getByRole('alert').filter({hasText:'T7-EMAIL-SESSION'}).waitFor();
 assert.equal(await f.page.getByRole('heading',{name:'My Progress',exact:true}).count(),0);
});
for(const origin of [web,native]) {
 await test('Query callback logs existing user in on '+new URL(origin).host,{native:origin===native},async f=>{
  await f.page.goto(origin+'/?access_token='+fakeToken);await dashboard(f);
  assert.ok(!new URL(f.page.url()).searchParams.has('access_token'));
  assert.ok(!f.requests.some(r=>r.path.endsWith('/auth/register')));
 });
}
await test('Fragment callback survives one-shot clear flag',{native:true},async f=>{
 await f.page.goto(native+'/?clear_access_token=true#access_token='+fakeToken);await dashboard(f);
 assert.equal(new URL(f.page.url()).hash,'');assert.equal(new URL(f.page.url()).search,'');
});
await test('Legacy saved clear flag cannot delete a newly returned session',{init:()=>localStorage.setItem('base44_clear_access_token','true')},async f=>{
 await f.page.goto(web+'/?access_token='+fakeToken);await dashboard(f);
 assert.equal(await f.page.evaluate(()=>localStorage.getItem('base44_clear_access_token')),null);
});
await test('Fresh callback retry recovers without ReferenceError',{me:n=>n<3?meDenied:{status:200,data:user}},async f=>{
 await f.page.goto(native+'/?access_token='+fakeToken);await dashboard(f);assert.ok(f.meCount<=6);
});
await test('Rejected callback stops with a visible error and no resurrection',{me:()=>meDenied},async f=>{
 await f.page.goto(native+'/?access_token='+fakeToken);
 await f.page.getByRole('heading',{name:'Session restore failed'}).waitFor();
 await f.page.getByText('Sign-in details',{exact:true}).click();
 await f.page.getByText('Support code: T7-SESSION-401',{exact:true}).waitFor();
 assert.equal(await f.page.evaluate(()=>localStorage.getItem('base44_access_token')),null);
 const n=f.meCount;await f.page.waitForTimeout(700);assert.equal(f.meCount,n);assert.ok(n<=6);
 await f.page.getByRole('link',{name:'Back to sign in'}).click();
 await f.page.getByRole('heading',{name:'Welcome back'}).waitFor();assert.equal(f.meCount,n);
});
await test('403 does not erase identity or grant access',{me:()=>({status:403,data:{detail:'Access forbidden'}})},async f=>{
 await f.page.goto(native+'/?access_token='+fakeToken);await f.page.getByRole('heading',{name:'Session restore failed'}).waitFor();
 assert.equal(await f.page.evaluate(()=>Boolean(localStorage.getItem('base44_access_token'))),true);
 assert.equal(await f.page.getByRole('heading',{name:'My Progress',exact:true}).count(),0);
});
await test('Network/server failures end in a retry state, not endless login',{me:()=>({status:503,data:{detail:'Service unavailable'}})},async f=>{
 await f.page.goto(native+'/?access_token='+fakeToken);await f.page.getByRole('heading',{name:'Session restore failed'}).waitFor();
 assert.equal(await f.page.evaluate(()=>Boolean(localStorage.getItem('base44_access_token'))),true);
});
await test('Warm WebView resume consumes a returned token without reload',{native:true},async f=>{
 await f.page.goto(native+'/login');await f.page.getByRole('heading',{name:'Welcome back'}).waitFor();
 await f.page.evaluate(t=>{localStorage.setItem('base44_access_token',t);window.dispatchEvent(new Event('focus'));},fakeToken);
 await dashboard(f);
});
await test('Warm URL callback is captured via same-document navigation',{native:true},async f=>{
 await f.page.goto(native+'/login');await f.page.getByRole('heading',{name:'Welcome back'}).waitFor();
 await f.page.evaluate(t=>{history.pushState({},'', '/?access_token='+t);window.dispatchEvent(new PopStateEvent('popstate'));},fakeToken);
 await dashboard(f);assert.ok(!f.page.url().includes('access_token'));
});
await test('Old 401 cannot delete a newer successful session',{native:true,me:(_,req)=>req.headers().authorization?.includes('OLD_FIXTURE')?{...meDenied,delay:1300}:{status:200,data:user}},async f=>{
 await f.page.goto(native+'/?access_token=OLD_FIXTURE');
 await f.page.waitForTimeout(150);
 await f.page.evaluate(t=>{localStorage.setItem('base44_access_token',t);localStorage.setItem('token',t);window.dispatchEvent(new Event('focus'));},fakeToken);
 await dashboard(f);await f.page.waitForTimeout(1700);
 assert.equal(await f.page.evaluate(()=>localStorage.getItem('base44_access_token')),fakeToken);await dashboard(f);
});
await test('Clearing a session while verification is pending prevents late login',{me:()=>({status:200,data:user,delay:1300})},async f=>{
 await f.page.goto(web+'/?access_token='+fakeToken);await f.page.getByText('Loading session…',{exact:true}).waitFor();
 await f.page.evaluate(()=>{localStorage.removeItem('base44_access_token');localStorage.removeItem('token');window.dispatchEvent(new Event('focus'));});
 await f.page.waitForTimeout(1900);await f.page.getByRole('heading',{name:'Top 7',exact:true}).waitFor();assert.equal(await f.page.getByRole('heading',{name:'My Progress',exact:true}).count(),0);
});
for(const route of ['/login','/register']) {
 let destination;
 await test('Native Google entry '+route+' uses shell endpoint and same-origin root',{native:true,onGoogle:u=>{destination=u;}},async f=>{
  await f.page.goto(native+route);await f.page.getByRole('button',{name:'Continue with Google',exact:true}).click();await dashboard(f);
  assert.equal(destination.origin,'https://app.base44.com');assert.equal(destination.searchParams.get('from_url'),native+'/');
  assert.ok(!f.requests.some(r=>r.path.endsWith('/auth/register')));
 });
}
await test('Web Google entry keeps the branded web origin',{onGoogle:u=>assert.equal(u.searchParams.get('from_url'),web+'/')},async f=>{
 await f.page.goto(web+'/login');await f.page.getByRole('button',{name:'Continue with Google',exact:true}).click();await dashboard(f);
});
await test('Password reset tokens are not mistaken for login sessions',{},async f=>{
 await f.page.goto(web+'/reset-password?token=RESET_FIXTURE');await f.page.getByRole('heading',{name:'New password'}).waitFor();
 assert.equal(await f.page.evaluate(()=>localStorage.getItem('base44_access_token')),null);
 assert.equal(new URL(f.page.url()).searchParams.get('token'),'RESET_FIXTURE');
});
await test('Duplicate email signup remains explicit and never logs in automatically',{register:{status:409,data:{detail:'Account already exists'}}},async f=>{
 await f.page.goto(web+'/register');await f.page.getByLabel('Email',{exact:true}).fill('existing@example.invalid');
 await f.page.getByLabel('Password',{exact:true}).fill('FAKE_PASSWORD');await f.page.getByLabel('Confirm Password',{exact:true}).fill('FAKE_PASSWORD');
 await f.page.getByRole('button',{name:'Create account',exact:true}).click();await f.page.getByRole('link',{name:'Log in instead'}).waitFor();
 assert.ok(!f.requests.some(r=>r.path.endsWith('/auth/login')));
});
for(const withToken of [false,true]) {
 await test('OTP completion validates a session '+(withToken?'with':'without')+' token in verify response',{otp:withToken?{access_token:fakeToken}:{verified:true}},async f=>{
  await f.page.goto(web+'/register');await f.page.getByLabel('Email',{exact:true}).fill('new@example.invalid');
  await f.page.getByLabel('Password',{exact:true}).fill('FAKE_PASSWORD');await f.page.getByLabel('Confirm Password',{exact:true}).fill('FAKE_PASSWORD');
  await f.page.getByRole('button',{name:'Create account',exact:true}).click();await f.page.getByRole('heading',{name:'Verify your email'}).waitFor();
  await f.page.locator('input[autocomplete="one-time-code"]').fill('123456');await f.page.getByRole('button',{name:'Verify',exact:true}).click();await dashboard(f);
  assert.equal(f.requests.filter(r=>r.path.endsWith('/auth/login')).length,withToken?0:1);
 });
}
await test('No callback is diagnosed instead of an unexplained repeat login',{native:true,init:()=>localStorage.setItem('top7_auth_diagnostics',JSON.stringify({phase:'opening_google',method:'google',startedAt:Date.now(),callbackSeen:false}))},async f=>{
 await f.page.goto(native+'/login');await f.page.getByRole('alert').filter({hasText:'T7-NO-CALLBACK'}).waitFor();
 await f.page.getByText('Sign-in details',{exact:true}).click();await f.page.getByText('Google callback received: no',{exact:true}).waitFor();
});
await test('Reset request network failure does not pretend email was sent',{resetStatus:503},async f=>{
 await f.page.goto(web+'/forgot-password');await f.page.getByLabel('Email address').fill('existing@example.invalid');
 await f.page.getByRole('button',{name:'Send reset link'}).click();await f.page.getByRole('alert').filter({hasText:'could not be reached'}).waitFor();
});
await test('Login stays usable when token storage writes fail',{init:()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='base44_access_token'||k==='token')throw new DOMException('Quota','QuotaExceededError');return original.call(this,k,v);};}},async f=>{
 await f.page.goto(web+'/login');await loginForm(f);await dashboard(f);
});

await test('A successful-looking response without a token cannot reuse an old session',{login:{status:200,data:{user}}},async f=>{
 await f.page.goto(web+'/login');await loginForm(f);
 await f.page.getByRole('alert').filter({hasText:'T7-EMAIL-SESSION'}).waitFor();
 assert.equal(await f.page.getByRole('heading',{name:'My Progress',exact:true}).count(),0);
});


for (const [reason, code] of [
 ['Invalid email or password', 'T7-EMAIL-CREDENTIALS'],
 ['Missing Turnstile token', 'T7-EMAIL-SECURITY-CHECK'],
 ['Username password authentication is disabled', 'T7-EMAIL-DISABLED'],
 ['Please login with Google', 'T7-EMAIL-SIGNIN-METHOD'],
 ['Email is not verified', 'T7-EMAIL-VERIFY'],
 ['Request rejected', 'T7-EMAIL-400'],
]) {
 await test('HTTP 400 gives a specific safe reason: '+code, {native:true,login:{status:400,data:{message:reason,detail:reason}}}, async f=>{
  await f.page.goto(native+'/login');
  await f.page.getByText('Sign-in details',{exact:true}).click();
  await loginForm(f);
  await f.page.getByRole('alert').filter({hasText:code}).waitFor();
  await f.page.getByText('Server status: 400',{exact:true}).waitFor();
  await f.page.getByText('Support code: '+code,{exact:true}).waitFor();
  await f.page.getByText('Email form: T7-EMAIL-2026-09-07-1',{exact:true}).waitFor();
  assert.equal(f.requests.filter(r=>r.path.endsWith('/auth/login')).length,1);
  assert.ok(!f.requests.some(r=>r.path.endsWith('/auth/register')));
 });
}
await test('Password visibility toggle preserves input and does not submit',{},async f=>{
 await f.page.goto(web+'/login');
 await f.page.getByLabel('Password',{exact:true}).fill('  Exact password with spaces  ');
 await f.page.getByRole('button',{name:'Show password',exact:true}).click();
 assert.equal(await f.page.getByLabel('Password',{exact:true}).getAttribute('type'),'text');
 assert.equal(await f.page.getByLabel('Password',{exact:true}).inputValue(),'  Exact password with spaces  ');
 await f.page.getByRole('button',{name:'Hide password',exact:true}).click();
 assert.equal(await f.page.getByLabel('Password',{exact:true}).getAttribute('type'),'password');
 assert.equal(f.requests.filter(r=>r.path.endsWith('/auth/login')).length,0);
 assert.ok(!(await f.page.evaluate(()=>JSON.stringify(localStorage))).includes('Exact password'));
});
await test('Recovery keeps the same email, with no password or email in the URL',{login:{status:400,data:{detail:'Invalid email or password'}}},async f=>{
 await f.page.goto(web+'/login');await loginForm(f);
 await f.page.getByRole('link',{name:'Reset password for this email'}).click();
 await f.page.getByRole('heading',{name:'Reset password',exact:true}).waitFor();
 assert.equal(await f.page.getByLabel('Email address').inputValue(),'existing@example.invalid');
 assert.equal(new URL(f.page.url()).search,'');
 assert.ok(!(await f.page.evaluate(()=>JSON.stringify(history.state))).includes('Exact password'));
 assert.ok(!f.requests.some(r=>r.path.endsWith('/auth/reset-password-request')));
 await f.page.getByRole('button',{name:'Send reset link',exact:true}).click();
 await f.page.getByText(/If password recovery is available/).waitFor();
 const request=f.requests.find(r=>r.path.endsWith('/auth/reset-password-request'));
 assert.deepEqual(request.body,{email:'existing@example.invalid'});
});
await test('An unexplained reset HTTP 400 is not reported as an email sent',{resetStatus:400,resetBody:{detail:'Request rejected'}},async f=>{
 await f.page.goto(web+'/forgot-password');await f.page.getByLabel('Email address').fill('existing@example.invalid');
 await f.page.getByRole('button',{name:'Send reset link',exact:true}).click();
 await f.page.getByRole('alert').filter({hasText:'No reset email was confirmed'}).waitFor();
 assert.equal(await f.page.getByText(/If password recovery is available/).count(),0);
});
await test('Explicit no-account recovery response preserves account privacy',{resetStatus:400,resetBody:{detail:'User not found'}},async f=>{
 await f.page.goto(web+'/forgot-password');await f.page.getByLabel('Email address').fill('existing@example.invalid');
 await f.page.getByRole('button',{name:'Send reset link',exact:true}).click();
 await f.page.getByText(/If password recovery is available/).waitFor();
 assert.ok(!(await f.page.locator('body').innerText()).includes('User not found'));
});

console.log(JSON.stringify({passed:results.filter(r=>r.status==='PASS').length,total:results.length,results},null,2));
const reportPath = process.env.TOP7_TEST_REPORT || '/tmp/top7-auth-tests/report.json';
await fs.mkdir(path.dirname(reportPath), {recursive:true});
await fs.writeFile(reportPath,JSON.stringify(results,null,2));
await browser.close();
if(results.some(r=>r.status!=='PASS'))process.exitCode=1;
