"""Check real user and anonymous access on the isolated restored services.

Credentials are requested only on this local terminal, with hidden input.
No service-role key is used for HTTP. Database expectations are evaluated in
READ ONLY mode under the non-bypass authenticated role and verified JWT claims.
Only aggregate counts and fixed error labels are printed.
"""
import argparse
import base64
import getpass
import hashlib
import json
import os
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
import warnings

import backup
import restore_local_media as media

MARKER = 'BATCAVERNA_VISIBLE='
DENIAL_CODES = {'NoSuchKey','NoSuchBucket','AccessDenied','not_found','Unauthorized','Bucket not found'}


class CheckFailed(Exception):
    def __init__(self, code): self.code = code


def object_route(item, public=False):
    bucket, name = item['bucket'], item['name']
    if not bucket or any(c in bucket for c in '/\\\x00') or bucket in {'.','..'}:
        raise CheckFailed('UNSAFE_OBJECT_PATH')
    if not name or '\\' in name or '\x00' in name or any(p in {'','.','..'} for p in name.split('/')):
        raise CheckFailed('UNSAFE_OBJECT_PATH')
    kind = 'public' if public else 'authenticated'
    return '/storage/v1/object/' + kind + '/' + urllib.parse.quote(bucket,safe='') + '/' + urllib.parse.quote(name,safe='/')


def policy_denial(status, body):
    if status in (403,404): return True
    if status != 400 or not isinstance(body,dict): return False
    code = body.get('code') or body.get('error')
    return (isinstance(code,str) and code in DENIAL_CODES) or body.get('statusCode') in (403,404,'403','404')


class LocalClient:
    def __init__(self, key, opener=None):
        self.key = key
        self.opener = opener or urllib.request.build_opener(urllib.request.ProxyHandler({}),backup.RejectStorageRedirects())

    def open(self, method, route, token=None, body=None):
        if media.API != 'http://127.0.0.1:54321':
            raise CheckFailed('LOCAL_URL_REQUIRED')
        if not route.startswith('/') or route.startswith('//'):
            raise CheckFailed('INVALID_LOCAL_ROUTE')
        headers = {'apikey':self.key}
        if token: headers['Authorization'] = 'Bearer ' + token
        data = None
        if body is not None:
            headers['Content-Type'] = 'application/json'
            data = json.dumps(body).encode()
        request = urllib.request.Request(media.API+route,data=data,headers=headers,method=method)
        try:
            return self.opener.open(request,timeout=60)
        except urllib.error.HTTPError as error:
            return error
        except (urllib.error.URLError,OSError):
            raise CheckFailed('LOCAL_CONNECTION_FAILED') from None
        except RuntimeError:
            raise CheckFailed('REDIRECT_BLOCKED') from None

    def json_request(self, method, route, token=None, body=None):
        with self.open(method,route,token,body) as response:
            status = response.getcode()
            data = response.read(1048577)
        if len(data) > 1048576: raise CheckFailed('RESPONSE_TOO_LARGE')
        try: parsed = json.loads(data) if data else {}
        except (ValueError,UnicodeError):
            if 200 <= status < 300: raise CheckFailed('UNEXPECTED_JSON') from None
            parsed = {}
        return status,parsed

    def object(self, item, token=None, public=False):
        with self.open('GET',object_route(item,public),token) as response:
            status = response.getcode()
            if status == 200:
                count, digest = 0, hashlib.sha256()
                for block in iter(lambda:response.read(1048576),b''):
                    count += len(block)
                    if count > item['bytes']: return status,False,{}
                    digest.update(block)
                return status,count == item['bytes'] and digest.hexdigest() == item['sha256'],{}
            raw = response.read(65536)
            try: body = json.loads(raw)
            except (ValueError,UnicodeError): body = {}
            return status,False,body


