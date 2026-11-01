import base64
import hashlib
import io
import json
import os
import subprocess
import tempfile
import unittest
import uuid
from unittest.mock import patch

import verify_local_media_access as access

UID='11111111-1111-1111-1111-111111111111'
OTHER='22222222-2222-2222-2222-222222222222'


def token(role='authenticated'):
    claims={'sub':UID,'role':role,'email':'synthetic@example.invalid','aal':'aal1'}
    encoded=base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip('=')
    return 'eyJhbGciOiJIUzI1NiJ9.'+encoded+'.synthetic_signature'


def items():
    data=b'synthetic-private-media'
    return [{'bucket':'private','name':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()} for name in ('allowed.txt','denied.txt')]


class FakeClient:
    def __init__(self,role='authenticated',mfa=False,leak=False,bad_hash=False):
        self.token=token(role); self.mfa=mfa; self.leak=leak; self.bad_hash=bad_hash; self.calls=[]
    def json_request(self,method,route,token=None,body=None):
        self.calls.append((method,route,token,body))
        if route.endswith('grant_type=password'): return 200,{'access_token':self.token,'user':{'id':UID}}
        if route=='/auth/v1/user': return 200,{'id':UID,'factors':[{'status':'verified'}] if self.mfa else []}
        if route=='/auth/v1/logout?scope=local': return 204,{}
        raise AssertionError(route)
    def object(self,item,token=None,public=False):
        self.calls.append(('object',item['name'],token,public))
        if public: return 404,False,{'code':'NoSuchBucket'}
        if item['name']=='allowed.txt': return 200,not self.bad_hash,{}
        if self.leak: return 200,True,{}
        return 400,False,{'code':'NoSuchKey','message':'private-name-canary'}


class LocalMediaAccessTests(unittest.TestCase):
    def state(self): return {'buckets':[{'id':'private','public':False}]}
    def test_success_compares_actual_access_to_rls_and_logs_out(self):
        client=FakeClient()
        report=access.run_test(items(),self.state(),'synthetic-public-key','synthetic@example.invalid','synthetic-password',client,lambda claims:{('private','allowed.txt')})
        self.assertEqual(report['status'],'passed')
        self.assertEqual(report['user_downloads_verified'],1)
        self.assertEqual(report['user_denials_verified'],1)
        self.assertEqual(report['anonymous_private_denials_verified'],2)
        self.assertEqual(report['policy_mismatches'],0)
        self.assertEqual(report['logout_status'],204)
        self.assertNotIn(UID,json.dumps(report)); self.assertNotIn('synthetic-password',json.dumps(report))
        anon=[call for call in client.calls if call[0]=='object' and call[3]]
        self.assertTrue(all(call[2] is None for call in anon))

    def test_leaked_or_corrupted_content_fails_without_showing_file_names_or_bytes(self):
        for kwargs in ({'leak':True},{'bad_hash':True}):
            client=FakeClient(**kwargs)
            report=access.run_test(items(),self.state(),'key','email','password',client,lambda claims:{('private','allowed.txt')})
            self.assertEqual(report['status'],'failed')
            self.assertEqual(report['policy_mismatches'],1)
            self.assertEqual(report['logout_status'],204)
            for secret in ('allowed.txt','denied.txt','private-name-canary','synthetic-private-media',client.token):
                self.assertNotIn(secret,json.dumps(report))

    def test_login_failure_reports_only_an_allowlisted_code_without_private_body(self):
        for code in ('email_provider_disabled','private-canary-code'):
            client=FakeClient()
            client.json_request=lambda *a,**kw:(422,{'error_code':code,'msg':'private-canary-email-or-message'})
            report=access.run_test(items(),self.state(),'public','email','password',client)
            self.assertEqual(report['status'],'failed')
            self.assertEqual(report.get('auth_error_code'),'email_provider_disabled' if code=='email_provider_disabled' else None)
            self.assertNotIn('private-canary',json.dumps(report))

    def test_service_role_cannot_be_used_for_the_user_test(self):
        client=FakeClient(role='service_role')
        with patch.object(access,'visible_keys') as visibility:
            report=access.run_test(items(),self.state(),'key','email','password',client)
        self.assertEqual(report['error'],'ACCOUNT_ROLE_NOT_AUTHENTICATED')
        self.assertEqual(report['logout_status'],204)
        visibility.assert_not_called()
        self.assertFalse(any(call[0]=='object' for call in client.calls))

    def test_mfa_accounts_require_a_separate_mfa_flow_and_are_not_bypassed(self):
        client=FakeClient(mfa=True)
        report=access.run_test(items(),self.state(),'key','email','password',client,lambda claims:self.fail('MFA bypass'))
        self.assertEqual(report['status'],'limited')
        self.assertEqual(report['reason'],'MFA_REQUIRED')
        self.assertEqual(report['logout_status'],204)
        self.assertFalse(any(call[0]=='object' for call in client.calls))

    def test_public_http_key_cannot_be_a_service_role_key(self):
        for role in ('anon','service_role'):
            value=token(role)
            with patch.object(access.media,'local_command',return_value=json.dumps({'ANON_KEY':value}).encode()):
                if role=='anon': self.assertEqual(access.public_key(__import__('pathlib').Path('/synthetic')),value)
                else:
                    with self.assertRaises(access.CheckFailed): access.public_key(__import__('pathlib').Path('/synthetic'))

    def test_identity_mismatch_is_refused_before_role_queries(self):
        session={'access_token':token(),'user':{'id':UID}}
        with self.assertRaises(access.CheckFailed): access.verified_claims(session,{'id':OTHER})

    def test_authentication_and_server_errors_do_not_count_as_policy_denials(self):
        self.assertTrue(access.policy_denial(404,{}))
        self.assertTrue(access.policy_denial(400,{'code':'NoSuchKey'}))
        self.assertTrue(access.policy_denial(400,{'statusCode':'403'}))
        for status,body in [(401,{}),(500,{}),(400,{'code':'InvalidJWT'}),(400,{'message':'private-error-canary'}),(200,{})]:
            self.assertFalse(access.policy_denial(status,body))

    def test_paths_and_local_base_are_checked_before_credentials_can_be_sent(self):
        for name in ('../x','/x','a/./b','a//b','a\\b'):
            with self.assertRaises(access.CheckFailed): access.object_route({'bucket':'private','name':name})
        class Opener:
            def open(self,*a,**k): raise AssertionError('credentials must not leave loopback')
        with patch.object(access.media,'API','https://production.invalid'):
            with self.assertRaises(access.CheckFailed): access.LocalClient('private-key',Opener()).open('POST','/auth/v1/token',body={'password':'private-canary'})

    def test_object_http_transport_checks_hash_and_does_not_add_user_auth_to_anonymous_request(self):
        data=b'synthetic-private-media'
        class Response(io.BytesIO):
            def getcode(self): return 200
        class Opener:
            def __init__(self): self.calls=[]
            def open(self,request,timeout): self.calls.append(request); return Response(data)
        opener=Opener(); client=access.LocalClient('synthetic-public-key',opener)
        self.assertEqual(client.object(items()[0],token='synthetic-user-token')[:2],(200,True))
        self.assertEqual(client.object(items()[0],public=True)[:2],(200,True))
        self.assertEqual(opener.calls[0].get_header('Authorization'),'Bearer synthetic-user-token')
        self.assertIsNone(opener.calls[1].get_header('Authorization'))
        self.assertTrue(opener.calls[1].full_url.startswith('http://127.0.0.1:54321/'))


