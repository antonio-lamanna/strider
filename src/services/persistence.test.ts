import { describe, expect, it, vi } from "vitest";
import {
  createDiagram,
  createNode,
  cleanDiagram,
  defaultPorts,
} from "../model/diagram";
import type { DiagramEdge } from "../model/diagram";
import { nodeTemplates } from "../config/nodeTypes";
import { serializeDiagram } from "./xmlSerializer";
import { parseDiagram } from "./xmlParser";
import {
  absolutePosition,
  containingGroup,
  nodeLayout,
  reparentNode,
} from "../utils/geometry";
import { buildSvg } from "./exportService";

// Stable text metrics in jsdom; production uses the browser's real Canvas metrics.
vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
  font: "",
  measureText: (s: string) => ({ width: s.length * 7 }),
} as unknown as CanvasRenderingContext2D);
const node = (kind: string, x = 0, y = 0) =>
  createNode(nodeTemplates.find((t) => t.kind === kind)!, { x, y });
describe("portable XML document", () => {
  it("round-trips the complete model, nested containers, ports, dimensions and viewport", () => {
    const d = createDiagram();
    d.name = 'R&D <operations> "α"';
    d.description = "First line\nSecond line & data";
    d.viewport = { x: -371.125, y: 202.5, zoom: 0.625 };
    d.settings = { grid: false, snap: false, gridSize: 24 };
    const outer = node("group", -100, 80),
      inner = node("system-boundary", 30, 60),
      agent = node("ai-agent", 25, 65),
      app = node("application", 410, 170),
      gateway = node("gateway", 650, 280);
    inner.parentId = outer.id;
    agent.parentId = inner.id;
    agent.width = 345;
    agent.height = 143;
    agent.zIndex = 4;
    agent.data.sizeMode = "manual";
    agent.data.label = 'Agent <A> & "B"';
    agent.data.description = "One\ntwo";
    agent.data.system = "openai";
    agent.data.color = "#597f6f";
    agent.data.icon = "sparkles";
    agent.data.properties = {
      model: "GPT",
      enabled: true,
      retries: 3,
      empty: null,
      nested: { tools: ["a", "b"] },
      text: "  surrounding whitespace  ",
    };
    agent.data.ports = [
      ...defaultPorts(),
      {
        id: "resource-in",
        side: "bottom",
        direction: "input",
        semantic: "resource",
        label: "Knowledge",
      },
    ];
    app.data.label = "A much wider application label than the default";
    app.data.system = "custom-system";
    gateway.data.subtype = "or";
    d.nodes = [outer, inner, agent, app, gateway];
    d.edges = [
      {
        id: "edge-1",
        type: "orthogonal",
        source: agent.id,
        target: app.id,
        sourceHandle: "out",
        targetHandle: "in-top",
        label: "Approved & valid",
        data: {
          semantic: "data",
          lineStyle: "auto",
          properties: { mapping: { field: "id" } },
        },
      },
    ];
    const restored = parseDiagram(serializeDiagram(d));
    expect(JSON.parse(JSON.stringify(cleanDiagram(restored)))).toEqual(
      JSON.parse(JSON.stringify(cleanDiagram(d))),
    );
    expect(absolutePosition(restored.nodes[2], restored.nodes)).toEqual({
      x: -45,
      y: 205,
    });
  });
  it("preserves every configured node family and gateway subtype", () => {
    const d = createDiagram();
    d.nodes = nodeTemplates.map((t, i) => createNode(t, { x: i * 200, y: 10 }));
    const restored = parseDiagram(serializeDiagram(d));
    expect(restored.nodes.map((n) => [n.data.kind, n.data.subtype])).toEqual(
      d.nodes.map((n) => [n.data.kind, n.data.subtype]),
    );
  });
  it("rejects malformed XML, foreign formats, unsupported versions and entities", () => {
    for (const xml of [
      "<x>",
      "<bpmn/>",
      '<automation-diagram version="2.0"><nodes/><edges/></automation-diagram>',
      '<!DOCTYPE a [<!ENTITY x SYSTEM "file:///etc/passwd">]><a/>',
    ])
      expect(() => parseDiagram(xml)).toThrow();
  });
  it("rejects broken edge references, duplicate IDs and missing ports", () => {
    const d = createDiagram(),
      a = node("task"),
      b = node("task");
    d.nodes = [a, b];
    d.edges = [{ id: "e", source: a.id, target: "missing" }];
    expect(() => parseDiagram(serializeDiagram(d))).toThrow(/missing node/);
    d.edges = [];
    d.nodes = [a, a];
    expect(() => parseDiagram(serializeDiagram(d))).toThrow(/Duplicate node/);
    d.nodes = [a, b];
    d.edges = [{ id: "e", source: a.id, target: b.id, sourceHandle: "wrong" }];
    expect(() => parseDiagram(serializeDiagram(d))).toThrow(/port/);
  });
  it("rejects group cycles and invalid manual dimensions", () => {
    const d = createDiagram(),
      a = node("group"),
      b = node("group");
    a.parentId = b.id;
    b.parentId = a.id;
    d.nodes = [a, b];
    expect(() => parseDiagram(serializeDiagram(d))).toThrow(/Circular/);
    a.parentId = undefined;
    d.nodes = [a];
    expect(() =>
      parseDiagram(serializeDiagram(d).replace('width="520"', 'width="NaN"')),
    ).toThrow(/width/);
  });
  it("retains typed properties with arbitrary names without prototype pollution", () => {
    const d = createDiagram(),
      a = node("task");
    a.data.properties = JSON.parse(
      '{"__proto__":{"polluted":true},"constructor":"test"}',
    );
    d.nodes = [a];
    const props = parseDiagram(serializeDiagram(d)).nodes[0].data.properties;
    expect(Object.hasOwn(props, "__proto__")).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
describe("sizing, grouping and vector exports", () => {
  it("grows with the label, wraps at 420px, and respects a manual size", () => {
    const n = node("task");
    n.data.label = "Send email";
    const compact = nodeLayout(n);
    n.data.label =
      "Validate supplier invoice and retrieve purchasing information";
    const wide = nodeLayout(n);
    expect(wide.width).toBeGreaterThan(compact.width);
    expect(wide.width).toBeLessThanOrEqual(420);
    expect(wide.labelLines.length).toBeGreaterThan(1);
    n.data.sizeMode = "manual";
    n.width = 280;
    n.height = 150;
    expect(nodeLayout(n)).toMatchObject({ width: 280, height: 150 });
    n.data.label = "Short";
    expect(nodeLayout(n)).toMatchObject({ width: 280, height: 150 });
  });
  it("reparents without a visual jump and detects the smallest enclosing group", () => {
    const g = node("group", 100, 100),
      n = node("task", 150, 180);
    const nodes = [g, n];
    expect(containingGroup(n, nodes)?.id).toBe(g.id);
    const grouped = reparentNode(n, g.id, nodes);
    expect(grouped.position).toEqual({ x: 50, y: 80 });
    expect(absolutePosition(grouped, [g, grouped])).toEqual(n.position);
    expect(reparentNode(grouped, undefined, [g, grouped]).position).toEqual(
      n.position,
    );
  });
  it("exports actual SVG vectors, orthogonal paths, labels, escaped content and bounds", () => {
    const d = createDiagram(),
      a = node("ai-agent", -200, -90),
      b = node("application", 450, 100);
    a.data.label = "<script>alert(1)</script>";
    d.nodes = [a, b];
    d.edges = [
      {
        id: "edge",
        source: a.id,
        target: b.id,
        label: "Approved & valid",
        data: { semantic: "data", lineStyle: "auto", properties: {} },
      } satisfies DiagramEdge,
    ];
    const { svg, width, height } = buildSvg(d);
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(doc.querySelector("foreignObject")).toBeNull();
    expect(doc.querySelector("script")).toBeNull();
    expect(doc.querySelectorAll("text").length).toBeGreaterThan(3);
    expect(svg).toContain('stroke-dasharray="7 5"');
    expect(svg).toContain("Approved &amp; valid");
    expect(width).toBeGreaterThan(750);
    expect(height).toBeGreaterThan(300);
  });
  it("handles the requested 200-node / 300-edge document without losing elements", () => {
    const d = createDiagram();
    d.nodes = Array.from({ length: 200 }, (_, i) =>
      node(
        i % 7 === 0 ? "ai-agent" : "task",
        (i % 20) * 250,
        Math.floor(i / 20) * 140,
      ),
    );
    d.edges = Array.from({ length: 300 }, (_, i) => ({
      id: `e${i}`,
      source: d.nodes[i % 200].id,
      target: d.nodes[(i + 1) % 200].id,
      data: { semantic: "control", lineStyle: "auto", properties: {} },
    }));
    const imported = parseDiagram(serializeDiagram(d));
    expect(imported.nodes).toHaveLength(200);
    expect(imported.edges).toHaveLength(300);
    expect(buildSvg(imported).svg).toContain("arrow-299");
  });
});
