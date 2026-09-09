import { memo, useEffect } from "react";
import type { CSSProperties } from "react";
import { Handle, NodeResizer, useUpdateNodeInternals } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { DiagramNode } from "../../model/diagram";
import { nodeLayout, sidePosition } from "../../utils/geometry";
import { Icon } from "../ui/Icon";
import { useEditorActions } from "../canvas/EditorContext";

export const WorkflowNode = memo(function WorkflowNode(
  props: NodeProps<DiagramNode>,
) {
  const { id, data, selected, width, height } = props;
  const node = {
    id,
    data,
    width,
    height,
    position: { x: 0, y: 0 },
  } as DiagramNode;
  const layout = nodeLayout(node),
    actions = useEditorActions(),
    updateInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateInternals(id);
  }, [id, layout.width, layout.height, data.ports, updateInternals]);
  const handles = data.ports.map((p) => {
    const siblings = data.ports.filter((q) => q.side === p.side),
      offset =
        ((siblings.findIndex((q) => q.id === p.id) + 1) /
          (siblings.length + 1)) *
        100;
    return (
      <Handle
        key={p.id}
        id={p.id}
        type={p.direction === "input" ? "target" : "source"}
        position={sidePosition[p.side]}
        className={`port ${p.direction}`}
        style={
          p.side === "left" || p.side === "right"
            ? { top: `${offset}%` }
            : { left: `${offset}%` }
        }
        title={`${p.label ?? p.id} · ${p.direction}`}
        aria-label={`${data.label} ${p.direction} ${p.side}`}
      />
    );
  });
  const style = {
    "--accent": data.color,
    width: layout.width,
    height: layout.height,
  } as CSSProperties;
  if (layout.group)
    return (
      <div
        className={`container-node ${selected ? "is-selected" : ""}`}
        style={style}
      >
        <NodeResizer
          isVisible={selected}
          minWidth={220}
          minHeight={140}
          color={data.color}
          onResizeStart={() => actions.beginResize(id)}
          onResizeEnd={actions.endResize}
        />
        <div
          className="container-heading"
          onDoubleClick={() => actions.editNode(id)}
        >
          <Icon name={data.icon} size={16} />
          <span>{data.label}</span>
        </div>
      </div>
    );
  if (layout.event || layout.gateway)
    return (
      <div
        className={`symbol-node ${selected ? "is-selected" : ""}`}
        style={style}
        onDoubleClick={() => actions.editNode(id)}
      >
        <div
          className={
            layout.gateway ? "gateway-core" : `event-core ${data.kind}`
          }
        >
          {layout.gateway ? (
            <span className="gateway-symbol">
              {data.subtype === "and" ? "+" : data.subtype === "or" ? "○" : "×"}
            </span>
          ) : (
            <Icon name={data.icon} size={17} />
          )}
          {handles}
        </div>
        <div className="symbol-label">
          {layout.labelLines.map((line, i) => (
            <div key={i}>{line || "\u00a0"}</div>
          ))}
        </div>
      </div>
    );
  return (
    <div
      className={`workflow-node ${selected ? "is-selected" : ""} ${data.kind === "ai-agent" ? "agent-node" : ""}`}
      style={style}
      onDoubleClick={() => actions.editNode(id)}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={150}
        minHeight={data.kind === "ai-agent" ? 96 : 62}
        color={data.color}
        onResizeStart={() => actions.beginResize(id)}
        onResizeEnd={actions.endResize}
      />
      <div className="node-inner">
        <div className="node-main">
          <span className="node-icon">
            <Icon name={data.icon} size={18} />
          </span>
          <div className="node-text">
            <div className="node-label">
              {layout.labelLines.map((line, i) => (
                <div key={i}>{line || "\u00a0"}</div>
              ))}
            </div>
            {!!layout.descriptionLines.length && (
              <div className="node-description">
                {layout.descriptionLines.map((line, i) => (
                  <div key={i}>{line || "\u00a0"}</div>
                ))}
              </div>
            )}
          </div>
        </div>
        {data.kind === "ai-agent" && (
          <div className="agent-capabilities">
            <span>{String(data.properties.model ?? "Model")}</span>
            {!!data.properties.memory && <span>Memory</span>}
            {!!data.properties.tools && <span>Tools</span>}
          </div>
        )}
      </div>
      {handles}
    </div>
  );
});
