import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{}};vm.runInNewContext(fs.readFileSync(new URL('../desktop/src/profile-images.js',import.meta.url),'utf8'),context);
const {frame,atPoint}=context.window.BatProfileImages;
const near=(a,b)=>assert.ok(Math.abs(a-b)<.001,`${a} != ${b}`);
test('drag positions the image in the direction of the pointer and stays inside the crop',()=>{
 const old={x:50,y:50,z:200};const result=atPoint(400,200,800,600,old,200,{x:200,y:100},{x:250,y:125});
 const before=frame(400,200,800,600,old.x,old.y,old.z),after=frame(400,200,800,600,result.x,result.y,result.z);
 near(after.left-before.left,50);near(after.top-before.top,25);
 for(const sign of [-1,1]){const end=atPoint(400,200,800,600,old,200,{x:200,y:100},{x:sign*99999,y:sign*99999});const box=frame(400,200,800,600,end.x,end.y,end.z);assert.ok(box.left<=0&&box.left+box.w>=400);assert.ok(box.top<=0&&box.top+box.h>=200);}
});
test('wheel and pinch keep the image point under the gesture focus',()=>{
 const old={x:50,y:50,z:150},from={x:180,y:90},to={x:200,y:100};
 const before=frame(400,200,800,600,old.x,old.y,old.z),result=atPoint(400,200,800,600,old,200,from,to),after=frame(400,200,800,600,result.x,result.y,result.z);
 near((from.x-before.left)/before.scale,(to.x-after.left)/after.scale);near((from.y-before.top)/before.scale,(to.y-after.top)/after.scale);
});
test('avatar preview and export use the same square source crop; a fitted axis stays centered',()=>{
 const s={x:70,y:27,z:180},a=frame(164,164,800,600,s.x,s.y,s.z),b=frame(512,512,800,600,s.x,s.y,s.z);near(a.left/a.scale,b.left/b.scale);near(a.top/a.scale,b.top/b.scale);
 const result=atPoint(400,200,800,400,{x:0,y:0,z:200},100,{x:200,y:100});assert.equal(result.x,50);assert.equal(result.y,50);
});
