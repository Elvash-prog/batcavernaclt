import {PGlite} from '@electric-sql/pglite';import fs from 'node:fs';import assert from 'node:assert/strict';
const A='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const migration=fs.readFileSync(fs.existsSync('supabase/patch-1.2.0-progresso-estatisticas.sql')?'supabase/patch-1.2.0-progresso-estatisticas.sql':'releases/BatCaverna-1.2.0-Supabase.sql','utf8');let checks=0;
for(const type of ['bigint','uuid']){
 const db=new PGlite();await db.exec(`create role authenticated;create role anon;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 create table itens(id ${type} primary key,user_id uuid,nome text,categoria text,tipo text,status text,horas numeric,data date);insert into auth.users values('${A}'),('${B}');`);
 await db.exec(migration);await db.exec(migration);
 const ids=type==='bigint'?['1','2','3','4','5','6']:Array.from({length:6},(_,i)=>`dddddddd-dddd-4ddd-addd-${String(i+1).padStart(12,'0')}`);
 const month=(await db.query("select to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM') m")).rows[0].m;
 for(const [i,name,category,kind,status,hours,date] of [[0,'Série','filmes','📺 Série','📺 Assistindo',null,null],[1,'Anime','filmes','🍥 Anime','✅ Assistido',null,month+'-01'],[2,'Filme','filmes','🎬 Filme','❤️ Favorito',null,null],[3,'Jogo','jogos',null,'🏆 100% (Platina)',25.5,month+'-01'],[4,'Outro','jogos',null,'📌 Backlog',4,null],[5,'Outro usuário','jogos',null,'✅ Zerado',1000,month+'-01']])await db.query('insert into itens values($1,$2,$3,$4,$5,$6,$7,$8)',[ids[i],i===5?B:A,name,category,kind,status,hours,date]);
 async function actor(u){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[u||'']);await db.exec('set role authenticated');}
 async function rpc(a,d={}){return (await db.query('select clt_journey($1,$2::jsonb) r',[a,JSON.stringify(d)])).rows[0].r;}
 async function rejected(p){await assert.rejects(p);checks++;}
 await actor(A);let p=(await rpc('progress',{item_id:ids[0]}))[0];assert.equal(p.temporada,1);assert.equal(p.episodio,0);assert.equal(p.revision,0);checks+=3;
 p=(await rpc('save_progress',{item_id:ids[0],revision:0,temporada:2,episodio:3,total:4}))[0];assert.equal(p.temporada,2);assert.equal(p.episodio,3);checks+=2;
 await rejected(rpc('next_episode',{item_id:ids[0],revision:0}));p=(await rpc('next_episode',{item_id:ids[0],revision:1}))[0];assert.equal(p.episodio,4);checks++;
 await rejected(rpc('next_episode',{item_id:ids[0],revision:2}));p=(await rpc('next_season',{item_id:ids[0],revision:2}))[0];assert.equal(p.temporada,3);assert.equal(p.episodio,0);assert.equal(p.total,null);checks+=3;
 await rejected(rpc('save_progress',{item_id:ids[0],revision:3,temporada:0,episodio:0}));await rejected(rpc('save_progress',{item_id:ids[0],revision:3,temporada:1,episodio:5,total:2}));await rejected(rpc('next_episode',{item_id:ids[0]}));
 await rejected(rpc('progress',{item_id:ids[2]}));await rejected(rpc('progress',{item_id:ids[3]}));await rejected(rpc('progress',{item_id:ids[5]}));
 assert.equal((await rpc('progress',{item_id:ids[1]}))[0].nome,'Anime');checks++;
 const s=(await rpc('stats'))[0];assert.equal(s.total,5);assert.equal(s.concluidos,3);assert.equal(s.horas,29.5);assert.equal(s.sem_data,1);assert.equal(s.months.length,12);assert.deepEqual([s.jogos,s.filmes,s.series,s.animes],[2,1,1,1]);const current=s.months.find(m=>m.mes===month);assert.deepEqual([current.jogos,current.midias],[1,1]);checks+=7;
 await actor(B);await rejected(rpc('progress',{item_id:ids[0]}));assert.equal((await rpc('stats'))[0].total,1);checks++;await rejected(db.query('select * from clt_episode_progress'));
 await actor(null);await rejected(rpc('stats'));await db.exec('reset role;set role anon');await rejected(rpc('stats'));await db.exec('reset role');
 await db.exec(migration);await actor(A);assert.equal((await rpc('progress',{item_id:ids[0]}))[0].episodio,0);checks++;
 await db.exec('reset role');await db.query('delete from itens where id=$1',[ids[0]]);assert.equal((await db.query('select count(*)::int n from clt_episode_progress where item_id=$1',[ids[0]])).rows[0].n,0);checks++;
 // The aggregate must include libraries larger than the client pagination defaults.
 await db.exec(`insert into itens(id,user_id,nome,categoria,status,horas) select ${type==='bigint'?'100+i':'gen_random_uuid()'},'${A}','Bulk','jogos','✅ Zerado',1 from generate_series(1,1200) i`);await actor(A);assert.equal((await rpc('stats'))[0].total,1204);checks++;
 await db.close();
}
console.log(`${checks} episode privacy/concurrency, statistics and migration checks passed.`);
