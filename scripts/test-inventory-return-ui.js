const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const { build } = require('esbuild');
const { chromium } = require('@playwright/test');
const sharp = require('sharp');

async function main() {
  const root = path.resolve(__dirname, '..');
  const bundle = await build({
    stdin: { resolveDir: root, sourcefile: 'accessory-ui-test.tsx', loader: 'tsx', contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import Panels from './app/servmacso10/servicios/InventoryCatalogPanels';
      window.inventory=[];window.servicesSelected=true;
      window.catalog=[{id:'pub-1',product_id:'prod-1',category:'accesorios',slug:'cable',is_published:true,product:{id:'prod-1',sku:'acc-lot-509',title:'Cable USB-C',price:'25',stock:2,status:'listed',product_condition:'Usado'},staged:{id:'stage-1',sku:'acc-lot-509',category:'accesorios',title:'Cable USB-C',price:'25',stock:2,status:'published',product_condition:'Usado',images:[],notes:JSON.stringify({accessoryCode:16})}}];
      createRoot(document.getElementById('root')).render(<Panels inventoryItems={[]} catalogItems={window.catalog} sealedPresets={[]} canDelete={true} category="accesorios"/>);
    ` },
    bundle: true, write: false, outdir: path.join(root, '.accessory-ui-test'), platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'stub-server-actions', setup(build) {
      build.onResolve({ filter: /^\.\.\/\.\.\/actions$/ }, () => ({ path: 'actions', namespace: 'fixture' }));
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
        export async function listStaged(){return {items:window.inventory};}
        export async function listAdminCatalog(){return {items:window.catalog};}
        export async function unpublishProduct(){window.inventory=[{...window.catalog[0].staged,status:'draft'}];window.catalog=[];return {ok:true};}
        export async function deleteStaged(){window.inventory=[];window.servicesSelected=false;return {ok:true};}
        export async function createManualPreventaDraft(){return {ok:true,item:{id:'stub'}};}
        export async function updateStaged(){return {ok:true};}
        export async function publishStaged(){return {ok:true};}
        export async function replacePreventaWithInventory(){return {ok:true};}
        export async function markProductSold(){return {ok:true};}
        export async function markStagedProductSold(){return {ok:true};}
        export async function prepareMarketplaceBridge(){return {ok:true};}
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
    await page.goto(base);
    const inventory=page.getByRole('heading',{name:'Inventario',exact:true}).locator('..');
    const catalog=page.getByRole('heading',{name:'Catálogo',exact:true}).locator('..');
    assert.equal(await inventory.getByText('Cable USB-C',{exact:true}).count(),0);
    await catalog.getByRole('button',{name:'Eliminar producto del catalogo',exact:true}).click();
    await inventory.getByText('Cable USB-C',{exact:true}).waitFor({timeout:2500});
    assert.equal(await catalog.getByText('Cable USB-C',{exact:true}).count(),0);
    assert.equal(await page.evaluate(()=>window.servicesSelected),true,'despublicar no lo retira de Servicios');
    page.on('dialog',dialog=>dialog.accept());
    await inventory.getByRole('button',{name:'Eliminar producto',exact:true}).click();
    await page.waitForFunction(()=>window.inventory.length===0);
    assert.equal(await inventory.getByText('Cable USB-C',{exact:true}).count(),0);
    assert.equal(await page.evaluate(()=>window.servicesSelected),false);
    assert.equal(errors.length,0,errors.join('\n'));
    console.log('Despublicar → Inventario sin recargar en menos de 2.5 s; eliminación del borrador OK (Chromium, API simulada)');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
