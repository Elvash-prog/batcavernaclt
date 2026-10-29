import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync('supabase/migrations/20261028130000_steam_local_achievements.sql','utf8');
const rust=fs.readFileSync('desktop/src-tauri/src/steam_local.rs','utf8');
const main=fs.readFileSync('desktop/src-tauri/src/main.rs','utf8');
const ui=fs.readFileSync('desktop/src/redesign.js','utf8');
const reference=fs.readFileSync('desktop/src/reference.js','utf8');

assert.match(migration,/primary key \(user_id, steam_appid\)/);
assert.match(migration,/enable row level security/);
assert.match(migration,/auth\.uid\(\) = user_id/g);
assert.match(migration,/jsonb_array_length\(achievements\) <= 1000/);
assert.match(rust,/UserGameStats|achievement_progress\.json|librarycache/);
assert.match(rust,/permanent_snapshot_never_loses_an_unlock/);
assert.match(main,/steam_local_achievements/);
assert.match(ui,/Steam local salvo/);
assert.match(reference,/api\.localSteamAchievements\(appid\)/);
assert.match(reference,/steamAchievementPanel\(remote,local,localError,showLocal\)/);
assert.match(reference,/Cache local ainda não encontrado neste PC/);
console.log('Local Steam achievements persistence contract passed.');
