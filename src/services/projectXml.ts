import type { Diagram } from '../model/diagram';
import type { ProjectFile } from '../model/project';
import { serializeDiagram } from './xmlSerializer';
import { parseDiagram } from './xmlParser';
const lists = { workflow: 'workflows', 'data-model': 'data-models', architecture: 'architectures' } as const;
export function serializeProject(p: ProjectFile): string {
  const doc = document.implementation.createDocument(null, 'Project');
  const root = doc.documentElement;
  root.setAttribute('version', '1.0'); root.setAttribute('id', p.id); root.setAttribute('name', p.name);
  root.setAttribute('diagram-order', JSON.stringify(p.diagrams.map(d => d.id)));
  if (p.activeDiagramId) root.setAttribute('active-diagram', p.activeDiagramId);
  const description = doc.createElement('description'); description.textContent = p.description; root.append(description);
  for (const [kind, tag] of Object.entries(lists)) {
    const list = doc.createElement(tag); root.append(list);
    p.diagrams.filter(d => d.kind === kind).forEach(d => list.append(doc.importNode(new DOMParser().parseFromString(serializeDiagram(d), 'application/xml').documentElement, true)));
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(doc);
}
export function parseFile(xml: string): { type: 'project'; project: ProjectFile } | { type: 'diagram'; diagram: Diagram } {
  if (xml.length > 50 * 1024 * 1024) throw new Error('This file exceeds the 50 MB project limit.');
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('DTD and entity declarations are not supported.');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('File corrupted: the XML is malformed.');
  const root = doc.documentElement;
  if (root.tagName !== 'Project') return { type: 'diagram', diagram: parseDiagram(xml) };
  if (root.getAttribute('version') !== '1.0') throw new Error('Unsupported project version.');
  if (!root.getAttribute('id') || !root.getAttribute('name')?.trim()) throw new Error('The project is missing its ID or name.');
  const diagrams: Diagram[] = [], ids = new Set<string>();
  for (const [kind, tag] of Object.entries(lists)) {
    const matches = Array.from(root.children).filter(c => c.tagName === tag);
    if (matches.length !== 1) throw new Error(`The project needs exactly one <${tag}> list.`);
    for (const el of Array.from(matches[0].children)) {
      const d = parseDiagram(new XMLSerializer().serializeToString(el));
      if (d.kind !== kind) throw new Error(`A ${d.kind} diagram is in the wrong project list.`);
      if (ids.has(d.id)) throw new Error('Duplicate diagram IDs in project.');
      ids.add(d.id); diagrams.push(d);
    }
  }
  if (Array.from(root.children).some(c => !['description', ...Object.values(lists)].includes(c.tagName))) throw new Error('Unrecognized content in project.');
  if (diagrams.length > 1000) throw new Error('A project supports up to 1,000 diagrams.');
  if (root.hasAttribute('diagram-order')) {
    let order: unknown;
    try { order = JSON.parse(root.getAttribute('diagram-order')!); } catch { throw new Error('Invalid diagram order.'); }
    if (!Array.isArray(order) || order.length !== diagrams.length || new Set(order).size !== diagrams.length || order.some(id => typeof id !== 'string' || !ids.has(id))) throw new Error('Invalid diagram order.');
    diagrams.sort((a, b) => (order as string[]).indexOf(a.id) - (order as string[]).indexOf(b.id));
  }
  const activeDiagramId = root.getAttribute('active-diagram') || undefined;
  if (activeDiagramId && !ids.has(activeDiagramId)) throw new Error('The active diagram is missing from this project.');
  return { type: 'project', project: { id: root.getAttribute('id')!, name: root.getAttribute('name')!, description: Array.from(root.children).find(c => c.tagName === 'description')?.textContent ?? '', diagrams, activeDiagramId } };
}
