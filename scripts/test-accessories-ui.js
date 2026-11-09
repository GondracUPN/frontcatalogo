const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const { build } = require('esbuild');
const { chromium } = require('@playwright/test');
const fs = require('node:fs/promises');
const os = require('node:os');
const sharp = require('sharp');

async function main() {
  const root = path.resolve(__dirname, '..');
  const bundle = await build({
    stdin: { resolveDir: root, sourcefile: 'accessory-ui-test.tsx', loader: 'tsx', contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import PublishModal from './app/servmacso10/servicios/PublishModal';
      window.calls=[];
      const item = location.search.includes('new') ? {category:'accesorios',sale_type:'VENTA_SIMPLE',stock:1,images:[]} : {
        sku:'acc-ref-5-1234567890abcdef',id:'accessory-1',category:'accesorios',status:'draft',title:'Cargador MagSafe Apple',price:65,
        sale_type:'VENTA_SIMPLE',product_condition:'Usado',stock:location.search.includes('empty')?0:7,images:[],color:'Starlight',includes:'Otros',
        notes:JSON.stringify({accessoryCode:374,warrantyEnabled:true,color:'Starlight',includes:'Otros',specs:{tipo:'Accesorios',detalle:{gama:'Air',procesador:'M2',ram:'8',almacenamiento:'256'}}}),
      };
      createRoot(document.getElementById('root')).render(<PublishModal item={item} onClose={()=>{}} onSaved={()=>window.saved=true}/>);
    ` },
    bundle: true, write: false, outdir: path.join(root, '.accessory-ui-test'), platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'stub-server-actions', setup(build) {
      build.onResolve({ filter: /^\.\.\/\.\.\/actions$/ }, () => ({ path: 'actions', namespace: 'fixture' }));
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
        export async function createManualPreventaDraft(seed){window.calls.push({kind:'create',seed});return {ok:true,item:{id:'accessory-1'}};}
        export async function updateStaged(id,patch){window.calls.push({kind:'update',id,patch});return {ok:true};}
        export async function deleteStaged(){return {ok:true};}
        export async function replacePreventaWithInventory(){return {ok:true};}
        export async function publishStaged(id){window.calls.push({kind:'publish',id});return {ok:true};}
      ` }));
    } }],
  });
  const css = await require('postcss')([require('@tailwindcss/postcss')({ base: root })]).process('@import "tailwindcss";', { from: path.join(root, 'app/globals.css') });
  const fixture = await sharp({ create: { width: 80, height: 80, channels: 3, background: '#dbeafe' } }).png().toBuffer();
  const server = http.createServer((req, res) => {
    if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles.find(file => file.path.endsWith('.js')).contents); }
    else if (req.url === '/api/admin/product-versions') { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ok:false})); }
    else if (req.url === '/style.css') { res.setHeader('Content-Type', 'text/css'); res.end(css.css); }
    else if (req.url.endsWith('.png')) { res.setHeader('Content-Type', 'image/png'); res.end(fixture); }
    else if (req.url === '/api/admin/upload') { req.resume(); res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ok: true, url: '/uploads/wm-accessory.png' })); }
    else { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/bundle.js"></script>'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 960, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const base = `http://127.0.0.1:${server.address().port}`;
    // Publicar sin tocar el campo conserva el nombre recibido.
    await page.goto(base);
    await page.getByLabel('Fotografías').setInputFiles({name:'original.png',mimeType:'image/png',buffer:fixture});
    await page.getByRole('button',{name:'Publicar',exact:true}).click(); await page.waitForFunction(()=>window.saved);
    assert.equal(await page.evaluate(()=>window.calls[0].patch.title),'Cargador MagSafe Apple');
    await page.goto(base);
    const type = page.getByLabel('Tipo', {exact:true});
    assert.equal(await type.inputValue(), 'accesorios');
    assert.equal(await page.getByText('ACC-374', {exact:true}).count(), 1);
    const hidden = async () => { for (const label of ['¿Garantía?', 'Color', '¿Qué incluye?']) assert.equal(await page.getByText(label,{exact:true}).count(),0); };
    await hidden();
    assert.equal(await page.getByLabel('Stock',{exact:true}).inputValue(),'7');
    await type.selectOption('macbook');
    assert.equal(await page.getByLabel('Vender también por paquete o caja').count(),0);
    for (const label of ['¿Garantía?', 'Color', '¿Qué incluye?']) assert.equal(await page.getByText(label,{exact:true}).isVisible(),true);
    await type.selectOption('accesorios'); await hidden();
    await page.getByLabel('Stock',{exact:true}).fill('7');
    for(const state of ['Nuevo','Usado','Open Box']) {
      await page.getByLabel('Estado',{exact:true}).selectOption(state);
      assert.equal(await page.getByLabel('Stock',{exact:true}).inputValue(),'7');
      assert.equal(await page.getByText('SKU adicionales para este stock',{exact:true}).count(),0);
    }
    await page.getByLabel('Título',{exact:true}).fill('Cargador MagSafe Apple');
    assert.equal(await page.getByText(/El color es obligatorio|Selecciona que incluye|garantía limitada/).count(),0);
    assert.equal(await page.getByRole('button',{name:'Publicar',exact:true}).isDisabled(),true);
    await page.getByLabel('Fotografías').setInputFiles({name:'cargador.png',mimeType:'image/png',buffer:fixture});
    assert.equal(await page.getByRole('button',{name:'Publicar',exact:true}).isEnabled(),true);
    await page.getByLabel('Estado',{exact:true}).selectOption('Open Box');
    assert.equal(await page.getByText('Tipo de Open Box',{exact:true}).count(),0);
    for (const mode of ['OFERTA','PROMOCION','PREVENTA','VENTA_SIMPLE']) {
      await page.getByLabel('Tipo de venta',{exact:true}).selectOption(mode);
      if(mode==='OFERTA') assert.equal(await page.getByText('Minimo de oferta (S/)',{exact:true}).count(),1);
      if(mode==='PROMOCION') assert.equal(await page.getByText('Descuento',{exact:true}).count(),1);
      if(mode==='PREVENTA') assert.equal(await page.getByText('Llega entre (desde)',{exact:true}).count(),1);
    }
    await page.getByLabel('Vender también por paquete o caja').check();
    await page.getByLabel('Nombre de presentación',{exact:true}).fill('Caja');
    await page.getByLabel('Unidades por presentación',{exact:true}).fill('6');
    await page.getByLabel('Precio de presentación',{exact:true}).fill('300.99');
    await page.getByRole('button',{name:'Copiar texto',exact:true}).click();
    const copied=await page.evaluate(()=>navigator.clipboard.readText());
    assert.ok(copied.includes("Caja de 6 unidades: S/ 300.99")); assert.match(copied,/REMATO - Cargador MagSafe Apple/); assert.match(copied,/No Mercado Pago/);
    assert.doesNotMatch(copied,/Starlight|Garantía:|Incluye:/);
    const previewDir=path.join(os.tmpdir(),'macsomenos-accessory-ui');await fs.mkdir(previewDir,{recursive:true});
    await page.screenshot({path:path.join(previewDir,'desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(previewDir,'mobile.png'),fullPage:true});
    await page.setViewportSize({width:960,height:900});
    await page.getByRole('button',{name:'Publicar',exact:true}).click(); await page.waitForFunction(()=>window.saved);
    const calls=await page.evaluate(()=>window.calls);
    assert.deepEqual(calls.map(call=>call.kind),['update','publish']);
    assert.equal(calls[0].patch.stock,7); assert.equal(calls[0].patch.category,'accesorios'); assert.equal(calls[0].patch.title,'Cargador MagSafe Apple');
    assert.equal(calls[0].patch.color,null); assert.equal(calls[0].patch.includes,null);
    assert.equal(JSON.parse(calls[0].patch.notes).warrantyEnabled,false);
    assert.deepEqual(JSON.parse(calls[0].patch.notes).accessoryPack,{units:6,price:300.99,label:'Caja'});
    await page.goto(base+'/?new');
    await page.getByLabel('Título',{exact:true}).fill('Cable USB-C');
    await page.getByLabel('Estado',{exact:true}).selectOption('Nuevo');
    await page.getByLabel('Precio por unidad (S/)',{exact:true}).fill('25');
    await page.getByLabel('Stock',{exact:true}).fill('5');
    await page.getByLabel('Costo del producto').fill('5'); await page.getByLabel('Costo de envío').fill('1');
    await page.getByLabel('Fotografías').setInputFiles({name:'cable.png',mimeType:'image/png',buffer:fixture});
    await page.getByRole('button',{name:'Publicar',exact:true}).click(); await page.waitForFunction(()=>window.saved);
    const created=await page.evaluate(()=>window.calls);
    assert.deepEqual(created.map(call=>call.kind),['create','update','publish']);
    assert.equal(created[0].seed.stock,5); assert.equal(created[1].patch.stock,5);
    assert.equal(created[0].seed.accessoryState,'Sellado'); assert.deepEqual(created[0].seed.accessoryCosts,{purchase:5,shipping:1});
    assert.equal(created[1].patch.presentation,'sellado'); assert.equal(errors.length,0,errors.join('\n'));
    await page.goto(base+'/?empty');
    assert.equal(await page.getByLabel('Stock',{exact:true}).inputValue(),'0');
    assert.equal(await page.getByRole('button',{name:'Publicar',exact:true}).isDisabled(),true);
    assert.equal(await page.getByText(/Podrás publicar cuando recibas stock/).count(),1);
    console.log('Formulario único: Tipo en ambos sentidos, campos condicionales, fotos, ventas y costos OK (Chromium; API simulada)');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
