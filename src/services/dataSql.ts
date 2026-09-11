import mysql from 'node-sql-parser/build/mysql';
import { createDiagram, createNode, type Diagram, type DiagramNode, type JsonValue } from '../model/diagram';
import { createField, withFields, fieldFromHandle } from '../model/dataModel';
import { tableTemplate } from '../config/modules';
import { newId } from '../utils/id';
const parser = new mysql.Parser();
const q = (s: string) => '`' + s.replace(/`/g, '``') + '`';

/** Split a dump without treating quoted semicolons or comments as SQL boundaries. No SQL is executed. */
export function sqlStatements(sql: string): string[] {
  const result: string[] = []; let current = '', quote = '', comment = '';
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i], n = sql[i + 1];
    if (comment === 'line') { if (c === '\n') { comment = ''; current += ' '; } continue; }
    if (comment === 'block') { if (c === '*' && n === '/') { comment = ''; i++; current += ' '; } continue; }
    if (quote) { current += c; if (c === '\\') { current += sql[++i] ?? ''; } else if (c === quote) { if (n === quote) current += sql[++i]; else quote = ''; } continue; }
    if (c === '#' || (c === '-' && n === '-' && /\s/.test(sql[i + 2] ?? ' '))) { comment = 'line'; if (c === '-') i++; continue; }
    if (c === '/' && n === '*') { comment = 'block'; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; current += c; continue; }
    if (c === ';') { if (current.trim()) result.push(current.trim()); current = ''; } else current += c;
  }
  if (quote || comment === 'block') throw new Error('Unclosed SQL string or comment.');
  if (current.trim()) result.push(current.trim());
  return result;
}

