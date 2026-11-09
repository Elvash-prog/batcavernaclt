import base64
import copy
import hashlib
import json
from pathlib import Path
import unittest
from unittest.mock import patch
import delivery as d

DOC = '''<html><a class="download-option" href="https://old.example/windows"><svg></svg><span><strong>Windows</strong><small>Versão 0.17.99 · Instalador .exe</small></span></a>
<a class="download-option android" href="https://old.example/android"><small>Versão 1.7.40 · Arquivo APK</small></a>
<a href="/privacidade">Privacidade</a></html>'''
IDS = {'windows': 'windows_fixture_id', 'signature': 'signature_fixture_id', 'android': 'android_fixture_id'}


class Fixture(d.Client):
    def __init__(self):
        super().__init__('Elvash-prog/batcavernaclt', 'test-token', 'test-drive-token')
        self.windows = b'MZ-Windows-fixture'
        self.signature = base64.b64encode(b'fixture-signature-' * 10) + b'\n'
        self.apk = b'PK-Android-fixture'
        self.feeds = {}
        self.bodies = {}
        self.promoted = False
        self.rows = []
        for platform, ver in [('windows', '0.17.113'), ('android', '1.7.58')]:
            tag = d.PREFIX[platform] + ver
            base = f'https://github.com/{self.repository}/releases/download/{tag}/'
            if platform == 'windows':
                feed = {'version': ver, 'platforms': {'windows-x86_64': {
                    'url': base + 'BatCaverna-CLT-Windows-setup.exe', 'signature': self.signature.decode().strip()}}}
                bodies = {'BatCaverna-CLT-Windows-setup.exe': self.windows,
                          'BatCaverna-CLT-Windows-setup.exe.sig': self.signature,
                          'latest.json': json.dumps(feed).encode()}
            else:
                feed = {'versionName': ver, 'versionCode': 105, 'url': base + f'BatCaverna-{ver}.apk',
                        'sha256': hashlib.sha256(self.apk).hexdigest()}
                bodies = {f'BatCaverna-{ver}.apk': self.apk, 'android-update.json': json.dumps(feed).encode()}
            self.feeds[platform] = feed
            assets = []
            for name, body in bodies.items():
                self.bodies[base + name] = body
                assets.append({'id': len(self.bodies), 'name': name, 'size': len(body),
                               'browser_download_url': base + name,
                               'digest': 'sha256:' + hashlib.sha256(body).hexdigest()})
            self.rows.append({'id': len(self.rows) + 1, 'tag_name': tag, 'assets': assets})
        self.files = {IDS['windows']: self.meta(self.windows, 'Windows.exe'),
                      IDS['signature']: self.meta(self.signature, 'Windows.exe.sig'),
                      IDS['android']: self.meta(self.apk, 'BatCaverna-1.7.58.apk')}

    @staticmethod
    def meta(body, name):
        return {'size': str(len(body)), 'md5Checksum': hashlib.md5(body).hexdigest(), 'name': name}

    def releases(self):
        return self.rows

    def asset(self, asset, url, limit):
        return self.bodies[url]

    def drive(self, file_id):
        return self.files[file_id]

    def latest(self):
        return {'tag_name': 'android-v1.7.58'}

    def promote_windows(self, release_id):
        self.promoted = True

    def public(self, url, limit=1_048_576):
        if '/releases/latest/download/latest.json' in url:
            return json.dumps(self.feeds['windows']).encode()
        if url.startswith('https://drive.usercontent.google.com/'):
            return self.windows
        return self.bodies[url]


