import type { DiagramNode, Port, Side } from "./diagram";
import { defaultPorts } from "./diagram";

/** Legacy port IDs remain stable; direction is metadata, not a drawing restriction. */
export function connectionPorts(node: DiagramNode): Port[] {
  if (node.data.kind === "table") return node.data.ports;
  const ports = [...node.data.ports];
  const defaults = defaultPorts();
  for (const side of ["left", "right", "top", "bottom"] as Side[]) {
    if (ports.some(p => p.side === side)) continue;
    const preset = defaults.find(p => p.side === side)!;
    let id = preset.id;
    while (ports.some(p => p.id === id)) id += "-side";
    ports.push({ ...preset, id });
  }
  return ports;
}
