import { describe, it, expect } from 'vitest';
import { createDiagram, createNode } from './diagram';
import { createField, withFields, fieldFromHandle } from './dataModel';
import { fieldsAreUnique, reconcileRelationship } from './relationships';
import { exportMySql, importMySql } from '../services/dataSql';
import { serializeDiagram } from '../services/xmlSerializer';
import { parseDiagram } from '../services/xmlParser';
import { nodeLayout } from '../utils/geometry';

function fixture() {
 const d = createDiagram('data-model');
 d.nodes = ['Customer', 'Table_3'].map(label => withFields(createNode({kind:'table',label,icon:'database',color:'#123456'}, {x:0,y:0}), [{...createField('id'),dataType:'UUID',primaryKey:true,nullable:false}]));
 d.edges = [{id:'relationship',type:'orthogonal',source:d.nodes[0].id,target:d.nodes[1].id,sourceHandle:d.nodes[0].data.fields![0].id+':out',targetHandle:d.nodes[1].data.fields![0].id+':in',data:{semantic:'data',lineStyle:'solid',properties:{cardinality:'1:N'}}}];
 return d;
}
describe('relationship cardinality integrity', () => {
 it('repairs a many-side PK without modifying the original and roundtrips the new handle', () => {
  const d = fixture(), copy = reconcileRelationship(d,'relationship');
  expect(d.nodes[1].data.fields).toHaveLength(1);
  expect(copy.nodes[1].data.fields).toHaveLength(2);
  const fk = copy.nodes[1].data.fields![1];
  expect(fk.name).toBe('customer_id'); expect(fk.primaryKey).toBe(false); expect(fk.unique).toBe(false);
  expect(fk.dataType).toBe('UUID'); expect(fk.nullable).toBe(false);
  expect(fieldFromHandle(copy.edges[0].targetHandle)).toBe(fk.id);
  expect(exportMySql(parseDiagram(serializeDiagram(copy)))).toContain('FOREIGN KEY (`customer_id`) REFERENCES `Customer` (`id`)');
  expect(reconcileRelationship(copy,'relationship').nodes[1].data.fields).toHaveLength(2);
 });
 it('rejects an inconsistent saved model instead of silently exporting 1:1', () => {
  expect(() => exportMySql(fixture())).toThrow('foreign key is unique');
 });
 it('keeps shared primary keys for 1:1 and infers them on SQL import', () => {
  const d = fixture(); d.edges[0].data!.properties.cardinality='1:1';
  const copy=reconcileRelationship(d,'relationship');
  expect(copy.nodes[1].data.fields).toHaveLength(1);
  expect(importMySql(exportMySql(copy)).diagram.edges[0].data!.properties.cardinality).toBe('1:1');
 });
 it('permits a repeating FK within a composite PK but detects full unique sets', () => {
  const node=fixture().nodes[1], first=node.data.fields![0];
  const second={...createField('sequence'),primaryKey:true};
  const composite=withFields(node,[first,second]);
  expect(fieldsAreUnique(composite,[first.id])).toBe(false);
  expect(fieldsAreUnique(composite,[first.id,second.id])).toBe(true);
 });
 it('repairs reversed N:1 on the source and avoids naming collisions', () => {
  const d=fixture(); d.edges[0].data!.properties.cardinality='N:1';
  const copy=reconcileRelationship(d,'relationship');
  expect(copy.nodes[0].data.fields).toHaveLength(2);
  expect(fieldFromHandle(copy.edges[0].sourceHandle)).toBe(copy.nodes[0].data.fields![1].id);
 });
});
describe('compact icon dimensions', () => {
 it('defaults to a 64px square and preserves manual sizing in XML', () => {
  const d=createDiagram('architecture');
  const n=createNode({kind:'application',label:'A long application label',icon:'cloud',color:'#123456',displayMode:'icon'}, {x:0,y:0});
  expect(nodeLayout(n)).toMatchObject({width:64,height:64});
  n.data.sizeMode='manual'; n.width=92; n.height=80; d.nodes=[n];
  expect(nodeLayout(parseDiagram(serializeDiagram(d)).nodes[0])).toMatchObject({width:92,height:80});
 });
});