class DeliveryTests(unittest.TestCase):
    def test_separate_channels_ignore_global_latest_and_sort_versions_numerically(self):
        f = Fixture()
        f.rows.extend([{'id': 9, 'tag_name': 'desktop-v0.17.9'},
                       {'id': 10, 'tag_name': 'desktop-v99.0.0', 'draft': True},
                       {'id': 11, 'tag_name': 'android-v99.0.0', 'prerelease': True}])
        self.assertEqual(d.choose(f.rows, 'windows')['tag_name'], 'desktop-v0.17.113')
        self.assertEqual(d.choose(f.rows, 'android')['tag_name'], 'android-v1.7.58')

    def test_verified_delivery_repairs_channel_and_updates_only_download_cards(self):
        f = Fixture()
        report, document = d.prepare(f, IDS, DOC)
        self.assertTrue(f.promoted)
        d.verify_site(document, report)
        self.assertIn('<a href="/privacidade">Privacidade</a>', document)
        self.assertIn('&amp;export=download', document)
        self.assertEqual(document, d.update_site(document, report))

    def test_corrupt_drive_file_blocks_promotion_and_site_publication(self):
        f = Fixture()
        f.files[IDS['android']]['md5Checksum'] = 'wrong'
        with self.assertRaisesRegex(d.DeliveryError, 'checksum mismatch'):
            d.prepare(f, IDS, DOC)
        self.assertFalse(f.promoted)

    def test_signature_must_match_both_feed_and_drive(self):
        f = Fixture()
        f.feeds['windows']['platforms']['windows-x86_64']['signature'] = 'wrong'
        url = next(url for url in f.bodies if url.endswith('/latest.json'))
        f.bodies[url] = json.dumps(f.feeds['windows']).encode()
        with self.assertRaisesRegex(d.DeliveryError, 'signature differs'):
            d.prepare(f, IDS, DOC)
        f = Fixture()
        f.files[IDS['signature']]['size'] = '1'
        with self.assertRaisesRegex(d.DeliveryError, 'Drive size mismatch'):
            d.prepare(f, IDS, DOC)

    def test_android_feed_cannot_point_to_another_release_or_invalid_hash(self):
        for key, value in [('url', 'https://example.com/unrelated.apk'), ('sha256', '0' * 64), ('versionCode', 0)]:
            f = Fixture()
            feed = copy.deepcopy(f.feeds['android'])
            feed[key] = value
            url = next(url for url in f.bodies if url.endswith('android-update.json'))
            f.bodies[url] = json.dumps(feed).encode()
            with self.subTest(key=key), self.assertRaises(d.DeliveryError):
                d.prepare(f, IDS, DOC)

    def test_newer_incomplete_release_never_silently_falls_back(self):
        f = Fixture()
        f.rows.append({'id': 99, 'tag_name': 'desktop-v0.17.114', 'assets': []})
        with self.assertRaisesRegex(d.DeliveryError, 'incomplete release'):
            d.prepare(f, IDS, DOC)

    def test_android_version_code_cannot_go_backwards(self):
        f = Fixture()
        url = f'https://github.com/{f.repository}/releases/download/android-v1.7.57/android-update.json'
        f.bodies[url] = json.dumps({'versionCode': 106, 'versionName': '1.7.57'}).encode()
        f.rows.append({'id': 98, 'tag_name': 'android-v1.7.57', 'assets': [
            {'name': 'android-update.json', 'browser_download_url': url}]})
        with self.assertRaisesRegex(d.DeliveryError, 'versionCode must increase'):
            d.prepare(f, IDS, DOC)

    def test_site_rejects_downgrades_duplicate_links_and_wrong_public_labels(self):
        report, document = d.prepare(Fixture(), IDS, DOC)
        old = copy.deepcopy(report)
        old['windows']['version'] = '0.17.98'
        with self.assertRaisesRegex(d.DeliveryError, 'downgrade'):
            d.update_site(document, old)
        with self.assertRaisesRegex(d.DeliveryError, 'Duplicate'):
            d.parse_downloads(DOC + DOC)
        with self.assertRaisesRegex(d.DeliveryError, 'version label mismatch'):
            d.verify_site(document.replace('0.17.113', '0.17.112'), report)

    def test_public_windows_link_must_deliver_the_verified_bytes(self):
        f = Fixture()
        with patch.object(f, 'public', return_value=b'<html>Permission required</html>'):
            with self.assertRaisesRegex(d.DeliveryError, 'Public Windows Drive download'):
                d.prepare(f, IDS, DOC)

    def test_real_page_still_has_exactly_two_supported_download_cards(self):
        page = Path(__file__).resolve().parents[2] / 'public/index.html'
        report, _ = d.prepare(Fixture(), IDS, DOC)
        links = d.parse_downloads(page.read_text())
        for platform in d.PREFIX:
            match = d.re.search(d.VERSION, links[platform]['label'])
            current = list(d.version(match[1]))
            current[2] += 1
            report[platform]['version'] = '.'.join(map(str, current))
        d.verify_site(d.update_site(page.read_text(), report), report)

    def test_asset_download_checks_release_url_size_and_sha256(self):
        f = Fixture()
        asset = f.rows[0]['assets'][0]
        client = d.Client(f.repository)
        body = f.windows
        with patch.object(client, 'public', return_value=body):
            self.assertEqual(client.asset(asset, asset['browser_download_url'], 1000), body)
        for change in [{'size': 1}, {'digest': 'sha256:' + '0' * 64}, {'browser_download_url': 'https://wrong.test/file'}]:
            client = d.Client(f.repository)
            with patch.object(client, 'public', return_value=body), self.subTest(change=change):
                with self.assertRaises(d.DeliveryError):
                    client.asset({**asset, **change}, asset['browser_download_url'], 1000)

    def test_credentials_are_never_forwarded_through_redirects(self):
        handler = d.NoRedirect()
        self.assertIsNone(handler.redirect_request(None, None, 302, '', {}, 'https://evil.test/'))
        with self.assertRaises(d.DeliveryError):
            d.PublicRedirect().redirect_request(None, None, 302, '', {}, 'http://github.com/file')
        with self.assertRaises(d.DeliveryError):
            d.PublicRedirect().redirect_request(None, None, 302, '', {}, 'https://evil.test/file')

    def test_retries_consistency_errors_but_not_missing_permissions(self):
        calls = []
        def action():
            calls.append(1)
            if len(calls) == 1:
                raise d.DeliveryError('stale feed')
            return 'ready'
        with patch.object(d.time, 'sleep'), patch.object(d.time, 'monotonic', side_effect=[0, 1, 1]):
            self.assertEqual(d.retry(action, 10), 'ready')
        self.assertEqual(len(calls), 2)
        with self.assertRaises(d.ConfigurationError):
            d.retry(lambda: (_ for _ in ()).throw(d.ConfigurationError('no access')), 10)

    def test_workflows_pin_latest_policy_and_keep_privileged_work_on_main(self):
        root = Path(__file__).resolve().parents[2]
        windows = (root / '.github/workflows/desktop-release.yml').read_text()
        android = (root / '.github/workflows/android-native.yml').read_text()
        official = (root / '.github/workflows/official-delivery.yml').read_text()
        self.assertIn("make_latest: 'true'", windows)
        self.assertIn("make_latest: 'false'", android)
        self.assertIn("github.event.workflow_run.head_repository.full_name == github.repository", official)
        self.assertIn("github.ref == 'refs/heads/main'", official)
        self.assertIn('ref: main', official)
        self.assertIn('cancel-in-progress: false', official)
        self.assertIn('https://www.googleapis.com/auth/drive.readonly', official)


if __name__ == '__main__':
    unittest.main()