def public_key(base):
    cli = base/'ferramentas'/'supabase-2.122.0'/'supabase.exe'
    raw = media.local_command([str(cli),'status','--workdir',str(base/'ensaio'),'-o','json'],env={**os.environ,'DO_NOT_TRACK':'1'})
    key = json.loads(raw).get('ANON_KEY')
    if not isinstance(key,str) or not key: raise CheckFailed('LOCAL_PUBLIC_KEY_UNAVAILABLE')
    if not key.startswith('sb_publishable_'):
        try:
            encoded = key.split('.')[1]
            role = json.loads(base64.urlsafe_b64decode(encoded + '='*(-len(encoded)%4)))['role']
        except (ValueError,KeyError,IndexError,TypeError,UnicodeError):
            raise CheckFailed('LOCAL_PUBLIC_KEY_INVALID') from None
        if role != 'anon': raise CheckFailed('LOCAL_PUBLIC_KEY_NOT_ANONYMOUS')
    return key


def verified_claims(session, user):
    try:
        token = session['access_token']
        parts = token.split('.')
        if len(parts) != 3: raise ValueError()
        claims = json.loads(base64.urlsafe_b64decode(parts[1] + '='*(-len(parts[1])%4)))
        identity = uuid.UUID(user['id'])
        if uuid.UUID(session['user']['id']) != identity or uuid.UUID(claims['sub']) != identity:
            raise ValueError()
    except (ValueError,KeyError,TypeError,UnicodeError):
        raise CheckFailed('IDENTITY_OR_CLAIMS_INVALID') from None
    if claims.get('role') != 'authenticated': raise CheckFailed('ACCOUNT_ROLE_NOT_AUTHENTICATED')
    return claims


def visible_keys(claims):
    if claims.get('role') != 'authenticated': raise CheckFailed('ACCOUNT_ROLE_NOT_AUTHENTICATED')
    try: identity = str(uuid.UUID(claims['sub']))
    except (ValueError,KeyError,TypeError): raise CheckFailed('IDENTITY_OR_CLAIMS_INVALID') from None
    def literal(value): return "'" + value.replace("'","''") + "'"
    # No JWT/user-controlled value is placed inside a dollar-quoted DO body.
    query = r"""
BEGIN READ ONLY;
SET LOCAL standard_conforming_strings=on;
DO $guard$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated' AND NOT rolsuper AND NOT rolbypassrls) THEN
    RAISE EXCEPTION 'AUTHENTICATED_ROLE_UNSAFE';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='storage.objects'::regclass AND relrowsecurity) THEN
    RAISE EXCEPTION 'STORAGE_RLS_DISABLED';
  END IF;
END
$guard$;
SET LOCAL ROLE authenticated;
SET LOCAL row_security=on;
"""
    context = {'request.jwt.claims':json.dumps(claims,ensure_ascii=True,separators=(',',':')),
               'request.jwt.claim.sub':identity,'request.jwt.claim.role':'authenticated',
               'request.jwt.claim.email':str(claims.get('email') or '')}
    for setting,value in context.items():
        query += '\nSELECT set_config(' + literal(setting) + ',' + literal(value) + ',true) IS NOT NULL;'
    query += "\nSELECT '" + MARKER + "' || COALESCE(json_agg(json_build_array(bucket_id,name)),'[]'::json)::text FROM storage.objects;\nROLLBACK;\n"
    raw = media.local_command(['docker','exec','-i',media.prepare.CONTAINER,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],query.encode())
    lines = [line[len(MARKER):] for line in raw.decode('utf-8').split('\n') if line.startswith(MARKER)]
    if len(lines) != 1: raise CheckFailed('POLICY_EXPECTATIONS_UNAVAILABLE')
    return {tuple(row) for row in json.loads(lines[0])}


