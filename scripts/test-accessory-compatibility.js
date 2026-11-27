const assert = require('node:assert/strict');
const path = require('node:path');
const { build } = require('esbuild');

async function load(entry) {
  const result = await build({ entryPoints: [path.join(__dirname, entry)], bundle: true, platform: 'node', format: 'cjs', write: false });
  const mod = { exports: {} };
  new Function('module', 'exports', result.outputFiles[0].text)(mod, mod.exports);
  return mod.exports;
}

async function main() {
  const c = await load('../lib/accessory-compatibility.ts');
  const { generateMarketplaceData } = await load('../lib/marketplace.ts');
  const A = 'iPad Pro 11″ (M4)';
  const B = 'iPad Pro 13″ (M4)';
  // Efectiva: manual (aunque vacía) > Servicios > [].
  assert.deepEqual(c.effectiveCompatibleModels({ servicesModelosCompatibles: [A, B] }), [A, B]);
  assert.deepEqual(c.effectiveCompatibleModels(JSON.stringify({ servicesModelosCompatibles: [A, B], modelosCompatibles: [A] })), [A]);
  assert.deepEqual(c.effectiveCompatibleModels({ servicesModelosCompatibles: [A], modelosCompatibles: [] }), []);
  assert.deepEqual(c.effectiveCompatibleModels({}), []);
  assert.deepEqual(c.effectiveCompatibleModels('{no json'), []);
  assert.equal(c.hasManualCompatibleModels({ modelosCompatibles: [] }), true);
  assert.equal(c.hasManualCompatibleModels({ servicesModelosCompatibles: [A] }), false);
  assert.deepEqual(c.cleanCompatibleModels([` ${A} `, A.toLowerCase(), '', 3, 'x'.repeat(121), B]), [A, B]);
  // Pública (solo nombres) tiene prioridad sobre las notas.
  assert.deepEqual(c.compatibleModelsOf({ staged: { compatibleModels: [B], notes: { modelosCompatibles: [A] } } }), [B]);
  assert.deepEqual(c.compatibleModelsOf({ notes: JSON.stringify({ modelosCompatibles: [A] }) }), [A]);

  // Cascada Familia -> Gama -> Tamaño -> Modelos.
  const rows = c.readCompatibleModelRows([
    { id: 'p11', family: 'ipad', range: 'iPad Pro', label: A, screen: '11″', chip: 'M4', year: 2024 },
    { id: 'p13', family: 'ipad', range: 'iPad Pro', label: B, screen: '13″', chip: 'M4', year: 2024 },
    { id: 'air', family: 'ipad', range: 'iPad Air', label: 'iPad Air 11″ (M2)', screen: '11″', chip: 'M2', year: 2022 },
    { id: 'mb', family: 'macbook', range: 'MacBook Air', label: 'MacBook Air 13″ (M2)', screen: '13″', chip: 'M2', year: 2022 },
    { id: 'bad', family: 'tv', range: 'x', label: 'x', screen: 'x', chip: 'x', year: 2020 },
    { family: 'ipad' },
  ]);
  assert.equal(rows.length, 4, 'descarta filas mal formadas');
  const blank = c.readCompatibleModelRows([{ id: 'b', family: 'iphone', range: 'iPhone X', label: 'iPhone X', screen: '', chip: '', year: 2017 }]);
  assert.deepEqual([blank.length, blank[0].screen, blank[0].chip], [1, c.NO_SCREEN, '']);
  assert.deepEqual(c.rangesOfFamily(rows, 'ipad'), ['iPad Pro', 'iPad Air']);
  assert.deepEqual(c.screensOf(rows, 'ipad', 'iPad Pro'), ['11″', '13″']);
  assert.deepEqual(c.modelsOf(rows, 'ipad', 'iPad Pro', '').map((r) => r.label), [A, B]);
  assert.deepEqual(c.modelsOf(rows, 'ipad', 'iPad Pro', '13″').map((r) => r.label), [B]);

  // Marketplace: «Compatible con» solo si hay lista efectiva.
  const base = { sku: 'MS-ACC', title: 'Funda', category: 'accesorios', price: '30', product_condition: 'Usado' };
  const withModels = generateMarketplaceData({ ...base, notes: JSON.stringify({ servicesModelosCompatibles: [A, B] }) }).descripcion;
  assert.ok(withModels.includes(`Compatible con: ${A}, ${B}`));
  assert.doesNotMatch(generateMarketplaceData({ ...base, notes: JSON.stringify({ servicesModelosCompatibles: [A], modelosCompatibles: [] }) }).descripcion, /Compatible con/);
  assert.match(generateMarketplaceData({ ...base, compatibleModels: [A] }).descripcion, /Compatible con: iPad Pro 11/);
  console.log('accessory-compatibility: OK');
}

main().catch((error) => { console.error(error); process.exit(1); });
