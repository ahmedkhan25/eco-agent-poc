import type { SystemModel } from "./types";
import { CATEGORY_COLORS, LINK_COLORS } from "./constants";

/**
 * Generate a self-contained interactive HTML file from a SystemModel.
 * Based on the ecoheart-systems-graph reference implementation.
 */
export function generateInteractiveHTML(model: SystemModel): string {
  const modelJSON = JSON.stringify(model, null, 2);
  const colorsJSON = JSON.stringify(CATEGORY_COLORS);
  const linkColorsJSON = JSON.stringify(LINK_COLORS);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${model.name} — EcoHeart Systems Modeler</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"><\/script>
<style>
  :root { --bg:#1a2f22; --panel:#162219; --green:#3ddc84; --text:#d4e8d8; --text-dim:#7a9e82; --border:#1e3528; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:var(--bg); color:var(--text); font-family:system-ui,sans-serif; height:100vh; overflow:hidden; }
  header { position:fixed; top:0; left:0; right:0; height:50px; background:linear-gradient(180deg,#1a2f22,transparent); display:flex; align-items:center; padding:0 20px; gap:12px; z-index:50; }
  .logo { font-size:18px; font-weight:700; color:var(--green); }
  .logo span { color:var(--text-dim); font-weight:400; font-size:12px; margin-left:8px; }
  .model-name { color:var(--text); font-size:13px; }
  #graph-container { width:100vw; height:100vh; }
  svg { width:100%; height:100%; }
  #controls { position:fixed; bottom:20px; left:50%; transform:translateX(-50%); display:flex; gap:6px; z-index:50; background:rgba(13,26,18,0.85); backdrop-filter:blur(12px); border:1px solid var(--border); border-radius:30px; padding:6px 10px; }
  .ctrl-btn { width:32px; height:32px; border-radius:50%; border:1px solid var(--border); background:transparent; color:var(--text-dim); cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
  .ctrl-btn:hover { color:var(--green); border-color:var(--green); }
  .node circle { stroke-width:2; cursor:grab; transition:filter 0.2s; }
  .node circle:hover { filter:brightness(1.3); }
  .node text { font-family:system-ui,sans-serif; font-size:10px; fill:var(--text); text-anchor:middle; dominant-baseline:middle; pointer-events:none; }
  .link { fill:none; stroke-width:1.5; opacity:0.7; }
  #tooltip { position:fixed; background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:8px 12px; font-size:12px; pointer-events:none; z-index:200; max-width:200px; opacity:0; transition:opacity 0.15s; }
  #tooltip.visible { opacity:1; }
  #tooltip .tt-title { font-weight:600; color:var(--green); margin-bottom:4px; }
  #tooltip .tt-body { color:var(--text-dim); line-height:1.5; }
</style>
</head>
<body>
<header>
  <div class="logo">ecoheart <span>Systems Modeler</span></div>
  <div style="width:1px;height:20px;background:var(--border)"></div>
  <div class="model-name">${model.name}</div>
</header>
<div id="graph-container"></div>
<div id="controls">
  <button class="ctrl-btn" onclick="zoomBy(1.2)">+</button>
  <button class="ctrl-btn" onclick="zoomBy(0.8)">&minus;</button>
  <button class="ctrl-btn" onclick="resetView()">&#8962;</button>
</div>
<div id="tooltip"><div class="tt-title" id="tt-title"></div><div class="tt-body" id="tt-body"></div></div>
<script>
const model = ${modelJSON};
const categoryColors = ${colorsJSON};
const linkColors = ${linkColorsJSON};

const container = document.getElementById('graph-container');
const W = container.clientWidth, H = container.clientHeight;
const svg = d3.select('#graph-container').append('svg');
const defs = svg.append('defs');

['reinforcing','balancing'].forEach(type => {
  defs.append('marker').attr('id','arrow-'+type).attr('viewBox','0 -5 10 10')
    .attr('refX',22).attr('refY',0).attr('markerWidth',6).attr('markerHeight',6).attr('orient','auto')
    .append('path').attr('d','M0,-5L10,0L0,5').attr('fill',linkColors[type]);
});

const grad = defs.append('radialGradient').attr('id','bgGrad').attr('cx','50%').attr('cy','50%');
grad.append('stop').attr('offset','0%').attr('stop-color','#172b1e');
grad.append('stop').attr('offset','100%').attr('stop-color','#1a2f22');
svg.append('rect').attr('width','100%').attr('height','100%').attr('fill','url(#bgGrad)');

const g = svg.append('g');
const zoomBehavior = d3.zoom().scaleExtent([0.2,3]).on('zoom',e=>g.attr('transform',e.transform));
svg.call(zoomBehavior);

const nodes = model.nodes.map((n,i) => {
  const angle = (i/model.nodes.length)*2*Math.PI;
  return {...n, x:W/2+Math.cos(angle)*220, y:H/2+Math.sin(angle)*180};
});
const links = model.links.map(l=>({...l}));

const simulation = d3.forceSimulation(nodes)
  .force('link',d3.forceLink(links).id(d=>d.id).distance(160).strength(0.5))
  .force('charge',d3.forceManyBody().strength(-400))
  .force('center',d3.forceCenter(W/2,H/2))
  .force('collision',d3.forceCollide(55));

const linkSel = g.append('g').selectAll('path').data(links).enter().append('path')
  .attr('class','link').attr('stroke',d=>linkColors[d.type]).attr('fill','none')
  .attr('stroke-width',1.5).attr('opacity',0.7).attr('marker-end',d=>'url(#arrow-'+d.type+')');

const edgeLabels = g.append('g').selectAll('text').data(links).enter().append('text')
  .attr('font-size','9px').attr('fill','#5a7a62').attr('text-anchor','middle').text(d=>d.lag);

const loopSel = g.append('g').selectAll('g').data(model.loops).enter().append('g').style('cursor','pointer');
loopSel.append('circle').attr('r',16).attr('fill',d=>d.type==='R'?linkColors.reinforcing:linkColors.balancing).attr('opacity',0.9);
loopSel.append('text').attr('text-anchor','middle').attr('dominant-baseline','middle').attr('fill','white').attr('font-size','11px').attr('font-weight','700').text(d=>d.id);

const nodeSel = g.append('g').selectAll('g').data(nodes).enter().append('g').attr('class','node')
  .call(d3.drag().on('start',(e,d)=>{if(!e.active)simulation.alphaTarget(0.3).restart();d.fx=d.x;d.fy=d.y;})
    .on('drag',(e,d)=>{d.fx=e.x;d.fy=e.y;}).on('end',(e,d)=>{if(!e.active)simulation.alphaTarget(0);d.fx=null;d.fy=null;}))
  .on('mouseenter',(e,d)=>{const tt=document.getElementById('tooltip');document.getElementById('tt-title').textContent=d.label.replace('\\n',' ');document.getElementById('tt-body').textContent=d.desc;tt.classList.add('visible');tt.style.left=(e.clientX+12)+'px';tt.style.top=(e.clientY-20)+'px';})
  .on('mouseleave',()=>document.getElementById('tooltip').classList.remove('visible'));

nodeSel.append('circle').attr('r',d=>d.key?38:32)
  .attr('fill',d=>categoryColors[d.category]||categoryColors.default).attr('fill-opacity',0.15)
  .attr('stroke',d=>categoryColors[d.category]||categoryColors.default).attr('stroke-width',d=>d.key?2.5:1.5);

nodeSel.each(function(d){const el=d3.select(this);d.label.split('\\n').forEach((line,i,arr)=>{
  el.append('text').attr('y',arr.length===2?(i===0?-7:7):0).attr('font-size',d.key?'11px':'10px')
    .attr('fill',d.key?'white':'#c8e0cc').attr('font-weight',d.key?'600':'400')
    .attr('text-anchor','middle').attr('dominant-baseline','middle').text(line);});});

function linkPath(d){const dx=d.target.x-d.source.x,dy=d.target.y-d.source.y,dr=Math.sqrt(dx*dx+dy*dy)*0.8;return 'M'+d.source.x+','+d.source.y+'A'+dr+','+dr+' 0 0,1 '+d.target.x+','+d.target.y;}

simulation.on('tick',()=>{
  linkSel.attr('d',linkPath);
  edgeLabels.attr('x',d=>(d.source.x+d.target.x)/2).attr('y',d=>(d.source.y+d.target.y)/2-6);
  nodeSel.attr('transform',d=>'translate('+d.x+','+d.y+')');
  loopSel.attr('transform',d=>{const inv=nodes.filter(n=>d.nodes.includes(n.id));if(!inv.length)return'translate(0,0)';return'translate('+(inv.reduce((s,n)=>s+n.x,0)/inv.length)+','+(inv.reduce((s,n)=>s+n.y,0)/inv.length)+')';});
});

function zoomBy(f){svg.transition().duration(300).call(zoomBehavior.scaleBy,f);}
function resetView(){svg.transition().duration(500).call(zoomBehavior.transform,d3.zoomIdentity);}
<\/script>
</body>
</html>`;
}
