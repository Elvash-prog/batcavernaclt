"""Apply only the reviewed local Steam achievement migration."""
import os, pathlib, subprocess, tempfile

version = "20261028130000"
name = "steam_local_achievements"
sql = pathlib.Path(f"supabase/migrations/{version}_{name}.sql").read_text()
password = os.environ.get("SUPABASE_DB_PASSWORD", "")
if not password or not os.environ.get("SUPABASE_ACCESS_TOKEN"):
    raise SystemExit("The configured Supabase project connection is incomplete.")
linked = subprocess.run(["supabase", "link", "--project-ref", "luoqlhgfmixvfqbfcdoc"], capture_output=True, text=True)
if linked.returncode:
    raise SystemExit("Unable to link the configured Supabase project; check the project connection credentials.")
url = pathlib.Path("supabase/.temp/pooler-url").read_text().strip()
history = sql.replace("'", "''")
query = (
    "begin read write;\n" + sql +
    f"\ndo $history$ begin if to_regclass('supabase_migrations.schema_migrations') is not null then "
    f"insert into supabase_migrations.schema_migrations(version,name,statements) values('{version}','{name}',ARRAY['{history}']) "
    "on conflict(version) do nothing; end if; end $history$;\ncommit;"
)
with tempfile.NamedTemporaryFile(mode="w", suffix=".sql") as script:
    script.write(query); script.flush()
    result = subprocess.run(
        ["psql", "-X", "--dbname", url, "--set", "ON_ERROR_STOP=1", "--quiet", "--file", script.name],
        env={**os.environ, "PGPASSWORD": password, "PGSSLMODE": "require", "PGAPPNAME": "batcaverna-steam-local-migration"},
        capture_output=True, text=True,
    )
    if result.returncode:
        detail = result.stderr.replace(password, "[redacted]").replace(url, "[connection]")[-1500:]
        raise SystemExit("Database migration failed: " + detail)
print("Local Steam achievement migration applied successfully.")
