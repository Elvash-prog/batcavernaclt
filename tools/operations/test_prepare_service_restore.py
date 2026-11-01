import copy
import json
import os
import subprocess
import uuid
import pathlib
import tempfile
import unittest
from unittest.mock import patch

import backup
import prepare_service_restore as plan


class ServiceRestorePlanTests(unittest.TestCase):
    def fixture(self):
        managed = '''CREATE TABLE IF NOT EXISTS "auth"."users" (
    "id" "uuid" NOT NULL,
    "email" "text"
);
CREATE TABLE IF NOT EXISTS "auth"."sessions" (
    "id" "uuid" NOT NULL
);
CREATE TABLE IF NOT EXISTS "storage"."objects" (
    "id" "uuid" NOT NULL
);
CREATE OR REPLACE FUNCTION "auth"."uid"() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid; $$;
CREATE OR REPLACE FUNCTION "storage"."custom_guard"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION "storage"."custom_guard"() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "storage"."custom_guard"() TO "authenticated";
CREATE TRIGGER "native_guard" BEFORE INSERT ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."native_guard"();
CREATE TRIGGER "custom_guard" BEFORE INSERT ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."custom_guard"();
CREATE POLICY "own_object" ON "storage"."objects" TO "authenticated" USING (true);
ALTER TABLE ONLY "storage"."objects" ADD CONSTRAINT "native_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");
GRANT SELECT ON TABLE "storage"."objects" TO "authenticated";
'''
        functions = '''CREATE TABLE IF NOT EXISTS "supabase_functions"."hooks" (
    "id" bigint NOT NULL
);
CREATE OR REPLACE FUNCTION "supabase_functions"."http_request"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION "supabase_functions"."http_request"() FROM PUBLIC;
'''
        data = '''SET session_replication_role = replica;
COPY "auth"."users" ("id", "email") FROM stdin;
11111111-1111-1111-1111-111111111111\tsynthetic@example.invalid
\\.
COPY "auth"."sessions" ("id") FROM stdin;
secret-session-canary
\\.
COPY "storage"."objects" ("id") FROM stdin;
\\.
COPY "supabase_functions"."hooks" ("id") FROM stdin;
1
\\.
COPY "public"."profiles" ("note") FROM stdin;
COPY "auth"."users" ("id") FROM stdin;
\\.
RESET ALL;
'''
        public = '''CREATE TABLE "public"."profiles" ("note" text);
CREATE OR REPLACE FUNCTION "public"."callback"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM ';'; RETURN NEW; END; $$;
CREATE TRIGGER "profile_hook" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."callback"();
CREATE POLICY "own_profile" ON "public"."profiles" USING (true);
ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "app_fk" FOREIGN KEY ("note") REFERENCES "public"."profiles"("note");
'''
        sql = {'schema.sql': public, 'managed_schema.sql': managed, 'functions_schema.sql': functions, 'data.sql': data}
        columns = []
        for (schema, name, col), kind in plan.source_columns(managed + '\n' + functions).items():
            columns.append({'schema': schema, 'name': name, 'col': col, 'type': kind, 'required': False})
        meta = {'empty': True, 'columns': columns, 'functions': [['auth', 'uid']], 'triggers': [['storage', 'objects', 'native_guard']], 'policies': [], 'fks': [{'schema': 'storage', 'name': 'objects', 'constraint': 'native_fk', 'definition': 'FOREIGN KEY (id) REFERENCES auth.users(id)'}]}
        return sql, meta

    def test_plan_separates_dependencies_and_preserves_platform_definitions(self):
        sql, meta = self.fixture()
        files, report = plan.prepare(sql, meta)
        self.assertNotIn('CREATE TRIGGER', files['02-schema-pre.sql'])
        self.assertNotIn('CREATE POLICY', files['02-schema-pre.sql'])
        self.assertNotIn('FOREIGN KEY', files['02-schema-pre.sql'])
        self.assertIn("PERFORM ';'; RETURN NEW", files['02-schema-pre.sql'])
        self.assertIn('"profile_hook"', files['04-schema-post.sql'])
        self.assertIn('"custom_guard"', files['04-schema-post.sql'])
        self.assertIn('"own_object"', files['04-schema-post.sql'])
        self.assertNotIn('CREATE TABLE IF NOT EXISTS "auth"', files['02-schema-pre.sql'])
        self.assertNotIn('FUNCTION "auth"."uid"', files['02-schema-pre.sql'])
        self.assertNotIn('"native_guard"', files['04-schema-post.sql'])
        self.assertEqual(report['native_triggers_preserved'], 1)
        self.assertEqual(report['native_fks_preserved'], 1)
        self.assertIn('REVOKE ALL ON FUNCTION "storage"."custom_guard"() FROM PUBLIC', files['02-schema-pre.sql'])
        self.assertIn('GRANT EXECUTE ON FUNCTION "storage"."custom_guard"()', files['02-schema-pre.sql'])
        self.assertIn('http_request', files['01-functions.sql'])

    def test_auth_sessions_are_omitted_and_sql_looking_copy_values_remain_opaque(self):
        sql, meta = self.fixture()
        files, report = plan.prepare(sql, meta)
        self.assertNotIn('secret-session-canary', files['03-data.sql'])
        self.assertNotIn('secret-session-canary', json.dumps(report))
        self.assertEqual(report['auth_tables_omitted'], ['auth.sessions'])
        self.assertEqual(report['auth_rows_omitted'], 1)
        self.assertEqual(report['expected_counts']['public.profiles'], 1)
        self.assertEqual(report['expected_counts']['auth.users'], 1)
        self.assertIn('COPY "auth"."users" ("id") FROM stdin;', files['03-data.sql'])

    def test_refuses_nonempty_destination_missing_columns_different_types_and_required_extras(self):
        for case in ('nonempty', 'missing', 'type', 'extra'):
            with self.subTest(case=case):
                sql, meta = self.fixture()
                if case == 'nonempty': meta['empty'] = False
                if case == 'missing': meta['columns'].pop(0)
                if case == 'type': meta['columns'][0]['type'] = 'integer'
                if case == 'extra': meta['columns'].append({'schema': 'auth', 'name': 'users', 'col': 'new_required', 'type': 'text', 'required': True})
                with self.assertRaises(ValueError): plan.prepare(sql, meta)

    def test_refuses_native_policy_and_fk_conflicts(self):
        for case in ('policy', 'fk'):
            sql, meta = self.fixture()
            if case == 'policy': meta['policies'] = [['storage', 'objects', 'own_object']]
            else: meta['fks'][0]['definition'] += ' ON DELETE CASCADE'
            with self.subTest(case=case), self.assertRaisesRegex(ValueError, 'conflito'):
                plan.prepare(sql, meta)

    def test_refuses_truncated_and_duplicate_copy_sections(self):
        sql, _ = self.fixture()
        with self.assertRaisesRegex(ValueError, 'terminador'):
            plan.filter_data('COPY "auth"."users" ("id") FROM stdin;\nno terminator\n')
        with self.assertRaisesRegex(ValueError, 'duplicada'):
            plan.filter_data(sql['data.sql'] + sql['data.sql'])

    def test_parser_handles_dump_type_modifiers_and_quotes(self):
        source = '''CREATE TABLE "auth"."probe" (
    "id" "uuid" NOT NULL,
    "label" character varying(255),
    "at" timestamp with time zone DEFAULT "now"(),
    "flags" "text"[],
    "value" numeric(10,2)
);'''
        result = plan.source_columns(source)
        self.assertEqual(list(result.values()), ['uuid', 'character varying(255)', 'timestamp with time zone', 'text[]', 'numeric(10,2)'])

    def test_extracted_manifest_is_checked_before_planning(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = pathlib.Path(temp)
            sql, _ = self.fixture()
            for name, text in sql.items(): (folder / name).write_text(text)
            backup.manifest(folder, 0)
            self.assertEqual(plan.verify_folder(folder)['format'], 2)
            (folder / 'data.sql').write_text('private-canary-corruption')
            with self.assertRaises(ValueError) as error: plan.verify_folder(folder)
            self.assertNotIn('private-canary', str(error.exception))

    def test_catalog_rejects_original_or_unisolated_container_before_any_sql(self):
        for running, networks in ((False, {plan.NETWORK: {}}), (True, {'bridge': {}}), (True, {plan.NETWORK: {}, 'other': {}})):
            inspection = [{'State': {'Running': running}, 'NetworkSettings': {'Networks': networks}}]
            with patch.object(plan, 'command', return_value=json.dumps(inspection).encode()) as command:
                with self.assertRaises(ValueError): plan.catalog()
                command.assert_called_once_with(['docker', 'inspect', plan.CONTAINER])

class ServiceRestoreCatalogTests(unittest.TestCase):
    @unittest.skipUnless(os.environ.get('PG_CONTAINER'), 'disposable PG_CONTAINER required')
    def test_real_catalog_query_and_plan_are_read_only(self):
        container = os.environ['PG_CONTAINER']
        database = 'restore_plan_' + uuid.uuid4().hex[:12]
        def run(args, data=None):
            result = subprocess.run(args, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if result.returncode:
                raise AssertionError(result.stderr.decode())  # Synthetic database only.
            return result.stdout
        run(['docker', 'exec', container, 'createdb', '-U', 'postgres', database])
        try:
            bootstrap = b"""
CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA supabase_functions;
CREATE TABLE auth.users(id uuid PRIMARY KEY, email text);
CREATE TABLE auth.sessions(id uuid);
CREATE TABLE storage.objects(id uuid CONSTRAINT native_fk REFERENCES auth.users(id));
CREATE TABLE storage.buckets(id text);
CREATE TABLE supabase_functions.hooks(id bigint);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT NULL::uuid$$;
CREATE FUNCTION storage.native_guard() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN NEW; END$$;
CREATE TRIGGER native_guard BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.native_guard();
"""
            run(['docker', 'exec', '-i', container, 'psql', '-X', '-q', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1'], bootstrap)
            def local_command(args, data=None):
                if args[:2] == ['docker', 'inspect']:
                    return json.dumps([{'State': {'Running': True}, 'NetworkSettings': {'Networks': {plan.NETWORK: {}}}}]).encode()
                self.assertTrue(data.lstrip().startswith(b'SELECT'))
                args = [container if arg == plan.CONTAINER else arg for arg in args]
                args[args.index('-d') + 1] = database
                return run(args, data)
            with patch.object(plan, 'command', side_effect=local_command):
                before = plan.catalog()
                sql, _ = ServiceRestorePlanTests().fixture()
                files, report = plan.prepare(sql, before)
                after = plan.catalog()
            self.assertEqual(before, after)
            self.assertTrue(report['preparation_only'])
            self.assertIn('auth.sessions', report['auth_tables_omitted'])
            self.assertEqual(len(files), 4)
        finally:
            run(['docker', 'exec', container, 'dropdb', '-U', 'postgres', database])

if __name__ == '__main__': unittest.main()
