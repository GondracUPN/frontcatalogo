const assert = require('node:assert/strict');
const path = require('node:path');
const engines = require('playwright');
const engineName = process.env.MACSO_TEST_BROWSER || 'chromium';

async function main() {
  const browser = await engines[engineName].launch({ headless: true });
  let passed = 0;
  async function scenario(options = {}) {
    const context = await browser.newContext({ timezoneId: 'Asia/Tokyo' });
    const queries = [], listingReads = [];
    await context.addInitScript(() => {
      const values = {};
      window.GM_getValue = (key, fallback) => values[key] || fallback;
      window.GM_setValue = (key, value) => { values[key] = value; };
    });
    let page;
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === 'https://www.facebook.com' && url.pathname.startsWith('/marketplace/item/')) {
        listingReads.push(url.pathname);
        if (options.listingRedirect) return route.fulfill({ status: 302, headers: { Location: 'https://www.facebook.com/login/' }, body: '' });
        const listing = { id: options.wrongListing ? '98765432' : '12345678', seller_sku: options.listingSku || null };
        const data = { require: [{ __bbox: { result: { data: { marketplace_listing: listing,
          recommendations: [{ id: '98765432', seller_sku: options.recommendedSku || 'MS-999' }],
          ...(options.conflict ? { conflicting_listing: { id: '12345678', sku: 'MS-477' } } : {}),
        } } } }] };
        return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body>
          <span>SKU MS-998</span>
          <script type="application/json">${JSON.stringify(data)}</script>
          ${options.scopedMarkup ? '<section data-listing-id="12345678"><div><span>SKU:</span><span>MS-476</span></div></section><section data-listing-id="98765432"><span>SKU MS-999</span></section>' : ''}
          </body></html>` });
      }
      if (url.origin === 'https://www.facebook.com') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><html><body><main><section id="chat">
        <article><a href="/marketplace/item/12345678/">${options.messengerBanner ? '<div><span dir="auto"><span>Marketplace</span></span></div><div><span dir="auto"><span>PEN2,699 - Remato MacBook Neo A18 Pro 13” 8GB RAM 256GB SSD Open Box 100% Batería Garantía 5 de mayo de 2027</span></span></div><object type="nested/pressable"><a aria-label="View buyer" href="/marketplace/profile/100000000000000/"><span dir="auto"><span>View buyer</span></span></a></object>' : '<h2>iPhone 15 Normal 128GB Black</h2>'}</a>
          ${options.sku ? '<span>SKU MS-476</span>' : ''}
          ${options.skuMarkup || ''}
          ${options.noPrice || options.messengerBanner ? '' : '<div>S/ 1,800</div>'}
          ${options.multiplePrices ? '<div>S/ 1,900</div>' : ''}
        </article>
        <textarea aria-label="Mensaje">${options.draft ? 'Borrador del usuario' : ''}</textarea>
        ${options.enter ? '' : '<button aria-label="Enviar" id="send">Enviar</button>'}
        ${options.scopedThread ? '<a href="/messages/t/111111">Conversación actual</a>' : ''}
        ${options.multipleListings ? '<a href="/marketplace/item/98765432/">Otro anuncio</a>' : ''}
        </section></main><script>
          window.sendCount = 0;
          const editor = document.querySelector('textarea');
          function send() { window.sendCount++; window.sentText = editor.value; ${options.unconfirmed ? '' : "editor.value = '';"} }
          document.querySelector('#send')?.addEventListener('click', send);
          editor.addEventListener('keydown', e => { if(e.key === 'Enter') send(); });
          ${options.changeDuringWrite ? "editor.addEventListener('input', () => history.replaceState({}, '', '/messages/t/222222'));" : ''}
        </script>${options.loadedSku ? '<script type="application/json">{"listing":{"id":"12345678","sku":"MS-476"},"recommended":{"id":"98765432","sku":"MS-999"}}</script>' : ''}</body></html>` });
      if (url.origin === 'https://www.macsomenos.com' && url.pathname === '/servmacso10/marketplace-resolver') {
        return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body>Resolver simulado para prueba aislada<script>
          const nonce = location.hash.slice(1);
          const ready = setInterval(() => opener.postMessage({type:'MACSO_RESOLVER_READY',nonce},'https://www.facebook.com'),100);
          addEventListener('message', async event => {
            if(event.origin !== 'https://www.facebook.com' || event.source !== opener || event.data?.nonce !== nonce || event.data.type !== 'MACSO_RESOLVE') return;
            clearInterval(ready);
            const response = await fetch('/api/admin/marketplace/resolve?' + new URLSearchParams(event.data.query));
            opener.postMessage({type:'MACSO_RESOLVED',nonce,status:response.status,body:await response.json()}, event.origin);
          });
        </script></body></html>` });
      }
      if (url.origin === 'https://www.macsomenos.com' && url.pathname === '/api/admin/marketplace/resolve') {
        queries.push(Object.fromEntries(url.searchParams));
        if (options.changed) await page.evaluate(() => history.replaceState({}, '', '/messages/t/222222'));
        return route.fulfill({ status: options.status || 200, contentType: 'application/json', body: JSON.stringify({ found: !options.status, product: {
          sku: '476', available: options.available !== false, availability: options.available === false ? 'sold' : 'available',
          url: options.badUrl ? 'https://evil.invalid/product/wrong' : 'https://www.macsomenos.com/product/iphone-15-normal-128gb-black-2',
        } }) });
      }
      throw Error('Unexpected network request: ' + url);
    });
    try {
      page = await context.newPage();
      await page.clock.setFixedTime(new Date(options.now || '2026-10-30T15:00:00Z'));
      await page.goto(options.noThread ? 'https://www.facebook.com/marketplace/inbox/' : options.encryptedThread ? 'https://www.facebook.com/messages/e2ee/t/111111/' : 'https://www.facebook.com/messages/t/111111');
      if (options.buttonRepair === 'legacy') await page.evaluate(() => {
        const old = document.createElement('button'); old.id = 'mm-chat-catalog-button-130'; old.hidden = true;
        old.style.cssText = 'display:none!important'; old.onclick = () => { window.legacyClicked = true; }; document.body.append(old);
      });
      await page.addScriptTag({ path: path.join(__dirname, 'marketplace', 'macsomenos-chat-anuncio.user.js') });
      if (options.buttonRepair === 'duplicate') await page.addScriptTag({ path: path.join(__dirname, 'marketplace', 'macsomenos-chat-anuncio.user.js') });
      if (options.buttonRepair === 'removed') await page.locator('#mm-chat-catalog-button-130').evaluate(button => button.remove());
      if (options.buttonRepair === 'hidden') await page.locator('#mm-chat-catalog-button-130').evaluate(button => {
        button.hidden = true; button.setAttribute('inert', ''); button.style.cssText = 'display:none!important;opacity:0!important';
      });
      if (options.buttonRepair === 'body') await page.evaluate(() => {
        const next = document.createElement('body'); next.append(...document.body.childNodes); document.body.replaceWith(next);
      });
      if (options.buttonRepair === 'navigation') await page.evaluate(() => {
        history.pushState({}, '', '/messages/t/111111/?view=chat'); document.querySelector('#mm-chat-catalog-button-130').remove();
      });
      await page.waitForFunction(() => {
        const button = document.getElementById('mm-chat-catalog-button-130');
        if (!button || button.hidden || button.hasAttribute('inert')) return false;
        const rect = button.getBoundingClientRect(), style = getComputedStyle(button);
        return rect.width === 54 && rect.height === 54 && style.visibility === 'visible' && style.opacity === '1' && style.position === 'fixed';
      });
      assert.equal(await page.locator('#mm-chat-catalog-button-130').count(), 1);
      assert.equal(await page.locator('#mm-chat-catalog-button-130').evaluate(button => getComputedStyle(button).backgroundColor), 'rgb(24, 119, 242)');
      await page.locator('textarea').focus();
      await page.waitForTimeout(150);
      assert.equal(queries.length, 0, 'opening a chat does not query');
      assert.equal(await page.evaluate(() => window.sendCount), 0, 'opening a chat does not send');
      await page.locator('#mm-chat-catalog-button-130').evaluate(button => button.click());
      assert.equal(queries.length, 0, 'synthetic clicks cannot trigger resolution');
      await page.locator('#mm-chat-catalog-button-130').click();
      await page.waitForFunction(() => !document.querySelector('#mm-chat-catalog-button-130').disabled, { timeout: 10000 });
      const skuFound = options.sku || options.skuMarkup || options.loadedSku || options.scopedMarkup || (options.listingSku && !options.wrongListing && !options.listingRedirect);
      const blockedBeforeLookup = options.noThread || options.draft || options.multipleListings || options.conflict || (!skuFound && (options.noPrice || options.multiplePrices));
      assert.equal(queries.length, blockedBeforeLookup ? 0 : 1, 'one resolver request, no catalog HTML downloads');
      if (queries.length) assert.deepEqual(queries[0], skuFound ? { sku: options.expectedSku || 'MS-476' } : options.messengerBanner ? { title: 'Remato MacBook Neo A18 Pro 13” 8GB RAM 256GB SSD Open Box 100% Batería Garantía 5 de mayo de 2027', price: '2699' } : { title: 'iPhone 15 Normal 128GB Black', price: '1800' });
      if (options.loadedSku || options.sku || options.skuMarkup) assert.equal(listingReads.length, 0, 'does not fetch a listing when the current DOM exposes its SKU');
      else if (!options.noThread && !options.draft && !options.multipleListings) assert.equal(listingReads.length, 1, 'reads only the exact listing, not catalog pages');
      const shouldSend = !blockedBeforeLookup && !options.changed && !options.changeDuringWrite && !options.status && !options.badUrl && options.available !== false;
      assert.equal(await page.evaluate(() => window.sendCount), shouldSend ? 1 : 0);
      if (shouldSend) {
        assert.equal(await page.evaluate(() => window.sentText), `${options.expectedGreeting || 'Buenos días'}, aquí le dejo el link de mi catálogo donde podrá ver más fotos y detalles del equipo:\n\nhttps://www.macsomenos.com/product/iphone-15-normal-128gb-black-2`, 'uses Peru time even when the browser has another timezone');
        assert.match(await page.evaluate(() => window.sentText), /https:\/\/www\.macsomenos\.com\/product\/iphone-15-normal-128gb-black-2/);
        if (options.retry) {
          await page.locator('#mm-chat-catalog-button-130').click();
          await page.waitForFunction(() => !document.querySelector('#mm-chat-catalog-button-130').disabled);
          assert.equal(await page.evaluate(() => window.sendCount), 1, 'no duplicate send after a second click');
        }
      }
      if (options.unconfirmed) assert.match(await page.locator('#mm-chat-catalog-status-130').innerText(), /no confirmó el envío/);
      if (options.draft) assert.equal(await page.locator('textarea').inputValue(), 'Borrador del usuario');
      assert.notEqual(await page.evaluate(() => window.legacyClicked), true);
      passed++;
    } finally { await context.close(); }
  }
  try {
    await scenario({ retry: true });
    for (const buttonRepair of ['legacy', 'duplicate', 'removed', 'hidden', 'body', 'navigation']) await scenario({ buttonRepair });
    await scenario({ now: '2026-10-30T18:00:00Z', expectedGreeting: 'Buenas tardes' });
    await scenario({ now: '2026-10-31T01:00:00Z', expectedGreeting: 'Buenas noches' });
    await scenario({ messengerBanner: true });
    await scenario({ messengerBanner: true, encryptedThread: true });
    await scenario({ sku: true, noPrice: true });
    await scenario({ skuMarkup: '<div><span>SKU:</span><span>MS-476</span></div>', noPrice: true });
    await scenario({ skuMarkup: '<label>SKU (opcional)<input aria-label="SKU" value="MS-476"></label>', noPrice: true });
    await scenario({ listingSku: 'MS-476', noPrice: true });
    await scenario({ loadedSku: true, noPrice: true });
    await scenario({ scopedMarkup: true, noPrice: true });
    await scenario({ recommendedSku: 'MS-476', noPrice: true });
    await scenario({ listingSku: 'MS-476', wrongListing: true, noPrice: true });
    await scenario({ listingSku: 'MS-476', conflict: true, noPrice: true });
    await scenario({ listingSku: 'MS-476', listingRedirect: true, noPrice: true });
    await scenario({ enter: true });
    await scenario({ enter: true, unconfirmed: true });
    await scenario({ unconfirmed: true });
    await scenario({ changed: true });
    await scenario({ changed: true, scopedThread: true });
    await scenario({ changeDuringWrite: true });
    await scenario({ noThread: true });
    await scenario({ draft: true });
    await scenario({ multipleListings: true });
    await scenario({ multiplePrices: true });
    await scenario({ noPrice: true });
    await scenario({ badUrl: true });
    await scenario({ available: false });
    for (const status of [401, 403, 404, 409, 429]) await scenario({ status });
    console.log(`macsomenos-chat-anuncio: ${passed} isolated ${engineName} scenarios passed. Simulated Facebook/relay/API; no live Facebook messages.`);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
