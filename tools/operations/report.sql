-- Run as project administrator in SQL Editor; no user-level records are selected.
select date_trunc('day',hour) as day,service,route,sum(requests) as completed_requests,
 round(sum(total_ms)::numeric/nullif(sum(requests),0),1) as mean_ms,max(max_ms) as max_ms,sum(slow_requests) as above_1_second
from public.clt_operational_metrics
where hour>=now()-interval '7 days'
group by 1,2,3 order by 1 desc,2,3;
-- cache layer events are separate counters, not additional user requests.
select count(*) as cache_entries,coalesce(sum(octet_length(payload::text)),0) as cache_bytes from public.clt_catalog_cache;
select pg_database_size(current_database()) as database_bytes;
select count(*) as storage_objects,coalesce(sum(case when metadata->>'size'~'^[0-9]+$' then(metadata->>'size')::bigint else 0 end),0)as storage_bytes from storage.objects;
