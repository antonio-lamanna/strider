import { FieldEditor } from "./FieldEditor";
import { readCustomIcon } from "../../services/customIcon";
import type { DataField } from "../../model/diagram";
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type {
  Diagram,
  DiagramNode,
  DiagramEdge,
  WorkflowNodeData,
  WorkflowEdgeData,
  JsonValue,
  NodeTemplate,
} from "../../model/diagram";
import { isContainer, isEvent } from "../../model/diagram";
import { nodeTemplates, typeLabel } from "../../config/nodeTypes";
import { systemPresets } from "../../config/systemPresets";
import { descendants, nodeLayout } from "../../utils/geometry";
import {
  Icon,
  icons,
  PanelRightClose,
  RotateCcw,
  Copy,
  Trash2,
  Plus,
  Unlink,
} from "../ui/Icon";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="property-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
function PropertiesEditor({
  value,
  onChange,
}: {
  value: Record<string, JsonValue>;
  onChange: (p: Record<string, JsonValue>) => void;
}) {
  const [draft, setDraft] = useState(JSON.stringify(value, null, 2)),
    [error, setError] = useState("");
  useEffect(() => {
    setDraft(JSON.stringify(value, null, 2));
    setError("");
  }, [value]);
  const changed = draft !== JSON.stringify(value, null, 2);
  function apply() {
    try {
      const v = JSON.parse(draft);
      if (!v || Array.isArray(v) || typeof v !== "object")
        throw new Error(
          'Use a JSON object, for example {"owner":"Operations"}.',
        );
      onChange(v);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON.");
    }
  }
  return (
    <>
      <textarea
        aria-label="Additional properties JSON"
        className="json-editor"
        rows={5}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setError("");
        }}
        spellCheck={false}
      />
      {error && <p className="field-error">{error}</p>}
      {changed && (
        <button className="secondary-button full-width" onClick={apply}>
          Apply properties
        </button>
      )}
    </>
  );
}
interface Props {
  onFields: (id: string, fields: DataField[]) => void;
  diagram: Diagram;
  nodes: DiagramNode[];
  edge?: DiagramEdge;
  onDiagram: (patch: Partial<Diagram>) => void;
  onData: (id: string, data: Partial<WorkflowNodeData>) => void;
  onType: (id: string, t: NodeTemplate) => void;
  onEdge: (
    id: string,
    patch: Partial<DiagramEdge>,
    data?: Partial<WorkflowEdgeData>,
  ) => void;
  onSize: (id: string, w: number, h: number) => void;
  onReset: (id: string) => void;
  onParent: (id: string, parentId?: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onGroup: () => void;
  onUngroup: (id: string) => void;
  onClose: () => void;
}
export function PropertiesPanel(p: Props) {
  const [iconError, setIconError] = useState("");
  const node = p.nodes.length === 1 ? p.nodes[0] : undefined,
    edge = !p.nodes.length ? p.edge : undefined;
  const layout = node ? nodeLayout(node) : null;
  const excluded = node
    ? descendants(new Set([node.id]), p.diagram.nodes)
    : new Set<string>();
  const groups = p.diagram.nodes.filter(
    (n) => isContainer(n) && !excluded.has(n.id),
  );
  return (
    <aside className="properties panel" aria-label="Properties panel">
      <div className="panel-heading">
        <span>Inspector</span>
        <button
          className="icon-button"
          title="Collapse inspector"
          onClick={p.onClose}
        >
          <PanelRightClose size={16} />
        </button>
      </div>
      <div className="properties-scroll">
        {p.nodes.length > 1 ? (
          <>
            <div className="inspector-summary">
              <span className="summary-icon">
                <Icon name="group" size={21} />
              </span>
              <div>
                <strong>{p.nodes.length} components</strong>
                <small>Multiple selection</small>
              </div>
            </div>
            <Section title="Selection">
              <button
                className="secondary-button full-width"
                onClick={p.onGroup}
              >
                <Plus size={15} />
                Group selection
              </button>
              <button
                className="secondary-button full-width"
                onClick={p.onDuplicate}
              >
                <Copy size={15} />
                Duplicate selection
              </button>
              <button className="danger-button full-width" onClick={p.onDelete}>
                <Trash2 size={15} />
                Delete selection
              </button>
            </Section>
            <p className="panel-note">
              Move the selection together, or create a container to keep these
              components in one boundary.
            </p>
          </>
        ) : node && layout ? (
          <>
            <div
              className="inspector-summary"
              style={{ "--accent": node.data.color } as CSSProperties}
            >
              <span className="summary-icon accent">
                <Icon name={node.data.icon} size={21} />
              </span>
              <div>
                <strong>{typeLabel(node.data.kind, node.data.subtype)}</strong>
                <small>
                  {node.data.system
                    ? (systemPresets.find((s) => s.id === node.data.system)
                        ?.name ?? node.data.system)
                    : "Component properties"}
                </small>
              </div>
            </div>
            <Section title="Content">
              <Field label="Label">
                <textarea
                  id="node-label-input"
                  rows={2}
                  value={node.data.label}
                  onChange={(e) => p.onData(node.id, { label: e.target.value })}
                />
              </Field>
              <Field label="Description">
                <textarea
                  rows={3}
                  placeholder="Add a description…"
                  value={node.data.description}
                  onChange={(e) =>
                    p.onData(node.id, { description: e.target.value })
                  }
                />
              </Field>
              {node.data.kind !== "table" && <Field label="Node type">
                <select
                  value={`${node.data.kind}:${node.data.subtype ?? ""}`}
                  onChange={(e) => {
                    const t = nodeTemplates.find(
                      (t) => `${t.kind}:${t.subtype ?? ""}` === e.target.value,
                    );
                    if (t) p.onType(node.id, t);
                  }}
                >
                  {nodeTemplates
                    .filter(
                      (t) =>
                        t.kind !== "table" && ["group", "system-boundary", "team-boundary"].includes(
                          t.kind,
                        ) === isContainer(node),
                    )
                    .map((t) => (
                      <option
                        key={`${t.kind}:${t.subtype ?? ""}`}
                        value={`${t.kind}:${t.subtype ?? ""}`}
                      >
                        {t.label}
                      </option>
                    ))}
                </select>
              </Field>}
            </Section>
            {node.data.kind === "table" && <FieldEditor key={node.id} fields={node.data.fields ?? []} onChange={fields => p.onFields(node.id, fields)}/>}
            <Section title="Appearance">
              {p.diagram.kind === "architecture" && !isContainer(node) && !isEvent(node) && node.data.kind !== "gateway" && <Field label="Display"><select aria-label="Display mode" value={node.data.displayMode ?? "card"} onChange={e => p.onData(node.id, { displayMode: e.target.value as "card" | "icon" })}><option value="card">Card</option><option value="icon">Icon only</option></select></Field>}
              <Field label="System preset">
                <select
                  value={node.data.system ?? ""}
                  onChange={(e) => {
                    const preset = systemPresets.find(
                      (s) => s.id === e.target.value,
                    );
                    p.onData(
                      node.id,
                      preset
                        ? {
                            system: preset.id,
                            icon: preset.icon,
                            color: preset.accentColor,
                          }
                        : { system: undefined },
                    );
                  }}
                >
                  <option value="">Custom / none</option>
                  {node.data.system &&
                    !systemPresets.some((s) => s.id === node.data.system) && (
                      <option value={node.data.system}>
                        {node.data.system}
                      </option>
                    )}
                  {systemPresets.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="field-pair">
                <Field label="Icon">
                  <select
                    value={icons[node.data.icon] ? node.data.icon : "box"}
                    onChange={(e) =>
                      p.onData(node.id, { icon: e.target.value })
                    }
                  >
                    {Object.keys(icons).map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Accent">
                  <div className="color-field">
                    <input
                      type="color"
                      aria-label="Accent color"
                      value={node.data.color}
                      onChange={(e) =>
                        p.onData(node.id, { color: e.target.value })
                      }
                    />
                    <span>{node.data.color.toUpperCase()}</span>
                  </div>
                </Field>
              </div>
            </Section>
            {!isEvent(node) && node.data.kind !== "gateway" && node.data.kind !== "table" && <Section title="Custom icon">
              <label className="field"><span>Upload PNG, JPEG or WebP</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e => {
                const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
                const id = node.id; setIconError('');
                try { const customIcon = await readCustomIcon(file); p.onData(id, { customIcon }); } catch (error) { setIconError(error instanceof Error ? error.message : 'Unable to open image.'); }
              }}/></label>
              {node.data.customIcon && <div className="custom-icon-preview"><img src={node.data.customIcon} alt="Custom icon"/><button className="subtle-button" onClick={() => p.onData(node.id, { customIcon: undefined })}>Remove custom icon</button></div>}
              {iconError && <p className="field-error">{iconError}</p>}
            </Section>}
            {!isEvent(node) && node.data.kind !== "gateway" && (
              <Section title="Dimensions">
                <div className="sizing-switch">
                  <button
                    className={node.data.sizeMode === "auto" ? "active" : ""}
                    disabled={isContainer(node)}
                    onClick={() => p.onReset(node.id)}
                  >
                    Auto size
                  </button>
                  <button
                    className={node.data.sizeMode === "manual" ? "active" : ""}
                    onClick={() =>
                      p.onSize(node.id, layout.width, layout.height)
                    }
                  >
                    Manual
                  </button>
                </div>
                <div className="field-pair">
                  <Field label="Width">
                    <div className="unit-input">
                      <input
                        type="number"
                        min={150}
                        max={20000}
                        value={Math.round(layout.width)}
                        onChange={(e) => {
                          if (Number(e.target.value) >= 150)
                            p.onSize(
                              node.id,
                              Number(e.target.value),
                              layout.height,
                            );
                        }}
                      />
                      <span>px</span>
                    </div>
                  </Field>
                  <Field label="Height">
                    <div className="unit-input">
                      <input
                        type="number"
                        min={
                          isContainer(node)
                            ? 140
                            : node.data.kind === "ai-agent"
                              ? 96
                              : 62
                        }
                        max={20000}
                        value={Math.round(layout.height)}
                        onChange={(e) => {
                          if (Number(e.target.value) >= 40)
                            p.onSize(
                              node.id,
                              layout.width,
                              Number(e.target.value),
                            );
                        }}
                      />
                      <span>px</span>
                    </div>
                  </Field>
                </div>
                <button
                  className="subtle-button"
                  onClick={() => p.onReset(node.id)}
                >
                  <RotateCcw size={13} />
                  {isContainer(node)
                    ? "Fit container to contents"
                    : "Reset to content size"}
                </button>
              </Section>
            )}
            {node.data.kind === "ai-agent" && (
              <Section title="Agent capabilities">
                {["model", "memory", "tools"].map((key) => (
                  <Field key={key} label={key[0].toUpperCase() + key.slice(1)}>
                    <input
                      value={String(node.data.properties[key] ?? "")}
                      placeholder={key === "model" ? "e.g. GPT-5" : "Optional"}
                      onChange={(e) =>
                        p.onData(node.id, {
                          properties: {
                            ...node.data.properties,
                            [key]: e.target.value,
                          },
                        })
                      }
                    />
                  </Field>
                ))}
              </Section>
            )}
            <Section title="Container">
              <Field label="Belongs to">
                <select
                  value={node.parentId ?? ""}
                  onChange={(e) =>
                    p.onParent(node.id, e.target.value || undefined)
                  }
                >
                  <option value="">Canvas (no container)</option>
                  {groups.map((g) => (
                    <option value={g.id} key={g.id}>
                      {g.data.label}
                    </option>
                  ))}
                </select>
              </Field>
              {isContainer(node) && (
                <button
                  className="subtle-button"
                  onClick={() => p.onUngroup(node.id)}
                >
                  <Unlink size={14} />
                  Ungroup contents
                </button>
              )}
            </Section>
            <Section title="Additional properties">
              <PropertiesEditor
                key={node.id}
                value={node.data.properties}
                onChange={(properties) => p.onData(node.id, { properties })}
              />
            </Section>
            <div className="inspector-actions">
              <button className="secondary-button" onClick={p.onDuplicate}>
                <Copy size={15} />
                Duplicate
              </button>
              <button
                className="icon-button danger"
                title="Delete component"
                aria-label="Delete component"
                onClick={p.onDelete}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </>
        ) : edge ? (
          <>
            <div className="inspector-summary">
              <span className="summary-icon">
                <Icon name="git-branch" size={21} />
              </span>
              <div>
                <strong>Connection</strong>
                <small>Flow properties</small>
              </div>
            </div>
            {p.diagram.kind === 'data-model' && <Section title="Relationship"><Field label="Cardinality"><select value={String(edge.data?.properties.cardinality ?? '1:N')} onChange={e => p.onEdge(edge.id, {}, { properties: { ...edge.data?.properties, cardinality: e.target.value } })}>{['1:1', '1:N', 'N:1', 'N:N'].map(c => <option key={c}>{c}</option>)}</select></Field></Section>}
            <Section title="Connection">
              <Field label="Label">
                <input
                  id="edge-label-input"
                  placeholder="e.g. Approved"
                  value={String(edge.label ?? "")}
                  onChange={(e) => p.onEdge(edge.id, { label: e.target.value })}
                />
              </Field>
              <Field label="Semantic type">
                <select
                  value={edge.data?.semantic ?? "control"}
                  onChange={(e) =>
                    p.onEdge(
                      edge.id,
                      {},
                      {
                        semantic: e.target
                          .value as WorkflowEdgeData["semantic"],
                      },
                    )
                  }
                >
                  {["control", "data", "resource", "event", "exception"].map(
                    (s) => (
                      <option key={s} value={s}>
                        {s[0].toUpperCase() + s.slice(1)} flow
                      </option>
                    ),
                  )}
                </select>
              </Field>
              <Field label="Connection color"><div className="color-field"><input type="color" aria-label="Connection color" value={edge.data?.color ?? "#929eae"} onChange={e => p.onEdge(edge.id, {}, { color: e.target.value })}/><button className="subtle-button" onClick={() => p.onEdge(edge.id, {}, { color: undefined })}>Reset</button></div></Field>
              <Field label="Line style">
                <select
                  value={edge.data?.lineStyle ?? "auto"}
                  onChange={(e) =>
                    p.onEdge(
                      edge.id,
                      {},
                      {
                        lineStyle: e.target
                          .value as WorkflowEdgeData["lineStyle"],
                      },
                    )
                  }
                >
                  <option value="auto">Automatic · follows type</option>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </Field>
            </Section>
            <Section title="Endpoints">
              {(["source", "target"] as const).map((side) => {
                const current = p.diagram.nodes.find(
                    (n) => n.id === edge[side],
                  ),
                  direction = side === "source" ? "output" : "input";
                return (
                  <div key={side}>
                    <Field label={side === "source" ? "Source" : "Target"}>
                      <select
                        value={edge[side]}
                        onChange={(e) => {
                          const target = p.diagram.nodes.find(
                            (n) => n.id === e.target.value,
                          )!;
                          p.onEdge(edge.id, {
                            [side]: target.id,
                            [`${side}Handle`]: target.data.ports.find(
                              (p) => p.direction === direction,
                            )!.id,
                          });
                        }}
                      >
                        {p.diagram.nodes
                          .filter((n) =>
                            n.data.ports.some((p) => p.direction === direction),
                          )
                          .map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.data.label || "Unnamed component"}
                            </option>
                          ))}
                      </select>
                    </Field>
                    <Field
                      label={side === "source" ? "Output port" : "Input port"}
                    >
                      <select
                        value={
                          (side === "source"
                            ? edge.sourceHandle
                            : edge.targetHandle) ?? ""
                        }
                        onChange={(e) =>
                          p.onEdge(edge.id, {
                            [`${side}Handle`]: e.target.value,
                          })
                        }
                      >
                        {current?.data.ports
                          .filter((p) => p.direction === direction)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label ?? p.id} · {p.side}
                            </option>
                          ))}
                      </select>
                    </Field>
                  </div>
                );
              })}
            </Section>
            <Section title="Additional properties">
              <PropertiesEditor
                key={edge.id}
                value={edge.data?.properties ?? {}}
                onChange={(properties) => p.onEdge(edge.id, {}, { properties })}
              />
            </Section>
            <div className="inspector-actions">
              <button className="danger-button full-width" onClick={p.onDelete}>
                <Trash2 size={15} />
                Delete connection
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="inspector-summary">
              <span className="summary-icon">
                <Icon name="workflow" size={22} />
              </span>
              <div>
                <strong>Diagram</strong>
                <small>Workspace properties</small>
              </div>
            </div>
            <Section title="Overview">
              <Field label="Name">
                <input
                  value={p.diagram.name}
                  onChange={(e) => p.onDiagram({ name: e.target.value })}
                />
              </Field>
              <Field label="Description">
                <textarea
                  placeholder="What does this diagram describe?"
                  rows={3}
                  value={p.diagram.description}
                  onChange={(e) => p.onDiagram({ description: e.target.value })}
                />
              </Field>
              <div className="diagram-stats">
                <div>
                  <strong>
                    {p.diagram.nodes.filter((n) => !isContainer(n)).length}
                  </strong>
                  <span>Components</span>
                </div>
                <div>
                  <strong>{p.diagram.edges.length}</strong>
                  <span>Connections</span>
                </div>
              </div>
            </Section>
            <Section title="Canvas">
              <label className="toggle-row">
                <span>Show grid</span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={p.diagram.settings.grid}
                  onChange={(e) =>
                    p.onDiagram({
                      settings: {
                        ...p.diagram.settings,
                        grid: e.target.checked,
                      },
                    })
                  }
                />
              </label>
              <label className="toggle-row">
                <span>Snap to grid</span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={p.diagram.settings.snap}
                  onChange={(e) =>
                    p.onDiagram({
                      settings: {
                        ...p.diagram.settings,
                        snap: e.target.checked,
                      },
                    })
                  }
                />
              </label>
              <Field label="Grid color"><input type="color" value={p.diagram.settings.gridColor ?? '#bbc3ce'} onChange={e => p.onDiagram({ settings: { ...p.diagram.settings, gridColor: e.target.value } })}/></Field>
              <Field label="Grid spacing">
                <select
                  value={p.diagram.settings.gridSize}
                  onChange={(e) =>
                    p.onDiagram({
                      settings: {
                        ...p.diagram.settings,
                        gridSize: Number(e.target.value),
                      },
                    })
                  }
                >
                  {Array.from(
                    new Set([
                      10,
                      16,
                      20,
                      24,
                      32,
                      40,
                      p.diagram.settings.gridSize,
                    ]),
                  )
                    .sort((a, b) => a - b)
                    .map((s) => (
                      <option key={s} value={s}>
                        {s} px
                      </option>
                    ))}
                </select>
              </Field>
            </Section>
            <Section title="Connection guide">
              <div className="connection-legend">
                <span className="legend-line" />
                Control flow
              </div>
              <div className="connection-legend">
                <span className="legend-line dashed" />
                Data flow
              </div>
              <div className="connection-legend">
                <span className="legend-line dotted" />
                Exception
              </div>
            </Section>
            <div className="inspector-empty">
              <Icon name="sliders" size={19} />
              <p>Select a component or connection to edit its properties.</p>
            </div>
          </>
        )}
      </div>
      <div className="inspector-footer">
        <span className="local-indicator" />
        Local workspace<span>XML 1.0</span>
      </div>
    </aside>
  );
}
