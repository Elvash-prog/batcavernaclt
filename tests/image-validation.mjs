import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateImage} from '../supabase/functions/native-api/image-validation.js';
const image=ext=>new Uint8Array(fs.readFileSync(new URL('./fixtures/profile-images/valid.'+ext,import.meta.url)));
test('real PNG, JPEG and WebP fixtures expose bounded dimensions',()=>{
 for(const [ext,type] of [['png','image/png'],['jpg','image/jpeg'],['webp','image/webp']])assert.deepEqual(validateImage(image(ext)),{type,width:8,height:6});
});
test('prefix-only, truncated, HTML and malformed containers are refused',()=>{
 for(const data of [new Uint8Array([255,216,255]),new TextEncoder().encode('<html><script>bad()</script></html>'),...['jpg','png','webp'].map(ext=>image(ext).slice(0,-10))])assert.throws(()=>validateImage(data),/FORMAT/);
 const webp=image('webp');webp[4]=0;assert.throws(()=>validateImage(webp),/FORMAT/);
});
test('dimension bombs are rejected before storage without decoding pixel buffers',()=>{
 const png=image('png');png.set([0,0,40,0],16);assert.throws(()=>validateImage(png),/DIMENSIONS/);
 const pixels=image('png');pixels.set([0,0,30,0],16);pixels.set([0,0,30,0],20);assert.throws(()=>validateImage(pixels),/DIMENSIONS/);
});
