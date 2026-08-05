/**
 * NEXUS SMART PROPERTIES + LAYOUT ASSISTANT
 * Engineering editor only. Additive; does not replace the core renderer.
 *
 * Completion-key behavior:
 * - Removes the duplicate legacy Completion legend from the right panel.
 * - Keeps the Mini Map and all original Properties editing controls.
 * - Provides one white diagram key that is movable, collapsible, and closable.
 * - Saves position, collapsed state, and visibility in localStorage.
 * - Adds a toolbar Key button so a closed key can always be restored.
 */
(function initializeNexusSmartTools(){
  "use strict";

  function isEditor(){return new URLSearchParams(location.search).get("mode")!=="view";}
  function q(root,sel){return root?root.querySelector(sel):null;}
  function qa(root,sel){return root?Array.from(root.querySelectorAll(sel)):[];}
  function num(value){const n=parseFloat(String(value||"").replace("%",""));return Number.isFinite(n)?Math.max(0,Math.min(100,Math.round(n))):0;}
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
    const notStarted=percentages.filter(p=>p===0).length;
    return {total,average,ready,notStarted,remaining:Math.max(0,total-ready)};
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
      card.innerHTML=
        '<div class="nx-sub">Project Summary</div>'+
        '<h3>Building Overview</h3>'+
        '<div class="nx-smart-grid nx-summary-grid">'+
          '<div class="nx-smart-stat"><small>Equipment</small><strong>'+s.total+'</strong></div>'+
          '<div class="nx-smart-stat"><small>Overall</small><strong>'+s.average+'%</strong></div>'+
          '<div class="nx-smart-stat"><small>Ready</small><strong>'+s.ready+'</strong></div>'+
          '<div class="nx-smart-stat"><small>Remaining</small><strong>'+s.remaining+'</strong></div>'+
          '<div class="nx-smart-stat"><small>Not Started</small><strong>'+s.notStarted+'</strong></div>'+
          '<div class="nx-smart-stat"><small>Status</small><strong>'+status(s.average)+'</strong></div>'+
        '</div>'+
        '<div class="nx-smart-guidance"><strong>No object selected</strong><span>Select equipment, a connection, label, or zone to view its information and editing controls.</span></div>';
      return;
    }

    card.innerHTML=
      '<div class="nx-sub">Selected Equipment</div>'+
      '<h3>'+data.id+'</h3>'+
      '<div class="nx-selected-type">'+data.type+'</div>'+
      '<div class="nx-smart-grid">'+
        '<div class="nx-smart-stat"><small>Completion</small><strong>'+data.percent+'%</strong></div>'+
        '<div class="nx-smart-stat"><small>Status</small><strong>'+status(data.percent)+'</strong></div>'+
        '<div class="nx-smart-stat"><small>Ready</small><strong>'+(data.percent===100?'YES':'NO')+'</strong></div>'+
        '<div class="nx-smart-stat"><small>Object</small><strong>Equipment</strong></div>'+
      '</div>'+
      '<div class="nx-smart-guidance"><strong>Equipment details</strong><span>Use the existing Properties controls below for placement, size, shape, lock state, and other diagram settings.</span></div>'+
      '<button class="nx-smart-open" type="button">Open Equipment in NEXUS</button>';

    const open=q(card,".nx-smart-open");
    if(open)open.addEventListener("click",function(){window.open("equipment.html?eq="+encodeURIComponent(data.id),"_blank","noopener,noreferrer");});
  }

  function removeLegacySidebarCompletion(root){
    const wrap=q(root,".properties-wrap");
    if(!wrap)return;

    qa(wrap,"section,div").forEach(function inspect(candidate){
      if(candidate.classList.contains("nx-smart-health")||candidate.closest(".nx-smart-health"))return;
      const full=(candidate.textContent||"").replace(/\s+/g," ").trim();
      if(!/^Completion(?:\s|$)/i.test(full))return;
      if(!/100% Complete/i.test(full)||!/No Data/i.test(full))return;

      const section=candidate.closest("section,.properties-section,.property-section,.completion-legend,.legend")||candidate;
      if(section&&section!==wrap)section.remove();
    });
  }

  function storageKey(root){
    const params=new URLSearchParams(location.search);
    return [
      "nexus-one-line-key",
      params.get("project")||"sample-project",
      params.get("building")||"A",
      params.get("diagram")||"overall"
    ].join(":");
  }

  function readLegendState(root){
    try{
      const value=JSON.parse(localStorage.getItem(storageKey(root))||"null");
      return value&&typeof value==="object"?value:{};
    }catch(error){return {};}
  }

  function saveLegendState(root,legend){
    try{
      const state={
        left:parseFloat(legend.style.left)||null,
        top:parseFloat(legend.style.top)||null,
        collapsed:legend.classList.contains("collapsed"),
        hidden:legend.hidden===true
      };
      localStorage.setItem(storageKey(root),JSON.stringify(state));
    }catch(error){/* local storage may be unavailable in restricted browsers */}
  }

  function clampLegend(viewport,legend,left,top){
    const margin=8;
    const maxLeft=Math.max(margin,viewport.clientWidth-legend.offsetWidth-margin);
    const maxTop=Math.max(margin,viewport.clientHeight-legend.offsetHeight-margin);
    return {
      left:Math.min(Math.max(margin,left),maxLeft),
      top:Math.min(Math.max(margin,top),maxTop)
    };
  }

  function applySavedLegendState(root,viewport,legend){
    const state=readLegendState(root);
    legend.classList.toggle("collapsed",state.collapsed===true);
    legend.hidden=state.hidden===true;

    const toggle=q(legend,".nx-legend-collapse");
    if(toggle){
      toggle.setAttribute("aria-expanded",state.collapsed===true?"false":"true");
      toggle.textContent=state.collapsed===true?"+":"−";
      toggle.title=state.collapsed===true?"Expand completion key":"Collapse completion key";
    }

    requestAnimationFrame(function positionSavedLegend(){
      const defaultLeft=Math.max(8,viewport.clientWidth-legend.offsetWidth-14);
      const defaultTop=Math.max(8,viewport.clientHeight-legend.offsetHeight-14);
      const position=clampLegend(
        viewport,
        legend,
        Number.isFinite(Number(state.left))?Number(state.left):defaultLeft,
        Number.isFinite(Number(state.top))?Number(state.top):defaultTop
      );
      legend.style.left=position.left+"px";
      legend.style.top=position.top+"px";
    });
  }

  function ensureLegendRestoreButton(root,legend){
    let button=q(root,".nx-key-restore");
    if(button)return button;

    const toolbar=q(root,".toolbar,.tool-row,.top-tools,.controls")||q(root,"header");
    if(!toolbar)return null;

    button=document.createElement("button");
    button.type="button";
    button.className="nx-key-restore";
    button.textContent="Key";
    button.title="Show the completion key";
    button.addEventListener("click",function(){
      legend.hidden=false;
      saveLegendState(root,legend);
      button.hidden=true;
    });
    toolbar.appendChild(button);
    button.hidden=!legend.hidden;
    return button;
  }

  function enableLegendDrag(root,viewport,legend){
    const handle=q(legend,".nx-legend-drag");
    if(!handle||handle.dataset.dragReady==="1")return;
    handle.dataset.dragReady="1";

    let drag=null;
    handle.addEventListener("pointerdown",function(event){
      if(event.button!==0)return;
      const legendRect=legend.getBoundingClientRect();
      const viewportRect=viewport.getBoundingClientRect();
      drag={
        pointerId:event.pointerId,
        offsetX:event.clientX-legendRect.left,
        offsetY:event.clientY-legendRect.top,
        viewportLeft:viewportRect.left,
        viewportTop:viewportRect.top
      };
      handle.setPointerCapture(event.pointerId);
      legend.classList.add("dragging");
      event.preventDefault();
    });

    handle.addEventListener("pointermove",function(event){
      if(!drag||event.pointerId!==drag.pointerId)return;
      const requestedLeft=event.clientX-drag.viewportLeft-drag.offsetX;
      const requestedTop=event.clientY-drag.viewportTop-drag.offsetY;
      const position=clampLegend(viewport,legend,requestedLeft,requestedTop);
      legend.style.left=position.left+"px";
      legend.style.top=position.top+"px";
    });

    function finish(event){
      if(!drag||event.pointerId!==drag.pointerId)return;
      drag=null;
      legend.classList.remove("dragging");
      saveLegendState(root,legend);
    }
    handle.addEventListener("pointerup",finish);
    handle.addEventListener("pointercancel",finish);
  }

  function ensureCanvasLegend(root){
    const viewport=q(root,".canvas-viewport");
    if(!viewport)return;

    let legend=q(viewport,".nx-canvas-legend");
    if(!legend){
      legend=document.createElement("aside");
      legend.className="nx-canvas-legend";
      legend.setAttribute("aria-label","Equipment completion color key");
      legend.innerHTML=
        '<div class="nx-legend-titlebar">'+
          '<button class="nx-legend-drag" type="button" aria-label="Drag completion key" title="Drag completion key">⋮⋮</button>'+
          '<strong>Completion Key</strong>'+
          '<span class="nx-legend-actions">'+
            '<button class="nx-legend-collapse" type="button" aria-expanded="true" title="Collapse completion key">−</button>'+
            '<button class="nx-legend-close" type="button" title="Hide completion key">×</button>'+
          '</span>'+
        '</div>'+
        '<div class="nx-legend-body">'+
          '<div><i class="nx-key-gray"></i><span>Not Started</span><b>0%</b></div>'+
          '<div><i class="nx-key-blue"></i><span>Started</span><b>1–25%</b></div>'+
          '<div><i class="nx-key-orange"></i><span>In Progress</span><b>26–60%</b></div>'+
          '<div><i class="nx-key-yellow"></i><span>Near Complete</span><b>61–99%</b></div>'+
          '<div><i class="nx-key-green"></i><span>Ready</span><b>100%</b></div>'+
          '<div><i class="nx-key-red"></i><span>Energized</span><b>Engineer Set</b></div>'+
          '<div class="nx-legend-help">Drag to move • − to collapse</div>'+
        '</div>';
      viewport.appendChild(legend);
      applySavedLegendState(root,viewport,legend);
    }

    enableLegendDrag(root,viewport,legend);
    const restore=ensureLegendRestoreButton(root,legend);

    const collapse=q(legend,".nx-legend-collapse");
    if(collapse&&!collapse.dataset.ready){
      collapse.dataset.ready="1";
      collapse.addEventListener("click",function(){
        const collapsed=legend.classList.toggle("collapsed");
        collapse.setAttribute("aria-expanded",collapsed?"false":"true");
        collapse.textContent=collapsed?"+":"−";
        collapse.title=collapsed?"Expand completion key":"Collapse completion key";
        const position=clampLegend(viewport,legend,parseFloat(legend.style.left)||8,parseFloat(legend.style.top)||8);
        legend.style.left=position.left+"px";
        legend.style.top=position.top+"px";
        saveLegendState(root,legend);
      });
    }

    const close=q(legend,".nx-legend-close");
    if(close&&!close.dataset.ready){
      close.dataset.ready="1";
      close.addEventListener("click",function(){
        legend.hidden=true;
        if(restore)restore.hidden=false;
        saveLegendState(root,legend);
      });
    }

    if(restore)restore.hidden=!legend.hidden;
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
      const auto=findButton(root,["auto arrange","auto-arrange","arrange"]);
      const fit=findButton(root,["fit"]);
      if(auto)auto.click();
      if(fit&&q(dialog,'[data-opt="fit"]').checked)setTimeout(()=>fit.click(),80);
      dialog.hidden=true;
    };
  }

  function install(root){
    if(!root||root.dataset.smartToolsInstalled==="1")return;
    root.dataset.smartToolsInstalled="1";
    ensureLayoutAssistant(root);
    ensureCanvasLegend(root);
    removeLegacySidebarCompletion(root);
    renderHealth(root);

    let queued=false;
    const observer=new MutationObserver(function(){
      if(queued)return;
      queued=true;
      requestAnimationFrame(function(){
        queued=false;
        ensureLayoutAssistant(root);
        ensureCanvasLegend(root);
        removeLegacySidebarCompletion(root);
        renderHealth(root);
      });
    });
    observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  }

  function scan(){if(!isEditor())return;qa(document,".nexus-one-line").forEach(install);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",scan,{once:true});else scan();
  new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
})();
