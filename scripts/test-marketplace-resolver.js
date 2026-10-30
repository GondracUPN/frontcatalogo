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
    console.log("marketplace-resolver frontend: anonymous/seller denied, admin proxy, JSON URL, no-store, status forwarding and outage passed");
  } finally { global.fetch = originalFetch; }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