def check_matrix(items, state, client, token, visible):
    public = {row['id']:row['public'] for row in state['buckets']}
    report = {'objects':len(items),'user_expected_allowed':0,'user_downloads_verified':0,
              'user_expected_denied':0,'user_denials_verified':0,'anonymous_private_expected':0,
              'anonymous_private_denials_verified':0,'anonymous_public_downloads_verified':0,
              'policy_mismatches':0}
    mismatches = []
    for ordinal,item in enumerate(items,1):
        expected = public[item['bucket']] or (item['bucket'],item['name']) in visible
        report['user_expected_allowed' if expected else 'user_expected_denied'] += 1
        status,matched,body = client.object(item,token=token)
        valid = status == 200 and matched if expected else policy_denial(status,body)
        if valid: report['user_downloads_verified' if expected else 'user_denials_verified'] += 1
        else: mismatches.append({'object_index':ordinal,'context':'user','expected_allowed':expected,'http_status':status})
        is_public = public[item['bucket']]
        if not is_public: report['anonymous_private_expected'] += 1
        status,matched,body = client.object(item,public=True)  # No user Authorization header.
        valid = status == 200 and matched if is_public else policy_denial(status,body)
        if valid: report['anonymous_public_downloads_verified' if is_public else 'anonymous_private_denials_verified'] += 1
        else: mismatches.append({'object_index':ordinal,'context':'anonymous','expected_allowed':is_public,'http_status':status})
    report['policy_mismatches'] = len(mismatches)
    if mismatches: report['first_mismatches'] = mismatches[:5]
    report['status'] = 'failed' if mismatches else ('passed' if report['user_downloads_verified'] and report['anonymous_private_expected'] else 'limited')
    return report


def run_test(items,state,key,email,password,client=None,visibility=None):
    client = client or LocalClient(key)
    visibility = visibility or visible_keys
    report,session,phase = {'status':'failed'},None,'login'
    try:
        status,session = client.json_request('POST','/auth/v1/token?grant_type=password',body={'email':email,'password':password})
        report['login_status'] = status
        if status != 200: raise CheckFailed('LOGIN_REJECTED')
        phase = 'user'
        status,user = client.json_request('GET','/auth/v1/user',token=session['access_token'])
        report['user_status'] = status
        if status != 200: raise CheckFailed('USER_VERIFICATION_FAILED')
        claims = verified_claims(session,user)
        factors = user.get('factors') or []
        if not isinstance(factors,list): raise CheckFailed('MFA_STATE_UNEXPECTED')
        report['verified_mfa_factors'] = sum(factor.get('status')=='verified' for factor in factors)
        if report['verified_mfa_factors']:
            report.update(status='limited',reason='MFA_REQUIRED')
        else:
            phase = 'policy_expectations'
            visible = visibility(claims)
            phase = 'media_requests'
            report.update(check_matrix(items,state,client,session['access_token'],visible))
    except CheckFailed as error:
        report.update(status='failed',error=error.code,error_stage=phase)
    except Exception:
        report.update(status='failed',error='LOCAL_CHECK_FAILED',error_stage=phase)
    finally:
        if isinstance(session,dict) and session.get('access_token'):
            try:
                status,_ = client.json_request('POST','/auth/v1/logout?scope=local',token=session['access_token'])
                report['logout_status'] = status
                if status != 204: report.update(status='failed',cleanup_error=True)
            except Exception:
                report.update(status='failed',cleanup_error=True)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backup',type=pathlib.Path,required=True)
    args = parser.parse_args()
    folder = args.backup.resolve()
    manifest = media.prepare.verify_folder(folder)
    media.inspect_local()
    before = media.read_state()
    items = media.inventory(folder,manifest,before)
    for item in items: object_route(item)
    key = public_key(folder.parent)
    print('Teste somente em 127.0.0.1. Digite os dados da sua conta BatCaverna; as entradas ficam ocultas.')
    with warnings.catch_warnings():
        warnings.simplefilter('error',getpass.GetPassWarning)
        email = getpass.getpass('E-mail da conta restaurada (oculto): ').strip()
        password = getpass.getpass('Senha da conta BatCaverna (oculta): ')
    report = run_test(items,before,key,email,password)
    password = None
    if media.state_digest(before) != media.state_digest(media.read_state()):
        report.update(status='failed',error='STORAGE_METADATA_CHANGED')
    else: report['metadata_preserved'] = True
    print(json.dumps(report))
    if report['status'] != 'passed':
        sys.exit('Teste sem aprovacao completa. Envie somente o resumo; nao altere politicas para liberar os arquivos.')
    print('Acesso autenticado e negativas anonimas conferidos com as politicas existentes. Sessao encerrada.')


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        sys.exit('Teste cancelado; nenhum dado pessoal foi exibido.')
    except Exception:
        sys.exit('Falha na preparacao do teste local; detalhes privados omitidos. Nenhuma politica foi alterada.')
