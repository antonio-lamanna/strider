import { describe, it, expect, vi } from 'vitest';
import { moduleExample } from '../config/moduleExamples';
import { createDiagram, cleanDiagram } from '../model/diagram';
import { parseFile, serializeProject } from './projectXml';
import { serializeDiagram } from './xmlSerializer';
import { buildSvg } from './exportService';
import { fieldPorts } from '../model/dataModel';
import { portAnchor, nodeLayout } from '../utils/geometry';
vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ font: '', measureText: (s: string) => ({ width: s.length * 7 }) } as unknown as CanvasRenderingContext2D);
describe('Strider project interchange', () => {
  it('round-trips all three modules, repeated kinds, tab order, custom icons and active tab', () => {
    const diagrams = [moduleExample('architecture'), moduleExample('data-model'), moduleExample('workflow'), createDiagram('data-model')];
    diagrams[0].nodes[2].data.customIcon = 'data:image/png;base64,iVBORw0KGgo=';
    diagrams[1].settings.gridColor = '#a8b2c1';
    const project = { id: 'project-1', name: 'R&D <A> "β"', description: 'One\nTwo & three', diagrams, activeDiagramId: diagrams[2].id };
    const parsed = parseFile(serializeProject(project));
    expect(parsed.type).toBe('project');
    if (parsed.type === 'project') expect(parsed.project).toEqual({ ...project, diagrams: diagrams.map(cleanDiagram) });
  });
  it('opens legacy workflow XML without an ID and detects standalone file type', () => {
    for (const kind of ['workflow', 'data-model', 'architecture'] as const) {
      const xml = serializeDiagram(moduleExample(kind));
      const result = parseFile(kind === 'workflow' ? xml.replace(/ id="[^"]+"/, '') : xml);
      expect(result.type).toBe('diagram');
      if (result.type === 'diagram') expect(result.diagram.kind).toBe(kind);
    }
  });
  it('rejects corrupt projects, duplicate diagram IDs, wrong lists and dangling field references', () => {
    const d = moduleExample('data-model');
    const xml = serializeProject({ id: 'p', name: 'P', description: '', diagrams: [d] });
    expect(() => parseFile(xml.replace('</Project>', ''))).toThrow();
    expect(() => parseFile(serializeProject({ id: 'p', name: 'P', description: '', diagrams: [d, d] }))).toThrow(/Duplicate/);
    expect(() => parseFile(xml.replace('<data-model-diagram', '<automation-diagram').replace('</data-model-diagram>', '</automation-diagram>'))).toThrow();
    const bad = structuredClone(d); bad.edges[0].targetHandle = 'missing:in';
    expect(() => parseFile(serializeDiagram(bad))).toThrow(/port/);
    bad.edges = []; bad.nodes[0].data.fields![1].name = bad.nodes[0].data.fields![0].name;
    expect(() => parseFile(serializeDiagram(bad))).toThrow(/unique/);
  });
  it('keeps field links stable after reordering and includes schema text in vector export', () => {
    const d = moduleExample('data-model'), n = d.nodes[0];
    const before = portAnchor(n, d.edges[0].sourceHandle, d.nodes, 'output');
    n.data.fields!.reverse(); n.data.ports = fieldPorts(n.data.fields!);
    const after = portAnchor(n, d.edges[0].sourceHandle, d.nodes, 'output');
    expect(after.y - before.y).toBe(64);
    expect(nodeLayout(n).height).toBeGreaterThan(140);
    const result = parseFile(serializeDiagram(d)); expect(result.type).toBe('diagram');
    const svg = buildSvg(d).svg;
    expect(svg).toContain('customer_id'); expect(svg).toContain('VARCHAR(255)'); expect(svg).toContain('1:N');
  });
  it('exports transparent by default, optional background, and embedded custom icons', () => {
    const d = moduleExample('architecture');
    d.nodes[2].data.customIcon = 'data:image/png;base64,iVBORw0KGgo=';
    const a = buildSvg(d), b = buildSvg(d, false, false);
    expect(a.svg).not.toContain('fill="#f8fafb"');
    expect(b.svg).toContain('fill="#f8fafb"');
    expect(a.svg).toContain('<image'); expect(a.svg).toContain(d.nodes[2].data.customIcon);
  });
});
