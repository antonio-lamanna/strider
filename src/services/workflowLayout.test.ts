import { describe,it,expect } from 'vitest';
import { createDiagram,createNode,cleanDiagram } from '../model/diagram';
import { orientWorkflow } from './workflowLayout';
import { serializeDiagram } from './xmlSerializer';
import { parseDiagram } from './xmlParser';
import { buildSvg } from './exportService';
import { flatProductIcons } from '../config/flatProductIcons';
import { validProductArtwork } from '../model/productArtwork';
function example() {
 const d=createDiagram();d.nodes=['Start','Task','End'].map((label,i)=>createNode({kind:i===0?'start':i===2?'end':'task',label,icon:'play',color:'#123456'},{x:60+i*280,y:90}));
 d.edges=[{id:'a',type:'orthogonal' as const,source:d.nodes[0].id,target:d.nodes[1].id,sourceHandle:'out',targetHandle:'in',label:'Proceed',data:{semantic:'control' as const,lineStyle:'solid' as const,properties:{}}},{id:'b',type:'orthogonal' as const,source:d.nodes[1].id,target:d.nodes[2].id,sourceHandle:'out',targetHandle:'in'}];return d;
}
describe('workflow orientation',()=>{
 it('arranges vertically without changing identity or semantics and restores horizontal after XML reopen',async()=>{
  const d=example(),v=await orientWorkflow(d,'vertical');
  expect(v.nodes[1].position.y).toBeGreaterThan(v.nodes[0].position.y);
  expect(v.nodes[2].position.y).toBeGreaterThan(v.nodes[1].position.y);
  expect(v.edges.map(e=>[e.id,e.source,e.target,e.sourceHandle,e.targetHandle,e.label])).toEqual(d.edges.map(e=>[e.id,e.source,e.target,e.sourceHandle,e.targetHandle,e.label]));
  expect(v.nodes[0].data.ports.find(p=>p.id==='out')?.side).toBe('bottom');
  const back=await orientWorkflow(parseDiagram(serializeDiagram(v)),'horizontal');
  expect(back.nodes.map(n=>n.position)).toEqual(d.nodes.map(n=>n.position));
  expect(back.nodes.map(n=>n.data)).toEqual(d.nodes.map(n=>n.data));
  expect(d.workflowLayout).toBeUndefined();
 });
 it('keeps edits and saves each orientation independently',async()=>{
  const v=await orientWorkflow(example(),'vertical');v.nodes[1].position.x+=35;v.nodes[1].data.label='Edited';
  const back=await orientWorkflow(v,'horizontal'),again=await orientWorkflow(back,'vertical');
  expect(again.nodes[1].position).toEqual(v.nodes[1].position);expect(again.nodes[1].data.label).toBe('Edited');
 });
 it('keeps groups and manual sizes intact',async()=>{
  const d=example();const group=createNode({kind:'group',label:'Boundary',icon:'group',color:'#123456'},{x:0,y:0});d.nodes[1].parentId=group.id;d.nodes[1].data.sizeMode='manual';d.nodes[1].width=240;d.nodes[1].height=100;d.nodes.unshift(group);
  const v=await orientWorkflow(d,'vertical');expect(v.nodes[2].parentId).toBe(group.id);expect(v.nodes[2].width).toBe(240);
  const back=await orientWorkflow(v,'horizontal');expect(cleanDiagram(back).nodes).toEqual(cleanDiagram(d).nodes);
 });
});
it('persists independently selected Simple Icons artwork and includes it in SVG',()=>{
 const d=example();const uri='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(flatProductIcons.salesforce.svg);
 expect(validProductArtwork(uri)).toBe(true);d.nodes[1].data.productIcon=uri;d.nodes[1].data.productIconName='Salesforce';d.nodes[1].data.iconMode='product';
 const copy=parseDiagram(serializeDiagram(d));expect(copy.nodes[1].data.productIcon).toBe(uri);expect(buildSvg(copy).svg).toContain('data:image/svg+xml');
 expect(validProductArtwork('data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/icon"/></svg>'))).toBe(false);
});
