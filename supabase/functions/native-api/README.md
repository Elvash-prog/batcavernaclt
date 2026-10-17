# Native API

The game catalog is IGDB. `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET` are Supabase Edge Function secrets; Twitch tokens are obtained and refreshed only on the server. TMDB and existing moderation secrets remain unchanged.

`/api/catalog/igdb/games` supports bounded search, recommendation pagination and `/games/{id}` details. Responses use the existing client field names with explicit `source: igdb`, `igdb_id`, portrait `cover_image` and landscape `background_image`. The legacy `/rawg/games` route is an IGDB alias for installed clients; there are no RAWG API calls or RAWG_KEY reads. Existing saved RAWG image URLs remain readable so library covers are not erased. Library IDs, ratings, hours and progress are unchanged. No destructive database migration is needed.

Every catalog query validates the Supabase user and shared user rate limit. Twitch credentials never enter client bundles. Queries use fixed endpoints/fields and escaped search literals; caches and single-flight token renewal reduce upstream calls. Requests are paced inside each isolate; upstream 429s are handled with bounded backoff across isolates. Mature sexual content is filtered on the server from themes, ratings, content descriptions and titles.

`/health` reports configuration booleans and the result of a one-time per-isolate IGDB connection probe. A true `igdbConnected` confirms a real IGDB query succeeded without disclosing credentials.
