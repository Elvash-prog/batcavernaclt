import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/continuity.js',import.meta.url),'utf8');
const policy=vm.runInNewContext(source.slice(source.indexOf(' const kindOf='),source.indexOf(' const journey='))+';({kindOf,latest,updated})',{normalizedStatus:s=>/progresso|assistindo|maratonando/i.test(s)?'progress':'done'});
test('mixed resume queue filters active titles, removes duplicates, orders offsets and preserves source',()=>{const rows=[{id:'a',categoria:'jogos',status:'Em progresso',updated_at:'2026-11-05T10:00:00Z'},{id:'b',categoria:'filmes',tipo:'🍥 Anime',status:'Maratonando',updated_at:'2026-11-05T10:30:00-01:00'},{id:'c',status:'Concluído'}];const snapshot=JSON.stringify(rows);assert.equal(policy.kindOf(rows[1]),'animes');assert.equal(policy.kindOf({categoria:'filmes',tipo:'📺'}),'series');assert.equal(policy.latest([...rows,rows[0]]).map(x=>x.id).join(','),'b,a');assert.equal(JSON.stringify(rows),snapshot);assert.equal(policy.updated({updated_at:'bad'}),'Sem data de atualização');});
test('resume queue is bounded after ordering and category selection',()=>{const rows=Array.from({length:20},(_,i)=>({id:String(i),categoria:'jogos',status:'Em progresso',updated_at:`2026-11-${String(i+1).padStart(2,'0')}T10:00:00Z`}));assert.equal(policy.latest(rows).length,8);assert.equal(policy.latest(rows)[0].id,'19');});
