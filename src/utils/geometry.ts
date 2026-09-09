import { Position, getSmoothStepPath } from "@xyflow/react";
import type { DiagramNode, DiagramEdge, Port } from "../model/diagram";
import { isContainer, isEvent } from "../model/diagram";

let context: CanvasRenderingContext2D | null | undefined;
export function textWidth(text: string, size = 14, weight = 500): number {
  if (context === undefined)
    context =
      typeof document !== "undefined"
        ? document.createElement("canvas").getContext("2d")
        : null;
  if (context) {
    context.font = `${weight} ${size}px Arial, sans-serif`;
    return context.measureText(text).width;
  }
  return text.length * size * 0.54;
}
export function wrapText(
  text: string,
  width: number,
  size = 14,
  weight = 500,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (textWidth((line ? line + " " : "") + word, size, weight) <= width) {
        line += (line ? " " : "") + word;
        continue;
      }
      if (line) {
        lines.push(line);
        line = "";
      }
      for (const character of word) {
        if (line && textWidth(line + character, size, weight) > width) {
          lines.push(line);
          line = "";
        }
        line += character;
      }
    }
    lines.push(line);
  }
  return lines.length ? lines : [""];
}
export function nodeLayout(n: DiagramNode) {
  const group = isContainer(n),
    event = isEvent(n),
    gateway = n.data.kind === "gateway";
  if (group)
    return {
      width: n.width ?? 520,
      height: n.height ?? 300,
      labelLines: [n.data.label],
      descriptionLines: [],
      event,
      gateway,
      group,
    };
  const min = event ? 64 : gateway ? 100 : 150;
  const contentWidth = Math.max(
    ...n.data.label.split("\n").map((s) => textWidth(s, 14, 500)),
    n.data.kind === "ai-agent" ? 230 : 0,
  );
  const naturalWidth = event
    ? Math.min(230, Math.max(64, contentWidth + 16))
    : gateway
      ? Math.min(250, Math.max(110, contentWidth + 20))
      : Math.min(420, Math.max(min, contentWidth + 74));
  const width =
    n.data.sizeMode === "manual" ? (n.width ?? naturalWidth) : naturalWidth;
  const labelLines = wrapText(
    n.data.label,
    Math.max(20, width - (event || gateway ? 12 : 72)),
  );
  const descriptionLines =
    n.data.description && !event && !gateway
      ? wrapText(n.data.description, Math.max(20, width - 72), 12, 400)
      : [];
  const naturalHeight = event
    ? 56 + labelLines.length * 19
    : gateway
      ? 70 + labelLines.length * 19
      : Math.max(
          62,
          32 +
            labelLines.length * 20 +
            (descriptionLines.length ? 5 + descriptionLines.length * 17 : 0),
        ) + (n.data.kind === "ai-agent" ? 37 : 0);
  return {
    width,
    height:
      n.data.sizeMode === "manual"
        ? (n.height ?? naturalHeight)
        : naturalHeight,
    labelLines,
    descriptionLines,
    event,
    gateway,
    group,
  };
}
export function absolutePosition(
  n: DiagramNode,
  nodes: DiagramNode[],
): { x: number; y: number } {
  let x = n.position.x,
    y = n.position.y,
    parent = n.parentId;
  const seen = new Set([n.id]),
    map = new Map(nodes.map((n) => [n.id, n]));
  while (parent && !seen.has(parent)) {
    seen.add(parent);
    const p = map.get(parent);
    if (!p) break;
    x += p.position.x;
    y += p.position.y;
    parent = p.parentId;
  }
  return { x, y };
}
export function sortParentsFirst(nodes: DiagramNode[]): DiagramNode[] {
  const map = new Map(nodes.map((n) => [n.id, n])),
    visited = new Set<string>(),
    result: DiagramNode[] = [];
  function add(n: DiagramNode) {
    if (visited.has(n.id)) return;
    visited.add(n.id);
    if (n.parentId && map.has(n.parentId)) add(map.get(n.parentId)!);
    result.push(n);
  }
  nodes.forEach(add);
  return result;
}
export function descendants(
  ids: Set<string>,
  nodes: DiagramNode[],
): Set<string> {
  const result = new Set(ids);
  let changed = true;
  while (changed) {
    changed = false;
    nodes.forEach((n) => {
      if (n.parentId && result.has(n.parentId) && !result.has(n.id)) {
        result.add(n.id);
        changed = true;
      }
    });
  }
  return result;
}
export function reparentNode(
  n: DiagramNode,
  parentId: string | undefined,
  nodes: DiagramNode[],
): DiagramNode {
  const at = absolutePosition(n, nodes),
    parent = nodes.find((p) => p.id === parentId),
    origin = parent ? absolutePosition(parent, nodes) : { x: 0, y: 0 };
  return {
    ...n,
    parentId: parent?.id,
    position: { x: at.x - origin.x, y: at.y - origin.y },
  };
}
export function containingGroup(
  n: DiagramNode,
  nodes: DiagramNode[],
): DiagramNode | undefined {
  const p = absolutePosition(n, nodes),
    s = nodeLayout(n),
    excluded = descendants(new Set([n.id]), nodes);
  return nodes
    .filter((g) => isContainer(g) && !excluded.has(g.id))
    .filter((g) => {
      const at = absolutePosition(g, nodes),
        size = nodeLayout(g);
      return (
        p.x >= at.x + 8 &&
        p.y >= at.y + 36 &&
        p.x + s.width <= at.x + size.width - 8 &&
        p.y + s.height <= at.y + size.height - 8
      );
    })
    .sort(
      (a, b) =>
        nodeLayout(a).width * nodeLayout(a).height -
        nodeLayout(b).width * nodeLayout(b).height,
    )[0];
}
export const sidePosition = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};
export function portAnchor(
  n: DiagramNode,
  portId: string | undefined | null,
  nodes: DiagramNode[],
  direction: "input" | "output",
) {
  const layout = nodeLayout(n),
    at = absolutePosition(n, nodes);
  const port: Port = n.data.ports.find((p) => p.id === portId) ??
    n.data.ports.find((p) => p.direction === direction) ?? {
      id: "",
      direction,
      side: direction === "input" ? "left" : "right",
      semantic: "control",
    };
  const sameSide = n.data.ports.filter((p) => p.side === port.side),
    fraction =
      (sameSide.findIndex((p) => p.id === port.id) + 1) / (sameSide.length + 1);
  const core = layout.event ? 44 : layout.gateway ? 56 : 0;
  const w = core || layout.width,
    h = core || layout.height,
    offset = core ? (layout.width - core) / 2 : 0;
  const x =
    at.x +
    offset +
    (port.side === "left" ? 0 : port.side === "right" ? w : w * fraction);
  const y =
    at.y +
    (port.side === "top" ? 0 : port.side === "bottom" ? h : h * fraction);
  return { x, y, position: sidePosition[port.side] };
}
export function edgeGeometry(edge: DiagramEdge, nodes: DiagramNode[]) {
  const source = nodes.find((n) => n.id === edge.source),
    target = nodes.find((n) => n.id === edge.target);
  if (!source || !target) return null;
  const s = portAnchor(source, edge.sourceHandle, nodes, "output"),
    t = portAnchor(target, edge.targetHandle, nodes, "input");
  return getSmoothStepPath({
    sourceX: s.x,
    sourceY: s.y,
    sourcePosition: s.position,
    targetX: t.x,
    targetY: t.y,
    targetPosition: t.position,
    borderRadius: 12,
    offset: 24,
  });
}
export function diagramBounds(nodes: DiagramNode[], edges: DiagramEdge[] = []) {
  if (!nodes.length) return { x: 0, y: 0, width: 800, height: 500 };
  const points = nodes.flatMap((n) => {
    const p = absolutePosition(n, nodes),
      s = nodeLayout(n);
    return [p, { x: p.x + s.width, y: p.y + s.height }];
  });
  edges.forEach((e) => {
    const g = edgeGeometry(e, nodes);
    if (g) {
      const half = textWidth(String(e.label ?? ""), 12, 400) / 2 + 10;
      points.push(
        { x: g[1] - half, y: g[2] - 14 },
        { x: g[1] + half, y: g[2] + 14 },
      );
    }
  });
  const x = Math.min(...points.map((p) => p.x)) - 64,
    y = Math.min(...points.map((p) => p.y)) - 64;
  return {
    x,
    y,
    width: Math.max(...points.map((p) => p.x)) - x + 64,
    height: Math.max(...points.map((p) => p.y)) - y + 64,
  };
}
export const dashPattern = (semantic: string, lineStyle = "auto") => {
  const s =
    lineStyle === "auto"
      ? semantic === "data" || semantic === "resource"
        ? "dashed"
        : semantic === "exception"
          ? "dotted"
          : "solid"
      : lineStyle;
  return s === "dashed" ? "7 5" : s === "dotted" ? "2 5" : undefined;
};
