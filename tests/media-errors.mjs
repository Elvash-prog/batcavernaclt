import test from 'node:test';
import assert from 'node:assert/strict';
import {moderationFailure,mediaFailure} from '../supabase/functions/native-api/media-errors.js';
test('provider failures stay fail-closed and expose only reviewed categories',()=>{
 for(const [type,status,label] of [['credentials_error',400,'MODERATION_CONFIGURATION'],['plan_error',400,'MODERATION_PLAN'],['usage_limit',400,'MODERATION_LIMIT'],['request_error',429,'MODERATION_LIMIT'],['media_error',400,'FORMAT'],['unknown_error',500,'MODERATION_UNAVAILABLE']]){
  const raw={error:{type,message:'private-api-secret-url-and-user'}};
  const code=moderationFailure(raw,status);assert.equal(code,label);
  const logs=[];const response=mediaFailure(new Error(code),{write:e=>logs.push(e),now:1e9+status});
  assert.ok(response.status>=400);assert.doesNotMatch(JSON.stringify({response,logs}),/private-api-secret/);
  if(response.status>=500)assert.ok(response.code.startsWith('media_moderation_'));
 }
 assert.equal(moderationFailure({error:{type:'argument_error',code:1}},400),'MODERATION_CONFIGURATION');
});
test('unexpected exceptions never become a provider body or arbitrary log label',()=>{
 const logs=[];const response=mediaFailure(new Error('private bearer token and file path'),{write:e=>logs.push(e),now:2e9});
 assert.equal(response.status,503);assert.equal(response.code,'media_moderation_unavailable');
 assert.doesNotMatch(JSON.stringify({response,logs}),/bearer|token|file path/);
});
