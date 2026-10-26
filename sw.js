const CACHE='yohaku-v3';
const ASSETS=['./','./index.html','./style.css','./app.js','./budget.js','./holidays.js','./manifest.webmanifest','./icon.svg','./apple-touch-icon.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('yohaku-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).then(response=>{
  const known=ASSETS.some(asset=>new URL(asset,self.registration.scope).href===event.request.url);
  if(response.ok&&known){
   const copy=response.clone();
   event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{}));
  }
  return response;
 }).catch(()=>caches.match(event.request).then(cached=>cached||(event.request.mode==='navigate'?caches.match('./index.html'):Response.error()))));
});
