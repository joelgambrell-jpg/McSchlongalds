window.NexusOneLineStorage=(()=>{
  const PREFIX='nexus-one-line-v3:';
  function load(id){try{const raw=localStorage.getItem(PREFIX+id);return raw?JSON.parse(raw):null}catch(e){console.warn('Diagram load failed',e);return null}}
  function save(id,state){localStorage.setItem(PREFIX+id,JSON.stringify({...state,updatedAt:new Date().toISOString()}));return true}
  function clear(id){localStorage.removeItem(PREFIX+id)}
  return{load,save,clear};
})();
