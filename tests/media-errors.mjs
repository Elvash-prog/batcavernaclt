import test from 'node:test';
import assert from 'node:assert/strict';
import {mediaFailure} from '../supabase/functions/native-api/media-errors.js';
test('media errors use only reviewed labels and never expose provider or database bodies',()=>{
 for(const [input,status,code] of [['FORMAT',422,'media_invalid_format'],['DIMENSIONS',413,'media_dimensions_exceeded'],['UNAUTHORIZED',401,'media_not_allowed'],['UPLOAD',503,'media_storage_unavailable'],['DATABASE',503,'media_database_unavailable'],['private SQL bearer secret user filename',503,'media_unavailable']]){
  const logs=[];const result=mediaFailure(new Error(input),{write:e=>logs.push(e),now:2e9});
  assert.equal(result.status,status);assert.equal(result.code,code);
  assert.doesNotMatch(JSON.stringify({result,logs}),/SQL|bearer|secret|filename/);
 }
});
