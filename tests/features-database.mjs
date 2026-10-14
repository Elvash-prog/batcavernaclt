import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const A='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',C='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const migration=fs.readFileSync(fs.existsSync('supabase/patch-1.1.0-listas-indicacoes.sql')?'supabase/patch-1.1.0-listas-indicacoes.sql':'releases/BatCaverna-1.1.0-Supabase.sql','utf8');
let checks=0;
async function fixture(type){
 const db=new PGlite();await db.exec(`create role anon; create role authenticated; create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 create table public.perfis(id uuid primary key,nome text);create table public.amigos(user_id uuid,amigo_id uuid);
 create table public.bloqueios_clt(bloqueador_id uuid,bloqueado_id uuid);
 create table public.itens(id ${type} primary key,user_id uuid,nome text,categoria text,tipo text,capa text,review text,preco numeric);
 create table public.notificacoes(id uuid primary key default gen_random_uuid(),destinatario_id uuid,tipo text,mensagem text,actor_id uuid,referencia_id text,read boolean,created_at timestamptz default now());
 insert into auth.users values('${A}'),('${B}'),('${C}');insert into perfis values('${A}','Ana'),('${B}','Bruno'),('${C}','Carla');
 insert into amigos values('${A}','${B}'),('${B}','${A}');`);
 await db.exec(migration);await db.exec(migration);checks++;
 return db;
}
async function actor(db,u){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[u||'']);await db.exec('set role authenticated');}
async function admin(db){await db.exec('reset role');}
async function rpc(db,action,data={}){return (await db.query('select public.clt_features($1,$2::jsonb) result',[action,JSON.stringify(data)])).rows[0].result;}
async function reject(p){await assert.rejects(p);checks++;}
for(const type of ['bigint','uuid']){
 const db=await fixture(type),item=type==='bigint'?'42':'dddddddd-dddd-4ddd-dddd-dddddddddddd';
 await db.query('insert into itens values($1,$2,$3,$4,$5,$6,$7,$8)',[item,A,'Test <title>','jogos',null,'https://example.com/cover','Anotação privada',49.9]);
 await actor(db,A);const list=(await rpc(db,'create_list',{nome:'Fim de semana'}))[0];assert.equal(list.compartilhada,false);checks++;
 await rpc(db,'add_item',{list_id:list.id,item_id:item});await rpc(db,'add_item',{list_id:list.id,item_id:item});
 let entries=await rpc(db,'list_items',{list_id:list.id});assert.equal(entries.length,1);assert.deepEqual(Object.keys(entries[0].titulo).sort(),['capa','categoria','nome','tipo']);checks+=2;
 await reject(rpc(db,'add_item',{list_id:list.id,item_id:'999'}));await reject(rpc(db,'create_list',{nome:' '}));await reject(rpc(db,'create_list',{nome:'x'.repeat(61)}));
 await actor(db,B);assert.equal((await rpc(db,'lists')).length,0);checks++;await reject(rpc(db,'list_items',{list_id:list.id}));await reject(rpc(db,'rename_list',{list_id:list.id,nome:'Steal'}));
 await actor(db,A);await rpc(db,'share_list',{list_id:list.id,compartilhada:true});
 await actor(db,B);assert.equal((await rpc(db,'lists'))[0].mine,false);assert.equal((await rpc(db,'list_items',{list_id:list.id})).length,1);checks+=2;
 await actor(db,C);assert.equal((await rpc(db,'lists')).length,0);checks++;await reject(rpc(db,'list_items',{list_id:list.id}));
 await actor(db,A);await reject(rpc(db,'recommend',{friend_id:C,item_id:item}));await reject(rpc(db,'recommend',{friend_id:B,item_id:item,mensagem:'x'.repeat(241)}));
 const rec=(await rpc(db,'recommend',{friend_id:B,item_id:item,mensagem:'Vale a pena!'}))[0];await reject(rpc(db,'recommend',{friend_id:B,item_id:item}));
 await admin(db);assert.equal((await db.query('select * from notificacoes')).rows[0].referencia_id,rec.id);checks++;
 await actor(db,B);const recommendations=await rpc(db,'recommendations',{id:rec.id});assert.equal(recommendations.length,1);assert.equal(recommendations[0].received,true);checks+=2;
 await rpc(db,'recommendation_state',{id:rec.id,estado:'interesse'});const received=(await rpc(db,'create_list',{nome:'Indicações'}))[0];await rpc(db,'save_recommendation',{list_id:received.id,recommendation_id:rec.id});assert.equal((await rpc(db,'list_items',{list_id:received.id}))[0].titulo.nome,'Test <title>');checks++;
 await actor(db,C);assert.equal((await rpc(db,'recommendations')).length,0);checks++;await reject(rpc(db,'recommendation_state',{id:rec.id,estado:'dispensada'}));await reject(rpc(db,'save_recommendation',{list_id:received.id,recommendation_id:rec.id}));
 await actor(db,B);assert.equal((await rpc(db,'preferences'))[0].mensagens,true);checks++;let prefs={mensagens:false,social:false,amizades:false,indicacoes:false,progresso:false};await rpc(db,'save_preferences',prefs);
 await actor(db,B);assert.equal((await rpc(db,'preferences'))[0].social,false);checks++;
 await admin(db);const old=(await db.query('select count(*)::int n from notificacoes')).rows[0].n;
 for(const kind of ['chat_message','chat_group_message','social_post','social_like','social_comment','convite','group_invite','friend_recommendation','missao','conquista','nivel'])await db.query('insert into notificacoes(destinatario_id,tipo) values($1,$2)',[B,kind]);
 assert.equal((await db.query('select count(*)::int n from notificacoes')).rows[0].n,old);checks++;
 await db.query('insert into notificacoes(destinatario_id,tipo) values($1,$2)',[B,'sistema']);assert.equal((await db.query('select count(*)::int n from notificacoes')).rows[0].n,old+1);checks++;
 await actor(db,B);await reject(rpc(db,'save_preferences',{social:true}));await reject(db.query('select * from clt_notification_preferences'));await reject(db.query('select * from clt_friend_recommendations'));
 await actor(db,null);await reject(rpc(db,'lists'));await admin(db);await db.exec('set role anon');await reject(rpc(db,'lists'));await admin(db);
 await db.query('insert into bloqueios_clt values($1,$2)',[B,A]);await actor(db,B);assert.equal((await rpc(db,'lists')).length,1);assert.equal((await rpc(db,'recommendations')).length,0);checks+=2;await reject(rpc(db,'list_items',{list_id:list.id}));
 await actor(db,A);await reject(rpc(db,'recommend',{friend_id:B,item_id:item}));await rpc(db,'delete_list',{list_id:list.id});await admin(db);assert.equal((await db.query('select count(*)::int n from clt_custom_list_items where list_id=$1',[list.id])).rows[0].n,0);assert.equal((await db.query('select count(*)::int n from itens')).rows[0].n,1);checks+=2;
 await db.close();
}
console.log(`${checks} database privacy and behavior checks passed (numeric and UUID item IDs).`);
