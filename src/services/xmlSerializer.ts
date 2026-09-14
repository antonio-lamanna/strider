import { connectionPorts } from "../model/connectionPorts";
import type { Diagram, JsonValue } from "../model/diagram";
import { cleanDiagram } from "../model/diagram";

export function serializeDiagram(input: Diagram): string {
  const d = cleanDiagram(input),
    doc = document.implementation.createDocument(null, d.kind === "data-model" ? "data-model-diagram" : d.kind === "architecture" ? "architecture-diagram" : "automation-diagram");
  const root = doc.documentElement;
  const append = (
    parent: Element,
    name: string,
    attrs: Record<string, unknown> = {},
    text?: string,
  ) => {
    const e = doc.createElement(name);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v !== undefined && v !== null) e.setAttribute(k, String(v));
    });
    if (text !== undefined) e.textContent = text;
    parent.appendChild(e);
    return e;
  };
  root.setAttribute("version", d.version);
  root.setAttribute("id", d.id);
  root.setAttribute("name", d.name);
  append(root, "metadata", {
    "created-at": d.createdAt,
    "updated-at": d.updatedAt,
  });
  append(root, "description", {}, d.description);
  append(root, "viewport", d.viewport);
  append(root, "settings", d.settings);
  if (d.workflowLayout) append(root, "workflow-layout", {}, JSON.stringify(d.workflowLayout));
  const writeProperties = (
    parent: Element,
    props: Record<string, JsonValue>,
  ) => {
    const group = append(parent, "properties");
    Object.entries(props).forEach(([name, value]) =>
      append(
        group,
        "property",
        { name, encoding: "json" },
        JSON.stringify(value),
      ),
    );
  };
  const nodes = append(root, "nodes");
  d.nodes.forEach((n) => {
    const e = append(nodes, "node", {
      id: n.id,
      type: n.data.kind,
      subtype: n.data.subtype,
      label: n.data.label,
      system: n.data.system,
      icon: n.data.icon,
      color: n.data.color,
      borderColor: n.data.borderColor,
      x: n.position.x,
      y: n.position.y,
      width: n.width,
      height: n.height,
      sizeMode: n.data.sizeMode,
      displayMode: n.data.displayMode,
      iconMode: n.data.iconMode,
      parent: n.parentId,
      zIndex: n.zIndex,
    });
    append(e, "description", {}, n.data.description);
    if (n.data.productIcon) append(e, "product-icon", {name:n.data.productIconName}, n.data.productIcon);
    if (n.data.customIcon) append(e, "custom-icon", {}, n.data.customIcon);
    if (n.data.fields) {
      const fields = append(e, "fields");
      n.data.fields.forEach(f => append(fields, "field", { ...f }));
    }
    writeProperties(e, n.data.properties);
    const ports = append(e, "ports");
    connectionPorts(n).forEach((p) => append(ports, "port", { ...p }));
  });
  const edges = append(root, "edges");
  d.edges.forEach((e) => {
    const el = append(edges, "edge", {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: e.data?.semantic ?? "control",
      label: e.label ?? "",
      lineStyle: e.data?.lineStyle ?? "auto",
      arrowDirection: e.data?.arrowDirection,
      color: e.data?.color,
    });
    if (e.data?.route) append(el, "route", {}, JSON.stringify(e.data.route));
    writeProperties(el, e.data?.properties ?? {});
  });
  // Add indentation as DOM whitespace so arbitrary text/property values remain untouched.
  function indent(el: Element, level: number) {
    const children = Array.from(el.children);
    if (!children.length) return;
    children.forEach((c) => {
      el.insertBefore(doc.createTextNode("\n" + "  ".repeat(level + 1)), c);
      indent(c, level + 1);
    });
    el.appendChild(doc.createTextNode("\n" + "  ".repeat(level)));
  }
  indent(root, 0);
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    new XMLSerializer().serializeToString(doc) +
    "\n"
  );
}
