import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist');
const origin = process.env.TARGET_URL || 'http://127.0.0.1:4173';
let server;
if (!process.env.TARGET_URL) {
  server = createServer(async (req, res) => {
    try {
      let path = resolve(root, '.' + decodeURIComponent(new URL(req.url, origin).pathname));
      if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
      if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
      const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
      res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream');
      res.end(await readFile(path));
    } catch { res.writeHead(404).end('Not found'); }
  });
  await new Promise(r => server.listen(4173, '127.0.0.1', r));
}
await mkdir('test-results', {recursive:true});
const browser = await chromium.launch();
const context = await browser.newContext({viewport:{width:1600,height:1000},acceptDownloads:true});
const page = await context.newPage();
page.setDefaultTimeout(15000);
const errors = [], report = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', e => { if (e.type() === 'error' && /React Flow|Couldn.t create edge/.test(e.text())) errors.push(e.text()); });
async function checked(name, action) { await action(); report.push(name); console.log('PASS ' + name); }
const upload = async (xml, name='graphics.xml') => {
  await page.getByLabel('Open XML, JSON or SQL file').setInputFiles({name,mimeType:'application/xml',buffer:Buffer.from(xml)});
  await expect(page.locator('.modal-overlay')).toHaveCount(0);
};
const component = id => page.locator('.react-flow__node[data-id="'+id+'"]');
const edges = () => page.locator('.react-flow__edge');
const graphics = () => page.getByRole('tab',{name:'Graphics',exact:true}).click();
const properties = () => page.getByRole('tab',{name:'Properties',exact:true}).click();
async function download(action) {
  const waiting = page.waitForEvent('download'); await action();
  const file = await waiting; assert.equal(await file.failure(),null);
  const stream = await file.createReadStream(), chunks=[]; for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}
async function exportAs(kind) {
  await page.getByRole('button',{name:'Export',exact:true}).click();
  return download(() => page.getByRole('button',{name:new RegExp('^Export '+kind)}).click());
}
const fixture = '<automation-diagram version="1.0" id="graphics" name="Graphics regression"><viewport x="65" y="125" zoom="0.9"/><settings grid="true" snap="false" gridSize="20"/><nodes>'+
  '<node id="a" type="application" label="Dataverse" system="dataverse" iconMode="product" color="#368777" x="30" y="60"/>'+
  '<node id="b" type="application" label="Cloud Run" system="cloud-run" iconMode="product" color="#4285f4" x="410" y="100"/>'+
  '<node id="x" type="gateway" subtype="xor" label="Approved?" color="#c19243" x="760" y="65"/>'+
  '<node id="g" type="system-boundary" label="Cloud boundary" color="#6385a5" x="350" y="370" width="380" height="170" sizeMode="manual"><ports/></node>'+
  '</nodes><edges><edge id="initial" source="b" target="x" sourceHandle="out" targetHandle="in" label="Validate"/></edges></automation-diagram>';
