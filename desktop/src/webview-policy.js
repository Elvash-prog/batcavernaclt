// Application behavior only. Authorization and database protection live on the server.
document.addEventListener('contextmenu',event=>event.preventDefault());
document.addEventListener('keydown',event=>{
 const key=event.key.toLowerCase(),command=event.ctrlKey||event.metaKey;
 if(key==='f12'||(command&&['r','p','s'].includes(key))||(command&&event.shiftKey&&['i','j','c'].includes(key)))event.preventDefault();
});
