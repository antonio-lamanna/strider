import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createDiagram, createNode, cleanDiagram } from '../model/diagram';
import { newNodeIconMode, productIconUri, findProduct, productSearchTerms, saveIconMode, loadIconMode } from './productIcons';
import { NodeIcon } from '../components/ui/NodeIcon';
import { serializeDiagram } from '../services/xmlSerializer';
import { parseDiagram } from '../services/xmlParser';
import { buildSvg } from '../services/exportService';
import { parseFile, serializeProject } from '../services/projectXml';
import { productIcons } from './productIcons';

const template = (system: string) => ({kind:'application' as const, label:system, system, icon:'cloud', color:'#3698c7'});
afterEach(() => localStorage.clear());
describe('independent icon modes', () => {
  it('A-C: creation snapshots global preference; changing it cannot restyle existing nodes', () => {
    saveIconMode('standard'); const standard = createNode(newNodeIconMode(template('salesforce'), loadIconMode()), {x:0,y:0});
    saveIconMode('product'); const product = createNode(newNodeIconMode(template('salesforce'), loadIconMode()), {x:200,y:0});
    saveIconMode('standard');
    expect(standard.data.iconMode).toBe('standard'); expect(product.data.iconMode).toBe('product');
    // Salesforce has bundled flat artwork; existing node modes remain independent.
    expect(renderToStaticMarkup(<NodeIcon data={product.data}/>)).toContain('data:image/svg+xml');
  });
  it('D-F: a local change retains identity, geometry, properties, other nodes and the next default', () => {
    saveIconMode('standard'); const nodes = ['salesforce','power-apps','sap'].map((id,i) => createNode(newNodeIconMode(template(id), loadIconMode()), {x:i*200,y:40}));
    const before = structuredClone(nodes);
    nodes[1] = {...nodes[1],data:{...nodes[1].data,iconMode:'product'}};
    expect(nodes[0]).toEqual(before[0]); expect(nodes[2]).toEqual(before[2]);
    expect({...nodes[1],data:{...nodes[1].data,iconMode:'standard'}}).toEqual(before[1]);
    expect(loadIconMode()).toBe('standard');
    expect(createNode(newNodeIconMode(template('salesforce'),loadIconMode()),{x:0,y:0}).data.iconMode).toBe('standard');
    expect(productIconUri(nodes[1].data)).toContain('data:image/svg+xml');
    expect(productIconUri(nodes[2].data)).toBeUndefined();
  });
  it('G-H: mixed XML/JSON roundtrip preserves modes; old files ignore a Product preference', () => {
    const d = createDiagram('architecture');
    d.nodes = ['power-apps','sap','salesforce'].map((id,i) => createNode({...template(id), ...(i < 2 ? {iconMode: i === 0 ? 'product' as const : 'standard' as const} : {})}, {x:i*200,y:0}));
    saveIconMode('product');
    const copy = parseDiagram(serializeDiagram(JSON.parse(JSON.stringify(cleanDiagram(d)))));
    expect(copy.nodes.map(n=>n.data.iconMode)).toEqual(['product','standard',undefined]);
    expect(copy.nodes.map(n=>n.data.system)).toEqual(['power-apps','sap','salesforce']);
    expect(productIconUri(copy.nodes[2].data)).toBeUndefined();
    expect(buildSvg(copy).svg).toContain('data:image/svg+xml');
    expect(() => parseDiagram(serializeDiagram(d).replace('iconMode="product"','iconMode="unknown"'))).toThrow('icon mode');
  });
  it('bundles approved artwork, handles unknown products and preserves custom icons', () => {
    expect(findProduct('sap')?.svg).toContain('viewBox');
    expect(productSearchTerms('power-apps')).toContain('microsoft');
    expect(productSearchTerms('google-sheets')).toContain('google');
    expect(productSearchTerms('uipath')).toContain('automation');
    expect(productIconUri({system:'unknown-vendor',iconMode:'product'})).toBeUndefined();
    expect(renderToStaticMarkup(<NodeIcon data={{...template('power-apps'),iconMode:'product',customIcon:'data:image/png;base64,AA=='}}/>)).toContain('data:image/png');
    expect(newNodeIconMode({kind:'table',label:'T',icon:'database',color:'#123456'},'product').iconMode).toBeUndefined();
  });
  it('roundtrips a project containing all designers and self-contained, valid product SVGs', () => {
    const diagrams = [createDiagram('workflow'),createDiagram('architecture'),createDiagram('data-model')];
    diagrams[0].nodes = [createNode({...template('sap'),iconMode:'product'}, {x:20,y:40})];
    diagrams[1].nodes = [createNode({...template('power-apps'),iconMode:'standard'}, {x:60,y:80})];
    const result = parseFile(serializeProject({id:'icons-project',name:'Mixed modes',description:'',diagrams}));
    if (result.type !== 'project') throw new Error('Expected project');
    expect(result.project.diagrams.map(d=>d.nodes[0]?.data.iconMode)).toEqual(['product','standard',undefined]);
    for (const product of productIcons.filter(p=>p.svg)) {
      const svg = new DOMParser().parseFromString(product.svg!, 'image/svg+xml');
      expect(svg.querySelector('parsererror'), product.id).toBeNull();
      expect(svg.querySelector('script, foreignObject, image'), product.id).toBeNull();
      const root = svg.documentElement;
      expect(root.getAttribute('viewBox') || (root.getAttribute('width') && root.getAttribute('height')), product.id).toBeTruthy();
    }
  });
});

import { flatProductIcons } from './flatProductIcons';
it('bundles flat, colored artwork for the additional brand catalog', () => { for (const [id, artwork] of Object.entries(flatProductIcons)) { expect(findProduct(id)?.svg, id).toBe(artwork.svg); expect(artwork.svg, id).not.toMatch(/<(?:filter|linearGradient|radialGradient)\b/); expect(artwork.svg, id).toContain('fill="#' + artwork.hex + '"'); } });

it('provides self-contained logos for every named product preset', () => {
  const generic = new Set(['sql', 'rest-api', 'generic-database', 'generic-application', 'generic-cloud']);
  for (const product of productIcons.filter(p => !generic.has(p.id))) {
    expect(product.svg, product.id).toBeTruthy();
    expect(productIconUri({ system: product.id, iconMode: 'product' }), product.id).toMatch(/^data:image\/svg\+xml/);
  }
  expect(productIconUri({ label: 'Dataverse', iconMode: 'product' })).toContain('data:image/svg+xml');
});
