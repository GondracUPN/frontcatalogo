const assert = require("node:assert/strict");
const path = require("node:path");
const { createRequire } = require("node:module");
const { build } = require("esbuild");
const { NextRequest } = require("next/server");

async function main() {
  const root = path.resolve(__dirname, "..");
  const compiled = await build({ entryPoints: [path.join(root, "app/api/admin/marketplace/resolve/route.ts")], bundle: true, platform: "node", format: "cjs", write: false, packages: "external" });
  const mod = { exports: {} };
  new Function("require", "module", "exports", compiled.outputFiles[0].text)(createRequire(path.join(root, "package.json")), mod, mod.exports);
  const originalFetch = global.fetch;
  let role = "ADMIN", status = 200, calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    if (String(url).endsWith("/auth/me")) return Response.json({ role });
    return Response.json(status === 200 ? { found: true, product: { url: "https://www.macsomenos.com/product/current-slug" } } : { message: "Not found" }, { status });
  };
  const request = (cookie = "token=test-session") => new NextRequest("https://www.macsomenos.com/api/admin/marketplace/resolve?sku=MS-476", { headers: cookie ? { cookie } : {} });
  try {
    assert.equal((await mod.exports.GET(request(""))).status, 401);
    assert.equal(calls.length, 0);
    role = "VENDEDOR";
    assert.equal((await mod.exports.GET(request())).status, 403);
    assert.equal(calls.length, 1, "seller cannot reach product lookup");
    role = "ADMIN";
    const response = await mod.exports.GET(request());
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal((await response.json()).product.url, "https://www.macsomenos.com/product/current-slug");
    const forwarded = calls.at(-1);
    assert.ok(forwarded.url.endsWith("/admin/marketplace/resolve?sku=MS-476"));
    assert.equal(forwarded.options.headers.Authorization, "Bearer test-session");
    assert.equal(forwarded.options.cache, "no-store");
    for (status of [400, 401, 403, 404, 409, 429]) assert.equal((await mod.exports.GET(request())).status, status);
    // Regresión del HTML real de Messenger: título corto en catálogo, título
    // completo del publicador en Facebook, y precio 2699.99 publicado como 2699.
    const neoTitle = 'Remato MacBook Neo A18 Pro 13” 8GB RAM 256GB SSD Open Box 100% Batería Garantía 5 de mayo de 2099';
    const productId = 'aaaaaaaa-1111-4111-8111-111111111111';
    const neo = {
      product_id: productId, slug: 'macbook-neo-a18-pro-13-13', category: 'macbook', availability: 'available',
      product: { sku: 'MS-482', title: 'MacBook Neo A18 Pro 13', price: '2699.99' },
      staged: { sku: 'MS-482', title: 'MacBook Neo A18 Pro 13', category: 'macbook', price: '2699.99',
        product_condition: 'Open Box', battery_health: 100, color: 'Indigo', notes: {
          warrantyEnabled: true, warrantyDate: '5 de mayo de 2099', warrantyType: 'Garantía limitada de Apple',
          specs: { tipo: 'MacBook', detalle: { gama: 'Neo', procesador: 'A18 Pro', 'tamaño': '13', ram: '8', almacenamiento: '256' } },
          cost: 999, supplier: 'must-not-leak',
        },
      },
    };
    let catalogItems = [neo], catalogStatus = 200, verifiedStatus = 200, verifiedAvailable = true;
    const publicationRequest = (title = neoTitle, price = '2699') => new NextRequest('https://www.macsomenos.com/api/admin/marketplace/resolve?' + new URLSearchParams({ title, price }), { headers: { cookie: 'token=test-session' } });
    global.fetch = async (url, options) => {
      calls.push({ url: String(url), options });
      const parsed = new URL(url);
      if (parsed.pathname === '/auth/me') return Response.json({ role: 'ADMIN' });
      assert.equal(options.cache, 'no-store');
      if (parsed.pathname === '/catalog') {
        assert.equal(parsed.searchParams.get('q'), 'MacBook neo');
        return Response.json({ items: catalogItems }, { status: catalogStatus });
      }
      assert.equal(parsed.pathname, '/admin/marketplace/resolve');
      if (parsed.searchParams.has('productId')) {
        assert.equal(parsed.searchParams.get('productId'), productId);
        return Response.json({ found: true, product: { sku: '482', title: neo.product.title,
          url: 'https://www.macsomenos.com/product/current-neo-slug', available: verifiedAvailable,
          availability: verifiedAvailable ? 'available' : 'reserved', debugPrivate: 'must-not-leak',
        } }, { status: verifiedStatus });
      }
      return Response.json({ found: false, message: 'No verifiable published product' }, { status: 404 });
    };
    calls = [];
    const generatedMatch = await mod.exports.GET(publicationRequest());
    assert.equal(generatedMatch.status, 200);
    assert.match(generatedMatch.headers.get('cache-control'), /private, no-store/);
    const generatedBody = await generatedMatch.json();
    assert.deepEqual(generatedBody, { found: true, product: { sku: '482', title: neo.product.title,
      url: 'https://www.macsomenos.com/product/current-neo-slug', available: true, availability: 'available',
    } });
    assert.equal(calls.length, 4, 'auth, exact lookup, one family JSON query and final ID verification');
    assert.ok(!JSON.stringify(generatedBody).includes('must-not-leak'));
    const helperBuild = await build({ entryPoints: [path.join(root, 'lib/marketplace-resolution.ts')], bundle: true, platform: 'node', format: 'cjs', write: false });
    const helper = { exports: {} };
    new Function('require', 'module', 'exports', helperBuild.outputFiles[0].text)(createRequire(path.join(root, 'package.json')), helper, helper.exports);
    const iphone = { product_id: 'cccccccc-1111-4111-8111-111111111111', slug: 'iphone-unit', availability: 'available', category: 'iphone', staged: {
      sku: 'MS-476', title: 'iPhone 15 Normal 128GB Black', price: '1800', iphone_number: 15,
      iphone_model: 'Normal', storage_gb: 128, color: 'Black', battery_health: 92, product_condition: 'Usado',
    } };
    const iphoneTitle = 'Remato iPhone 15 Normal 128GB Black 92% Batería';
    assert.equal(helper.exports.matchingPublications([iphone], iphoneTitle, '1800').length, 1);
    for (const changed of [iphoneTitle.replace('Black', 'White'), iphoneTitle.replace('Normal', 'Pro'), iphoneTitle.replace('15', '16')]) {
      assert.equal(helper.exports.matchingPublications([iphone], changed, '1800').length, 0);
    }
    catalogItems = [{ ...neo, staged: { ...neo.staged, price: '2999.99', final_price: '2699.99' } }];
    assert.equal((await mod.exports.GET(publicationRequest())).status, 200, 'uses the same promotion price as the publisher');
    catalogItems = [{ ...neo, staged: { ...neo.staged, price: '2999.99', notes: { ...neo.staged.notes, finalPrice: '2699.99' } } }];
    assert.equal((await mod.exports.GET(publicationRequest())).status, 200, 'uses notes.finalPrice like the publisher');
    catalogItems = [neo];
    // Cambios reales de especificaciones/precio no se suavizan ni se ignoran.
    for (const title of [neoTitle.replace('8GB RAM', '16GB RAM'), neoTitle.replace('256GB SSD', '512GB SSD'), neoTitle.replace('A18 Pro', 'M2'), neoTitle.replace('13”', '15”'), neoTitle.replace('100%', '90%'), neoTitle.replace('5 de mayo', '6 de mayo'), neoTitle.replace('Open Box ', '')]) {
      assert.equal((await mod.exports.GET(publicationRequest(title))).status, 404);
    }
    assert.equal((await mod.exports.GET(publicationRequest(neoTitle, '2698'))).status, 404);
    assert.equal((await mod.exports.GET(publicationRequest(neoTitle.replace('Batería', 'BATERIA').replace('13”', '13"')))).status, 200);
    assert.equal((await mod.exports.GET(publicationRequest(neoTitle.replace('8GB RAM', '8 GB\u200e RAM')))).status, 200, 'ignores invisible display marks and unit spacing');
    const duplicate = { ...neo, product_id: 'bbbbbbbb-1111-4111-8111-111111111111', slug: 'another-unit', staged: { ...neo.staged, sku: 'MS-483', color: 'Silver' } };
    catalogItems = [neo, duplicate];
    calls = [];
    assert.equal((await mod.exports.GET(publicationRequest())).status, 409, 'same generated title/price for different units stays ambiguous');
    assert.equal(calls.some(call => call.url.includes('productId=')), false, 'never selects the first ambiguous unit');
    catalogItems = [{ ...neo, availability: 'reserved' }];
    assert.equal((await mod.exports.GET(publicationRequest())).status, 404);
    catalogItems = [neo]; verifiedAvailable = false;
    assert.equal((await mod.exports.GET(publicationRequest())).status, 404, 'rechecks reservations after selecting a candidate');
    verifiedAvailable = true; verifiedStatus = 404;
    assert.equal((await mod.exports.GET(publicationRequest())).status, 404, 'rechecks publication/owner before returning a URL');
    verifiedStatus = 200; catalogStatus = 500;
    assert.equal((await mod.exports.GET(publicationRequest())).status, 502);
    catalogStatus = 200; calls = [];
    assert.equal((await mod.exports.GET(request())).status, 404);
    assert.equal(calls.some(call => call.url.includes('/catalog?')), false, 'an unknown SKU never falls back to title matching');
    global.fetch = async (url) => {
      if (String(url).endsWith("/auth/me")) return Response.json({ role: "ADMIN" });
      throw Error("backend unavailable");
    };
    assert.equal((await mod.exports.GET(request())).status, 502);
    const downloadBuild = await build({ entryPoints: [path.join(root, "app/api/admin/marketplace/script/route.ts")], bundle: true, platform: "node", format: "cjs", write: false, packages: "external" });
    const download = { exports: {} };
    new Function("require", "module", "exports", downloadBuild.outputFiles[0].text)(createRequire(path.join(root, "package.json")), download, download.exports);
    global.fetch = async () => Response.json({ role });
    assert.equal((await download.exports.GET(request(""))).status, 401);
    role = "VENDEDOR";
    assert.equal((await download.exports.GET(request())).status, 403);
    role = "ADMIN";
    const scriptResponse = await download.exports.GET(request());
    assert.equal(scriptResponse.status, 200);
    assert.match(scriptResponse.headers.get("content-disposition"), /v1\.4\.4\.user\.js/);
    assert.match(scriptResponse.headers.get("cache-control"), /private, no-store/);
    const script = await scriptResponse.text();
    assert.match(script, /@version\s+1\.4\.4/);
    assert.match(script, /aquí le dejo el link de mi catálogo/);
    assert.match(script, /MutationObserver/);
    console.log("marketplace-resolver frontend: ADMIN auth/download, generated Neo/iPhone titles, exact price/specs, ambiguity, live ID/stock checks, privacy, no-store and errors passed");
  } finally { global.fetch = originalFetch; }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
