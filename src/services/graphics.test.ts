import { describe, it, expect } from "vitest";
import { createDiagram, createNode, type DiagramEdge } from "../model/diagram";
import { connectionPorts } from "../model/connectionPorts";
import { createField, withFields, fieldFromHandle } from "../model/dataModel";
import { serializeDiagram } from "./xmlSerializer";
import { parseDiagram } from "./xmlParser";
import { buildSvg } from "./exportService";
import { nodeLayout, edgeGeometry, portAnchor } from "../utils/geometry";
import { orientWorkflow } from "./workflowLayout";
import { arrangeDataModel } from "./dataLayout";
import { exportMySql, importMySql } from "./dataSql";
import { routeSignature, routedGeometry } from "../utils/routes";
const node = (kind: "task" | "start" | "end" | "group" | "system-boundary" | "gateway" | "table" = "task") => createNode({ kind, label: kind, icon: "box", color: "#6385a5" }, { x: 100, y: 100 });
describe("diagram graphics and connections", () => {
  it("round-trips every side combination, both arrowheads, borders and global font", () => {
    const d = createDiagram(), a = node(), b = node("system-boundary");
    b.position = { x: 600, y: 350 }; a.data.borderColor = "#c54389"; d.settings.fontSize = 20;
    d.nodes = [a, b];
    d.edges = a.data.ports.flatMap((p, i) => b.data.ports.map((q, j) => ({
      id: i + "-" + j, type: "orthogonal", source: a.id, target: b.id, sourceHandle: p.id, targetHandle: q.id,
      data: { semantic: "control", lineStyle: "auto", arrowDirection: "both", properties: {} }
    } as DiagramEdge)));
    const copy = parseDiagram(serializeDiagram(d));
    expect(copy.edges).toHaveLength(16);
    expect(copy.nodes[0].data.borderColor).toBe("#c54389");
    expect(copy.settings.fontSize).toBe(20);
    for (const edge of copy.edges) expect(edgeGeometry(edge, copy.nodes, 20)?.[0]).toBeTruthy();
    const svg = new DOMParser().parseFromString(buildSvg(copy).svg, "image/svg+xml");
    expect(svg.querySelector("parsererror")).toBeNull();
    expect(svg.querySelectorAll("path[marker-start][marker-end]")).toHaveLength(16);
    expect(svg.querySelector('rect[stroke="#c54389"]')).not.toBeNull();
    expect(svg.querySelector('text[font-size="20"]')).not.toBeNull();
  });
  it("keeps endpoint IDs intact when changing arrow direction", () => {
    for (const direction of ["forward", "reverse", "both"] as const) {
      const d = createDiagram(); d.nodes = [node(), node()]; d.nodes[1].position.x = 500;
      d.edges = [{ id: "edge", source: d.nodes[0].id, target: d.nodes[1].id, sourceHandle: "in", targetHandle: "out",
        data: { semantic: "data", lineStyle: "dashed", arrowDirection: direction, properties: {} } }];
      const copy = parseDiagram(serializeDiagram(d));
      expect(copy.edges[0].sourceHandle).toBe("in");
      expect(copy.edges[0].targetHandle).toBe("out");
      const svg = new DOMParser().parseFromString(buildSvg(copy).svg, "image/svg+xml");
      expect(svg.querySelectorAll("path[marker-start]")).toHaveLength(direction === "forward" ? 0 : 1);
      expect(svg.querySelectorAll("path[marker-end]")).toHaveLength(direction === "reverse" ? 0 : 1);
    }
  });
  it("upgrades legacy start/end and empty containers without losing old handles", () => {
    for (const kind of ["start", "end", "group"] as const) {
      const n = node(kind); n.data.ports = kind === "group" ? [] : n.data.ports.filter(p => p.direction === (kind === "start" ? "output" : "input"));
      const old = structuredClone(n.data.ports);
      expect(new Set(connectionPorts(n).map(p => p.side)).size).toBe(4);
      expect(n.data.ports).toEqual(old);
      for (const p of old) expect(connectionPorts(n)).toContainEqual(p);
    }
  });
  it("validates graphics values and retains readable compact gateway geometry", () => {
    const d = createDiagram(); d.nodes = [node("gateway")]; d.nodes[0].data.borderColor = "#123456"; d.settings.fontSize = 18;
    expect(nodeLayout(d.nodes[0])).toMatchObject({width:64,height:64});
    expect(buildSvg(d).svg).toContain('polygon points="32,1 63,32 32,63 1,32"');
    expect(() => parseDiagram(serializeDiagram(d).replace('borderColor="#123456"','borderColor="red"'))).toThrow("border color");
    expect(() => parseDiagram(serializeDiagram(d).replace('fontSize="18"','fontSize="999"'))).toThrow("fontSize");
    const t = node();
    expect(nodeLayout(t, 28).height).toBeGreaterThan(nodeLayout(t, 14).height);
    expect(nodeLayout(t, 28).width).toBeGreaterThan(nodeLayout(t, 14).width);
  });
  it("restores orientation, free-side edges and appearance after save/reopen", async () => {
    const d = createDiagram(); d.nodes = [node(), node("group")]; d.nodes[1].position.x = 500;
    d.nodes[0].data.borderColor = "#123456"; d.settings.fontSize = 18;
    d.edges = [{id:"e",source:d.nodes[0].id,target:d.nodes[1].id,sourceHandle:"in-top",targetHandle:"out-bottom",data:{semantic:"control",lineStyle:"auto",arrowDirection:"reverse",properties:{}}}];
    const vertical = await orientWorkflow(d,"vertical");
    const restored = await orientWorkflow(parseDiagram(serializeDiagram(vertical)),"horizontal");
    expect(restored.nodes.map(n=>n.position)).toEqual(d.nodes.map(n=>n.position));
    expect(restored.edges[0].data?.arrowDirection).toBe("reverse");
    expect(restored.nodes[0].data.borderColor).toBe("#123456");
  });
  it("keeps table field identity and SQL relationships when attached to top/bottom", async () => {
    const d = importMySql("CREATE TABLE parent (id INT PRIMARY KEY); CREATE TABLE child (id INT PRIMARY KEY, parent_id INT, FOREIGN KEY (parent_id) REFERENCES parent(id));").diagram;
    const edge = d.edges[0]; edge.sourceHandle = fieldFromHandle(edge.sourceHandle) + ":top"; edge.targetHandle = fieldFromHandle(edge.targetHandle) + ":bottom";
    d.settings.fontSize = 20;
    const copy = parseDiagram(serializeDiagram(d));
    expect(exportMySql(copy)).toContain("FOREIGN KEY");
    const arranged = await arrangeDataModel(copy);
    expect(arranged.edges[0].data?.route?.points.length).toBeGreaterThan(1);
    const first = arranged.nodes.find(n=>n.id === edge.source)!;
    expect(portAnchor(first, edge.sourceHandle, arranged.nodes, "output", 20).y).toBe(first.position.y);
    expect(routedGeometry(arranged.edges[0],arranged.nodes,20)).not.toBeNull();
    expect(routedGeometry(arranged.edges[0],arranged.nodes,24)).toBeNull();
    expect(routeSignature(arranged.nodes,arranged.edges[0],20)).not.toBe(routeSignature(arranged.nodes,arranged.edges[0],24));
    const t=withFields(node("table"),[createField("id")]);
    expect(new Set(t.data.ports.map(p=>p.side)).size).toBe(4);
  });
});
