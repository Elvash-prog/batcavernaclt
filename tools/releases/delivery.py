#!/usr/bin/env python3
"""Verify official release feeds and Drive bytes before updating download labels."""
import argparse
import base64
import hashlib
import html
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import time
import urllib.error
import urllib.parse
import urllib.request

SITE = 'https://batcavernaclt.gamersclt.workers.dev/'
VERSION = r'(\d+\.\d+\.\d+)'
PREFIX = {'windows': 'desktop-v', 'android': 'android-v'}


class DeliveryError(Exception):
    pass


class ConfigurationError(DeliveryError):
    pass


def require(condition, message):
    if not condition:
        raise DeliveryError(message)


def version(value):
    require(isinstance(value, str) and re.fullmatch(VERSION, value), 'Invalid stable version')
    return tuple(map(int, value.split('.')))


class NoRedirect(urllib.request.HTTPRedirectHandler):
    # Credentials are sent only to the fixed API host, never forwarded elsewhere.
    def redirect_request(self, request, *args, **kwargs):
        return None


class PublicRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, target):
        parsed = urllib.parse.urlsplit(target)
        allowed = parsed.hostname in {'github.com', 'release-assets.githubusercontent.com',
                                      'objects.githubusercontent.com', 'github-releases.githubusercontent.com',
                                      'drive.usercontent.google.com', 'drive.google.com'} or bool(parsed.hostname and parsed.hostname.endswith('.googleusercontent.com'))
        if parsed.scheme != 'https' or not allowed or parsed.username or parsed.password:
            raise DeliveryError('Unexpected release download redirect')
        return super().redirect_request(request, fp, code, msg, headers, target)


class Client:
    def __init__(self, repository, token='', drive_token=''):
        if (not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repository)
                or any(part in ('.', '..') for part in repository.split('/'))):
            raise ConfigurationError('Invalid repository')
        self.repository, self.token, self.drive_token = repository, token, drive_token
        self.assets = {}

    def _read(self, url, *, headers=None, data=None, method='GET', limit=1_048_576, public=False):
        request = urllib.request.Request(url, headers={
            'User-Agent': 'BatCaverna-Delivery/1.0 (+https://github.com/Elvash-prog/batcavernaclt)',
            **(headers or {}),
        }, data=data, method=method)
        opener = urllib.request.build_opener(PublicRedirect() if public else NoRedirect())
        try:
            with opener.open(request, timeout=25) as response:
                body = response.read(limit + 1)
        except urllib.error.HTTPError as error:
            if error.code in (401, 403):
                raise ConfigurationError(f'API access denied (HTTP {error.code})') from None
            raise DeliveryError(f'HTTP {error.code} while checking delivery') from None
        except (urllib.error.URLError, TimeoutError):
            raise DeliveryError('Delivery endpoint temporarily unavailable') from None
        require(len(body) <= limit, 'Delivery response exceeds size limit')
        return body

    def github(self, path, method='GET', data=None):
        headers = {'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'}
        if self.token:
            headers['Authorization'] = 'Bearer ' + self.token
        body = None if data is None else json.dumps(data).encode()
        if body is not None:
            headers['Content-Type'] = 'application/json'
        raw = self._read(f'https://api.github.com/repos/{self.repository}/{path}',
                         headers=headers, method=method, data=body, limit=8_388_608)
        return json.loads(raw)

    def releases(self):
        releases = []
        for page in range(1, 11):
            rows = self.github(f'releases?per_page=100&page={page}')
            require(isinstance(rows, list), 'Invalid releases response')
            releases.extend(rows)
            if len(rows) < 100:
                return releases
        raise DeliveryError('Release history exceeds configured pagination limit')

    def public(self, url, limit=1_048_576):
        return self._read(url, headers={'Cache-Control': 'no-cache'}, public=True, limit=limit)

    def asset(self, asset, expected_url, limit):
        require(asset.get('browser_download_url') == expected_url, 'Unexpected release asset URL')
        key = (asset.get('id'), asset.get('updated_at'), asset.get('size'), asset.get('digest'))
        if key not in self.assets:
            body = self.public(expected_url, limit)
            require(len(body) == asset.get('size'), 'Published asset size differs from release metadata')
            digest = asset.get('digest')
            if digest:
                require(digest == 'sha256:' + hashlib.sha256(body).hexdigest(), 'Release asset digest mismatch')
            if len(self.assets) >= 12:
                self.assets.clear()
            self.assets[key] = body
        return self.assets[key]

    def drive(self, file_id):
        if not re.fullmatch(r'[A-Za-z0-9_-]{10,128}', file_id or '') or not self.drive_token:
            raise ConfigurationError('Drive file ID or access token is missing')
        url = f'https://www.googleapis.com/drive/v3/files/{file_id}?fields=id,name,size,md5Checksum,trashed'
        return json.loads(self._read(url, headers={'Authorization': 'Bearer ' + self.drive_token}))

    def latest(self):
        return self.github('releases/latest')

    def promote_windows(self, release_id):
        if not self.token:
            raise ConfigurationError('GitHub token is required to repair the Windows channel')
        self.github(f'releases/{int(release_id)}', method='PATCH', data={'make_latest': 'true'})