try {
  await checked('deployed release and landing assets',async()=>{
    const expected = JSON.parse(await readFile('public/version.json','utf8'));
    const response = await page.request.get(origin+'/app/version.json?check='+Date.now());
    assert.equal(response.status(),200); assert.equal((await response.json()).version,expected.version);
    const localHtml = await readFile('dist/app/index.html','utf8');
    const liveHtml = await (await page.request.get(origin+'/app/?check='+Date.now())).text();
    const scripts = [...localHtml.matchAll(/src="([^"]+\.js)"/g)].map(m=>m[1]);
    assert(scripts.length>0); for(const script of scripts) assert(liveHtml.includes(script),'Release asset '+script+' must match');
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    assert(await page.locator('img').count()>0);
    await expect.poll(()=>page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete || i.naturalWidth===0).length)).toBe(0);
  });
  await checked('empty editor and Inspector tabs',async()=>{
    await page.goto(origin+'/app/',{waitUntil:'networkidle'});
    await expect(component('a')).toHaveCount(0);
    await expect(page.getByRole('tab',{name:'Properties',exact:true})).toHaveAttribute('aria-selected','true');
    await graphics(); await expect(page.getByLabel('Diagram font size')).toBeVisible();
    await properties(); await expect(page.getByLabel('Diagram font size')).toBeHidden();
  });
  await checked('legacy XML, product logos, compact XOR and boundary handles',async()=>{
    await upload(fixture);
    await expect(page.locator('.react-flow__node')).toHaveCount(4);
    await expect(edges()).toHaveCount(1);
    await expect(component('g').locator('.react-flow__handle')).toHaveCount(4);
    await expect(component('x').locator('polygon')).toHaveAttribute('points','32,1 63,32 32,63 1,32');
    assert.equal(await component('x').locator('.gateway-node').evaluate(el=>el.offsetWidth),64);
    for(const id of ['a','b']) await expect.poll(()=>component(id).locator('img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  });
  await checked('forward, reverse and bidirectional arrow controls',async()=>{
    const point=await page.locator('.react-flow__edge[data-id="initial"] .react-flow__edge-path').evaluate(el=>{
      const p=el.getPointAtLength(el.getTotalLength()/2); const s=new DOMPoint(p.x,p.y).matrixTransform(el.getScreenCTM()); return {x:s.x,y:s.y};
    });
    await page.mouse.click(point.x,point.y); await graphics();
    const path=page.locator('.react-flow__edge[data-id="initial"] .react-flow__edge-path');
    for(const direction of ['reverse','both','forward']) {
      await page.getByLabel('Arrow direction').selectOption(direction);
      if(direction==='forward') await expect(path).not.toHaveAttribute('marker-start',/url/); else await expect(path).toHaveAttribute('marker-start',/url/);
      if(direction==='reverse') await expect(path).not.toHaveAttribute('marker-end',/url/); else await expect(path).toHaveAttribute('marker-end',/url/);
    }
    await page.getByLabel('Arrow direction').selectOption('both');
  });
  await checked('all 16 side combinations and connections to/from boundaries',async()=>{
    const sides=['left','right','top','bottom']; let count=1;
    async function connect(a,from,b,to) {
      const source=component(a).locator('.react-flow__handle-'+from).first();
      const target=component(b).locator('.react-flow__handle-'+to).first();
      const sb=await source.boundingBox(),tb=await target.boundingBox(); assert(sb&&tb);
      await page.mouse.move(sb.x+sb.width/2,sb.y+sb.height/2); await page.mouse.down();
      await page.mouse.move(tb.x+tb.width/2,tb.y+tb.height/2,{steps:12}); await page.mouse.up();
      await expect(edges()).toHaveCount(++count);
    }
    for(const from of sides) for(const to of sides) await connect('a',from,'b',to);
    await connect('b','bottom','g','right'); await connect('g','top','a','top');
  });
  await checked('border color, global text sizing, undo and redo',async()=>{
    await component('a').locator('.node-label').click(); await graphics();
    await page.getByLabel('Border color',{exact:true}).fill('#c54389');
    await expect(component('a').locator('.workflow-node')).toHaveCSS('border-top-color','rgb(197, 67, 137)');
    await page.getByLabel('Diagram font size').selectOption('20');
    await expect(component('a').locator('.node-label')).toHaveCSS('font-size','20px');
    await expect(component('b').locator('.node-label')).toHaveCSS('font-size','20px');
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    await expect(component('a').locator('.node-label')).toHaveCSS('font-size','14px');
    await page.getByRole('button',{name:'Redo',exact:true}).click();
    await expect(component('a').locator('.node-label')).toHaveCSS('font-size','20px');
  });
  let saved;
  await checked('XML save/reopen and export fidelity',async()=>{
    saved=await download(()=>page.getByRole('button',{name:'Save XML',exact:true}).click());
    assert(saved.toString().includes('fontSize="20"'));assert(saved.toString().includes('borderColor="#c54389"'));assert(saved.toString().includes('arrowDirection="both"'));
    const svg=(await exportAs('SVG')).toString(); assert(svg.includes('marker-start='));assert(svg.includes('stroke="#c54389"'));assert(svg.includes('font-size="20"'));
    for(const theme of ['light','dark']) {
      if(await page.locator('html').getAttribute('data-theme')!==theme) await page.getByRole('button',{name:'Toggle theme'}).click();
      const png=await exportAs('PNG'); assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert(png.length>1000);
      await page.screenshot({path:'test-results/graphics-'+theme+'.png'});
    }
    await page.reload({waitUntil:'networkidle'});await upload(saved.toString(),'roundtrip.xml');
    await expect(edges()).toHaveCount(19);
    await expect(component('a').locator('.node-label')).toHaveCSS('font-size','20px');
  });
  await checked('library product icons including Dataverse and all GCP services',async()=>{
    await page.getByRole('button',{name:'Product icons',exact:true}).click();
    await page.getByRole('tab',{name:/^Systems/}).click();
    for(const query of ['Dataverse','GCP']) {
      await page.getByRole('textbox',{name:'Search components'}).fill(query);
      const images=page.locator('.palette-item img.product-node-icon');
      assert(await images.count()>0);
      await expect.poll(()=>images.evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0))).toBe(true);
    }
    await page.getByRole('textbox',{name:'Search components'}).fill('Dataverse');
    const before=await page.locator('.react-flow__node').count();
    await page.locator('.palette-item').first().click();
    await expect(page.locator('.react-flow__node')).toHaveCount(before+1);
  });
  await checked('existing examples across workflow, architecture and data model',async()=>{
    for(const name of ['workflow','architecture','data-model']) {
      await page.reload({waitUntil:'networkidle'});
      await upload(await readFile('examples/'+name+'.xml','utf8'),name+'.xml');
      assert(await page.locator('.react-flow__node').count()>1);
      const svg=await exportAs('SVG');assert(svg.toString().includes('<svg'));
      if(name==='data-model') {
        const sql=await exportAs('SQL');assert(sql.toString().includes('CREATE TABLE'));assert(sql.toString().includes('FOREIGN KEY'));
        await page.getByRole('button',{name:'Auto arrange',exact:true}).click();
        await expect(page.getByRole('button',{name:'Auto arrange',exact:true})).toBeEnabled();
      }
    }
  });
  assert.deepEqual(errors,[]);
  console.log('Browser regression: '+report.length+' groups passed on '+origin);
} catch(error) {
  await page.screenshot({path:'test-results/failure.png',fullPage:true}).catch(()=>{});
  await writeFile('test-results/failure-dom.html',await page.content());
  console.error('Page errors:',JSON.stringify(errors)); throw error;
} finally {
  await writeFile('test-results/browser-report.json',JSON.stringify({origin,passed:report,errors},null,2));
  await context.close();await browser.close();if(server) await new Promise(r=>server.close(r));
}
