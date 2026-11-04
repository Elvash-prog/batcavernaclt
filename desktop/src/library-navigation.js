// Keep the collection's visible anchor when a completed edit reloads its data.
(() => {
 'use strict';
 const base=renderLibrary;let category='',owner='',sequence=0;
 renderLibrary=async function(){
  const ticket=++sequence,target=state.libraryCategory,user=state.userId,root=document.querySelector('#content'),box=root?.querySelector('#libraryGroups');
  const position=box&&category===target&&owner===user?window.BatLibraryQuery.capture(root,box):null;
  await base();if(ticket!==sequence||state.current!=='library'||state.libraryCategory!==target||state.userId!==user)return;
  category=target;owner=user;
  if(position&&root.querySelector('#libraryGroups'))window.BatLibraryQuery.restore(root,root.querySelector('#libraryGroups'),position);
 };
})();
