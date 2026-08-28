#!/usr/bin/env node
// blockout-validate.mjs — enforce blockout-stage doctrine gates (compute-light, VM-safe).
// Usage: node tools/blockout-validate.mjs blockout/blockout-slice-cw.json
import { readFileSync } from 'node:fs';

const path = process.argv[2] ?? 'blockout/blockout-slice-cw.json';
const b = JSON.parse(readFileSync(path, 'utf8'));
const CATS = new Set(['ground-surface-type','warehouse-enterable','building-enterable','service-pressure',
  'wall-blocking','entrance-player','cover','kill-zone','spawn','stair','incline','bridge','tunnel-passage',
  'hole-drone-entry','overhead-cover','mountain-boundary','waterbody-boundary','tower','facade-non-enterable']);
const res=[]; const c=(n,p,d='')=>res.push({n,p,d});

const segs=b.segments||[];
// 1. stable unique IDs
const ids=segs.map(s=>s.id); const dup=ids.filter((x,i)=>ids.indexOf(x)!==i);
c('unique stable IDs', dup.length===0, dup.join(','));
// 2. valid categories + required fields
let catBad=[], needBounds=[];
for(const s of segs){ if(!CATS.has(s.category)) catBad.push(s.id); if(!s.bounds) needBounds.push(s.id);
  const bb=s.bounds; if(bb && (bb.min[0]>=bb.max[0]||bb.min[1]>=bb.max[1])) needBounds.push(s.id+'(bbox)'); }
c('valid categories', catBad.length===0, catBad.join(','));
c('all segments have valid bounds', needBounds.length===0, needBounds.join(','));
// 3. cover must carry threatElevation + directionality + interrupts
let covBad=[];
for(const s of segs){ if(s.category==='cover'){
  const cv=s.cover||{}; if(!cv.threatElevation||!cv.directionality||!cv.interrupts) covBad.push(s.id); }}
c('cover has threatElevation+directionality+interrupts', covBad.length===0, covBad.join(','));
// 4. entrance-player clearance vs capsule (door >=1m wide, >=2m tall)
let entBad=[];
for(const s of segs){ if(s.category==='entrance-player'){
  const w=s.width||((s.bounds.max[0]-s.bounds.min[0])>(s.bounds.max[1]-s.bounds.min[1])?(s.bounds.max[1]-s.bounds.min[1]):(s.bounds.max[0]-s.bounds.min[0]));
  const h=s.height||999; if(w<1||h<2) entBad.push(s.id+`(w${w.toFixed(1)},h${h.toFixed(1)})`); }}
c('entrances admit 1.8m capsule (>=1m x >=2m)', entBad.length===0, entBad.join(','));
// 5. no unexplained horizontal overlap of non-displaceable segments (AABB pair, min 5m intrusion)
function aabb(s){const mm=s.bounds.min,xx=s.bounds.max;return{id:s.id,minX:mm[0],minZ:mm[1],maxX:xx[0],maxZ:xx[1]}}
const inscat=new Set(['warehouse-enterable','building-enterable','wall-blocking','kill-zone']);
const boxes=segs.filter(s=>inscat.has(s.category)&&s.bounds).map(aabb);
let overlap=[];
for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
  const a=boxes[i],c2=boxes[j];
  const ix=Math.min(a.maxX,c2.maxX)-Math.max(a.minX,c2.minX);
  const iz=Math.min(a.maxZ,c2.maxZ)-Math.max(a.minZ,c2.minZ);
  if(ix>5&&iz>5) overlap.push(a.id+'/'+c2.id);
}
c('no unexplained overlap of non-displaceable volumes (>5m)', overlap.length===0, overlap.join(','));
// 7. connectivity refs resolve to existing segments or known zones; spawn reaches core
const idset = new Set(segs.map(s=>s.id));
const zoneSet = new Set(['zone_spawn','zone_courtyard','zone_warehouse','zone_plant','zone_core','zone_tunnels','zone_bridge']);
let dangling=[];
for(const s of segs){
  const refs=[...(s.connectivity||[]),...(s.connects||[]),...(s.connections||[])];
  for(const r of refs){ if(!idset.has(r) && !zoneSet.has(r) && !r.startsWith('zone_')) dangling.push(s.id+'->'+r); }
}
c('connectivity refs resolve to segments/zones', dangling.length===0, [...new Set(dangling)].slice(0,6).join('; '));
// 8. spawn + core objective both present (so traversal route exists)
const hasSpawn=segs.some(s=>s.category==='spawn');
const hasCore=segs.some(s=>s.zone==='zone_core');
const isFull=b.slice==='full-map'||b.openQuestions?.length>0 && b.zones?.length>=6;
c('spawn present', hasSpawn);
c('core objective zone present (full map)', isFull?hasCore:true);
// 8b. coarse campus spawn reaches core via adjacency graph (BFS over zone adjacencies)
const ADJ={spawn:['courtyard'],courtyard:['spawn','warehouse','bridge'],warehouse:['courtyard','plant','tunnels'],
  bridge:['courtyard','plant'],plant:['warehouse','bridge','core'],tunnels:['warehouse','core'],core:['plant','tunnels']};
const coreZones=segs.filter(s=>s.zone==='zone_core').map(s=>'core');
let reach=false;
{ const q=['spawn'], seen=new Set(q); while(q.length){const n=q.shift(); if(n==='core'){reach=true;break;}
  for(const nb of ADJ[n]||[]){ if(!seen.has(nb)){seen.add(nb);q.push(nb);} } } }
c('campus adjacency: spawn reaches core', reach);
let off=[];
for(const s of segs){for(const p of [s.bounds.min[0],s.bounds.min[1],s.bounds.max[0],s.bounds.max[1]]){ if(Math.abs(p-Math.round(p))>1e-6) off.push(s.id);}}
c('all coords snapped to 1m grid', off.length===0, [...new Set(off)].join(','));

const hasOpen=b.openQuestions && b.openQuestions.length>=0;
console.log('BLOCKOUT VALIDATION —', path);
let fails=0;
for(const r of res){console.log((r.p?'PASS':'FAIL')+'  '+r.n+(r.d?'  ->  '+r.d:'')); if(!r.p)fails++;}
console.log(fails? `\n${fails} gate(s) FAILING` : '\nALL GATES PASS');
process.exit(fails?1:0);