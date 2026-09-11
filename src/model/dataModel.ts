import type { DataField, DiagramNode, Port } from './diagram';
import { newId } from '../utils/id';
// Dataverse names/formats follow Microsoft Learn's column type catalog:
// https://learn.microsoft.com/en-us/power-apps/maker/data-platform/types-of-fields
export const dataTypeGroups = [
  { label: 'Standard', options: ['UUID', 'CHAR(1)', 'VARCHAR(255)', 'NVARCHAR(255)', 'TEXT', 'BOOLEAN', 'TINYINT', 'SMALLINT', 'INT', 'BIGINT', 'DECIMAL(10,2)', 'NUMERIC(10,2)', 'FLOAT', 'DOUBLE', 'DATE', 'TIME', 'DATETIME', 'TIMESTAMP', 'BINARY', 'VARBINARY', 'BLOB', 'JSON', 'XML'].map(value => ({ value, label: value })) },
  { label: 'Dataverse', options: ['Text', 'Text Area', 'Multiline Text', 'Email', 'Phone', 'URL', 'Ticker Symbol', 'Autonumber', 'Whole Number', 'Decimal Number', 'Floating Point Number', 'Currency', 'Yes/No', 'Date Only', 'Date and Time', 'Choice', 'Choices', 'Lookup', 'Customer', 'File', 'Image', 'Duration', 'Language', 'Timezone', 'Unique Identifier', 'Owner', 'Status', 'Status Reason', 'Big'].map(label => ({ value: `Dataverse: ${label}`, label })) },
];
export const dataTypes = dataTypeGroups.flatMap(group => group.options.map(option => option.value));
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
