import type { Diagram } from '../model/diagram';
import { fieldFromHandle } from '../model/dataModel';
import { downloadBlob, safeFilename } from './exportService';
// Small dependency-free ZIP writer (stored entries). XLSX cells are explicitly strings.
const enc = new TextEncoder();
const xml = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
function crc32(bytes: Uint8Array) { let crc = -1; for (const b of bytes) { crc ^= b; for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); } return (crc ^ -1) >>> 0; }
function zip(files: Record<string, string>): Blob {
  const chunks: Uint8Array[] = [], directory: Uint8Array[] = []; let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const n = enc.encode(name), data = enc.encode(content), crc = crc32(data);
    const local = new Uint8Array(30 + n.length), v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint32(14, crc, true); v.setUint32(18, data.length, true); v.setUint32(22, data.length, true); v.setUint16(26, n.length, true); local.set(n, 30);
    chunks.push(local, data);
    const central = new Uint8Array(46 + n.length), c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, n.length, true); c.setUint32(42, offset, true); central.set(n, 46); directory.push(central);
    offset += local.length + data.length;
  }
  const end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, directory.length, true); e.setUint16(10, directory.length, true); e.setUint32(12, directory.reduce((s, b) => s + b.length, 0), true); e.setUint32(16, offset, true);
  return new Blob([...chunks, ...directory, end] as BlobPart[], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
function sheet(rows: unknown[][]) {
  return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="12" width="24" customWidth="1"/></cols><sheetData>${rows.map((r, i) => `<row r="${i + 1}">${r.map((v, j) => `<c r="${String.fromCharCode(65 + j)}${i + 1}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`).join('')}</row>`).join('')}</sheetData><autoFilter ref="A1:${String.fromCharCode(64 + rows[0].length)}${rows.length}"/></worksheet>`;
}
export function buildExcel(d: Diagram): Blob {
  const tables = d.nodes.filter(n => n.data.kind === 'table');
  const fields: unknown[][] = [['Table', 'Field', 'Data type', 'Primary key', 'Foreign key', 'Nullable', 'Unique', 'Default', 'Description']];
  tables.forEach(t => (t.data.fields ?? []).forEach(f => fields.push([t.data.label, f.name, f.dataType, f.primaryKey ? 'Yes' : '', f.foreignKey ? 'Yes' : '', f.nullable ? 'Yes' : 'No', f.unique ? 'Yes' : '', f.defaultValue, f.description])));
  const relationships: unknown[][] = [['Name', 'Source table', 'Source field', 'Target table', 'Target field', 'Cardinality']];
  d.edges.forEach(e => { const s = tables.find(t => t.id === e.source), t = tables.find(t => t.id === e.target); relationships.push([e.label, s?.data.label, s?.data.fields?.find(f => f.id === fieldFromHandle(e.sourceHandle))?.name, t?.data.label, t?.data.fields?.find(f => f.id === fieldFromHandle(e.targetHandle))?.name, e.data?.properties.cardinality ?? '1:N']); });
  const tableRows: unknown[][] = [['Table', 'Description', 'Fields'], ...tables.map(t => [t.data.label, t.data.description, t.data.fields?.length ?? 0])];
  const names = ['Tables', 'Fields', 'Relationships'];
  return zip({
    '[Content_Types].xml': `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    '_rels/.rels': `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`,
    'xl/worksheets/sheet1.xml': sheet(tableRows), 'xl/worksheets/sheet2.xml': sheet(fields), 'xl/worksheets/sheet3.xml': sheet(relationships),
  });
}
export function exportExcel(d: Diagram) { downloadBlob(buildExcel(d), safeFilename(d.name) + '.xlsx'); }
