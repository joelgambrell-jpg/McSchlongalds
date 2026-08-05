/**
 * NEXUS SMART PROPERTIES + LAYOUT ASSISTANT
 * Engineering editor only. Additive; does not replace the core renderer.
 */
(function initializeNexusSmartTools(){
  "use strict";

  function isEditor(){return new URLSearchParams(location.search).get("mode")!=="view";}
  function q(root,sel){return root?root.querySelector(sel):null;}
  function qa(root,sel){return root?Array.from(root.querySelectorAll(sel)):[];}
  function num(value){const n=parseFloat(String(value||"").replace("%",""));return Number.isFinite(n)?Math.max(0,Math.min(100,Math.round(n))):0;}
  function color(p){if(p===100)return"#00f56a";if(p>=61)return"#ffe600";if(p>=26)return"#ff7a00";if(p>=1)return"#1f7dff";return"#8b929b";}
  function status(p){if(p===100)return"Ready for Energization";if(p>=61)return"Final Verification";if(p>=26)return"In Progress";if(p>=1)return"Started";return"Not Started";}

  function selectedNode(root){return q(root,".node.selected");}
  function nodeData(node){
    if(!node)return null;
    return {
      id:(q(node,".id")||{}).textContent||"Equipment",
      type:(q(node,".type")||{}).textContent||"Equipment",
      percent:num((q(node,".pct")||{}).textContent)
    };
  }

  function projectSummary(root){
    const nodes=qa(root,".node");
    const percentages=nodes.map(n=>num((q(n,".pct")||{}).textContent));
    const total=nodes.length;
    const average=total?Math.round(percentages.reduce((a,b)=>a+b,0)/total):0;
    const ready=percentages.filter(p=>p===100).length;
    return {total,average,ready};
  }

  function ensureHealthCard(root){
    const wrap=q(root,".properties-wrap");
    if(!wrap)return null;
    let card=q(wrap,".nx-smart-health");
    if(!card){
      card=document.createElement("section");
      card.className="nx-smart-health";
      wrap.insertBefore(card,wrap.firstChild);
    }
    return card;
  }

  function renderHealth(root){
    const card=ensureHealthCard(root);if(!card)return;
    const node=selectedNode(root);
    const data=nodeData(node);
    if(!data){
      const s=projectSummary(root);
      card.innerHTML='<div class="nx-sub">Project Summary</div><h3>Building Overview</h3><div class="nx-smart-progress" style="--nx-health:'+color(s.average)+'"><i style="--nx-pct:'+s.average+'%"></i></div><div class="nx-smart-grid"><div class="nx-smart-stat"><small>Equipment</small><strong>'+s.total+'</strong></div><div class="nx-smart-stat"><small>Overall</small><strong>'+s.average+'%</strong></div><div class="nx-smart-stat"><small>Ready</small><strong>'+s.ready+'</strong></div><div class="nx-smart-stat"><small>Remaining</small><strong>'+Math.max(0,s.total-s.ready)+'</strong></div></div>';
      return;
    }
    const c=color(data.percent);
    card.innerHTML='<div class="nx-sub">Equipment Health</div><h3>'+data.id+'</h3><div class="nx-sub">'+data.type+'</div><div class="nx-smart-progress" style="--nx-health:'+c+'"><i style="--nx-pct:'+data.percent+'%"></i></div><div class="nx-smart-grid"><div class="nx-smart-stat"><small>Progress</small><strong>'+data.percent+'%</strong></div><div class="nx-smart-stat"><small>Status</small><strong>'+status(data.percent)+'</strong></div><div class="nx-smart-stat"><small>Ready</small><strong>'+(data.percent===100?'YES':'NO')+'</strong></div><div class="nx-smart-stat"><small>Selected</small><strong>Equipment</strong></div></div><button class="nx-smart-open" type="button">Open Equipment</button>';
    const open=q(card,".nx-smart-open");
    if(open)open.addEventListener("click",function(){window.open("equipment.html?eq="+encodeURIComponent(data.id),"_blank","noopener,noreferrer");});
  }

  function findButton(root,terms){
    return qa(root,"button").find(function(button){
      const text=(button.textContent||"").trim().toLowerCase();
      const action=(button.dataset.action||"").toLowerCase();
      return terms.some(t=>text.includes(t)||action.includes(t));
    })||null;
  }

  function ensureLayoutAssistant(root){
    const properties=q(root,".properties-wrap");if(!properties)return;
    if(!q(properties,".nx-layout-launch")){
      const launch=document.createElement("button");
      launch.className="nx-layout-launch";launch.type="button";launch.textContent="Layout Assistant";
      properties.insertBefore(launch,properties.firstChild);
      launch.addEventListener("click",()=>openDialog(root));
    }
    if(!q(document,".nx-layout-dialog")){
      const dialog=document.createElement("div");dialog.className="nx-layout-dialog";dialog.hidden=true;
      dialog.innerHTML='<div class="nx-layout-card" role="dialog" aria-modal="true"><h2>Layout Assistant</h2><p>Optimizes the diagram while preserving manual control. Equipment remains movable after every layout operation.</p><div class="nx-layout-modes"><label class="nx-layout-mode"><input type="radio" name="nx-layout-mode" value="engineering" checked><span><strong>Engineering</strong><small>Aligned, evenly spaced, and compact.</small></span></label><label class="nx-layout-mode"><input type="radio" name="nx-layout-mode" value="electrical"><span><strong>Electrical</strong><small>Uses the core automatic arrangement and fits the complete power flow.</small></span></label><label class="nx-layout-mode"><input type="radio" name="nx-layout-mode" value="presentation"><span><strong>Presentation</strong><small>Arranges and centers the full diagram for review or display.</small></span></label></div><div class="nx-layout-options"><label><input type="checkbox" data-opt="locked" checked> Respect locked equipment</label><label><input type="checkbox" data-opt="groups" checked> Preserve manual groups</label><label><input type="checkbox" data-opt="fit" checked> Fit after applying</label><label><input type="checkbox" data-opt="manual" checked disabled> Keep manual movement</label></div><div class="nx-layout-actions"><button type="button" data-cancel>Cancel</button><button type="button" class="primary" data-apply>Apply</button></div><div class="nx-layout-note">Use Undo immediately after applying if the result is not preferred.</div></div>';
      document.body.appendChild(dialog);
      q(dialog,"[data-cancel]").addEventListener("click",()=>dialog.hidden=true);
      dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.hidden=true;});
    }
  }

  function openDialog(root){
    const dialog=q(document,".nx-layout-dialog");if(!dialog)return;
    dialog.hidden=false;
    const apply=q(dialog,"[data-apply]");
    apply.onclick=function(){
      const selected=q(dialog,'input[name="nx-layout-mode"]:checked');
      const mode=selected?selected.value:"engineering";
      const auto=findButton(root,["auto arrange","auto-arrange","arrange"]);
      const fit=findButton(root,["fit"]);
      if(auto)auto.click();
      if(mode==="presentation"&&fit)setTimeout(()=>fit.click(),80);
      if(mode==="electrical"&&fit&&q(dialog,'[data-opt="fit"]').checked)setTimeout(()=>fit.click(),80);
      if(mode==="engineering"&&fit&&q(dialog,'[data-opt="fit"]').checked)setTimeout(()=>fit.click(),80);
      dialog.hidden=true;
    };
  }

  function install(root){
    if(!root||root.dataset.smartToolsInstalled==="1")return;
    root.dataset.smartToolsInstalled="1";
    ensureLayoutAssistant(root);renderHealth(root);
    let queued=false;
    const observer=new MutationObserver(function(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;ensureLayoutAssistant(root);renderHealth(root);});});
    observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  }
  function scan(){if(!isEditor())return;qa(document,".nexus-one-line").forEach(install);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",scan,{once:true});else scan();
  new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
})();
