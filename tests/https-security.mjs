import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';

const env={ASSETS:{async fetch(){return new Response('presentation');}}};
test('HTTP always redirects to HTTPS before serving pages or endpoints',async()=>{
  for(const path of ['/','/privacidade?source=test','/marketing/site.css','/api/account/login']){
    for(const method of ['GET','HEAD','POST']){
      let calls=0;
      const response=await worker.fetch(new Request('http://presentation.test'+path,{method}),{ASSETS:{fetch(){calls++;throw Error('HTTP assets must not be served');}}});
      assert.equal(response.status,308);
      assert.equal(response.headers.get('Location'),'https://presentation.test'+path);
      assert.equal(calls,0);
      assert.equal(await response.text(),'');
    }
  }
});
test('HTTPS responses retain the security headers, including retired endpoints',async()=>{
  for(const path of ['/','/privacidade','/marketing/site.css','/api/account/login']){
    for(const method of ['GET','HEAD','POST']){
      const response=await worker.fetch(new Request('https://presentation.test'+path,{method}),env);
      assert.equal(response.status,method==='POST'||path.startsWith('/api/')?410:200);
      assert.equal(response.headers.get('Strict-Transport-Security'),'max-age=31536000');
      assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
      assert.equal(response.headers.get('X-Frame-Options'),'DENY');
      assert.equal(response.headers.get('Referrer-Policy'),'strict-origin-when-cross-origin');
      assert.match(response.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);
      assert.equal(response.headers.get('Location'),null);
    }
  }
});
