const assert = require('node:assert/strict');
const path = require('node:path');
const { build } = require('esbuild');

async function main() {
  const result = await build({ entryPoints: [path.join(__dirname, '../lib/marketplace.ts')], bundle: true, platform: 'node', format: 'cjs', write: false });
  const mod = { exports: {} };
  new Function('module', 'exports', result.outputFiles[0].text)(mod, mod.exports);
  const { generateMarketplaceData } = mod.exports;
  const displayBuild = await build({ entryPoints: [path.join(__dirname, '../lib/catalog-display.ts')], bundle: true, platform: 'node', format: 'cjs', write: false });
  const display = { exports: {} };
  new Function('module', 'exports', displayBuild.outputFiles[0].text)(display, display.exports);
  // Caso real: «otros» es el grupo público, 509 es el lote y 16 es el código.
  const legacyAccessory = { category: 'otros', product: { sku: 'acc-lot-509' }, staged: { category: 'accesorios', sku: 'acc-lot-509', notes: { accessoryCode: 16 } } };
  assert.equal(display.exports.catalogFacts(legacyAccessory).sku, 'ACC-16');
  assert.equal(display.exports.catalogFacts({ ...legacyAccessory, staged: { ...legacyAccessory.staged, notes: JSON.stringify({ accessoryCode: 16 }) } }).sku, 'ACC-16');
  assert.equal(display.exports.catalogFacts({ category: 'macbook', product: { sku: 'MS-374' }, staged: { category: 'macbook' } }).sku, '374');
  for (const state of ['Sellado', 'Usado', 'Open Box']) {
    const data = generateMarketplaceData({
      sku: 'MS-ACC', title: 'Cargador MagSafe Apple', category: 'accesorios', price: '65.50',
      product_condition: state === 'Sellado' ? 'Nuevo' : state,
      presentation: state === 'Sellado' ? 'sellado' : null,
      notes: JSON.stringify({ accessoryCode: 374, valor: { costoProducto: 35, costoEnvio: 5, costoTotal: 40 }, includes: 'Ninguno', warrantyEnabled: false }),
      images: ['https://example.com/a.jpg', ' https://example.com/b.jpg ', 'https://example.com/a.jpg', ''],
    });
    assert.equal(data.titulo, 'REMATO - Cargador MagSafe Apple');
    assert.ok(data.descripcion.startsWith(`Se remata Cargador MagSafe Apple\n\nEstado: ${state}\n\n`));
    assert.match(data.descripcion, /Se entrega boleta de compra USA/);
    assert.match(data.descripcion, /No Mercado Pago/);
    assert.deepEqual(data.images, ['https://example.com/a.jpg', 'https://example.com/b.jpg'], 'las fotos del accesorio se envían a Marketplace');
    assert.equal(data.precio, '65.5');
    assert.equal(data.displaySku, 'ACC-374');
    assert.equal(data.sku, 'MS-ACC', 'conserva el identificador interno de ventas');
    assert.equal(data.estadoMarketplace, state === 'Sellado' ? 'Nuevo' : 'Usado: como nuevo');
    assert.doesNotMatch(JSON.stringify(data), /costo|garantía|No incluye|No cuenta|No incluye: caja/i);
  }
  // El nombre del accesorio puede mencionar equipos sin activar su plantilla.
  const charger = generateMarketplaceData({ sku: 'a', category: 'accesorios', title: 'Cargador MacBook Pro', price: 65, product_condition: 'Usado' });
  assert.equal(charger.titulo, 'REMATO - Cargador MacBook Pro');
  assert.ok(charger.descripcion.startsWith('Se remata Cargador MacBook Pro\n\nEstado: Usado\n\n'));
  assert.doesNotMatch(charger.descripcion, /color|garantía|Accesorios:|No incluye/i);
  const normal = generateMarketplaceData({ sku: 'b', category: 'macbook', title: 'MacBook Pro', price: '2699.99', product_condition: 'Open Box' });
  assert.equal(normal.precio, '2699');
  assert.match(normal.descripcion, /Garantía:/);
  assert.notEqual(normal.titulo, 'REMATO - MacBook Pro');
  const packed = generateMarketplaceData({category:'accesorios',title:'Cable',price:5,notes:{accessoryPack:{units:6,price:25.99,label:'Caja'}}});
  assert.ok(packed.descripcion.includes("Caja de 6 unidades: S/ 25.99"));
  assert.ok(packed.descripcion.includes("Precio por unidad: S/ 5"));
  console.log('Accesorios: Marketplace, estados, centavos y regresión de equipos OK');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
