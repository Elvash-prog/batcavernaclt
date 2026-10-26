import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';import assert from 'node:assert/strict';
for(const existing of [false,true]){
const db=new PGlite(),a='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',b='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',session='cccccccc-cccc-4ccc-cccc-cccccccccccc';
await db.exec(`create role authenticated;create role anon;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create table public.itens(id bigint primary key,user_id uuid references auth.users(id),categoria text,steam_appid bigint,loja text,horas numeric);grant select,update on public.itens to authenticated;alter table public.itens enable row level security;create policy own_items on public.itens for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());insert into auth.users values('${a}'),('${b}');insert into itens values(1,'${a}','jogos',1174180,'Steam',10),(2,'${a}','jogos',null,'Outra',0),(3,'${b}','jogos',null,'Outra',0);`);
if(existing)await db.exec(fs.readFileSync('supabase/migrations/20261018124614_native_progress_tracking.sql','utf8'));
const sql=fs.readFileSync('supabase/migrations/20261026090000_explicit_executable_playtime.sql','utf8');await db.exec(sql);await db.exec(sql);
async function actor(){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${a}',false);set role authenticated`)}
async function advance(){await db.exec("reset role;update clt_pc_play_clock set last_ping=now()-interval '30 seconds'");await actor()}
async function tick(id,seconds,s=session){return Number((await db.query('select clt_record_pc_play($1,$2,$3) hours',[id,s,seconds])).rows[0].hours)}
await actor();assert.equal(await tick(1,0),10);await advance();assert.ok(Math.abs(await tick(1,30)-(10+30/3600))<1e-9);
const hours=await tick(1,30);assert.equal(await tick(1,30),hours);assert.equal(await tick(1,15),hours);
assert.equal(await tick(1,40,'dddddddd-dddd-4ddd-dddd-dddddddddddd'),hours);
await assert.rejects(tick(3,30));await assert.rejects(tick(1,-1));
assert.equal(await tick(2,0),0);await advance();assert.ok(Math.abs(await tick(2,30)-30/3600)<1e-9);
await db.exec('reset role;set role anon');await assert.rejects(tick(1,60));await db.close();console.log('PC time: Steam and other stores, retries, concurrency and ownership passed.');

}
