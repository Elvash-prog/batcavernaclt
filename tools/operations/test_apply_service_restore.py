import contextlib
import io
import json
import os
import pathlib
import subprocess
import tempfile
import unittest
import uuid
from unittest.mock import patch

import apply_service_restore as apply
import backup
import prepare_service_restore as prepare
import test_prepare_service_restore as plan_tests


def fixture():
    sql, meta = plan_tests.ServiceRestorePlanTests().fixture()
    sql['schema.sql'] = sql['schema.sql'].replace('("note" text);', '("note" text UNIQUE);')
    return sql, meta


def write_plan(root, sql, meta):
    folder, output = root / 'backup', root / 'plan'
    folder.mkdir(); output.mkdir()
    for name, text in sql.items(): (folder / name).write_text(text, encoding='utf-8')
    backup.manifest(folder, 0)
    files, summary = prepare.prepare(sql, meta)
    for name, text in files.items(): (output / name).write_text(text, encoding='utf-8', newline='\n')
    summary['files'] = {name: backup.digest(output / name) for name in files}
    (output / 'plan.json').write_text(json.dumps(summary))
    return folder, output


class ServiceRestoreApplyTests(unittest.TestCase):
    def test_tampered_sql_is_refused_even_if_its_recorded_hash_is_updated(self):
        sql, meta = fixture()
        with tempfile.TemporaryDirectory() as temp:
            folder, output = write_plan(pathlib.Path(temp), sql, meta)
            (output / '03-data.sql').write_text('SELECT private_canary;')
            summary = json.loads((output / 'plan.json').read_text())
            summary['files']['03-data.sql'] = backup.digest(output / '03-data.sql')
            (output / 'plan.json').write_text(json.dumps(summary))
            with patch.object(prepare, 'catalog', return_value=meta), self.assertRaisesRegex(ValueError, 'alterado'):
                apply.validate_plan(folder, output)

    def test_default_invocation_does_not_execute_a_restore(self):
        sql, meta = fixture()
        with tempfile.TemporaryDirectory() as temp:
            folder, output = write_plan(pathlib.Path(temp), sql, meta)
            with patch.object(prepare, 'catalog', return_value=meta), patch.object(apply, 'run_restore') as run, patch('sys.argv', ['apply_service_restore.py', '--backup', str(folder), '--plan', str(output)]), contextlib.redirect_stdout(io.StringIO()) as captured:
                apply.main()
            run.assert_not_called()
            self.assertTrue(json.loads(captured.getvalue())['validated_only'])

    def test_transaction_controls_are_refused_outside_opaque_bodies_and_copy_rows(self):
        for text in ('COMMIT;\n', '\\connect another_database\n'):
            sql, meta = fixture()
            sql['data.sql'] += text
            with tempfile.TemporaryDirectory() as temp:
                folder, output = write_plan(pathlib.Path(temp), sql, meta)
                with patch.object(prepare, 'catalog', return_value=meta), self.assertRaisesRegex(ValueError, 'transacao'):
                    apply.validate_plan(folder, output)
        sql, meta = fixture()
        sql['data.sql'] = sql['data.sql'].replace('COPY "auth"."users" ("id") FROM stdin;\n\\.\nRESET ALL;', 'COMMIT;\n\\.\nRESET ALL;')
        with tempfile.TemporaryDirectory() as temp:
            folder, output = write_plan(pathlib.Path(temp), sql, meta)
            with patch.object(prepare, 'catalog', return_value=meta):
                files, _, counts = apply.validate_plan(folder, output)
            payload = apply.transaction_sql(files, counts)
            self.assertTrue(payload.startswith('BEGIN;'))
            self.assertLess(payload.rindex('\nCOMMIT;'), payload.index(apply.VALIDATION_PREFIX))

    def test_remote_error_is_saved_privately_but_never_echoed_in_report(self):
        canary = b'private-password-and-copy-canary'
        result = subprocess.CompletedProcess([], 3, stdout=b'', stderr=b'ERROR: 23503: foreign key error ' + canary)
        with tempfile.TemporaryDirectory() as temp:
            root = pathlib.Path(temp)
            report = apply.run_restore('BEGIN; SELECT 1; COMMIT;', root, runner=lambda *a, **kw: result)
            self.assertEqual(report['status'], 'failed')
            self.assertEqual(report['sqlstate'], '23503')
            self.assertNotIn(canary.decode(), json.dumps(report))
            self.assertEqual((root / 'psql.err.log').read_bytes(), result.stderr)
            if os.name != 'nt': self.assertEqual((root / 'psql.err.log').stat().st_mode & 0o777, 0o600)

    def test_success_without_post_commit_confirmation_is_not_claimed_as_committed(self):
        result = subprocess.CompletedProcess([], 0, stdout=b'', stderr=b'')
        with tempfile.TemporaryDirectory() as temp:
            report = apply.run_restore('', pathlib.Path(temp), runner=lambda *a, **kw: result)
            self.assertEqual(report['status'], 'confirmation_missing')


