import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const handlers={};
vm.runInNewContext(fs.readFileSync(new URL('../desktop/src/webview-policy.js',import.meta.url),'utf8'),{document:{addEventListener:(name,fn)=>handlers[name]=fn}});
function blocked(type,props={}){let result=false;handlers[type]({...props,preventDefault(){result=true}});return result;}
assert(blocked('contextmenu'));
for(const key of ['r','p','s'])assert(blocked('keydown',{key,ctrlKey:true}));
assert(blocked('keydown',{key:'F12'}));
assert(blocked('keydown',{key:'I',ctrlKey:true,shiftKey:true}));
for(const key of ['c','v','x','a','z','ArrowLeft'])assert(!blocked('keydown',{key,ctrlKey:true}));
console.log('Webview menu policy passed; editing shortcuts preserved.');
