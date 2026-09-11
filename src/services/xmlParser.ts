import { createDiagram, defaultPorts, isContainer } from "../model/diagram";
import type {
  Diagram,
  DiagramNode,
  DiagramEdge,
  EdgeSemantic,
  LineStyle,
  JsonValue,
  Port,
} from "../model/diagram";
import { fieldPorts, validCustomIcon } from "../model/dataModel";
import type { DataField, DiagramKind } from "../model/diagram";
import { tableTemplate } from "../config/modules";
import { nodeTemplates } from "../config/nodeTypes";
import { sortParentsFirst } from "../utils/geometry";

const semantics = ["control", "data", "resource", "event", "exception"];
function children(el: Element, name: string) {
  return Array.from(el.children).filter((c) => c.tagName === name);
}
function child(el: Element, name: string) {
  return children(el, name)[0];
}
function required(el: Element, key: string) {
  const value = el.getAttribute(key);
  if (value === null || value === "")
    throw new Error(`A ${el.tagName} is missing its "${key}" attribute.`);
  return value;
}
function number(
  el: Element,
  key: string,
  fallback: number,
  min = -1e7,
  max = 1e7,
) {
  if (!el.hasAttribute(key)) return fallback;
  const raw = el.getAttribute(key)!;
  const v = Number(raw);
  if (!raw.trim() || !Number.isFinite(v) || v < min || v > max)
    throw new Error(
      `Invalid ${key} on ${el.tagName} ${el.getAttribute("id") ?? ""}.`,
    );
  return v;
}
function boolean(el: Element, key: string, fallback: boolean) {
  if (!el.hasAttribute(key)) return fallback;
  const v = el.getAttribute(key);
  if (v !== "true" && v !== "false")
    throw new Error(`Invalid ${key}: expected true or false.`);
  return v === "true";
}
function properties(el: Element): Record<string, JsonValue> {
  const p: Record<string, JsonValue> = {};
  const container = child(el, "properties");
  for (const item of container
    ? children(container, "property")
    : children(el, "property")) {
    const name = required(item, "name");
    if (Object.hasOwn(p, name))
      throw new Error(`Duplicate property "${name}".`);
    let value: JsonValue;
    try {
      value =
        item.getAttribute("encoding") === "json"
          ? JSON.parse(item.textContent ?? "null")
          : (item.getAttribute("value") ?? item.textContent ?? "");
    } catch {
      throw new Error(`Invalid JSON in property "${name}".`);
    }
    Object.defineProperty(p, name, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
  return p;
}
export function parseDiagram(xml: string): Diagram {
  if (xml.length > 10 * 1024 * 1024)
    throw new Error("This file exceeds the 10 MB XML limit.");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error("DTD and entity declarations are not supported.");
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror"))
    throw new Error(
      "The XML is malformed. Open a Strider XML file.",
    );
  const root = doc.documentElement;
  if (!["automation-diagram", "data-model-diagram", "architecture-diagram"].includes(root.tagName))
    throw new Error(
      "This is not a Strider diagram. Expected <automation-diagram>.",
    );
  if (root.getAttribute("version") !== "1.0")
    throw new Error(
      `Unsupported diagram version: ${root.getAttribute("version") ?? "missing"}. Supported version: 1.0.`,
    );
  const kind: DiagramKind = root.tagName === "data-model-diagram" ? "data-model" : root.tagName === "architecture-diagram" ? "architecture" : "workflow";
  const d = createDiagram(kind);
  d.id = root.getAttribute("id") || d.id;
  d.name = root.getAttribute("name") || "Untitled diagram";
  d.description = child(root, "description")?.textContent ?? "";
  const meta = child(root, "metadata");
  if (meta) {
    d.createdAt = meta.getAttribute("created-at") ?? d.createdAt;
    d.updatedAt = meta.getAttribute("updated-at") ?? d.updatedAt;
  }
  const vp = child(root, "viewport");
  if (vp)
    d.viewport = {
      x: number(vp, "x", 0),
      y: number(vp, "y", 0),
      zoom: number(vp, "zoom", 1, 0.1, 3),
    };
  const settings = child(root, "settings");
  if (settings)
    d.settings = {
      grid: boolean(settings, "grid", true),
      snap: boolean(settings, "snap", true),
      gridSize: number(settings, "gridSize", 20, 5, 100),
      ...(settings.hasAttribute("gridColor") ? { gridColor: required(settings, "gridColor") } : {}),
    };
  if (d.settings.gridColor && !/^#[\da-f]{6}$/i.test(d.settings.gridColor)) throw new Error("Invalid grid color.");
  const nodeList = child(root, "nodes"),
    edgeList = child(root, "edges");
  if (!nodeList || !edgeList)
    throw new Error("The diagram needs both <nodes> and <edges> elements.");
  if (
    children(nodeList, "node").length > 5000 ||
    children(edgeList, "edge").length > 10000
  )
    throw new Error(
      "This diagram exceeds the supported import size (5,000 nodes / 10,000 connections).",
    );
  const ids = new Set<string>();
  d.nodes = children(nodeList, "node").map((el) => {
    const id = required(el, "id");
    if (ids.has(id)) throw new Error(`Duplicate node ID: ${id}.`);
    ids.add(id);
    const kind = required(el, "type"),
      subtype = el.getAttribute("subtype") ?? undefined;
    const template = [...nodeTemplates, tableTemplate].find(
      (t) => t.kind === kind && (!subtype || t.subtype === subtype),
    );
    if (!template)
      throw new Error(
        `Unknown node type: ${kind}${subtype ? "/" + subtype : ""}.`,
      );
    const sizeMode = el.getAttribute("sizeMode") ?? "auto";
    if (!["auto", "manual"].includes(sizeMode))
      throw new Error(`Invalid size mode on node ${id}.`);
    const color = el.getAttribute("color") ?? template.color;
    if (!/^#[\da-f]{6}$/i.test(color))
      throw new Error(`Invalid accent color on node ${id}. Use #RRGGBB.`);
    const portsElement = child(el, "ports"),
      portIds = new Set<string>();
    const ports: Port[] = portsElement
      ? children(portsElement, "port").map((p) => {
          const pid = required(p, "id"),
            direction = required(p, "direction"),
            side = required(p, "side"),
            semantic = p.getAttribute("semantic") ?? "control";
          if (portIds.has(pid))
            throw new Error(`Duplicate port ${pid} on node ${id}.`);
          portIds.add(pid);
          if (
            !["input", "output"].includes(direction) ||
            !["left", "right", "top", "bottom"].includes(side) ||
            !semantics.includes(semantic)
          )
            throw new Error(`Invalid port on node ${id}.`);
          return {
            id: pid,
            direction,
            side,
            semantic,
            ...(p.hasAttribute("label")
              ? { label: p.getAttribute("label")! }
              : {}),
          } as Port;
        })
      : defaultPorts().filter((p) =>
          kind === "start"
            ? p.direction === "output"
            : kind === "end"
              ? p.direction === "input"
              : true,
        );
    const n: DiagramNode = {
      id,
      type: ["group", "system-boundary", "team-boundary", "lane"].includes(kind)
        ? "container"
        : "workflow",
      position: { x: number(el, "x", 0), y: number(el, "y", 0) },
      data: {
        kind: template.kind,
        subtype: subtype ?? template.subtype,
        label: el.getAttribute("label") ?? template.label,
        description: child(el, "description")?.textContent ?? "",
        system: el.getAttribute("system") ?? undefined,
        icon: el.getAttribute("icon") ?? template.icon,
        color,
        sizeMode: sizeMode as "auto" | "manual",
        properties: properties(el),
        ports,
      },
    };
    const displayMode = el.getAttribute("displayMode");
    if (displayMode && !["card", "icon"].includes(displayMode)) throw new Error("Invalid display mode.");
    if (displayMode) n.data.displayMode = displayMode as "card" | "icon";
    const customIcon = child(el, "custom-icon")?.textContent;
    if (customIcon) {
      if (!validCustomIcon(customIcon)) throw new Error(`Invalid custom image on ${id}. Use PNG, JPEG or WebP.`);
      n.data.customIcon = customIcon;
    }
    if (kind === "table") {
      if (d.kind !== "data-model") throw new Error("Tables belong in a Data Model diagram.");
      const fieldsElement = child(el, "fields");
      if (!fieldsElement) throw new Error(`Table ${id} is missing its fields.`);
      const fieldIds = new Set<string>(), fieldNames = new Set<string>();
      n.data.fields = children(fieldsElement, "field").map(f => {
        const fid = required(f, "id");
        if (fieldIds.has(fid)) throw new Error(`Duplicate field ID on ${id}.`);
        fieldIds.add(fid);
        const name = required(f, "name"), dtype = required(f, "dataType");
        if (!name.trim() || !dtype.trim() || fieldNames.has(name.trim().toLowerCase())) throw new Error(`Table ${n.data.label} needs unique, non-empty field names and data types.`);
        fieldNames.add(name.trim().toLowerCase());
        return { id: fid, name: required(f, "name"), dataType: required(f, "dataType"),
          primaryKey: boolean(f, "primaryKey", false), foreignKey: boolean(f, "foreignKey", false),
          nullable: boolean(f, "nullable", true), unique: boolean(f, "unique", false),
          defaultValue: f.getAttribute("defaultValue") ?? "", description: f.getAttribute("description") ?? "" } satisfies DataField;
      });
      n.data.ports = fieldPorts(n.data.fields);
    } else if (d.kind === "data-model" && !isContainer(n)) throw new Error("A Data Model can contain only tables and groups.");
    if (el.hasAttribute("parent")) n.parentId = el.getAttribute("parent")!;
    if (el.hasAttribute("zIndex"))
      n.zIndex = number(el, "zIndex", 0, -1000, 1000);
    if (sizeMode === "manual") {
      if (!el.hasAttribute("width") || !el.hasAttribute("height"))
        throw new Error(`Manual-sized node ${id} needs width and height.`);
      n.width = number(el, "width", 150, 40, 20000);
      n.height = number(el, "height", 64, 40, 20000);
    }
    if (isContainer(n)) {
      if (!portsElement) n.data.ports = [];
      n.zIndex ??= -10;
    }
    return n;
  });
  const nodeMap = new Map(d.nodes.map((n) => [n.id, n]));
  for (const n of d.nodes) {
    const seen = new Set([n.id]);
    let parent = n.parentId;
    while (parent) {
      if (seen.has(parent))
        throw new Error(`Circular group membership on node ${n.id}.`);
      seen.add(parent);
      const p = nodeMap.get(parent);
      if (!p || !isContainer(p))
        throw new Error(`Node ${n.id} references an invalid container.`);
      parent = p.parentId;
    }
  }
  const edgeIds = new Set<string>();
  d.edges = children(edgeList, "edge").map((el) => {
    const id = required(el, "id");
    if (edgeIds.has(id)) throw new Error(`Duplicate connection ID: ${id}.`);
    edgeIds.add(id);
    const source = required(el, "source"),
      target = required(el, "target"),
      s = nodeMap.get(source),
      t = nodeMap.get(target);
    if (!s || !t)
      throw new Error(`Connection ${id} references a missing node.`);
    const sourceHandle = el.getAttribute("sourceHandle") ?? "out",
      targetHandle = el.getAttribute("targetHandle") ?? "in";
    if (
      !s.data.ports.some(
        (p) => p.id === sourceHandle && p.direction === "output",
      ) ||
      !t.data.ports.some(
        (p) => p.id === targetHandle && p.direction === "input",
      )
    )
      throw new Error(
        `Connection ${id} references a missing or incompatible port.`,
      );
    const semantic = el.getAttribute("type") ?? "control",
      lineStyle = el.getAttribute("lineStyle") ?? "auto";
    if (
      !semantics.includes(semantic) ||
      !["auto", "solid", "dashed", "dotted"].includes(lineStyle)
    )
      throw new Error(`Invalid connection type or line style on ${id}.`);
    const color = el.getAttribute("color") ?? undefined;
    if (color && !/^#[\da-f]{6}$/i.test(color)) throw new Error("Invalid connection color.");
    let route: import("../model/diagram").WorkflowEdgeData["route"];
    const routeText = child(el, "route")?.textContent;
    if (routeText) {
      const value = JSON.parse(routeText);
      if (!value || typeof value.signature !== "string" || !Array.isArray(value.points) || value.points.length < 2 || value.points.length > 10000 || !value.points.every((p: {x: number; y: number}) => p && Number.isFinite(p.x) && Number.isFinite(p.y))) throw new Error("Invalid connection route.");
      route = value;
    }
    const props = properties(el);
    if (d.kind === 'data-model' && props.cardinality !== undefined && !['1:1', '1:N', 'N:1', 'N:N'].includes(String(props.cardinality))) throw new Error(`Invalid cardinality on ${id}.`);
    return {
      id,
      type: "orthogonal",
      source,
      target,
      sourceHandle,
      targetHandle,
      label: el.getAttribute("label") ?? "",
      data: {
        ...(color ? { color } : {}),
        ...(route ? { route } : {}),
        semantic: semantic as EdgeSemantic,
        lineStyle: lineStyle as LineStyle,
        properties: props,
      },
    } satisfies DiagramEdge;
  });
  d.nodes = sortParentsFirst(d.nodes);
  return d;
}
