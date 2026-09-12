import type { Node, Edge, Viewport, XYPosition } from "@xyflow/react";
import { newId } from "../utils/id";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
export type IconMode = "standard" | "product";
export type DiagramKind = "workflow" | "data-model" | "architecture";
export type NodeKind =
  | "lane"
  | "table"
  | "start"
  | "end"
  | "event"
  | "timer"
  | "gateway"
  | "task"
  | "human-task"
  | "automated-task"
  | "script"
  | "decision"
  | "api-call"
  | "ai-agent"
  | "database"
  | "document"
  | "file"
  | "queue"
  | "data-object"
  | "user"
  | "team"
  | "external-actor"
  | "robot"
  | "mobile-robot"
  | "device"
  | "application"
  | "external-system"
  | "resource"
  | "group"
  | "system-boundary"
  | "team-boundary";
export type EdgeSemantic =
  | "control"
  | "data"
  | "resource"
  | "event"
  | "exception";
export type LineStyle = "auto" | "solid" | "dashed" | "dotted";
export type Side = "left" | "right" | "top" | "bottom";
export interface Port {
  id: string;
  direction: "input" | "output";
  side: Side;
  semantic: EdgeSemantic;
  label?: string;
}
export interface DataField {
  id: string;
  name: string;
  dataType: string;
  primaryKey: boolean;
  foreignKey: boolean;
  nullable: boolean;
  unique: boolean;
  defaultValue: string;
  description: string;
}
export interface WorkflowNodeData extends Record<string, unknown> {
  fields?: DataField[];
  customIcon?: string;
  productIcon?: string;
  productIconName?: string;
  iconMode?: IconMode;
  displayMode?: "card" | "icon";
  kind: NodeKind;
  subtype?: string;
  label: string;
  description: string;
  system?: string;
  icon: string;
  color: string;
  sizeMode: "auto" | "manual";
  properties: Record<string, JsonValue>;
  ports: Port[];
}
export interface WorkflowEdgeData extends Record<string, unknown> {
  color?: string;
  route?: { points: { x: number; y: number }[]; signature: string };
  semantic: EdgeSemantic;
  lineStyle: LineStyle;
  properties: Record<string, JsonValue>;
}
export type DiagramNode = Node<WorkflowNodeData, "workflow" | "container">;
export type DiagramEdge = Edge<WorkflowEdgeData, "orthogonal">;
export interface Diagram {
  workflowLayout?: import("./layoutState").WorkflowLayout;
  id: string;
  kind: DiagramKind;
  version: "1.0";
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  viewport: Viewport;
  settings: { grid: boolean; snap: boolean; gridSize: number; gridColor?: string };
}
export type NodeTemplate = {
  fields?: DataField[];
  customIcon?: string;
  productIcon?: string;
  productIconName?: string;
  iconMode?: IconMode;
  displayMode?: "card" | "icon";
  kind: NodeKind;
  label: string;
  icon: string;
  color: string;
  subtype?: string;
  system?: string;
};
export const isContainer = (n: DiagramNode) =>
  ["group", "system-boundary", "team-boundary", "lane"].includes(n.data.kind);
export const isEvent = (n: DiagramNode) =>
  ["start", "end", "event", "timer"].includes(n.data.kind);
export const defaultPorts = (): Port[] => [
  { id: "in", direction: "input", side: "left", semantic: "control" },
  { id: "out", direction: "output", side: "right", semantic: "control" },
  { id: "in-top", direction: "input", side: "top", semantic: "control" },
  {
    id: "out-bottom",
    direction: "output",
    side: "bottom",
    semantic: "control",
  },
];
export function createDiagram(kind: DiagramKind = "workflow"): Diagram {
  const now = new Date().toISOString();
  return {
    id: newId(),
    kind,
    version: "1.0",
    name: kind === "data-model" ? "Untitled data model" : kind === "architecture" ? "Untitled architecture" : "Untitled diagram",
    description: "",
    createdAt: now,
    updatedAt: now,
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    settings: { grid: true, snap: true, gridSize: 20 },
  };
}
export function createNode(
  template: NodeTemplate,
  position: XYPosition,
): DiagramNode {
  const group = ["group", "system-boundary", "team-boundary", "lane"].includes(
    template.kind,
  );
  return {
    id: newId(),
    type: group ? "container" : "workflow",
    position,
    ...(group ? { width: 520, height: 300, zIndex: -10 } : {}),
    data: {
      ...template,
      description: "",
      sizeMode: group ? "manual" : "auto",
      properties:
        template.kind === "ai-agent"
          ? { model: "GPT-5", memory: "Session", tools: "Enabled" }
          : {},
      ...(template.kind === "table" ? { fields: [] } : {}),
      ports: template.kind === "table" ? [] : group
        ? []
        : defaultPorts().filter((p) =>
            template.kind === "start"
              ? p.direction === "output"
              : template.kind === "end"
                ? p.direction === "input"
                : true,
          ),
    },
  };
}

/** Excludes all transient React Flow selection/measurement/gesture fields. */
export function cleanDiagram(d: Diagram): Diagram {
  return {
    ...d,
    nodes: d.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: { ...n.position },
      data: structuredClone(n.data),
      ...(n.parentId ? { parentId: n.parentId } : {}),
      ...(n.zIndex !== undefined ? { zIndex: n.zIndex } : {}),
      ...(n.data.sizeMode === "manual"
        ? {
            width: n.width ?? n.measured?.width ?? 150,
            height: n.height ?? n.measured?.height ?? 64,
          }
        : {}),
    })),
    edges: d.edges.map((e) => ({
      id: e.id,
      type: "orthogonal",
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? "out",
      targetHandle: e.targetHandle ?? "in",
      label: typeof e.label === "string" ? e.label : "",
      data: structuredClone(
        e.data ?? { semantic: "control", lineStyle: "auto", properties: {} },
      ),
    })),
  };
}
export const fingerprint = (d: Diagram) =>
  JSON.stringify({ ...cleanDiagram(d), updatedAt: "" });
