import datetime,unittest
from audit_dependencies import audit,cargo_inventory,reviewed_exceptions

class AuditTests(unittest.TestCase):
 def test_only_reachable_windows_dependencies_are_selected(self):
  metadata={'resolve':{'root':'app','nodes':[{'id':'app','deps':[{'pkg':'win'}]},{'id':'win','deps':[]},{'id':'linux','deps':[]}]},'packages':[{'id':n,'name':n,'version':'1','source':'registry+fixture'}for n in ['app','win','linux']]}
  self.assertEqual({p[1]for p in cargo_inventory({'package':[]},metadata)},{'app','win'})
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
 def test_reviewed_exception_requires_exact_package_reason_and_valid_expiry(self):
  finding={'id':'FIXTURE-1','affected':[{'ecosystem':'crates.io','name':'fixture','version':'1.0.0'}]}
  row={'id':'FIXTURE-1','expires':'2026-12-31','reason':'Upstream migration is pending.','packages':finding['affected']}
  active,suppressed=reviewed_exceptions([finding],[row],datetime.date(2026,10,27))
  self.assertEqual(active,[]);self.assertEqual([x['id']for x in suppressed],['FIXTURE-1'])
  active,_=reviewed_exceptions([finding],[{**row,'expires':'2026-01-01'}],datetime.date(2026,10,27))
  self.assertEqual([x['id']for x in active],['FIXTURE-1'])

if __name__=='__main__':unittest.main()
