import { describe, it, expect } from 'vitest';
import { importMySql, exportMySql, sqlStatements } from './dataSql';
import { arrangeDataModel } from './dataLayout';
import { serializeDiagram } from './xmlSerializer';
import { parseDiagram } from './xmlParser';
import { buildSvg } from './exportService';
import { createDiagram, createNode, cleanDiagram } from '../model/diagram';
import { nodeLayout } from '../utils/geometry';
import { routedGeometry } from '../utils/routes';

const schema = `
-- schema only
CREATE TABLE parent (tenant INT NOT NULL, id INT NOT NULL, name VARCHAR(100) DEFAULT 'hello; world', PRIMARY KEY(tenant,id), UNIQUE(name));
CREATE TABLE child (id INT PRIMARY KEY AUTO_INCREMENT, tenant INT, parent_id INT, amount DECIMAL(10,2) DEFAULT 0,
 CONSTRAINT parent_fk FOREIGN KEY (tenant,parent_id) REFERENCES parent(tenant,id) ON DELETE CASCADE);
INSERT INTO child VALUES (1, 1, 1, 0);
`;
describe('MySQL interchange', () => {
  it('preserves composite keys, field types, defaults, auto increment and referential actions', () => {
    const { diagram, warnings } = importMySql(schema);
    expect(warnings).toEqual([]);
    expect(diagram.edges).toHaveLength(2);
    expect(diagram.nodes[0].data.fields?.filter(f => f.primaryKey)).toHaveLength(2);
    const sql = exportMySql(diagram);
    expect(sql).toContain('DECIMAL(10,2)');
    expect(sql).toContain('AUTO_INCREMENT');
    expect(sql).toContain('FOREIGN KEY (`tenant`, `parent_id`) REFERENCES `parent` (`tenant`, `id`) ON DELETE CASCADE');
    const reimported = importMySql(sql);
    expect(reimported.warnings).toEqual([]);
    expect(reimported.diagram.edges).toHaveLength(2);
    expect(reimported.diagram.nodes[0].data.fields?.[2].defaultValue).toBe("'hello; world'");
  });
  it('handles cycles, self references, quoted identifiers and ALTER keys', () => {
    const d = importMySql('CREATE TABLE `a table` (`a id` INT, b INT); CREATE TABLE b (id INT PRIMARY KEY, a INT); ALTER TABLE `a table` ADD PRIMARY KEY (`a id`); ALTER TABLE b ADD FOREIGN KEY(a) REFERENCES `a table`(`a id`); ALTER TABLE `a table` ADD FOREIGN KEY(b) REFERENCES b(id);').diagram;
    expect(importMySql(exportMySql(d)).diagram.edges).toHaveLength(2);
  });
  it('rejects missing references and malformed input, reports unsupported DDL', () => {
    expect(() => importMySql('CREATE TABLE a(id INT, FOREIGN KEY(id) REFERENCES b(id));')).toThrow('missing');
    expect(() => importMySql("CREATE TABLE a (id INT DEFAULT 'oops);")).toThrow();
    expect(importMySql('CREATE TABLE a(id INT); CREATE VIEW v AS SELECT * FROM a;').warnings).toHaveLength(1);
    expect(sqlStatements("/* ; */ SELECT ';'; -- ;\n SELECT 'it\\'s';")).toHaveLength(2);
  });
  it('requires a junction table for many-to-many relationships', () => {
    const d = importMySql(schema).diagram;
    d.edges[0].data!.properties.cardinality = 'N:N';
    expect(() => exportMySql(d)).toThrow('junction');
  });
});
describe('layout and persistence', () => {
  it('arranges variable-sized tables and retains usable routed edges after XML roundtrip', async () => {
    const d = importMySql(schema).diagram;
    const layout = await arrangeDataModel(d);
    const [a,b] = layout.nodes, as = nodeLayout(a), bs = nodeLayout(b);
    expect(a.position.x + as.width <= b.position.x || b.position.x + bs.width <= a.position.x || a.position.y + as.height <= b.position.y || b.position.y + bs.height <= a.position.y).toBe(true);
    for (const edge of layout.edges) expect(routedGeometry(edge, layout.nodes)).not.toBeNull();
    const copy = parseDiagram(serializeDiagram(layout));
    for (const edge of copy.edges) expect(routedGeometry(edge, copy.nodes)).not.toBeNull();
    copy.nodes[0].position.x += 20;
    expect(routedGeometry(copy.edges[0], copy.nodes)).toBeNull();
    expect(cleanDiagram(d).nodes.every(n => n.position.x === 0)).toBe(true);
  });
  it('handles disconnected tables and a self reference', async () => {
    const d = importMySql('CREATE TABLE a(id INT PRIMARY KEY, manager INT, FOREIGN KEY(manager) REFERENCES a(id)); CREATE TABLE b(id INT);').diagram;
    const result = await arrangeDataModel(d);
    expect(result.nodes).toHaveLength(2);
    expect(result.edges[0].data!.route!.points.length).toBeGreaterThan(2);
  });
  it('preserves lanes, icon mode and connection colors in XML and SVG', () => {
    const d = createDiagram('workflow');
    const lane = createNode({ kind:'lane', label:'Operations', icon:'group', color:'#123456' }, {x:0,y:0});
    const user = createNode({ kind:'user', label:'User', icon:'user', color:'#123456', displayMode:'icon' }, {x:70,y:60}); user.parentId = lane.id;
    const app = createNode({ kind:'application', label:'System', icon:'server', color:'#123456' }, {x:260,y:60}); app.parentId = lane.id;
    d.nodes = [lane,user,app]; d.edges = [{id:'e',type:'orthogonal',source:user.id,target:app.id,sourceHandle:'out',targetHandle:'in',data:{semantic:'control',lineStyle:'solid',color:'#ff0022',properties:{}}}];
    const copy = parseDiagram(serializeDiagram(d));
    expect(copy.nodes[0].type).toBe('container');
    expect(copy.nodes[1].data.displayMode).toBe('icon');
    expect(copy.edges[0].data!.color).toBe('#ff0022');
    expect(buildSvg(copy).svg).toContain('stroke="#ff0022"');
    expect(buildSvg(copy).svg).toContain('rotate(-90)');
  });
});
