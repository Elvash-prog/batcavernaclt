import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const dist=new URL('../dist/',import.meta.url),assets=new URL('assets/',dist);
assert.ok(fs.existsSync(new URL('index.html',dist)),'dist/index.html não foi gerado');
assert.ok(fs.existsSync(assets),'dist/assets não foi gerado');
const files=fs.readdirSync(assets),scripts=files.filter(file=>file.endsWith('.js'));
const source=scripts.map(file=>fs.readFileSync(new URL(`assets/${file}`,dist),'utf8')).join('\n');
for(const name of ['app','reference','refinement','polish','redesign','journey','alignment','desktop-fixes']){
  assert.ok(scripts.some(file=>file.startsWith(`${name}-`)),`${name}.js foi embutido ou não foi emitido como arquivo`);
}
assert.doesNotMatch(source,/data:(?:text|application)\/(?:javascript|ecmascript)/i,'o bundle contém script data: incompatível com a CSP do Tauri');
assert.match(source,/Diagnóstico copiado/,'a tela de diagnóstico não entrou no bundle');
console.log(`Bundle verificado: ${scripts.length} scripts externos, CSP compatível.`);
