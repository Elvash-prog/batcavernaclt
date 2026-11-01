// Reviewed labels only: never expose provider bodies, filenames, URLs or identity.
const errors={
 UNAUTHORIZED:[401,'media_not_allowed','Sua sessão ou permissão não permite esta operação.'],
 RATE_LIMIT:[429,'over_request_rate_limit','Muitos envios. Aguarde um minuto e tente novamente.'],
 ADULT_CONTENT:[422,'media_content_blocked','Esta imagem está bloqueada. Escolha outra imagem.'],
 TARGET:[422,'media_invalid_target','Destino de envio inválido.'],
 SIZE:[413,'media_too_large','Escolha uma imagem dentro do limite permitido.'],
 FORMAT:[422,'media_invalid_format','Não foi possível ler a imagem. Escolha um arquivo JPG, PNG ou WebP válido.'],
 DIMENSIONS:[413,'media_dimensions_exceeded','Escolha uma imagem de até 8192 pixels por lado e 32 megapixels.'],
 MEDIA_UNAVAILABLE:[503,'media_unavailable','Não foi possível concluir o envio da imagem. Tente novamente mais tarde.'],
 DATABASE:[503,'media_database_unavailable','Não foi possível confirmar o envio da imagem. Tente novamente mais tarde.'],
 UPLOAD:[503,'media_storage_unavailable','Não foi possível armazenar a imagem. Tente novamente mais tarde.'],
 CONFIG:[503,'media_auth_unavailable','Não foi possível verificar sua sessão para enviar a imagem. Tente novamente.']
};
const last=new Map();
export function mediaFailure(error,{write=event=>console.warn(JSON.stringify(event)),now=Date.now()}={}){
 const label=Object.hasOwn(errors,error?.message)?error.message:'MEDIA_UNAVAILABLE';
 const [status,code,message]=errors[label];
 if(status>=500&&(!last.has(code)||now-last.get(code)>=60000)){
  last.set(code,now);
  try{write({event:'media_failure',code,status,stage:label});}catch{}
 }
 return {status,code,message};
}
