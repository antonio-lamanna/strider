import { memo, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { Handle, Position, NodeResizer, useUpdateNodeInternals } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { DiagramNode } from '../../model/diagram';
import { nodeLayout } from '../../utils/geometry';
import { useEditorActions } from '../canvas/EditorContext';
import { Icon } from '../ui/Icon';
export const TableNode = memo(function TableNode(props: NodeProps<DiagramNode>) {
  const { id, data, selected, width, height } = props;
  const actions = useEditorActions();
  const layout = nodeLayout({ id, data, width, height, position: { x: 0, y: 0 } } as DiagramNode, actions.fontSize);
  const update = useUpdateNodeInternals();
  useEffect(() => { update(id); }, [id, data.fields, layout.width, layout.height, update]);
  return <div className={`table-node ${selected ? 'is-selected' : ''}`} style={{ '--accent': data.color, '--diagram-font-scale': actions.fontSize / 14, '--diagram-font-size': `${actions.fontSize}px`, borderColor: data.borderColor, width: layout.width, height: layout.height } as CSSProperties} onDoubleClick={() => actions.editNode(id)}>
    <NodeResizer isVisible={selected} minWidth={260} minHeight={52 + Math.max(1, data.fields?.length ?? 0) * 32} color={data.color} onResizeStart={() => actions.beginResize(id)} onResizeEnd={actions.endResize}/>
    <div className="table-heading"><Icon name="database" size={17}/><strong>{data.label}</strong><small>{data.fields?.length ?? 0}</small></div>
    {(data.fields ?? []).map(f => <div className="table-row" key={f.id} title={`${f.name} · ${f.dataType}${f.description ? ' · ' + f.description : ''}`}>
      <Handle id={`${f.id}:in`} type="source" position={Position.Left} className="port bidirectional" style={{ top: '50%' }} title={`Connect to ${data.label}.${f.name}`} aria-label={`${data.label}.${f.name} input`}/>
      <span className={`field-key ${f.primaryKey ? 'pk' : f.foreignKey ? 'fk' : ''}`}>{f.primaryKey ? 'PK' : f.foreignKey ? 'FK' : '·'}</span>
      <span className="table-field-name">{f.name}{!f.nullable && <b title="Required"> *</b>}{f.primaryKey && f.foreignKey && <small className="inline-fk"> FK</small>}</span>
      <code>{f.dataType}</code>
      <Handle id={`${f.id}:out`} type="source" position={Position.Right} className="port bidirectional" style={{ top: '50%' }} title={`Connect from ${data.label}.${f.name}`} aria-label={`${data.label}.${f.name} output`}/>
    </div>)}
    {(data.fields ?? []).flatMap((f, i) => (["top", "bottom"] as const).map(side => <Handle key={f.id + side} id={`${f.id}:${side}`} type="source" position={side === "top" ? Position.Top : Position.Bottom} className="port bidirectional" style={{ left: `${(i + 1) / ((data.fields?.length ?? 0) + 1) * 100}%` }} title={`${data.label}.${f.name} · ${side}`} aria-label={`${data.label}.${f.name} ${side}`} />))}
    {!data.fields?.length && <div className="table-empty">Select table to add fields</div>}
  </div>;
});