def choose(releases, platform):
    candidates = []
    for release in releases:
        match = re.fullmatch(re.escape(PREFIX[platform]) + VERSION, release.get('tag_name', ''))
        if match and not release.get('draft') and not release.get('prerelease'):
            candidates.append((version(match[1]), release))
    require(bool(candidates), f'No stable {platform} release was found')
    # A newer incomplete publication must fail verification, never downgrade the site.
    return max(candidates, key=lambda value: value[0])[1]


def verify_drive(client, file_id, body, label):
    remote = client.drive(file_id)
    require(not remote.get('trashed'), f'{label}: Drive file is trashed')
    require(str(len(body)) == str(remote.get('size')), f'{label}: Drive size mismatch')
    require(remote.get('md5Checksum') == hashlib.md5(body).hexdigest(), f'{label}: Drive checksum mismatch')
    return {'size': len(body), 'md5': remote['md5Checksum']}


def verify_release(client, release, platform, file_ids):
    ver = release['tag_name'][len(PREFIX[platform]):]
    version(ver)
    base = f'https://github.com/{client.repository}/releases/download/{release["tag_name"]}/'
    assets = {row['name']: row for row in release.get('assets', [])}

    def read(name, limit):
        require(name in assets, f'{platform}: incomplete release, missing {name}')
        return client.asset(assets[name], base + name, limit)

    if platform == 'windows':
        installer = read('BatCaverna-CLT-Windows-setup.exe', 33_554_432)
        signature_bytes = read('BatCaverna-CLT-Windows-setup.exe.sig', 65_536)
        signature = signature_bytes.decode().strip()
        feed = json.loads(read('latest.json', 262_144))
        require(feed.get('version') == ver, 'Windows feed version mismatch')
        entry = feed.get('platforms', {}).get('windows-x86_64', {})
        require(entry.get('url') == base + 'BatCaverna-CLT-Windows-setup.exe', 'Windows feed points outside its release')
        require(entry.get('signature') == signature, 'Windows feed signature differs from the published signature')
        try:
            decoded = base64.b64decode(signature, validate=True)
        except ValueError:
            raise DeliveryError('Invalid Windows updater signature encoding') from None
        require(len(decoded) >= 100, 'Windows updater signature is missing')
        installed = verify_drive(client, file_ids['windows'], installer, 'Windows installer')
        verify_drive(client, file_ids['signature'], signature_bytes, 'Windows signature')
        url = 'https://drive.usercontent.google.com/download?' + urllib.parse.urlencode(
            {'id': file_ids['windows'], 'export': 'download', 'confirm': 't'})
        require(client.public(url, 33_554_432) == installer, 'Public Windows Drive download differs from the verified installer')
        return {'version': ver, 'tag': release['tag_name'], 'release_id': release['id'],
                'url': url, 'feed': feed, 'artifact': installed}
    apk_name = f'BatCaverna-{ver}.apk'
    apk = read(apk_name, 33_554_432)
    feed = json.loads(read('android-update.json', 262_144))
    require(feed.get('versionName') == ver, 'Android feed version mismatch')
    require(type(feed.get('versionCode')) is int and feed['versionCode'] > 0, 'Invalid Android version code')
    require(feed.get('url') == base + apk_name, 'Android feed points outside its release')
    require(feed.get('sha256') == hashlib.sha256(apk).hexdigest(), 'Android feed APK checksum mismatch')
    installed = verify_drive(client, file_ids['android'], apk, 'Android APK')
    require(client.drive(file_ids['android']).get('name') == apk_name, 'Android Drive filename mismatch')
    return {'version': ver, 'versionCode': feed['versionCode'], 'tag': release['tag_name'],
            'release_id': release['id'], 'url': base + apk_name, 'artifact': installed}


