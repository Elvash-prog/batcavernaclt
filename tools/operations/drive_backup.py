"""Update seven owner-created private Drive slots. Never creates or shares files."""
import argparse
import datetime
import hashlib
import json
import os
import pathlib
import sys
import urllib.parse
import urllib.request

FOLDER = '1JlbfnNOs2i5yROgcYmeMW9dDu13PqWKy'
OWNER = 'odoutorblou@gmail.com'
SERVICE = 'batcaverna-github-drive@batcavernaclt.iam.gserviceaccount.com'
SLOTS = [
    '1ZMKtAcSd9r4Ii4zbkkpWMX8NO9Wy3UF4',
    '1usepiT1cUtoKsEdW0pquH4zMuPH5CKX2',
    '1yyur1F2nKsaf8bMtd6hWK0nCP_lbAPNr',
    '176J5yrCYtzCQSBhtyvumx6-sboUp0BTS',
    '1xdTJf9N8UJXY9xe05tM8wJLSSneG9hoT',
    '1mUby5A-WpfCMbptIb3fviNZY-aEw1qaI',
    '1M1Dg-_w3UxRMOgwMtXCDkGlxrHkisPuG',
]
FIELDS = 'id,name,mimeType,parents,trashed,owners(emailAddress),appProperties,headRevisionId,size,md5Checksum'


class RejectRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        raise RuntimeError('Redirecionamento do Drive recusado.')


def private_permissions(permissions):
    allowed = {OWNER: {'owner'}, SERVICE: {'writer'}}
    for permission in permissions:
        email = permission.get('emailAddress', '').lower()
        if permission.get('type') != 'user' or permission.get('role') not in allowed.get(email, set()):
            raise RuntimeError('Destino possui compartilhamento inesperado.')
    if not any(p.get('emailAddress', '').lower() == OWNER and p.get('role') == 'owner' for p in permissions):
        raise RuntimeError('Proprietario do destino nao confirmado.')


def validate_slot(meta, number):
    names = {f'BatCaverna-backup-slot-{number:02d}.txt', f'BatCaverna-backup-slot-{number:02d}.tar.gz.gpg'}
    if (meta.get('id') != SLOTS[number - 1] or meta.get('trashed') is not False
            or meta.get('parents') != [FOLDER] or meta.get('name') not in names
            or meta.get('mimeType') not in {'text/plain', 'application/octet-stream'}
            or {x.get('emailAddress', '').lower() for x in meta.get('owners', [])} != {OWNER}):
        raise RuntimeError('Arquivo de reserva inesperado; nenhuma permissao foi alterada.')


def select_slot(slots, today):
    for meta in slots:
        p = meta.get('appProperties', {})
        if p.get('batcaverna_verified') == 'true' and p.get('batcaverna_date') == today:
            return None
    return min(slots, key=lambda m: (
        m.get('appProperties', {}).get('batcaverna_verified') == 'true',
        m.get('appProperties', {}).get('batcaverna_date', ''), SLOTS.index(m['id'])
    ))