// AST values are supplied by the MySQL parser; they never reach an execution engine.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ast = any;
function typeSql(d: Ast): string {
  let type = d.dataType;
  if (d.expr) type += '(' + d.expr.map((v: Ast) => parser.exprToSQL(v)).join(', ') + ')';
  else if (d.length !== undefined) type += '(' + d.length + (d.scale !== undefined ? ',' + d.scale : '') + ')';
  if (d.suffix?.length) type += ' ' + d.suffix.join(' ');
  return type;
}
export function importMySql(sql: string, name = 'Imported data model'): { diagram: Diagram; warnings: string[] } {
  if (sql.length > 10 * 1024 * 1024) throw new Error('SQL import supports files up to 10 MB. Export the schema without data for larger databases.');
  const diagram = createDiagram('data-model'); diagram.name = name;
  const warnings: string[] = [], pending: { node: DiagramNode; def: Ast }[] = [], tables = new Map<string, DiagramNode>();
  const alters: Ast[] = [];
  for (const statement of sqlStatements(sql)) {
    if (!/^CREATE\s+TABLE\b/i.test(statement)) {
      if (/^ALTER\s+TABLE\b/i.test(statement)) {
        try { const parsed = parser.astify(statement); alters.push(...(Array.isArray(parsed) ? parsed : [parsed])); }
        catch { warnings.push(`Unable to import: ${statement.slice(0,90)}`); }
        continue;
      }
      if (/^(INSERT|REPLACE|SET|USE|LOCK|UNLOCK|DROP\s+TABLE|CREATE\s+DATABASE)\b/i.test(statement)) continue;
      warnings.push(`Not imported: ${statement.slice(0,90)}${statement.length > 90 ? '…' : ''}`); continue;
    }
    let ast: Ast;
    try { const parsed = parser.astify(statement); ast = Array.isArray(parsed) ? parsed[0] : parsed; }
    catch { throw new Error(`Unable to parse MySQL table definition: ${statement.slice(0,100)}. Use a MySQL CREATE TABLE schema dump.`); }
    if (!ast.create_definitions) throw new Error('CREATE TABLE AS/LIKE is not supported. Export full table definitions.');
    const table = ast.table[0], key = table.db ? `${table.db}.${table.table}` : table.table;
    if (tables.has(key)) throw new Error(`Duplicate table ${key}.`);
    let node = createNode(tableTemplate, { x: 0, y: 0 }); node.data.label = key;
    if (table.db) node.data.properties.sqlSchema = table.db;
    node.data.properties.sqlTable = table.table;
    const columns = ast.create_definitions.filter((d: Ast) => d.resource === 'column');
    if (!columns.length) throw new Error(`Table ${key} has no columns.`);
    const auto: string[] = [];
    node = withFields(node, columns.map((d: Ast) => {
      const field = createField(d.column.column);
      field.dataType = typeSql(d.definition); field.primaryKey = !!d.primary_key;
      field.nullable = !field.primaryKey && d.nullable?.type !== 'not null'; field.unique = !!d.unique;
      if (d.default_val) field.defaultValue = parser.exprToSQL(d.default_val.value);
      if (d.comment?.value) field.description = String(d.comment.value.value ?? d.comment.value);
      if (d.auto_increment) auto.push(field.id);
      if (d.reference_definition || d.generated || d.check) warnings.push(`Review unsupported column options on ${key}.${field.name}.`);
      return field;
    }));
    if (new Set(node.data.fields!.map(f => f.name.toLowerCase())).size !== columns.length) throw new Error(`Duplicate column in ${key}.`);
    node.data.properties.sqlAutoIncrement = auto;
    for (const def of ast.create_definitions.filter((d: Ast) => d.resource !== 'column')) pending.push({ node, def });
    tables.set(key, node); diagram.nodes.push(node);
    if (diagram.nodes.length > 500) throw new Error('Import supports up to 500 tables at a time.');
  }
  if (!diagram.nodes.length) throw new Error('No CREATE TABLE statements found. Export a MySQL schema with table definitions.');
  for (const ast of alters) {
    const t = ast.table[0], node = tables.get(t.db ? `${t.db}.${t.table}` : t.table);
    if (!node) throw new Error(`ALTER TABLE references missing table ${t.table}.`);
    for (const expr of ast.expr ?? []) {
      if (expr.action === 'add' && expr.create_definitions?.resource === 'constraint') pending.push({ node, def: expr.create_definitions });
      else warnings.push(`ALTER TABLE option not imported on ${node.data.label}: ${expr.action}.`);
    }
  }
  for (const { node, def } of pending) {
    const kind = String(def.constraint_type ?? '').toUpperCase();
    const names: string[] = (def.definition ?? []).map((x: Ast) => x.column);
    const fields = names.map(name => { const f = node.data.fields!.find(f => f.name === name); if (!f) throw new Error(`Unknown column ${name} in ${node.data.label}.`); return f; });
    if (kind === 'PRIMARY KEY') fields.forEach(f => { f.primaryKey = true; f.nullable = false; });
    else if (kind.startsWith('UNIQUE')) {
      if (fields.length === 1) fields[0].unique = true;
      else { const groups = (node.data.properties.sqlUniqueKeys ?? []) as JsonValue[]; groups.push(fields.map(f => f.id)); node.data.properties.sqlUniqueKeys = groups; }
    } else if (kind === 'FOREIGN KEY') {
      const ref = def.reference_definition, t = ref.table[0];
      const schema = t.db ?? node.data.properties.sqlSchema;
      const parent = tables.get(schema ? `${schema}.${t.table}` : t.table) ?? tables.get(t.table);
      if (!parent) throw new Error(`Referenced table ${t.table} is missing. Include it in the schema export.`);
      const group = newId();
      const actions: Record<string, JsonValue> = {};
      for (const action of ref.on_action ?? []) actions[action.type.toLowerCase().includes('delete') ? 'onDelete' : 'onUpdate'] = String(action.value.value).toUpperCase();
      fields.forEach((field, i) => {
        const parentField = parent.data.fields!.find(f => f.name === ref.definition[i]?.column);
        if (!parentField) throw new Error(`Referenced field is missing in ${parent.data.label}.`);
        field.foreignKey = true;
        diagram.edges.push({ id: newId(), type: 'orthogonal', source: parent.id, target: node.id,
          sourceHandle: `${parentField.id}:out`, targetHandle: `${field.id}:in`, label: def.constraint ?? '',
          data: { semantic: 'data', lineStyle: 'solid', properties: { cardinality: '1:N', foreignKeyGroup: group, foreignKeyOrder: i, ...actions } } });
      });
    } else if (def.resource) warnings.push(`Index or constraint not represented on ${node.data.label}: ${kind || def.resource}.`);
  }
  return { diagram, warnings: [...new Set(warnings)] };
}

