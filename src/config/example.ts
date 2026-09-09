import { createDiagram, createNode } from "../model/diagram";
import type { Diagram, DiagramEdge, NodeTemplate } from "../model/diagram";
import { nodeTemplates } from "./nodeTypes";
import { newId } from "../utils/id";
export function exampleDiagram(): Diagram {
  const d = createDiagram();
  d.name = "User onboarding";
  d.description =
    "An automated onboarding process with an AI assistant and a manager decision.";
  function add(
    kind: string,
    label: string,
    x: number,
    y: number,
    extra: Partial<NodeTemplate> = {},
  ) {
    const t = nodeTemplates.find((t) => t.kind === kind)!;
    const n = createNode({ ...t, label, ...extra }, { x, y });
    d.nodes.push(n);
    return n;
  }
  const start = add("start", "Start", 60, 226);
  const create = add("automated-task", "Create user", 210, 217, {
    system: "power-automate",
    color: "#4775d8",
    icon: "workflow",
  });
  const agent = add("ai-agent", "Onboarding agent", 445, 201, {
    system: "openai",
  });
  const gate = add("gateway", "Is manager?", 850, 222, { subtype: "xor" });
  const slack = add("application", "Add to Slack channel", 1070, 120, {
    system: "slack",
    icon: "hash",
    color: "#94508b",
  });
  const update = add("automated-task", "Update user profile", 1070, 355, {
    system: "dataverse",
    color: "#368777",
  });
  const end1 = add("end", "End", 1400, 129),
    end2 = add("end", "End", 1400, 364);
  const connect = (a: string, b: string, label = ""): DiagramEdge => ({
    id: newId(),
    type: "orthogonal",
    source: a,
    target: b,
    sourceHandle: "out",
    targetHandle: "in",
    label,
    data: { semantic: "control", lineStyle: "auto", properties: {} },
  });
  d.edges = [
    connect(start.id, create.id),
    connect(create.id, agent.id),
    connect(agent.id, gate.id),
    connect(gate.id, slack.id, "True"),
    connect(gate.id, update.id, "False"),
    connect(slack.id, end1.id),
    connect(update.id, end2.id),
  ];
  return d;
}