class Drive:
    def __init__(self, token):
        self.token = token
        self.opener = urllib.request.build_opener(RejectRedirects())

    def open(self, url, method='GET', body=None, headers=None):
        parsed = urllib.parse.urlsplit(url)
        if (parsed.scheme != 'https' or parsed.netloc != 'www.googleapis.com'
                or not parsed.path.startswith(('/drive/v3/', '/upload/drive/v3/'))):
            raise RuntimeError('Endpoint do Drive inesperado.')
        request = urllib.request.Request(url, data=body, method=method,
            headers={'Authorization': 'Bearer ' + self.token, **(headers or {})})
        return self.opener.open(request, timeout=300)

    def json(self, path, method='GET', body=None):
        payload = None if body is None else json.dumps(body).encode()
        with self.open('https://www.googleapis.com/drive/v3/' + path, method, payload,
                       {'Content-Type': 'application/json'} if payload is not None else {}) as response:
            return json.load(response)

    def permissions(self, identity):
        result = []
        token = None
        while True:
            query = {'fields': 'nextPageToken,permissions(type,role,emailAddress)', 'pageSize': '100'}
            if token:
                query['pageToken'] = token
            page = self.json('files/' + identity + '/permissions?' + urllib.parse.urlencode(query))
            result.extend(page.get('permissions', []))
            token = page.get('nextPageToken')
            if not token:
                break
        private_permissions(result)

    def preflight(self):
        folder = self.json('files/' + FOLDER + '?fields=id,mimeType,trashed')
        if folder.get('mimeType') != 'application/vnd.google-apps.folder' or folder.get('trashed') is not False:
            raise RuntimeError('Pasta de backups indisponivel.')
        self.permissions(FOLDER)
        slots = []
        for number, identity in enumerate(SLOTS, 1):
            meta = self.json('files/' + identity + '?' + urllib.parse.urlencode({'fields': FIELDS}))
            validate_slot(meta, number)
            self.permissions(identity)
            slots.append(meta)
        return slots

    def upload(self, archive, slot, today):
        number = SLOTS.index(slot['id']) + 1
        identity = slot['id']
        properties = {'batcaverna_verified': 'false', 'batcaverna_date': today}
        metadata = {'name': f'BatCaverna-backup-slot-{number:02d}.tar.gz.gpg',
                    'mimeType': 'application/octet-stream', 'appProperties': properties}
        size = archive.stat().st_size
        url = 'https://www.googleapis.com/upload/drive/v3/files/' + identity + '?uploadType=resumable&keepRevisionForever=false'
        with self.open(url, 'PATCH', json.dumps(metadata).encode(), {
            'Content-Type': 'application/json', 'X-Upload-Content-Type': 'application/octet-stream',
            'X-Upload-Content-Length': str(size)
        }) as response:
            location = response.headers.get('Location', '')
        # open() checks the returned upload URL before attaching credentials.
        with archive.open('rb') as source, self.open(location, 'PUT', source, {
            'Content-Type': 'application/octet-stream', 'Content-Length': str(size),
            'Content-Range': f'bytes 0-{size - 1}/{size}'
        }) as response:
            response.read()

        expected = hashlib.sha256()
        with archive.open('rb') as source:
            for chunk in iter(lambda: source.read(1048576), b''):
                expected.update(chunk)
        actual = hashlib.sha256()
        downloaded = 0
        with self.open('https://www.googleapis.com/drive/v3/files/' + identity + '?alt=media') as response:
            for chunk in iter(lambda: response.read(1048576), b''):
                downloaded += len(chunk)
                if downloaded > size:
                    raise RuntimeError('Tamanho do arquivo remoto divergente.')
                actual.update(chunk)
        if downloaded != size or actual.digest() != expected.digest():
            raise RuntimeError('Upload nao confirmado por SHA-256.')
        # Recheck sharing after upload; never silently change permissions.
        self.permissions(FOLDER)
        self.permissions(identity)
        properties.update(batcaverna_verified='true', batcaverna_sha256=expected.hexdigest())
        self.json('files/' + identity + '?fields=id,appProperties', 'PATCH', {'appProperties': properties})
        return {'slot': number, 'bytes': size, 'sha256': expected.hexdigest(), 'download_verified': True}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--archive', type=pathlib.Path)
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args()
    token = os.environ.get('GDRIVE_ACCESS_TOKEN', '').strip()
    if not token:
        raise RuntimeError('Credencial temporaria do Drive ausente.')
    drive = Drive(token)
    slots = drive.preflight()
    if args.check_only:
        print('Pasta e sete arquivos privados conferidos. Nenhum arquivo alterado.')
        return
    if args.archive is None or not args.archive.name.endswith('.tar.gz.gpg'):
        raise ValueError('Informe somente o pacote criptografado .tar.gz.gpg.')
    size = args.archive.stat().st_size
    if not 32 < size <= 536870912:
        raise ValueError('Tamanho de pacote criptografado inesperado.')
    with args.archive.open('rb') as source:
        first = source.read(1)[0]
    if not first & 128:
        raise ValueError('Cabecalho de pacote OpenPGP ausente.')
    today = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    slot = select_slot(slots, today)
    if slot is None:
        print('Ja existe uma copia verificada hoje; nenhum arquivo substituido.')
        return
    print(json.dumps(drive.upload(args.archive, slot, today)))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        sys.exit(str(error) if isinstance(error, (RuntimeError, ValueError)) else
                 'Falha no Drive (' + type(error).__name__ + '); nenhum detalhe remoto foi exibido.')