@unittest.skipUnless(os.environ.get('PG_CONTAINER'),'disposable PG_CONTAINER required')
class MediaPolicyContextTests(unittest.TestCase):
    def execute(self,args,data=None):
        result=subprocess.run(args,input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        if result.returncode: raise AssertionError(result.stderr.decode())  # Synthetic fixtures only.
        return result.stdout
    def sql(self,text):
        return self.execute(['docker','exec','-i',self.container,'psql','-X','-qAt','-U','postgres','-d',self.database,'-v','ON_ERROR_STOP=1'],text.encode()).decode().strip()
    def setUp(self):
        self.container=os.environ['PG_CONTAINER']; self.database='media_policy_'+uuid.uuid4().hex[:12]
        self.execute(['docker','exec',self.container,'createdb','-U','postgres',self.database])
        self.addCleanup(self.execute,['docker','exec',self.container,'dropdb','-U','postgres',self.database])
        self.sql("""
DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF; END$$;
CREATE SCHEMA storage;
CREATE TABLE storage.objects(bucket_id text,name text,owner uuid);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT ON storage.objects TO authenticated;
CREATE POLICY own_only ON storage.objects TO authenticated USING(owner=nullif(current_setting('request.jwt.claim.sub',true),'')::uuid);
INSERT INTO storage.objects VALUES('private','allowed.txt','11111111-1111-1111-1111-111111111111'),('private','denied.txt','22222222-2222-2222-2222-222222222222');
""")
    def local(self,args,data=None,env=None):
        args=[self.container if arg==access.media.prepare.CONTAINER else arg for arg in args]
        args[args.index('-d')+1]=self.database
        return self.execute(args,data)
    def test_role_is_not_superuser_and_untrusted_claim_strings_cannot_escape_into_sql(self):
        claims={'sub':UID,'role':'authenticated','email':"o'fixture@example.invalid",'user_metadata':{'note':"'); DROP TABLE storage.objects; -- $guard$"}}
        with patch.object(access.media,'local_command',side_effect=self.local):
            self.assertEqual(access.visible_keys(claims),{('private','allowed.txt')})
        self.assertEqual(self.sql('SELECT count(*) FROM storage.objects'),'2')
        self.assertEqual(self.sql('SELECT current_user'),'postgres')
    def test_disabled_rls_is_refused_instead_of_claiming_a_pass(self):
        self.sql('ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;')
        with patch.object(access.media,'local_command',side_effect=self.local):
            with self.assertRaisesRegex(AssertionError,'STORAGE_RLS_DISABLED'):
                access.visible_keys({'sub':UID,'role':'authenticated'})

if __name__=='__main__': unittest.main()
