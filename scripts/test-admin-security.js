const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');

// Ejecuta los handlers reales con caché y API simuladas. Nunca abre conexiones.
function load(file, overrides = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, process, Buffer, URL, URLSearchParams, console,
    fetch: async () => { throw new Error('Unexpected network access'); },
    require: (name) => overrides[name] || require(name), ...overrides.globals,
  }, { filename: file });
  return exports;
}

async function main() {
  const previous = { ...process.env };
  try {
    const safe = load('lib/safe-redirect.ts');
    const tags = [];
    const revalidate = load('app/api/admin/revalidate/route.ts', {
      'next/cache': { revalidateTag: (tag) => tags.push(tag) },
    });
    const request = (secret, body = {}) => new NextRequest('http://localhost/api/admin/revalidate', {
      method: 'POST', headers: secret ? { 'x-revalidate-secret': secret } : {}, body: JSON.stringify(body),
    });
    for (const env of ['development', 'production']) {
      process.env.NODE_ENV = env;
      delete process.env.REVALIDATE_SECRET;
      assert.equal((await revalidate.POST(request())).status, 503);
      process.env.REVALIDATE_SECRET = 'test-secret';
      assert.equal((await revalidate.POST(request())).status, 401);
      assert.equal((await revalidate.POST(request('incorrect'))).status, 401);
    }
    assert.equal(tags.length, 0);
    assert.equal((await revalidate.POST(request('test-secret', { tags: ['catalog-products', 'private-tag'] }))).status, 200);
    assert.deepEqual(tags, ['catalog-products']);

    let backendStatus = 429;
    let sentHeaders = {};
    const login = load('app/api/login/route.ts', {
      '@/lib/safe-redirect': safe,
      globals: { fetch: async (_url, init) => {
        sentHeaders = init.headers;
        return { ok: backendStatus === 200, status: backendStatus, json: async () => ({ access_token: 'test-token' }) };
      } },
    });
    const loginRequest = () => new NextRequest('http://localhost/api/login', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
      body: JSON.stringify({ username: 'admin_t', password: 'fictitious-password', next: 'https://external.example' }),
    });
    delete process.env.LOGIN_PROXY_SECRET;
    await login.POST(loginRequest());
    assert.equal(sentHeaders['x-login-client-ip'], undefined);
    process.env.LOGIN_PROXY_SECRET = 'proxy-secret';
    await login.POST(loginRequest());
    assert.equal(sentHeaders['x-login-client-ip'], '203.0.113.7');
    assert.equal(sentHeaders['x-login-proxy-secret'], 'proxy-secret');
    const limited = await login.POST(loginRequest());
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get('retry-after'), '600');
    backendStatus = 200;
    const success = await login.POST(loginRequest());
    assert.equal(success.headers.get('location'), 'http://localhost/servmacso10/servicios');
    assert.match(success.headers.get('set-cookie'), /HttpOnly/);

    const marker = Symbol('redirect');
    let destination;
    const page = load('app/servmacso10/page.tsx', {
      '@/lib/safe-redirect': safe,
      '../actions': { getSessionUser: async () => ({ role: 'admin' }) },
      'next/navigation': { redirect: (value) => { destination = value; throw marker; } },
    });
    for (const next of ['https://external.example', '//external.example', '/\\external.example', '/\t/external.example']) {
      await assert.rejects(() => page.default({ searchParams: Promise.resolve({ next }) }), (e) => e === marker);
      assert.equal(destination, '/servmacso10/servicios');
    }
    await assert.rejects(() => page.default({ searchParams: Promise.resolve({ next: '/servmacso10/solicitudes?status=new' }) }), (e) => e === marker);
    assert.equal(destination, '/servmacso10/solicitudes?status=new');
    console.log('admin-security: revalidation, login 429 and safe redirect checks passed');
  } finally { process.env = previous; }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
