// Only public catalogue descriptions reach this module; never reviews or account data.
import {persistentCatalogQuery} from './catalog-cache.js';
const pending=new Map();
export async function translateDescription(env,text){
 const original=String(text||'').trim();
 if(!original||!env.DEEPL_API_KEY||original.length>16000)return {text:original,translated:false};
 // A single in-flight request per source text in this isolate; shared database cache across devices.
 const key='translation:en:pt-BR:v1:'+original;
 if(pending.has(key))return pending.get(key);
 const task=(async()=>{try{
  const rows=await persistentCatalogQuery(env,key,async()=>{
   const response=await fetch('https://api-free.deepl.com/v2/translate',{method:'POST',headers:{Authorization:'DeepL-Auth-Key '+env.DEEPL_API_KEY,'content-type':'application/json'},body:JSON.stringify({text:[original],source_lang:'EN',target_lang:'PT-BR',preserve_formatting:true}),redirect:'error',signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error('TRANSLATION_UNAVAILABLE');
   const result=await response.json(),translated=result.translations?.[0]?.text;
   if(typeof translated!=='string'||!translated.trim())throw Error('TRANSLATION_UNAVAILABLE');
   return [{text:translated,translated:true}];
  });
  if(typeof rows?.[0]?.text!=='string'||rows[0].translated!==true)throw Error('TRANSLATION_UNAVAILABLE');
  return rows[0];
 }catch{return {text:original,translated:false}}})();
 pending.set(key,task);try{return await task}finally{pending.delete(key)}
}
