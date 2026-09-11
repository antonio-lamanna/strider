import { useRef } from "react";
import { newId } from "../utils/id";
import type { Diagram, DiagramNode, DiagramEdge } from "../model/diagram";
import { descendants, reparentNode, sortParentsFirst } from "../utils/geometry";
export function useClipboard() {
  const clipboard = useRef<{
      kind: Diagram["kind"];
      nodes: DiagramNode[];
      edges: DiagramEdge[];
    } | null>(null),
    count = useRef(0);
  function copy(d: Diagram) {
    const ids = descendants(
      new Set(d.nodes.filter((n) => n.selected).map((n) => n.id)),
      d.nodes,
    );
    if (!ids.size) return false;
    clipboard.current = {
      kind: d.kind,
      nodes: structuredClone(
        d.nodes
          .filter((n) => ids.has(n.id))
          .map((n) =>
            n.parentId && !ids.has(n.parentId)
              ? reparentNode(n, undefined, d.nodes)
              : n,
          ),
      ),
      edges: structuredClone(
        d.edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
      ),
    };
    count.current = 0;
    return true;
  }
  function paste(d: Diagram, point?: { x: number; y: number }): Diagram {
    const content = clipboard.current;
    if (!content?.nodes.length || ((d.kind === "data-model") !== (content.kind === "data-model"))) return d;
    count.current++;
    const ids = new Map(content.nodes.map((n) => [n.id, newId()]));
    const roots = content.nodes.filter(
      (n) => !n.parentId || !ids.has(n.parentId),
    );
    const delta = point
      ? {
          x: point.x - Math.min(...roots.map((n) => n.position.x)),
          y: point.y - Math.min(...roots.map((n) => n.position.y)),
        }
      : { x: count.current * 32, y: count.current * 32 };
    const nodes = content.nodes.map((n) => ({
      ...structuredClone(n),
      id: ids.get(n.id)!,
      selected: true,
      parentId: n.parentId ? ids.get(n.parentId) : undefined,
      position:
        n.parentId && ids.has(n.parentId)
          ? n.position
          : { x: n.position.x + delta.x, y: n.position.y + delta.y },
      dragging: false,
    }));
    const edges = content.edges.map((e) => ({
      ...structuredClone(e),
      id: newId(),
      source: ids.get(e.source)!,
      target: ids.get(e.target)!,
      selected: false,
    }));
    return {
      ...d,
      nodes: sortParentsFirst([
        ...d.nodes.map((n) => ({ ...n, selected: false })),
        ...nodes,
      ]),
      edges: [...d.edges.map((e) => ({ ...e, selected: false })), ...edges],
    };
  }
  return { copy, paste, hasContent: () => !!clipboard.current };
}
