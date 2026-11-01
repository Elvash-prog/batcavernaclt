// Reviewed labels only: never expose provider bodies, filenames, URLs or identity.
const errors={
 UNAUTHORIZED:[401,'media_not_allowed','Sua sessão ou permissão não permite esta operação.'],
 RATE_LIMIT:[429,'over_request_rate_limit','Muitos envios. Aguarde um minuto e tente novamente.'],
 ADULT_CONTENT:[422,'media_content_blocked','A imagem foi bloqueada pela análise de conteúdo. Escolha outra imagem.'],
 TARGET:[422,'media_invalid_target','Destino de envio inválido.'],
 SIZE:[413,'media_too_large','Escolha uma imagem dentro do limite permitido.'],
 FORMAT:[422,'media_invalid_format','Não foi possível ler a imagem. Escolha um arquivo JPG, PNG ou WebP válido.'],
 MODERATION_CONFIGURATION:[503,'media_moderation_configuration','A análise de imagens precisa de um ajuste no serviço. Seu perfil não foi alterado.'],
 MODERATION_PLAN:[503,'media_moderation_configuration','A análise de imagens precisa de um ajuste no serviço. Seu perfil não foi alterado.'],
 MODERATION_LIMIT:[503,'media_moderation_limit','O serviço de análise atingiu seu limite de uso. Tente enviar a imagem mais tarde.'],
 MODERATION_UNAVAILABLE:[503,'media_moderation_unavailable','A análise da imagem não está disponível agora. Tente novamente mais tarde.'],
 DATABASE:[503,'media_database_unavailable','Não foi possível confirmar a aprovação da imagem. Tente novamente mais tarde.'],
 UPLOAD:[503,'media_storage_unavailable','Não foi possível armazenar a imagem. Tente novamente mais tarde.'],
 CONFIG:[503,'media_auth_unavailable','Não foi possível verificar sua sessão para enviar a imagem. Tente novamente.']
};
const last=new Map();
export function moderationFailure(data,status){
 const type=data?.error?.type;
 if(type==='credentials_error'||(type==='argument_error'&&data?.error?.code===1)||status===401||status===403)return 'MODERATION_CONFIGURATION';
 if(type==='plan_error')return 'MODERATION_PLAN';
 if(type==='usage_limit'||status===429)return 'MODERATION_LIMIT';
 if(type==='media_error')return 'FORMAT';
 return 'MODERATION_UNAVAILABLE';
}
export function mediaFailure(error,{write=event=>console.warn(JSON.stringify(event)),now=Date.now()}={}){
 const label=Object.hasOwn(errors,error?.message)?error.message:'MODERATION_UNAVAILABLE';
 const [status,code,message]=errors[label];
 if(status>=500&&(!last.has(code)||now-last.get(code)>=60000)){
  last.set(code,now);
  try{write({event:'media_failure',code,status,stage:label});}catch{}
 }
 return {status,code,message};
}