class Downloads(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.entries, self.active, self.small = {}, None, False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a' and 'download-option' in attrs.get('class', '').split():
            platform = 'android' if 'android' in attrs.get('class', '').split() else 'windows'
            require(platform not in self.entries, 'Duplicate download link')
            self.active = {'platform': platform, 'url': attrs.get('href', ''), 'label': ''}
        elif tag == 'small' and self.active:
            self.small = True

    def handle_data(self, data):
        if self.active and self.small:
            self.active['label'] += data

    def handle_endtag(self, tag):
        if tag == 'small':
            self.small = False
        if tag == 'a' and self.active:
            self.entries[self.active['platform']] = self.active
            self.active = None


def parse_downloads(document):
    parser = Downloads()
    parser.feed(document)
    require(set(parser.entries) == {'windows', 'android'}, 'Expected exactly two official download links')
    return parser.entries


def verify_site(document, report):
    links = parse_downloads(document)
    for platform, info in report.items():
        if platform not in PREFIX:
            continue
        require(links[platform]['url'] == info['url'], f'{platform}: public download URL mismatch')
        require(links[platform]['label'].startswith('Versão ' + info['version'] + ' · '),
                f'{platform}: public version label mismatch')


def update_site(document, report):
    previous = parse_downloads(document)
    for platform in PREFIX:
        old = re.search(VERSION, previous[platform]['label'])
        require(old is not None and version(report[platform]['version']) >= version(old[1]),
                f'{platform}: refusing to downgrade the download page')
    pattern = r'(<a\b[^>]*\bclass="[^"]*\bdownload-option\b[^"]*"[^>]*>)(.*?)(</a>)'

    def replace(match):
        first, body, last = match.groups()
        platform = 'android' if re.search(r'class="[^"]*\bandroid\b', first) else 'windows'
        info = report[platform]
        first, count = re.subn(r'\bhref="[^"]*"', 'href="' + html.escape(info['url'], quote=True) + '"', first)
        require(count == 1, 'Expected one URL in download link')
        label = 'Instalador .exe' if platform == 'windows' else 'Arquivo APK'
        body, count = re.subn(r'<small>[^<]*</small>', f'<small>Versão {info["version"]} · {label}</small>', body)
        require(count == 1, 'Expected one version label per download link')
        return first + body + last

    updated, count = re.subn(pattern, replace, document, flags=re.S)
    require(count == 2, 'Expected exactly two download cards')
    verify_site(updated, report)
    return updated


def prepare(client, file_ids, document):
    releases = client.releases()
    report = {platform: verify_release(client, choose(releases, platform), platform, file_ids)
              for platform in PREFIX}
    older = [row for row in releases if re.fullmatch('android-v' + VERSION, row.get('tag_name', ''))
             and not row.get('draft') and not row.get('prerelease')
             and version(row['tag_name'][9:]) < version(report['android']['version'])]
    if older:
        previous = choose(older, 'android')
        assets = {asset['name']: asset for asset in previous.get('assets', [])}
        require('android-update.json' in assets, 'Previous Android feed is missing')
        url = f'https://github.com/{client.repository}/releases/download/{previous["tag_name"]}/android-update.json'
        previous_feed = json.loads(client.asset(assets['android-update.json'], url, 262_144))
        require(type(previous_feed.get('versionCode')) is int
                and report['android']['versionCode'] > previous_feed['versionCode'],
                'Android versionCode must increase between stable releases')
    latest = client.latest()
    if latest.get('tag_name') != report['windows']['tag']:
        client.promote_windows(report['windows']['release_id'])
    public_feed = json.loads(client.public(
        f'https://github.com/{client.repository}/releases/latest/download/latest.json', 262_144))
    require(public_feed == report['windows']['feed'], 'The public Windows updater is not serving the verified feed')
    return report, update_site(document, report)


def retry(action, seconds):
    deadline = time.monotonic() + seconds
    while True:
        try:
            return action()
        except ConfigurationError:
            raise
        except (DeliveryError, json.JSONDecodeError) as error:
            if time.monotonic() >= deadline:
                raise DeliveryError(str(error)) from None
            print(f'Waiting for delivery consistency: {error}', flush=True)
            time.sleep(min(10, max(0, deadline - time.monotonic())))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['prepare', 'check-site'])
    parser.add_argument('--repository', default=os.environ.get('GITHUB_REPOSITORY', 'Elvash-prog/batcavernaclt'))
    parser.add_argument('--site-file', type=Path, default=Path('public/index.html'))
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--site-url', default=SITE)
    parser.add_argument('--retry-seconds', type=int, default=300)
    args = parser.parse_args()
    client = Client(args.repository, os.environ.get('GH_TOKEN', ''), os.environ.get('GDRIVE_ACCESS_TOKEN', ''))
    if args.mode == 'prepare':
        ids = {key: os.environ.get(env, '') for key, env in
               [('windows', 'GDRIVE_WINDOWS_FILE_ID'), ('signature', 'GDRIVE_WINDOWS_SIG_FILE_ID'),
                ('android', 'GDRIVE_APK_FILE_ID')]}
        report, document = retry(lambda: prepare(client, ids, args.site_file.read_text()), args.retry_seconds)
        args.site_file.write_text(document)
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        if os.environ.get('GITHUB_OUTPUT'):
            with open(os.environ['GITHUB_OUTPUT'], 'a') as stream:
                stream.write(f'windows={report["windows"]["version"]}\nandroid={report["android"]["version"]}\n')
        print(f'Verified GitHub feeds and Drive: Windows {report["windows"]["version"]}, Android {report["android"]["version"]}')
    else:
        if args.site_url != SITE:
            raise ConfigurationError('Unexpected official website URL')
        report = json.loads(args.report.read_text())
        retry(lambda: verify_site(client.public(SITE + '?delivery=' + str(time.time_ns()), 1_048_576).decode(), report), args.retry_seconds)
        report['site_verified'] = True
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        print('Official website matches the verified Windows and Android deliveries.')


if __name__ == '__main__':
    try:
        main()
    except (DeliveryError, json.JSONDecodeError) as error:
        raise SystemExit(str(error)) from None
