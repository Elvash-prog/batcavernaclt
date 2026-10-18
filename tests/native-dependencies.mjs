import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?files(path.join(dir,x.name)):[path.join(dir,x.name)]);}
for(const root of ['desktop/src','desktop/src-tauri/src','android-native/app/src/main/java']){
 for(const file of files(root).filter(x=>/\.(js|ts|tsx|rs|java)$/.test(x))){
  assert.doesNotMatch(fs.readFileSync(file,'utf8'),/https?:[^\s"']*\.(?:workers|pages)\.dev/i,file+' still depends on a retired app host');
 }
}
assert.match(fs.readFileSync('desktop/src-tauri/src/main.rs','utf8'),/supabase\.co\/functions\/v1\/native-api/);
assert.match(fs.readFileSync('android-native/app/src/main/java/dev/gamersclt/batcaverna/nativeapp/NativeBackend.java','utf8'),/BuildConfig.SUPABASE_URL\+"\/functions\/v1\/native-api"/);
console.log('Native source dependency check: no application Workers/Pages endpoints remain in Windows or Android');

const retired=await import('../worker.js');for(const route of ['/','/config.js','/app.js','/api/account/login']){const response=await retired.default.fetch(new Request('https://retired.test'+route));assert.equal(response.status,410);assert.equal(response.headers.get('Cache-Control'),'no-store');}console.log('Retired web entrypoints return 410');
