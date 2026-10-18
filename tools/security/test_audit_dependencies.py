import unittest
from audit_dependencies import audit

class AuditTests(unittest.TestCase):
 def test_pagination_and_withdrawn_records(self):
  calls=[]
  def transport(path,body=None):
   calls.append((path,body))
   if path=='querybatch':
    return {'results':[{'vulns':[{'id':'FIXTURE-2'}]}]} if 'page_token' in body['queries'][0] else {'results':[{'vulns':[{'id':'FIXTURE-1'}],'next_page_token':'next'}]}
   return {'withdrawn':'2020-01-01'} if path.endswith('FIXTURE-2') else {'summary':'Synthetic advisory'}
  findings=audit([('npm','synthetic','1.0.0')],transport)
  self.assertEqual([f['id']for f in findings],['FIXTURE-1'])
  self.assertEqual(calls[1][1]['queries'][0]['page_token'],'next')
 def test_partial_response_is_failure(self):
  with self.assertRaises(RuntimeError):audit([('npm','synthetic','1.0.0')],lambda *_:{'results':[]})
 def test_package_errors_are_failure(self):
  with self.assertRaises(RuntimeError):audit([('npm','synthetic','1.0.0')],lambda *_:{'results':[{'error':'failed'}]})

if __name__=='__main__':unittest.main()
