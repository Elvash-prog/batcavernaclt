import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const db=new PGlite();let checks=0;
const A='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',C='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const file=fs.readdirSync('supabase/migrations').find(f=>f.endsWith('_profile_input_validation.sql'));
assert.ok(file);const migration=fs.readFileSync('supabase/migrations/'+file,'utf8');
await db.exec(`create role anon;create role authenticated;create schema auth;create schema clt_private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table perfis(id uuid primary key,nome text,bio text,avatar_url text,banner_url text,steam_id text,status_personalizado text,jogos_destaque jsonb,conquistas_destaque jsonb,titulo_destaque_nivel integer);
alter table perfis enable row level security;grant usage on schema auth to authenticated;
grant select,insert,update on perfis to authenticated;
create policy own on perfis to authenticated using(id=auth.uid()) with check(id=auth.uid());
insert into perfis(id,nome,bio,status_personalizado)values('${A}','Ana','','online'),('${C}','Legado',repeat('x',500),'online');
create function salvar_personalizacao_perfil_clt(p_nome text,p_bio text,p_banner_url text,p_status text,p_jogos_destaque jsonb,p_conquistas_destaque jsonb) returns setof perfis language sql security definer set search_path=public,pg_temp as $$
update perfis set nome=p_nome,bio=p_bio,banner_url=p_banner_url,status_personalizado=p_status,jogos_destaque=p_jogos_destaque,conquistas_destaque=p_conquistas_destaque where id=auth.uid() returning *$$;
create function salvar_personalizacao_perfil_clt(p_nome text,p_bio text,p_banner_url text,p_status text,p_titulo_destaque_nivel integer,p_jogos_destaque jsonb,p_conquistas_destaque jsonb) returns setof perfis language sql security definer set search_path=public,pg_temp as $$
update perfis set nome=p_nome,bio=p_bio,banner_url=p_banner_url,status_personalizado=p_status,titulo_destaque_nivel=p_titulo_destaque_nivel,jogos_destaque=p_jogos_destaque,conquistas_destaque=p_conquistas_destaque where id=auth.uid() returning *$$;`);
await db.exec(migration);await db.exec(migration);checks++;
async function actor(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
async function reject(query,params){await assert.rejects(db.query(query,params),error=>error.code==='23514');checks++;}
try{
 await actor(A);
 await db.query('update perfis set bio=$1,avatar_url=$2,banner_url=$3,steam_id=$4,jogos_destaque=$5::jsonb,conquistas_destaque=$6::jsonb where id=$7',[
  '🎮'.repeat(140),'https://example.test/avatar.jpg','https://example.test/banner.jpg#bc-cover=50,50,100','12345678901234567',JSON.stringify(Array.from({length:8},(_,i)=>'Jogo '+i)),'[0,1,30,31]',A]);checks++;
 for(const [field,bad] of [['nome',''],['nome',' '.repeat(5)],['nome','x'.repeat(41)],['nome','Ana'+' '.repeat(1000)],['bio','x'.repeat(281)],['steam_id','1'],['steam_id','1234567890123456x'],['status_personalizado','admin'],['titulo_destaque_nivel',-1],['titulo_destaque_nivel',10001]]){
  await reject('update perfis set '+field+'=$1 where id=$2',[bad,A]);
 }
 for(const field of ['avatar_url','banner_url'])for(const value of ['http://example.test/img','javascript:alert(1)','data:image/png,evil','https://user:password@example.test/img','https://','https://example.test/\nimage','https://example.test/'+ 'x'.repeat(2048)]){
  await reject('update perfis set '+field+'=$1 where id=$2',[value,A]);
 }
 for(const value of [{},null,Array(9).fill('Jogo'),[{}],[1],[''],['x'.repeat(241)],['Jogo'+' '.repeat(1000)]])await reject('update perfis set jogos_destaque=$1::jsonb where id=$2',[JSON.stringify(value),A]);
 for(const value of [{},null,[0,1,2,3,4],['1'],[null],[-1],[32],[0.5],[999999999999]])await reject('update perfis set conquistas_destaque=$1::jsonb where id=$2',[JSON.stringify(value),A]);
 for(const withTitle of [false,true]){
  const sql=withTitle?'select * from salvar_personalizacao_perfil_clt($1,$2,$3,$4,$5::integer,$6::jsonb,$7::jsonb)':'select * from salvar_personalizacao_perfil_clt($1,$2,$3,$4,$5::jsonb,$6::jsonb)';
  const params=['Ana','Bio válida','https://example.test/banner.jpg','online',...(withTitle?[1]:[]),'["Black","Horizon Zero Dawn"]','[0,31]'];
  await db.query(sql,params);checks++;
  const bad=[...params];bad[1]='x'.repeat(281);await reject(sql,bad);
 }
 await db.query('update perfis set jogos_destaque=null,conquistas_destaque=null,avatar_url=null,banner_url=$1,bio=$2,nome=$3 where id=$4',['',"Literal '); DROP TABLE perfis; --",'Ana',A]);
 assert.equal((await db.query('select bio from perfis where id=$1',[A])).rows[0].bio,"Literal '); DROP TABLE perfis; --");checks++;
 await actor(B);await reject('insert into perfis(id,nome,bio)values($1,$2,$3)',[B,'Bruno','x'.repeat(281)]);
 await db.query('insert into perfis(id,nome,bio)values($1,$2,$3)',[B,'Bruno','Bio']);checks++;
 await db.query('update perfis set bio=$1 where id=$2',['forged',A]);
 assert.equal((await db.query('select count(*)::integer n from perfis')).rows[0].n,1);checks++;
 await actor(C);await db.query("update perfis set status_personalizado='ausente' where id=$1",[C]);
 assert.equal((await db.query('select length(bio) n from perfis where id=$1',[C])).rows[0].n,500);checks++;
 await db.exec('reset role');
 const safe=(await db.query("select not prosecdef as invoker,proconfig from pg_proc where oid='clt_private.validate_profile_input()'::regprocedure")).rows[0];
 assert.equal(safe.invoker,true);assert.ok(safe.proconfig.includes('search_path=pg_catalog'));checks++;
 assert.equal((await db.query("select has_function_privilege('authenticated','clt_private.validate_profile_input()','EXECUTE') allowed")).rows[0].allowed,false);checks++;
 await db.exec('set role anon');await assert.rejects(db.query('update perfis set bio=$1',['forged']));checks++;
 console.log(checks+' isolated profile validation checks passed: REST writes, RPC overloads, RLS, boundaries and legacy preservation.');
}finally{await db.close();}