const dataverse: Record<string, string> = {
  'Unique Identifier': 'CHAR(36)', Lookup: 'CHAR(36)', Customer: 'CHAR(36)', Owner: 'CHAR(36)',
  'Whole Number': 'INT', Autonumber: 'VARCHAR(255)', Big: 'BIGINT', 'Decimal Number': 'DECIMAL(18,4)', Currency: 'DECIMAL(19,4)',
  'Floating Point Number': 'DOUBLE', 'Yes/No': 'BOOLEAN', 'Date Only': 'DATE', 'Date and Time': 'DATETIME',
  Choice: 'INT', Choices: 'JSON', Status: 'INT', 'Status Reason': 'INT', File: 'BLOB', Image: 'BLOB',
  'Text Area': 'TEXT', 'Multiline Text': 'TEXT', Duration: 'INT', Language: 'INT', Timezone: 'INT',
};
function mysqlType(type: string): string {
  if (type.startsWith('Dataverse: ')) return dataverse[type.slice(11)] ?? 'VARCHAR(255)';
  if (type === 'UUID') return 'CHAR(36)';
  if (type === 'XML') return 'LONGTEXT';
  if (type === 'BINARY' || type === 'VARBINARY') return `${type}(255)`;
  if (!/^[A-Z][A-Z0-9_ ]*(?:\([^;]*\))?(?:\s+(?:UNSIGNED|ZEROFILL))*$/i.test(type)) throw new Error(`Unsupported SQL type: ${type}`);
  return type;
}
export function exportMySql(diagram: Diagram): string {
  if (diagram.kind !== 'data-model') throw new Error('SQL export is available for data models.');
  const tables = diagram.nodes.filter(n => n.data.kind === 'table');
  if (!tables.length) throw new Error('Add at least one table.');
  const name = (n: DiagramNode) => n.data.properties.sqlSchema ? `${q(String(n.data.properties.sqlSchema))}.${q(n.data.label === `${n.data.properties.sqlSchema}.${n.data.properties.sqlTable}` ? String(n.data.properties.sqlTable) : n.data.label)}` : q(n.data.label);
  if (new Set(tables.map(name)).size !== tables.length) throw new Error('SQL export needs unique table names.');
  const statements = tables.map(n => {
    const fields = n.data.fields ?? [];
    if (!fields.length) throw new Error(`Add fields to ${n.data.label} before exporting SQL.`);
    if (new Set(fields.map(f => f.name.toLowerCase())).size !== fields.length || fields.some(f => !f.name.trim())) throw new Error(`Use unique, non-empty fields in ${n.data.label}.`);
    const auto = n.data.properties.sqlAutoIncrement as string[] | undefined;
    const lines = fields.map(f => `  ${q(f.name)} ${mysqlType(f.dataType)}${!f.nullable || f.primaryKey ? ' NOT NULL' : ''}${f.defaultValue.trim() ? ' DEFAULT ' + f.defaultValue : ''}${auto?.includes(f.id) ? ' AUTO_INCREMENT' : ''}${f.unique && !f.primaryKey ? ' UNIQUE' : ''}`);
    const pk = fields.filter(f => f.primaryKey);
    if (pk.length) lines.push(`  PRIMARY KEY (${pk.map(f => q(f.name)).join(', ')})`);
    for (const ids of (n.data.properties.sqlUniqueKeys ?? []) as string[][]) {
      const names = ids.map(id => { const f = fields.find(f => f.id === id); if (!f) throw new Error(`A unique key in ${n.data.label} references a deleted field.`); return q(f.name); });
      lines.push(`  UNIQUE (${names.join(', ')})`);
    }
    return `CREATE TABLE ${name(n)} (\n${lines.join(',\n')}\n);`;
  });
  const groups = new Map<string, typeof diagram.edges>();
  for (const e of diagram.edges) { const key = String(e.data?.properties.foreignKeyGroup ?? e.id); groups.set(key, [...(groups.get(key) ?? []), e]); }
  let count = 0;
  for (const edges of groups.values()) {
    edges.sort((a,b) => Number(a.data?.properties.foreignKeyOrder ?? 0) - Number(b.data?.properties.foreignKeyOrder ?? 0));
    const first = edges[0], reverse = first.data?.properties.cardinality === 'N:1';
    if (first.data?.properties.cardinality === 'N:N') throw new Error('Resolve N:N relationships with a junction table before SQL export.');
    const parent = tables.find(n => n.id === (reverse ? first.target : first.source));
    const child = tables.find(n => n.id === (reverse ? first.source : first.target));
    if (!parent || !child) throw new Error('Relationship references a missing table.');
    const parentFields = edges.map(e => parent.data.fields!.find(f => f.id === fieldFromHandle(reverse ? e.targetHandle : e.sourceHandle)));
    const childFields = edges.map(e => child.data.fields!.find(f => f.id === fieldFromHandle(reverse ? e.sourceHandle : e.targetHandle)));
    if (parentFields.some(f => !f) || childFields.some(f => !f)) throw new Error('Relationship references a missing field.');
    const parentIds = parentFields.map(f => f!.id);
    const primaryIds = parent.data.fields!.filter(f => f.primaryKey).map(f => f.id);
    const uniqueGroups = (parent.data.properties.sqlUniqueKeys ?? []) as string[][];
    const matches = (ids: string[]) => ids.length === parentIds.length && ids.every((id, i) => id === parentIds[i]);
    if (!(parentFields.length === 1 && parentFields[0]!.unique) && !matches(primaryIds) && !uniqueGroups.some(matches)) throw new Error(`Referenced fields in ${parent.data.label} must form a primary or unique key.`);
    if (first.data?.properties.cardinality === '1:1') statements.push(`ALTER TABLE ${name(child)} ADD UNIQUE (${childFields.map(f => q(f!.name)).join(', ')});`);
    if (edges.some(e => e.source !== first.source || e.target !== first.target)) throw new Error('Composite foreign key must connect the same tables.');
    let actions = '';
    for (const [key, clause] of [['onDelete','ON DELETE'],['onUpdate','ON UPDATE']]) {
      const value = first.data?.properties[key];
      if (value) { if (!['CASCADE','RESTRICT','NO ACTION','SET NULL','SET DEFAULT'].includes(String(value))) throw new Error('Unsupported foreign key action.'); actions += ` ${clause} ${value}`; }
    }
    statements.push(`ALTER TABLE ${name(child)} ADD CONSTRAINT ${q('fk_strider_' + ++count)} FOREIGN KEY (${childFields.map(f => q(f!.name)).join(', ')}) REFERENCES ${name(parent)} (${parentFields.map(f => q(f!.name)).join(', ')})${actions};`);
  }
  const sql = '-- STRIDER — MySQL 8 schema\n-- Dataverse types are mapped to MySQL storage types.\n\n' + statements.join('\n\n') + '\n';
  try { parser.astify(sql); } catch { throw new Error('Generated SQL is invalid. Check field types and SQL default expressions (quote text defaults).'); }
  return sql;
}
