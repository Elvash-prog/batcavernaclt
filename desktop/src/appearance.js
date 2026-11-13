export function normalizeTheme(theme={}) {
 // Upgrade only the former built-in light background; preserve custom colors.
 return theme.preset==='Claro'&&String(theme.bg||'').toLowerCase()==='#eef2f8'?{...theme,bg:'#faf9fd'}:{...theme};
}

export function accentText(hex) {
 const rgb=/^#[0-9a-f]{6}$/i.test(hex||'')?hex:'#7947f5';
 const linear=value=>{value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;};
 const luminance=[.2126,.7152,.0722].reduce((sum,weight,index)=>sum+weight*linear(parseInt(rgb.slice(1+index*2,3+index*2),16)),0);
 return (luminance+.05)/.05>1.05/(luminance+.05)?'#000000':'#ffffff';
}

// Existing application wallpapers take precedence until the user next changes the image.
// Afterwards profile.fundo is the single account-backed wallpaper for every screen.
export function wallpaperSource(theme={},profile={}) {
 const legacy=String(theme.background||'');
 if(/^data:image\/(png|jpeg|webp);base64,/i.test(legacy))return legacy;
 const value=typeof profile?.fundo==='string'?profile.fundo:profile?.fundo?.url;
 return /^https:\/\//i.test(String(value||''))?value:'';
}

export function createWallpaper({resolve,paint,owner}) {
 let generation=0,key='',flight=Promise.resolve();
 return {
  update(theme,profile,account){
   const source=account?wallpaperSource(theme,profile):'',next=JSON.stringify([account,source]);
   if(next===key)return flight;
   key=next;const ticket=++generation;
   paint('');
   if(!source)return flight=Promise.resolve();
   flight=(async()=>{try{const image=await resolve(source);if(ticket===generation&&account===owner())paint(image);}catch{if(ticket===generation)key='';}})();
   return flight;
  },
  clear(){generation++;key='';paint('');}
 };
}
if(typeof window!=='undefined')window.BatAppearance={normalizeTheme,accentText,wallpaperSource,createWallpaper};
