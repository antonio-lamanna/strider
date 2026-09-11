import { createDiagram, createNode } from '../model/diagram';
import type { DiagramKind, DiagramEdge } from '../model/diagram';
import { createField, withFields } from '../model/dataModel';
import { tableTemplate, architectureCategories } from './modules';
import { exampleDiagram } from './example';
export function moduleExample(kind: DiagramKind) {
  if (kind === 'workflow') return exampleDiagram();
  const d = createDiagram(kind);
  if (kind === 'data-model') {
    d.name = 'Customer orders';
    const id = { ...createField('id'), dataType: 'UUID', primaryKey: true, nullable: false };
    const customer = withFields(createNode({ ...tableTemplate, label: 'Customer' }, { x: 100, y: 120 }), [id, createField('name'), createField('email')]);
    const ref = { ...createField('customer_id'), dataType: 'UUID', foreignKey: true, nullable: false };
    const orders = withFields(createNode({ ...tableTemplate, label: 'Order', color: '#609b86' }, { x: 530, y: 180 }), [{ ...createField('id'), dataType: 'UUID', primaryKey: true, nullable: false }, ref, { ...createField('total'), dataType: 'DECIMAL(10,2)' }, { ...createField('created_at'), dataType: 'TIMESTAMP' }]);
    d.nodes = [customer, orders]; d.edges = [{ id: 'customer-orders', type: 'orthogonal', source: customer.id, target: orders.id, sourceHandle: `${id.id}:out`, targetHandle: `${ref.id}:in`, label: 'places', data: { semantic: 'data', lineStyle: 'solid', properties: { cardinality: '1:N' } } }];
  } else {
    d.name = 'Hybrid application architecture';
    const client = createNode(architectureCategories[0].items[0], { x: 40, y: 80 }); client.width = 420; client.height = 330;
    const cloud = createNode({ ...architectureCategories[0].items[2], label: 'Microsoft Azure' }, { x: 620, y: 80 }); cloud.width = 510; cloud.height = 330;
    const citrix = createNode(architectureCategories[1].items[1], { x: 60, y: 120 }); citrix.parentId = client.id;
    const app = createNode({ kind: 'application', label: 'Power Platform', system: 'power-platform', icon: 'layers', color: '#8370ca' }, { x: 70, y: 100 }); app.parentId = cloud.id;
    const db = createNode({ kind: 'database', label: 'Dataverse', icon: 'database', color: '#609b86' }, { x: 70, y: 220 }); db.parentId = cloud.id;
    d.nodes = [client, cloud, citrix, app, db];
    d.edges = [{ id: 'vpn', type: 'orthogonal', source: citrix.id, sourceHandle: 'out', target: app.id, targetHandle: 'in', label: 'VPN · HTTPS', data: { semantic: 'resource', lineStyle: 'dashed', properties: {} } }, { id: 'data', type: 'orthogonal', source: app.id, sourceHandle: 'out-bottom', target: db.id, targetHandle: 'in-top', label: 'Data', data: { semantic: 'data', lineStyle: 'solid', properties: {} } }] as DiagramEdge[];
  }
  return d;
}
