import type { DiagramNode, DiagramEdge } from '../model/diagram';
// Includes every obstacle: a manual move or resize invalidates the saved route.
export function routeSignature(nodes: DiagramNode[], edge: DiagramEdge, fontSize = 14): string {
  return JSON.stringify([...(fontSize === 14 ? [] : [fontSize]), edge.source, edge.target, edge.sourceHandle, edge.targetHandle,
    nodes.map(n => [n.id, n.position.x, n.position.y, n.parentId, n.data.sizeMode === 'manual' ? n.width : null, n.data.sizeMode === 'manual' ? n.height : null, n.data.label, n.data.sizeMode,
      n.data.fields?.map(f => [f.id, f.name, f.dataType])])]);
}
export function routedGeometry(edge: DiagramEdge, nodes: DiagramNode[], fontSize = 14): [string, number, number] | null {
  const route = edge.data?.route;
  if (!route || route.signature !== routeSignature(nodes, edge, fontSize) || route.points.length < 2) return null;
  const points = route.points;
  let longest = 0, x = points[0].x, y = points[0].y;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length > longest) { longest = length; x = (a.x + b.x) / 2; y = (a.y + b.y) / 2; }
  }
  return [points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' '), x, y];
}
