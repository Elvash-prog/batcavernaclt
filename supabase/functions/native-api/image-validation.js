// Bounded container/metadata validation. No external services or client assertions.
const ascii=(b,at,n)=>String.fromCharCode(...b.subarray(at,at+n));
const u16=(b,at)=>b[at]*256+b[at+1];
const u32=(b,at)=>(b[at]*0x1000000+b[at+1]*0x10000+b[at+2]*256+b[at+3])>>>0;
const le32=(b,at)=>(b[at]+b[at+1]*256+b[at+2]*0x10000+b[at+3]*0x1000000)>>>0;
function dimensions(type,width,height){
 if(!width||!height)throw Error('FORMAT');
 if(width>8192||height>8192||width*height>32000000)throw Error('DIMENSIONS');
 return {type,width,height};
}
export function validateImage(b){
 if(!(b instanceof Uint8Array)||b.length<24)throw Error('FORMAT');
 if(b[0]===137&&ascii(b,1,7)==='PNG\r\n\x1a\n'){
  if(u32(b,8)!==13||ascii(b,12,4)!=='IHDR')throw Error('FORMAT');
  const size=dimensions('image/png',u32(b,16),u32(b,20));let at=8,idat=false,count=0;
  while(at+12<=b.length&&count++<4096){const length=u32(b,at),kind=ascii(b,at+4,4);if(length>b.length-at-12)throw Error('FORMAT');
   if(kind==='IDAT'&&length>0)idat=true;
   if(kind==='IEND'){if(length!==0||at+12!==b.length||!idat||u32(b,at+8)!==0xae426082)throw Error('FORMAT');return size;}
   at+=length+12;
  }
  throw Error('FORMAT');
 }
 if(b[0]===255&&b[1]===216&&b[b.length-2]===255&&b[b.length-1]===217){
  let at=2,size=null,count=0;
  while(at+4<=b.length&&count++<4096){if(b[at++]!==255)throw Error('FORMAT');while(b[at]===255)at++;const marker=b[at++];
   if(marker===0xd9)break;
   const length=u16(b,at);if(length<2||at+length>b.length)throw Error('FORMAT');
   if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){
    if(length<8)throw Error('FORMAT');size=dimensions('image/jpeg',u16(b,at+5),u16(b,at+3));
   }
   if(marker===0xda){if(!size||at+length>=b.length-2)throw Error('FORMAT');return size;}
   at+=length;
  }
  throw Error('FORMAT');
 }
 if(ascii(b,0,4)==='RIFF'&&ascii(b,8,4)==='WEBP'&&le32(b,4)===b.length-8){
  let at=12,size=null,payload=false,count=0;
  while(at+8<=b.length&&count++<4096){const kind=ascii(b,at,4),length=le32(b,at+4),data=at+8;if(length>b.length-data)throw Error('FORMAT');
   if(kind==='ANIM'||kind==='ANMF')throw Error('FORMAT');
   if(kind==='VP8X'){if(length!==10)throw Error('FORMAT');size=dimensions('image/webp',1+b[data+4]+b[data+5]*256+b[data+6]*65536,1+b[data+7]+b[data+8]*256+b[data+9]*65536);}
   if(kind==='VP8 '){if(length<10||ascii(b,data+3,3)!=='\x9d\x01\x2a')throw Error('FORMAT');const actual=dimensions('image/webp',(b[data+6]+b[data+7]*256)&16383,(b[data+8]+b[data+9]*256)&16383);if(size&&(size.width!==actual.width||size.height!==actual.height))throw Error('FORMAT');size=actual;payload=true;}
   if(kind==='VP8L'){if(length<5||b[data]!==47)throw Error('FORMAT');const bits=le32(b,data+1),actual=dimensions('image/webp',(bits&16383)+1,((bits>>>14)&16383)+1);if(size&&(size.width!==actual.width||size.height!==actual.height))throw Error('FORMAT');size=actual;payload=true;}
   at=data+length+(length%2);
  }
  if(at===b.length&&size&&payload)return size;
 }
 throw Error('FORMAT');
}
