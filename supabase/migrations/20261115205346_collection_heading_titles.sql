create or replace function public.clt_save_desktop_layout(p_patch jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare me uuid:=auth.uid(); key text; value jsonb; removed text[]:='{}'; cleaned jsonb:='{}'; result jsonb;
begin
 if me is null or p_patch is null or jsonb_typeof(p_patch)<>'object' or octet_length(p_patch::text)>2097152 then raise exception 'Aparência inválida';end if;
 for key,value in select * from jsonb_each(p_patch) loop
  if key not in ('preset','bg','panel','accent','text','width','cardWidth','scale','cardFormat','background','compact','noAnimations','collectionTitles') then raise exception 'Configuração de aparência desconhecida';end if;
  if value='null'::jsonb then removed:=array_append(removed,key);continue;end if;
  if key in ('bg','panel','accent','text') and (jsonb_typeof(value)<>'string' or value#>>'{}' !~ '^#[a-fA-F0-9]{6}$') then raise exception 'Cor inválida';end if;
  if key='preset' and (jsonb_typeof(value)<>'string' or length(value#>>'{}')>40) then raise exception 'Tema inválido';end if;
  if key='cardFormat' and value#>>'{}' not in ('poster','landscape') then raise exception 'Formato inválido';end if;
  if key='background' and (jsonb_typeof(value)<>'string' or value#>>'{}' !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$') then raise exception 'Imagem de fundo inválida';end if;
  if key in ('compact','noAnimations') and jsonb_typeof(value)<>'boolean' then raise exception 'Preferência inválida';end if;
  if key in ('width','cardWidth','scale') then
   if jsonb_typeof(value)<>'number' then raise exception 'Dimensão inválida';end if;
   if (key='width' and (value#>>'{}')::numeric not between 1050 and 2600) or (key='cardWidth' and (value#>>'{}')::numeric not between 180 and 500) or (key='scale' and (value#>>'{}')::numeric not between 80 and 140) then raise exception 'Dimensão fora do limite';end if;
  end if;
  if key='collectionTitles' then
   if jsonb_typeof(value)<>'object' or octet_length(value::text)>4096 then raise exception 'Títulos de coleção inválidos';end if;
   if exists(select 1 from jsonb_each(value) as title(category,label)
      where category not in ('jogos','filmes','series','animes')
       or jsonb_typeof(label)<>'string'
       or char_length(label#>>'{}') not between 1 and 80
       or btrim(label#>>'{}')='') then raise exception 'Títulos de coleção inválidos';end if;
  end if;
  cleaned:=cleaned||jsonb_build_object(key,value);
 end loop;
 insert into public.clt_desktop_layout(user_id,layout) values(me,cleaned)
 on conflict(user_id) do update set layout=(public.clt_desktop_layout.layout-removed)||cleaned,updated_at=now()
 returning jsonb_build_object('layout',layout,'updated_at',updated_at) into result;
 return result;
end $$;
notify pgrst,'reload schema';