@unittest.skipUnless(os.environ.get('PG_CONTAINER'), 'disposable PG_CONTAINER required')
class ServiceRestoreTransactionTests(unittest.TestCase):
    def setUp(self):
        self.container = os.environ['PG_CONTAINER']
        self.database = 'restore_apply_' + uuid.uuid4().hex[:12]
        self.execute(['docker', 'exec', self.container, 'createdb', '-U', 'postgres', self.database])
        self.addCleanup(self.execute, ['docker', 'exec', self.container, 'dropdb', '-U', 'postgres', self.database])
        self.sql("""
DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF; END$$;
CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA supabase_functions;
CREATE TABLE auth.users(id uuid PRIMARY KEY, email text);
CREATE TABLE auth.sessions(id uuid);
CREATE TABLE storage.objects(id uuid CONSTRAINT native_fk REFERENCES auth.users(id));
CREATE TABLE storage.buckets(id text);
CREATE TABLE supabase_functions.hooks(id bigint PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT NULL::uuid$$;
CREATE FUNCTION storage.native_guard() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN NEW; END$$;
CREATE TRIGGER native_guard BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.native_guard();
""")

    def execute(self, args, data=None):
        result = subprocess.run(args, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.returncode: raise AssertionError(result.stderr.decode())  # Synthetic data only.
        return result.stdout

    def sql(self, text):
        return self.execute(['docker', 'exec', '-i', self.container, 'psql', '-X', '-qAt', '-U', 'postgres', '-d', self.database, '-v', 'ON_ERROR_STOP=1'], text.encode()).decode().strip()

    def runner(self, args, **kwargs):
        args = [self.container if arg == prepare.CONTAINER else arg for arg in args]
        args[args.index('-d') + 1] = self.database
        return subprocess.run(args, **kwargs)

    def payload(self, sql=None):
        sql = sql or fixture()[0]
        def catalog_command(args, data=None):
            if args[:2] == ['docker', 'inspect']:
                return json.dumps([{'State': {'Running': True}, 'NetworkSettings': {'Networks': {prepare.NETWORK: {}}}}]).encode()
            args = [self.container if arg == prepare.CONTAINER else arg for arg in args]
            args[args.index('-d') + 1] = self.database
            return self.execute(args, data)
        with patch.object(prepare, 'command', side_effect=catalog_command): meta = prepare.catalog()
        files, _ = prepare.prepare(sql, meta)
        _, counts, _, _ = prepare.filter_data(sql['data.sql'])
        return apply.transaction_sql(files, counts)

    def apply_payload(self, payload):
        with tempfile.TemporaryDirectory() as temp:
            return apply.run_restore(payload, pathlib.Path(temp), runner=self.runner)

    def assert_empty(self):
        self.assertEqual(self.sql("SELECT count(*) FROM auth.users"), '0')
        self.assertEqual(self.sql("SELECT count(*) FROM storage.objects"), '0')
        self.assertEqual(self.sql("SELECT count(*) FROM pg_tables WHERE schemaname='public'"), '0')
        self.assertEqual(self.sql("SELECT to_regprocedure('storage.custom_guard()') IS NULL"), 't')

    def test_import_commits_only_after_counts_and_native_fk_scans(self):
        report = self.apply_payload(self.payload())
        self.assertEqual(report, {'status': 'committed', 'tables_checked': 4, 'rows_checked': 3, 'foreign_keys_scanned': 2})
        self.assertEqual(self.sql('SELECT count(*) FROM auth.users'), '1')
        self.assertEqual(self.sql('SELECT count(*) FROM auth.sessions'), '0')
        self.assertEqual(self.sql('SELECT count(*) FROM public.profiles'), '1')
        with self.assertRaisesRegex(ValueError, 'ja contem'):
            self.payload()

    def test_native_fk_marked_valid_still_rejects_orphans_and_rolls_everything_back(self):
        self.assertEqual(self.sql("SELECT convalidated FROM pg_constraint WHERE conname='native_fk'"), 't')
        sql, _ = fixture()
        sql['data.sql'] = sql['data.sql'].replace('COPY "storage"."objects" ("id") FROM stdin;\n', 'COPY "storage"."objects" ("id") FROM stdin;\n22222222-2222-2222-2222-222222222222\n')
        report = self.apply_payload(self.payload(sql))
        self.assertEqual(report['status'], 'failed')
        self.assertEqual(report['sqlstate'], '23503')
        self.assert_empty()

    def test_late_sql_failure_rolls_schema_and_data_back(self):
        payload = self.payload().replace('CREATE TEMP TABLE __batcaverna_validation', 'SELECT 1/0;\nCREATE TEMP TABLE __batcaverna_validation')
        report = self.apply_payload(payload)
        self.assertEqual(report['status'], 'failed')
        self.assertEqual(report['sqlstate'], '22012')
        self.assert_empty()

    def test_truncated_input_never_auto_commits_or_reports_success(self):
        payload = self.payload().rsplit('\nCOMMIT;\n', 1)[0] + '\n'
        report = self.apply_payload(payload)
        self.assertEqual(report['status'], 'confirmation_missing')
        self.assert_empty()

    def test_match_full_detects_partial_nulls_in_a_validated_native_fk(self):
        self.sql("""
CREATE SCHEMA fk_probe;
CREATE TABLE fk_probe.parent(a integer,b integer,PRIMARY KEY(a,b));
CREATE TABLE fk_probe.child(a integer,b integer,FOREIGN KEY(a,b) REFERENCES fk_probe.parent(a,b) MATCH FULL);
SET session_replication_role=replica;
INSERT INTO fk_probe.child VALUES(1,NULL);
RESET ALL;
""")
        payload = 'BEGIN;\n' + apply.validation_sql({('fk_probe', 'child'): 1}) + '\nCOMMIT;\n' + apply.commit_report_sql()
        report = self.apply_payload(payload)
        self.assertEqual(report['status'], 'failed')
        self.assertEqual(report['sqlstate'], '23503')

if __name__ == '__main__': unittest.main()
