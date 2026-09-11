import type { DataField, DiagramNode, Port } from './diagram';
import { newId } from '../utils/id';
export const dataTypes = ['UUID', 'INT', 'BIGINT', 'VARCHAR(255)', 'TEXT', 'BOOLEAN', 'DATE', 'DATETIME', 'TIMESTAMP', 'DECIMAL(10,2)', 'FLOAT', 'JSON', 'BINARY'];
export function createField(name = 'new_field'): DataField {
  return { id: newId(), name, dataType: 'VARCHAR(255)', primaryKey: false, foreignKey: false, nullable: true, unique: false, defaultValue: '', description: '' };
}
export function fieldPorts(fields: DataField[]): Port[] {
  return fields.flatMap(f => [
    { id: `${f.id}:in`, direction: 'input', side: 'left', semantic: 'data', label: f.name },
    { id: `${f.id}:out`, direction: 'output', side: 'right', semantic: 'data', label: f.name },
  ] as Port[]);
}
export function withFields(n: DiagramNode, fields: DataField[]): DiagramNode {
  return { ...n, data: { ...n.data, fields, ports: fieldPorts(fields) } };
}
export const fieldFromHandle = (handle?: string | null) => handle?.replace(/:(in|out)$/, '');
export function validCustomIcon(value: string) {
  return value.length <= 1500000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value);
}
