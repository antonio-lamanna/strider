import type { NodeTemplate } from "../model/diagram";
export const nodeCategories: { name: string; items: NodeTemplate[] }[] = [
  {
    name: "Flow",
    items: [
      { kind: "start", label: "Start", icon: "play", color: "#26966b" },
      { kind: "end", label: "End", icon: "square", color: "#dc6161" },
      { kind: "event", label: "Event", icon: "zap", color: "#d79427" },
      { kind: "timer", label: "Timer", icon: "clock", color: "#d79427" },
      {
        kind: "gateway",
        subtype: "xor",
        label: "XOR gateway",
        icon: "git-branch",
        color: "#c18b35",
      },
      {
        kind: "gateway",
        subtype: "and",
        label: "AND gateway",
        icon: "plus",
        color: "#c18b35",
      },
      {
        kind: "gateway",
        subtype: "or",
        label: "OR gateway",
        icon: "circle",
        color: "#c18b35",
      },
    ],
  },
  {
    name: "Activities",
    items: [
      { kind: "task", label: "Task", icon: "check-square", color: "#5c738c" },
      {
        kind: "human-task",
        label: "Human task",
        icon: "user-check",
        color: "#d79427",
      },
      {
        kind: "automated-task",
        label: "Automated task",
        icon: "settings",
        color: "#4f7cd7",
      },
      { kind: "script", label: "Script", icon: "code", color: "#cc8b31" },
      { kind: "decision", label: "Decision", icon: "split", color: "#c18b35" },
      { kind: "api-call", label: "API call", icon: "globe", color: "#6385df" },
      { kind: "ai-agent", label: "AI Agent", icon: "bot", color: "#8370ca" },
    ],
  },
  {
    name: "Data",
    items: [
      {
        kind: "database",
        label: "Database",
        icon: "database",
        color: "#399b94",
      },
      {
        kind: "document",
        label: "Document",
        icon: "file-text",
        color: "#78909c",
      },
      { kind: "file", label: "File", icon: "file", color: "#78909c" },
      { kind: "queue", label: "Queue", icon: "list", color: "#399b94" },
      {
        kind: "data-object",
        label: "Data object",
        icon: "braces",
        color: "#399b94",
      },
    ],
  },
  {
    name: "Actors",
    items: [
      { kind: "user", label: "User", icon: "user", color: "#c19243" },
      { kind: "team", label: "Team", icon: "users", color: "#c19243" },
      {
        kind: "external-actor",
        label: "External actor",
        icon: "contact",
        color: "#c19243",
      },
    ],
  },
  {
    name: "Physical",
    items: [
      { kind: "robot", label: "Robot", icon: "bot", color: "#aa79b1" },
      {
        kind: "mobile-robot",
        label: "Mobile robot",
        icon: "truck",
        color: "#aa79b1",
      },
      { kind: "device", label: "Device", icon: "cpu", color: "#aa79b1" },
    ],
  },
  {
    name: "Systems & resources",
    items: [
      {
        kind: "application",
        label: "Application",
        icon: "app-window",
        color: "#5f7ec7",
      },
      {
        kind: "external-system",
        label: "External system",
        icon: "external-link",
        color: "#5f7ec7",
      },
      { kind: "resource", label: "Resource", icon: "box", color: "#78909c" },
    ],
  },
  {
    name: "Containers",
    items: [
      { kind: "lane", label: "Lane", icon: "square-kanban", color: "#8794a6" },
      { kind: "group", label: "Group", icon: "group", color: "#8794a6" },
      {
        kind: "system-boundary",
        label: "System boundary",
        icon: "layers",
        color: "#5f7ec7",
      },
      {
        kind: "team-boundary",
        label: "Team boundary",
        icon: "users",
        color: "#c19243",
      },
    ],
  },
];
export const nodeTemplates = nodeCategories.flatMap((c) => c.items);
export const typeLabel = (kind: string, subtype?: string) =>
  nodeTemplates.find(
    (t) => t.kind === kind && (!subtype || t.subtype === subtype),
  )?.label ?? kind;
