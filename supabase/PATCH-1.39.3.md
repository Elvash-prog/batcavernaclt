# Patch 1.39.3 — bright-api

The old supplied function performed provider calls without validating a user session and accepted unbounded cover batches. This version validates the bearer token against Supabase Auth before calling any provider. It does not accept the anonymous project API key as a user identity.

## Apply in Supabase

1. Execute `patch-1.39.3-bright-api.sql` in SQL Editor. Its final three checks must return `true`.
2. Open **Edge Functions → bright-api → Code**. Replace `index.ts` with `functions/bright-api/index.ts`, then deploy the function under its existing name **bright-api**.
3. Preserve the existing `SGDB_KEY` and `STEAM_KEY` secrets. The code uses Supabase's built-in `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`; do not put their values in source code.
4. Keep gateway JWT verification enabled when it works with the project's signing keys. This code independently verifies every request through `/auth/v1/user`; do not remove that validation.

GitHub/Cloudflare builds do not execute this SQL or deploy this Supabase function. These dashboard steps are required. Keep the existing function source for rollback; the new SQL does not alter existing app tables or helpers. Deploying the function before its SQL causes protected calls to return 503.

## Behavior

- Origin is restricted to the production site; requests without Origin still need a valid user token. CORS is not authentication.
- POST JSON only, maximum 16 KiB, known operations only, validated numeric game IDs, Steam IDs, names and bounded arrays.
- Shared database limits, serialized per user: 120 requests/600 provider credits per minute, 6,000 requests/12,000 credits per UTC day. Large batches consume more credits. There are two limit rows per account and deleting an Auth account deletes its counters.
- The rate RPC is executable only by service_role. Failure of authentication or the limit backend blocks provider calls.
- Upstream requests have timeouts, fixed destinations and no redirects. Responses are not cached and raw provider errors/keys are not returned or logged.
- SteamGridDB searches retain `nsfw=false` and explicitly flagged adult covers are skipped. Steam/Epic titles and Steam descriptor notes have a conservative explicit-content text filter. This is not visual moderation and does not guarantee that all adult catalogue media is detected. The existing upload moderation remains separate.
- Steam profile names/avatar URLs come from Steam; this patch does not prove ownership of a linked Steam account or change its public visibility. It does not expose private Steam libraries.

## Verify

Offline: `node tests/bright-api-security.mjs` (Node 24.19+). The checks simulate Auth, RPC and providers; they do not execute the SQL in a database or make live provider requests.

After deploying: log in, search/add a game, view the Steam tab, check friends playing and open achievements. A request without a valid user bearer token must be rejected (401, or gateway rejection). If all searches return 503, check SQL installation and Supabase function secrets without sharing secret values.
