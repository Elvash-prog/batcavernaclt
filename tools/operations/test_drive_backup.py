import contextlib
import hashlib
import io
import pathlib
import tempfile
import unittest
from unittest.mock import Mock

import drive_backup as db


class DriveBackupTests(unittest.TestCase):
    def slot(self, number=1, date=None):
        return {'id': db.SLOTS[number - 1], 'name': f'BatCaverna-backup-slot-{number:02d}.txt',
                'mimeType': 'text/plain', 'parents': [db.FOLDER], 'trashed': False,
                'owners': [{'emailAddress': db.OWNER}],
                'appProperties': {} if date is None else {
                    'batcaverna_date': date, 'batcaverna_verified': 'true'}}

    def test_rejects_public_domain_external_and_unexpected_writer_access(self):
        owner = {'type': 'user', 'role': 'owner', 'emailAddress': db.OWNER}
        service = {'type': 'user', 'role': 'writer', 'emailAddress': db.SERVICE}
        db.private_permissions([owner, service])
        for extra in [{'type': 'anyone', 'role': 'reader'},
                      {'type': 'domain', 'role': 'reader', 'domain': 'example.invalid'},
                      {'type': 'user', 'role': 'reader', 'emailAddress': 'other@example.invalid'},
                      {**service, 'role': 'owner'}]:
            with self.subTest(extra=extra), self.assertRaises(RuntimeError):
                db.private_permissions([owner, extra])
        with self.assertRaises(RuntimeError):
            db.private_permissions([service])

    def test_rejects_changed_slot_identity_folder_owner_and_google_document(self):
        db.validate_slot(self.slot(), 1)
        for change in [{'id': 'different'}, {'parents': ['public-downloads']},
                       {'owners': [{'emailAddress': db.SERVICE}]}, {'trashed': True},
                       {'mimeType': 'application/vnd.google-apps.document'}, {'name': 'unrelated.gpg'}]:
            with self.subTest(change=change), self.assertRaises(RuntimeError):
                db.validate_slot({**self.slot(), **change}, 1)

    def test_rotation_fills_empty_then_oldest_and_skips_same_day(self):
        slots = [self.slot(i, f'2026-10-{i:02d}') for i in range(1, 8)]
        self.assertEqual(db.select_slot(slots, '2026-10-24')['id'], db.SLOTS[0])
        slots[4] = self.slot(5)
        self.assertEqual(db.select_slot(slots, '2026-10-24')['id'], db.SLOTS[4])
        slots[2] = self.slot(3, '2026-10-24')
        self.assertIsNone(db.select_slot(slots, '2026-10-24'))

    def test_upload_location_rejects_credential_forwarding(self):
        drive = db.Drive('synthetic-token')
        drive.opener = Mock()
        for url in ['https://attacker.invalid/upload/drive/v3/files/x',
                    'http://www.googleapis.com/upload/drive/v3/files/x',
                    'https://www.googleapis.com@attacker.invalid/upload/drive/v3/files/x',
                    'https://www.googleapis.com/other/path']:
            with self.subTest(url=url), self.assertRaises(RuntimeError):
                drive.open(url)
        drive.opener.open.assert_not_called()

    def test_upload_marks_verified_only_after_matching_remote_download(self):
        class FakeDrive(db.Drive):
            def __init__(self, corrupt):
                self.corrupt = corrupt
                self.marked = []
                self.remote = b''

            @contextlib.contextmanager
            def open(self, url, method='GET', body=None, headers=None):
                response = io.BytesIO(b'{}')
                if method == 'PATCH':
                    response.headers = {'Location': 'https://www.googleapis.com/upload/drive/v3/files/test?upload_id=synthetic'}
                elif method == 'PUT':
                    self.remote = body.read()
                else:
                    response = io.BytesIO(self.remote + (b'corruption' if self.corrupt else b''))
                yield response

            def permissions(self, identity):
                pass

            def json(self, path, method='GET', body=None):
                self.marked.append(body)

        with tempfile.TemporaryDirectory() as folder:
            archive = pathlib.Path(folder) / 'synthetic.tar.gz.gpg'
            archive.write_bytes(b'synthetic ciphertext fixture')
            drive = FakeDrive(False)
            result = drive.upload(archive, self.slot(), '2026-10-24')
            self.assertTrue(result['download_verified'])
            self.assertEqual(result['sha256'], hashlib.sha256(archive.read_bytes()).hexdigest())
            self.assertEqual(drive.marked[0]['appProperties']['batcaverna_verified'], 'true')
            drive = FakeDrive(True)
            with self.assertRaises(RuntimeError):
                drive.upload(archive, self.slot(), '2026-10-24')
            self.assertEqual(drive.marked, [])


if __name__ == '__main__':
    unittest.main()
