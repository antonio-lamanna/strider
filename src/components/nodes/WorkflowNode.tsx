import { connectionPorts } from "../../model/connectionPorts";
import { typeLabel } from "../../config/nodeTypes";
import { TableNode } from "./TableNode";
import { memo, useEffect } from "react";
import type { CSSProperties } from "react";
import { Handle, NodeResizer, useUpdateNodeInternals } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { DiagramNode } from "../../model/diagram";
import { nodeLayout, sidePosition } from "../../utils/geometry";
import { Icon } from "../ui/Icon";
import { NodeIcon } from "../ui/NodeIcon";
import { useEditorActions } from "../canvas/EditorContext";

const NormalWorkflowNode = memo(function NormalWorkflowNode(
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
  const actions = useEditorActions();
  const layout = nodeLayout(node, actions.fontSize),
    updateInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateInternals(id);
  }, [id, layout.width, layout.height, data.ports, updateInternals]);
  const ports = connectionPorts(node);
  const handles = ports.map((p) => {
    const siblings = ports.filter((q) => q.side === p.side),
      offset =
        ((siblings.findIndex((q) => q.id === p.id) + 1) /
          (siblings.length + 1)) *
        100;
    return (
      <Handle
        key={p.id}
        id={p.id}
        type="source"
        position={sidePosition[p.side]}
        className="port bidirectional"
        style={
          p.side === "left" || p.side === "right"
            ? { top: `${offset}%` }
            : { left: `${offset}%` }
        }
        title={`${p.label ?? p.side} · connect from or to this side`}
        aria-label={`${data.label} connection ${p.side}`}
      />
    );
  });
  const style = {
    "--accent": data.color,
    "--diagram-font-scale": actions.fontSize / 14,
    "--diagram-font-size": `${actions.fontSize}px`,
    "--component-border": data.borderColor,
    borderColor: data.borderColor,
    width: layout.width,
    height: layout.height,
  } as CSSProperties;
  if (layout.group)
    return (
      <div
        className={`container-node ${data.kind === "lane" ? "lane-node" : ""} ${selected ? "is-selected" : ""}`}
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
          <NodeIcon data={data} size={16} />
          <span>{data.label}</span>
        </div>
        {handles}
      </div>
    );
  if (data.displayMode === "icon" && !layout.event && !layout.gateway) return <div className={`icon-only-node ${selected ? "is-selected" : ""}`} style={style} onDoubleClick={() => actions.editNode(id)}>
    <NodeResizer isVisible={selected} minWidth={40} minHeight={40} color={data.color} onResizeStart={() => actions.beginResize(id)} onResizeEnd={actions.endResize}/>
    <div className="standalone-icon"><NodeIcon data={data} size={Math.max(20, Math.min(layout.width, layout.height) - 16)}/></div>
    <div className="symbol-label">{layout.labelLines.map((line, i) => <div key={i}>{line}</div>)}</div>{handles}
  </div>;
  if (layout.gateway) return <div className={`gateway-node ${selected ? "is-selected" : ""}`} style={style} onDoubleClick={() => actions.editNode(id)}>
    <svg className="gateway-outline" viewBox="0 0 64 64" aria-hidden="true"><polygon points="32,1 63,32 32,63 1,32" /></svg>
    <span className="gateway-symbol">{data.subtype === "and" ? "+" : data.subtype === "or" ? "○" : "×"}</span>
    <div className="gateway-label">{layout.labelLines.map((line, i) => <div key={i}>{line}</div>)}</div>{handles}
  </div>;
  if (layout.event || layout.gateway) return <div className={`flow-card ${layout.event ? 'flow-event' : 'flow-gateway'} ${selected ? 'is-selected' : ''}`} style={style} onDoubleClick={()=>actions.editNode(id)}>
    <span className="node-icon">{layout.gateway ? <span className="gateway-symbol">{data.subtype==='and'?'+':data.subtype==='or'?'○':'×'}</span> : <Icon name={data.icon} size={14}/>}</span>
    <div className="node-text"><div className="node-label">{layout.labelLines.map((line,i)=><div key={i}>{line}</div>)}</div>{layout.gateway&&<div className="node-kind-label">{typeLabel(data.kind, data.subtype)}</div>}</div>{handles}
  </div>;
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
            <NodeIcon data={data} size={18} />
          </span>
          <div className="node-text">
            <div className="node-label">
              {layout.labelLines.map((line, i) => (
                <div key={i}>{line || "\u00a0"}</div>
              ))}
            </div>
            {!layout.descriptionLines.length && <div className="node-kind-label">{typeLabel(data.kind, data.subtype)}</div>}
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

export const WorkflowNode = memo(function WorkflowNode(props: NodeProps<DiagramNode>) { return props.data.kind === "table" ? <TableNode {...props}/> : <NormalWorkflowNode {...props}/>; });
