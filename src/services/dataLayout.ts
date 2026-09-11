import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkNode } from 'elkjs/lib/elk-api';
import type { Diagram, DiagramNode } from '../model/diagram';
import { isContainer } from '../model/diagram';
import { absolutePosition, nodeLayout, sortParentsFirst } from '../utils/geometry';
import { routeSignature } from '../utils/routes';

/** Sugiyama layered layout: fixed field ports, crossing minimization, orthogonal routing. */
export async function arrangeDataModel(input: Diagram): Promise<Diagram> {
  if (input.kind !== 'data-model' || !input.nodes.length) return input;
  const elk = new ELK();
  const children: ElkNode[] = input.nodes.filter(n => !isContainer(n)).map(n => {
    const size = nodeLayout(n);
    return { id: n.id, width: size.width, height: size.height,
      layoutOptions: { 'elk.portConstraints': 'FIXED_POS' },
      ports: (n.data.fields ?? []).flatMap((f, i) => [
        { id: `${n.id}/${f.id}:in`, x: 0, y: 64 + i * 32, width: 0, height: 0, layoutOptions: { 'elk.port.side': 'WEST' } },
        { id: `${n.id}/${f.id}:out`, x: size.width, y: 64 + i * 32, width: 0, height: 0, layoutOptions: { 'elk.port.side': 'EAST' } },
      ]) };
  });
  const result = await elk.layout<ElkNode>({ id: 'root', children,
    layoutOptions: { 'elk.algorithm': 'layered', 'elk.direction': 'RIGHT', 'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '90', 'elk.layered.spacing.nodeNodeBetweenLayers': '140',
      'elk.spacing.edgeEdge': '24', 'elk.layered.spacing.edgeEdgeBetweenLayers': '24',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP', 'elk.layered.thoroughness': '20',
      'elk.padding': '[top=60,left=60,bottom=60,right=60]' },
    edges: input.edges.map(e => ({ id: e.id, sources: [`${e.source}/${e.sourceHandle}`], targets: [`${e.target}/${e.targetHandle}`] })),
  });
  const positions = new Map(result.children?.map(n => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));
  // Retain container membership while fitting each boundary around its descendants.
  const nodes: DiagramNode[] = input.nodes.map(n => ({ ...n, position: positions.get(n.id) ?? absolutePosition(n, input.nodes) }));
  const map = new Map(nodes.map(n => [n.id, n]));
  for (const n of sortParentsFirst(nodes).reverse().filter(isContainer)) {
    const members = nodes.filter(c => c.parentId === n.id);
    if (!members.length) continue;
    const x = Math.min(...members.map(c => c.position.x)) - 40;
    const y = Math.min(...members.map(c => c.position.y)) - 60;
    n.width = Math.max(220, Math.max(...members.map(c => c.position.x + nodeLayout(c).width)) - x + 40);
    n.height = Math.max(140, Math.max(...members.map(c => c.position.y + nodeLayout(c).height)) - y + 40);
    n.position = { x, y };
  }
  const relative = nodes.map(n => { const p = map.get(n.parentId ?? ''); return { ...n, position: p ? { x: n.position.x - p.position.x, y: n.position.y - p.position.y } : n.position }; });
  const routes = new Map(result.edges?.map(e => [e.id, e.sections?.[0]]));
  return { ...input, nodes: relative, edges: input.edges.map(e => {
    const section = routes.get(e.id);
    return { ...e, data: { semantic: 'data', lineStyle: 'solid', properties: {}, ...e.data,
      route: section ? { points: [section.startPoint, ...(section.bendPoints ?? []), section.endPoint], signature: routeSignature(relative, e) } : undefined } };
  }) };
}
