begin;
set local role authenticated;
do $$begin
 begin perform public.clt_login_rate_limit(array_fill(repeat('a',64),array[4]));raise exception 'Rate RPC exposed';exception when insufficient_privilege then null;end;
 begin perform count(*) from clt_private.login_rate_windows;raise exception 'Rate counters exposed';exception when insufficient_privilege then null;end;
end$$;
reset role;
set local role service_role;
do $$declare i integer;keys text[];scope text;limit_value integer;begin
 foreach scope in array array['pair','account','source','global'] loop
  limit_value:=case scope when 'pair' then 10 when 'account' then 30 when 'source' then 60 else 300 end;
  for i in 1..limit_value+1 loop
   keys:=array[md5(scope||'a'||i)||md5('a'),md5(scope||'s'||i)||md5('s'),md5(scope||'p'||i)||md5('p'),md5(scope||'g')||md5('g')];
   if scope='pair' then keys[1]:=repeat('a',64);keys[2]:=repeat('b',64);keys[3]:=repeat('c',64);end if;
   if scope='account' then keys[1]:=repeat('d',64);end if;
   if scope='source' then keys[2]:=repeat('e',64);end if;
   if public.clt_login_rate_limit(keys) is distinct from (i<=limit_value) then raise exception 'Limit failed: % at %',scope,i;end if;
  end loop;
 end loop;
 -- Previous windows do not block the current minute.
 keys:=array[repeat('1',64),repeat('2',64),repeat('3',64),repeat('4',64)];
 insert into clt_private.login_rate_windows values(date_trunc('minute',now())-interval '1 minute',keys[4],301);
 if not public.clt_login_rate_limit(keys)then raise exception 'Window did not reset';end if;
end$$;
reset role;
rollback;
