import type { Diagram, DiagramNode } from './diagram';
import { createField, fieldFromHandle, withFields } from './dataModel';

/** A subset of a UNIQUE/PRIMARY key is not necessarily unique; the whole key must be present. */
export function fieldsAreUnique(node: DiagramNode, ids: string[]): boolean {
  const fields = node.data.fields ?? [];
  const keys = [
    fields.filter(f => f.primaryKey).map(f => f.id),
    ...fields.filter(f => f.unique).map(f => [f.id]),
    ...((node.data.properties.sqlUniqueKeys ?? []) as string[][]),
  ];
  return keys.some(key => key.length > 0 && key.every(id => ids.includes(id)));
}

/** Repair only the selected relationship, atomically with its fields and handles. */
export function reconcileRelationship(diagram: Diagram, edgeId: string): Diagram {
  if (diagram.kind !== 'data-model') return diagram;
  const edge = diagram.edges.find(e => e.id === edgeId);
  if (!edge) return diagram;
  const cardinality = String(edge.data?.properties.cardinality ?? '1:N');
  if (cardinality === 'N:N') return diagram;
  const reverse = cardinality === 'N:1';
  const parent = diagram.nodes.find(n => n.id === (reverse ? edge.target : edge.source));
  const child = diagram.nodes.find(n => n.id === (reverse ? edge.source : edge.target));
  if (!parent || !child) return diagram;
  const parentField = parent.data.fields?.find(f => f.id === fieldFromHandle(reverse ? edge.targetHandle : edge.sourceHandle));
  const oldField = child.data.fields?.find(f => f.id === fieldFromHandle(reverse ? edge.sourceHandle : edge.targetHandle));
  if (!parentField || !oldField) return diagram;
  const group = edge.data?.properties.foreignKeyGroup;
  const composite = group && diagram.edges.filter(e => e.data?.properties.foreignKeyGroup === group).length > 1;
  if (composite || cardinality === '1:1' || !fieldsAreUnique(child, [oldField.id])) {
    return { ...diagram, nodes: diagram.nodes.map(n => n.id === child.id ? withFields(n, n.data.fields!.map(f => f.id === oldField.id ? { ...f, foreignKey: true } : f)) : n) };
  }
  // Keep the child PK intact. Do not turn a unique identifier into a repeating FK.
  const stem = (parent.data.label.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() || 'parent') + '_' + parentField.name;
  const fields = child.data.fields ?? [];
  let name = stem, suffix = 2;
  while (fields.some(f => f.name.toLowerCase() === name.toLowerCase())) name = stem + '_' + suffix++;
  const field = { ...createField(name), dataType: parentField.dataType, nullable: oldField.nullable, foreignKey: true };
  const stillUsed = diagram.edges.some(e => e.id !== edge.id && (
    (e.target === child.id && e.data?.properties.cardinality !== 'N:1' && fieldFromHandle(e.targetHandle) === oldField.id) ||
    (e.source === child.id && e.data?.properties.cardinality === 'N:1' && fieldFromHandle(e.sourceHandle) === oldField.id)
  ));
  return {
    ...diagram,
    nodes: diagram.nodes.map(n => n.id === child.id ? withFields(n, [...fields.map(f => f.id === oldField.id ? { ...f, foreignKey: stillUsed } : f), field]) : n),
    edges: diagram.edges.map(e => e.id === edge.id ? {
      ...e, ...(reverse ? {sourceHandle: field.id + ':out'} : {targetHandle: field.id + ':in'}),
      data: { ...e.data!, route: undefined },
    } : e),
  };
}
