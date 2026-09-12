import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkNode } from 'elkjs/lib/elk-api';
import type { Diagram, Side } from '../model/diagram';
import { isContainer } from '../model/diagram';
import { nodeLayout } from '../utils/geometry';
import type { Orientation, WorkflowLayout, LayoutView } from "../model/layoutState";
const signature = (d: Diagram) => JSON.stringify([d.nodes.map(n=>[n.id,n.parentId]),d.edges.map(e=>[e.id,e.source,e.target,e.sourceHandle,e.targetHandle])]);
const snapshot = (d: Diagram): LayoutView => ({signature:signature(d), nodes:d.nodes.map(n=>({id:n.id,x:n.position.x,y:n.position.y,...(isContainer(n)?{width:nodeLayout(n).width,height:nodeLayout(n).height}:{})}))});
const swapped: Record<Side, Side> = {left:'top',right:'bottom',top:'left',bottom:'right'};
/** Layout only: IDs, semantics, groups, content and handle IDs remain unchanged. */
export async function orientWorkflow(input: Diagram, orientation: Orientation): Promise<Diagram> {
  if (input.kind!=='workflow' || (input.workflowLayout?.orientation ?? 'horizontal')===orientation) return input;
  const current=input.workflowLayout?.orientation ?? 'horizontal';
  const layouts: WorkflowLayout={...input.workflowLayout,orientation,[current]:snapshot(input)};
  const saved=layouts[orientation];
  let nodes=input.nodes.map(n=>({...n,position:{...n.position},data:{...n.data,ports:n.data.ports.map(p=>({...p,side:swapped[p.side]}))}}));
  if (saved?.signature===signature(input)) {
    const positions=new Map(saved.nodes.map(n=>[n.id,n]));
    nodes=nodes.map(n=>{const p=positions.get(n.id);return p?{...n,position:{x:p.x,y:p.y},...(isContainer(n)?{width:p.width,height:p.height}:{})}:n;});
  } else if(nodes.length) {
    const elk=new ELK();
    async function arrangeLevel(parent?: string): Promise<void> {
      const siblings=nodes.filter(n=>n.parentId===parent);
      for(const n of siblings.filter(isContainer)) await arrangeLevel(n.id);
      const ids=new Set(siblings.map(n=>n.id));
      function ancestor(id:string): string | undefined { let n=nodes.find(n=>n.id===id);const seen=new Set<string>();while(n&&!ids.has(n.id)&&n.parentId&&!seen.has(n.id)){seen.add(n.id);n=nodes.find(x=>x.id===n!.parentId);}return n&&ids.has(n.id)?n.id:undefined; }
      const edges=input.edges.flatMap(e=>{const s=ancestor(e.source),t=ancestor(e.target);return s&&t&&s!==t?[{id:e.id,sources:[s],targets:[t]}]:[];});
      const result=await elk.layout<ElkNode>({id:parent??'root',layoutOptions:{'elk.algorithm':'layered','elk.direction':orientation==='vertical'?'DOWN':'RIGHT','elk.spacing.nodeNode':'80','elk.layered.spacing.nodeNodeBetweenLayers':'100','elk.padding':'[top=60,left=40,bottom=40,right=40]'},children:siblings.map(n=>({id:n.id,width:nodeLayout(n).width,height:nodeLayout(n).height+(n.data.displayMode==='icon'?40:0)})),edges});
      for(const child of result.children??[]){const n=nodes.find(n=>n.id===child.id)!;n.position={x:child.x??0,y:child.y??0};}
      if(parent){const n=nodes.find(n=>n.id===parent)!;n.width=Math.max(220,result.width??220);n.height=Math.max(140,result.height??140);}
    }
    await arrangeLevel();
  }
  return {...input,nodes,workflowLayout:layouts,edges:input.edges.map(e=>({...e,data:{semantic:'control',lineStyle:'auto',properties:{},...e.data,route:undefined}}))};
}
