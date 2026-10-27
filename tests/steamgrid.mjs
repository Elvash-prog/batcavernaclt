import {test} from 'node:test';import assert from 'node:assert/strict';
import {selectSteamGrid,steamGridCover,steamGridCovers} from '../supabase/functions/_shared/steamgrid.js';
const portrait={id:2,width:600,height:900,url:'https://cdn2.steamgriddb.com/grid/portrait.png',score:5};
const landscape={id:1,width:920,height:430,url:'https://cdn2.steamgriddb.com/grid/landscape.png',score:10};
test('seleciona formato correto com ordem estável e exclui conteúdo inadequado',()=>{
 const rows=[portrait,landscape,{...portrait,id:0,nsfw:true,score:999},{...portrait,id:3,url:'https://cdn2.steamgriddb.com.evil.test/x',score:999},{...portrait,id:4,mime:'image/gif',score:999}];
 assert.equal(selectSteamGrid(rows,'poster'),portrait.url);assert.equal(selectSteamGrid(rows.reverse(),'poster'),portrait.url);assert.equal(selectSteamGrid(rows,'landscape'),landscape.url);assert.equal(selectSteamGrid([landscape],'poster'),null);
});
test('consulta App ID exato e mantém chave apenas no cabeçalho',async()=>{
 const calls=[];const url=await steamGridCover({appid:1174180,format:'poster',key:'test-key',getJson:async(u,h)=>{calls.push([u,h]);return {data:[portrait,landscape]}}});assert.equal(url,portrait.url);assert.equal(calls.length,1);assert.match(calls[0][0],/grids\/steam\/1174180\?/);assert.equal(new URL(calls[0][0]).searchParams.get('dimensions'),'600x900');assert.equal(calls[0][1].Authorization,'Bearer test-key');assert.ok(!calls[0][0].includes('test-key'));
});
test('retorna uma galeria segura e ordenada para escolha manual',async()=>{
 const rows=await steamGridCovers({appid:1174180,format:'poster',key:'test-key',getJson:async()=>({data:[{...portrait,id:8,score:2},{...portrait,id:9,url:'https://cdn2.steamgriddb.com/grid/best.png',score:20},landscape]})});
 assert.deepEqual(rows.map(x=>x.url),['https://cdn2.steamgriddb.com/grid/best.png',portrait.url]);assert.deepEqual(rows[0],{url:'https://cdn2.steamgriddb.com/grid/best.png',width:600,height:900,score:20});
});
test('nome exato não confunde sequência e ausência de chave não chama provedor',async()=>{
 let calls=0;const getJson=async()=>{calls++;return {data:[{id:2,name:'Red Dead Redemption 2'}]}};
 assert.equal(await steamGridCover({name:'Red Dead Redemption',key:'test',getJson}),null);assert.equal(calls,1);assert.equal(await steamGridCover({name:'Red Dead Redemption',key:'',getJson}),null);assert.equal(calls,1);
});
