// ==UserScript==
// @name         Macsomenos - Chat por anuncio y catalogo
// @namespace    macsomenos-chat-anuncio
// @version      1.4.4
// @description  Resuelve el anuncio del chat mediante la API ADMIN y envía un enlace al pulsar 🔗.
// @match        https://www.facebook.com/*
// @match        https://facebook.com/*
// @match        https://web.facebook.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// @noframes
// ==/UserScript==

(() => {
  'use strict';

  const SITE = 'https://www.macsomenos.com';
  const SENT = 'mm_chat_sent_130'; // Conserva el bloqueo de intentos del script anterior.
  const BUTTON = 'mm-chat-catalog-button-130';
  const STATUS = 'mm-chat-catalog-status-130';
  const VERSION = '1.4.4';
  const DEBUG = `[Macsomenos Chat ${VERSION}]`;
  let busy = false, focused = null, statusTimer = null, scriptActive = true;

  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const norm = value => clean(value).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const stored = (key, fallback) => {
    try { return GM_getValue(key, fallback) || fallback; } catch { return fallback; }
  };
  // Si no se puede registrar el intento, no se intenta un envío automático.
  const persist = (key, value) => GM_setValue(key, value);
  const visible = element => {
    if (!(element instanceof HTMLElement) || !element.isConnected) return false;
    const style = getComputedStyle(element), rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  };
  const currentText = element => clean(element instanceof HTMLTextAreaElement ? element.value : element.textContent);

  function listingId(raw) {
    try {
      const url = new URL(raw, location.origin);
      if (!['www.facebook.com', 'facebook.com', 'web.facebook.com'].includes(url.hostname)) return null;
      return url.pathname.match(/^\/marketplace\/item\/(\d{5,25})(?:\/|$)/)?.[1] || null;
    } catch { return null; }
  }

  function threadId(raw) {
    try {
      const url = new URL(raw, location.origin);
      if (!['www.facebook.com', 'facebook.com', 'web.facebook.com'].includes(url.hostname)) return null;
      const id = url.pathname.match(/^\/(?:marketplace\/inbox|messages(?:\/e2ee)?)\/t\/([^/?#]+)/)?.[1]
        || url.searchParams.get('thread_id');
      return id && /^[a-zA-Z0-9._:-]{1,120}$/.test(id) ? id : null;
    } catch { return null; }
  }

  function isComposer(element) {
    if (!visible(element) || !element.matches('textarea,[contenteditable="true"]')) return false;
    const label = norm([element.getAttribute('aria-label'), element.getAttribute('placeholder'), element.getAttribute('data-placeholder')].filter(Boolean).join(' '));
    return /mensaje|message|escrib|write/.test(label)
      && (!!element.closest('[role="dialog"]') || /\/messages|\/marketplace\/inbox/.test(location.pathname));
  }

  function selectedChat() {
    const editors = [...document.querySelectorAll('textarea,[contenteditable="true"]')].filter(isComposer);
    const composer = editors.find(element => element === document.activeElement)
      || editors.find(element => element === focused) || (editors.length === 1 ? editors[0] : null);
    if (!composer) throw Error('Selecciona el cuadro de mensaje del chat de Marketplace.');
    let scope = composer.closest('[role="dialog"]');
    if (!scope) {
      for (let parent = composer.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        const localEditors = [...parent.querySelectorAll('textarea,[contenteditable="true"]')].filter(isComposer);
        if (localEditors.length === 1 && parent.querySelector('a[href*="/marketplace/item/"]')) { scope = parent; break; }
      }
    }
    if (!scope) throw Error('No se pudo aislar el panel de esta conversación.');
    const scopedThreads = new Set([...scope.querySelectorAll('a[href]')].filter(visible).map(link => threadId(link.href)).filter(Boolean));
    if (scopedThreads.size > 1) throw Error('El panel contiene varias conversaciones. Abre el chat en la bandeja de mensajes.');
    // La URL identifica el destinatario solo si no hay otros editores abiertos.
    const conversationId = scopedThreads.size === 1 ? [...scopedThreads][0] : editors.length === 1 ? threadId(location.href) : null;
    if (!conversationId) throw Error('Facebook no muestra un identificador verificable del chat. Ábrelo en la bandeja de mensajes.');
    return { composer, scope, conversationId };
  }

  const currencyPattern = () => /(?:S\s*\/\.?\s*|PEN\s*)(\d[\d.,]*)/gi;
  function parseMoney(raw) {
    let value = String(raw).replace(/\s/g, '');
    if (!/^\d[\d.,]*$/.test(value)) return null;
    const comma = value.lastIndexOf(','), dot = value.lastIndexOf('.');
    if (comma >= 0 && dot >= 0) {
      const decimal = comma > dot ? ',' : '.';
      const thousands = decimal === ',' ? '.' : ',';
      value = value.split(thousands).join('').replace(decimal, '.');
    } else if (comma >= 0 || dot >= 0) {
      const separator = comma >= 0 ? ',' : '.';
      const parts = value.split(separator);
      if (parts.length > 1 && parts.slice(1).every(part => part.length === 3)) value = parts.join('');
      else if (parts.length === 2 && /^[0-9]{1,2}$/.test(parts[1])) value = parts.join('.');
      else return null;
    }
    const number = Number(value);
    return Number.isFinite(number) && number > 0 && number <= 999999999 ? String(number) : null;
  }

  function explicitSku(value) {
    const sku = clean(value).replace(/^MS[–—]/i, 'MS-');
    return /^(?:MS-\d+|[A-Z0-9][A-Z0-9._-]{0,99})$/i.test(sku) ? sku : null;
  }
  const skuKey = sku => /^(?:MS-)?\d+$/i.test(sku) ? sku.replace(/^MS-/i, '') : sku;
  function singleSku(values) {
    const candidates = new Map();
    for (const value of values) {
      const sku = explicitSku(value);
      if (sku) candidates.set(skuKey(sku), sku);
    }
    if (candidates.size > 1) throw Error('La publicación contiene varios SKU diferentes. No se enviará un producto arbitrario.');
    return [...candidates.values()][0] || null;
  }

  function skuFromFields(root, live = true) {
    const values = [];
    for (const element of [root, ...root.querySelectorAll('span,div,p,label,input,[itemprop="sku"],[data-sku]')]) {
      if (live && !visible(element)) continue;
      const text = clean(element.innerText || element.textContent);
      // Acepta la etiqueta y el valor repartidos en nodos, no solo un span.
      const labeled = text.length <= 120 && text.match(/^SKU\s*[:#]?\s*((?:MS-)?[A-Z0-9][A-Z0-9._-]{0,99})$/i);
      if (labeled) values.push(labeled[1]);
      if (element.hasAttribute('data-sku')) values.push(element.getAttribute('data-sku'));
      if (element.getAttribute('itemprop') === 'sku') values.push(element.getAttribute('content') || text);
      if (element.matches('input')) {
        const labels = [element.getAttribute('name'), element.getAttribute('aria-label'), element.getAttribute('placeholder'), ...[...(element.labels || [])].map(label => label.textContent)];
        if (labels.some(label => /^(?:seller[_ -]?)?sku\b/i.test(clean(label)))) values.push(element.value);
      }
      if (/^SKU(?:\s*\([^)]*\))?\s*[:#]?$/i.test(text)) {
        const parent = element.parentElement;
        if (parent && parent !== root.parentElement && clean(parent.textContent).length <= 140) {
          const input = parent.querySelector('input');
          if (input && (!live || visible(input))) values.push(input.value);
          else if (element.nextElementSibling) values.push(clean(element.nextElementSibling.textContent));
        }
      }
    }
    return singleSku(values);
  }

  function skuFromListingData(doc, id) {
    const values = [];
    const skuFields = ['seller_sku', 'sellerSKU', 'stock_keeping_unit', 'custom_sku', 'sku'];
    const read = object => {
      for (const name of skuFields) {
        const value = object?.[name];
        if (typeof value === 'string' || typeof value === 'number') values.push(String(value));
        else if (value && typeof value === 'object') {
          if (typeof value.value === 'string') values.push(value.value);
          if (typeof value.text === 'string') values.push(value.text);
        }
      }
    };
    // El HTML de Facebook puede contener recomendaciones con sus propios SKU.
    // Solo lee campos del objeto cuyo ID coincide exactamente con este anuncio.
    let remaining = 150000;
    for (const script of doc.querySelectorAll('script[type="application/json"],script[type="application/ld+json"]')) {
      let data;
      try { data = JSON.parse(script.textContent.replace(/^for\s*\(;;\);\s*/, '')); } catch { continue; }
      const stack = [data];
      while (stack.length && remaining-- > 0) {
        const object = stack.pop();
        if (!object || typeof object !== 'object') continue;
        if (['id', 'listing_id', 'marketplace_listing_id'].some(key => String(object[key] ?? '') === id)) {
          read(object);
          for (const key of ['listing_details', 'inventory']) {
            const child = object[key];
            if (child && typeof child === 'object' && !['id', 'listing_id', 'marketplace_listing_id'].some(name => child[name] != null && String(child[name]) !== id)) read(child);
          }
        }
        for (const value of Object.values(object)) if (value && typeof value === 'object') stack.push(value);
      }
      if (remaining <= 0) throw Error('Los datos de la publicación son demasiado grandes para verificar el SKU.');
    }
    // Marcado explícitamente asociado al ID; nunca doc.body ni todos los spans.
    for (const element of doc.querySelectorAll('[data-listing-id],[itemscope][itemid]')) {
      if (element.getAttribute('data-listing-id') === id || listingId(element.getAttribute('itemid')) === id) {
        const foreignIds = [...element.querySelectorAll('[data-listing-id],[itemscope][itemid]')]
          .map(child => child.getAttribute('data-listing-id') || listingId(child.getAttribute('itemid'))).filter(Boolean);
        if (foreignIds.some(other => other !== id)) continue;
        const sku = skuFromFields(element, false);
        if (sku) values.push(sku);
      }
    }
    return singleSku(values);
  }

  async function readListingSku(chat) {
    if (chat.sku) return chat.sku;
    const loaded = skuFromListingData(document, chat.listingId);
    if (loaded) return loaded;
    show('Leyendo el SKU dentro de la publicación asociada a este chat…');
    let html;
    try {
      const response = await fetch(`${location.origin}/marketplace/item/${chat.listingId}/`, {
        credentials: 'include', redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(12000),
      });
      if (!response.ok || listingId(response.url) !== chat.listingId) throw Error('Facebook no devolvió la publicación solicitada.');
      html = await response.text();
    } catch (error) {
      console.info(DEBUG, 'No se pudo consultar la publicación del anuncio.', error.message);
      return null;
    }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return skuFromListingData(doc, chat.listingId);
  }

  function getListingContext(scope) {
    const links = [...scope.querySelectorAll('a[href*="/marketplace/item/"]')].filter(visible);
    const ids = new Set(links.map(link => listingId(link.href)).filter(Boolean));
    if (ids.size !== 1) throw Error(ids.size ? 'Hay varios anuncios en este chat; no se elegirá uno arbitrariamente.' : 'Facebook no muestra un enlace al anuncio de este chat.');
    const id = [...ids][0];
    const anchor = links.find(link => listingId(link.href) === id);
    // Nunca usar el texto de todo el chat ni HTML de páginas/recomendaciones.
    let card = anchor;
    const article = anchor.closest('article,[role="article"]');
    if (article && scope.contains(article) && !article.contains(scope) && !article.querySelector('textarea,[contenteditable="true"]') && clean(article.textContent).length <= 900) card = article;
    else {
      for (let i = 0, parent = anchor.parentElement; i < 2 && parent && parent !== scope; i++, parent = parent.parentElement) {
        if (parent.querySelector('textarea,[contenteditable="true"]') || clean(parent.textContent).length > 900) break;
        const parentIds = new Set([...parent.querySelectorAll('a[href*="/marketplace/item/"]')].map(link => listingId(link.href)).filter(Boolean));
        if (parentIds.size !== 1 || !parentIds.has(id)) break;
        card = parent;
      }
    }
    const sku = skuFromFields(card);
    if (sku) return { listingId: id, sku };
    const prices = new Set([...clean(card.textContent).matchAll(currencyPattern())].map(match => parseMoney(match[1])).filter(Boolean));
    const missingReason = prices.size > 1 ? 'El anuncio muestra varios precios.' : 'Facebook no muestra un precio verificable del anuncio.';
    const titleText = value => clean(value).replace(currencyPattern(), '').trim();
    // Estructura observada en el HTML real de Messenger: un span dir=auto
    // contiene «PEN2,699 - Remato ...»; los otros son Marketplace y View buyer.
    const bannerTitles = [...anchor.querySelectorAll('span[dir="auto"]')].filter(visible)
      .map(element => clean(element.textContent))
      .filter(value => /^(?:S\s*\/\.?\s*|PEN\s*)\d[\d.,]*\s*[-–—:]\s*\S/i.test(value))
      .map(value => value.replace(/^(?:S\s*\/\.?\s*|PEN\s*)\d[\d.,]*\s*[-–—:]\s*/i, ''));
    const tiers = [
      bannerTitles,
      [...card.querySelectorAll('h1,h2,h3,[role="heading"]')].filter(visible).map(element => element.textContent),
      [anchor.getAttribute('aria-label'), anchor.getAttribute('title')],
      [anchor.textContent], [anchor.querySelector('img')?.alt],
    ];
    let title;
    for (const tier of tiers) {
      const titles = [...new Set(tier.map(titleText).filter(value => value.length >= 8 && value.length <= 300 && !/^(marketplace|messenger|facebook|ver anuncio|ver publicación)$/i.test(value)))];
      if (titles.length > 1) return { listingId: id, missingReason: 'No se pudo obtener un título único del anuncio.' };
      if (titles.length === 1) { title = titles[0]; break; }
    }
    return { listingId: id, title, price: prices.size === 1 ? [...prices][0] : undefined,
      missingReason: !title ? 'Facebook no muestra el título verificable del anuncio.' : prices.size !== 1 ? missingReason : undefined };
  }

  function snapshot() {
    if (!scriptActive) throw Error('El script se actualizó durante la consulta. Vuelve a pulsar 🔗.');
    const chat = selectedChat();
    return { ...chat, ...getListingContext(chat.scope), navigation: location.pathname + location.search };
  }
  const fingerprint = chat => JSON.stringify([chat.conversationId, chat.listingId, chat.sku || '', chat.title || '', chat.price || '', chat.navigation]);
  function assertSameChat(original) {
    const current = snapshot();
    if (current.composer !== original.composer || fingerprint(current) !== fingerprint(original)) throw Error('Cambió la conversación o el anuncio. No se enviará el mensaje.');
    return current;
  }

  function resolveProduct(chat, popup, nonce) {
    const query = chat.sku ? { sku: chat.sku } : { title: chat.title, price: chat.price };
    return new Promise((resolve, reject) => {
      let requested = false;
      const cleanup = () => { clearTimeout(timeout); clearInterval(closedTimer); window.removeEventListener('message', receive); };
      const receive = event => {
        if (event.origin !== SITE || event.source !== popup || event.data?.nonce !== nonce) return;
        if (event.data.type === 'MACSO_RESOLVER_READY' && !requested) {
          requested = true;
          show('Sesión de administrador comprobada. Consultando el producto…');
          popup.postMessage({ type: 'MACSO_RESOLVE', nonce, query }, SITE);
        } else if (event.data.type === 'MACSO_RESOLVED' && requested) {
          cleanup();
          const { status, body } = event.data;
          if (status !== 200 || body?.found !== true) {
            const errors = { 400: 'Los datos visibles del anuncio no son válidos para la API.', 401: 'Inicia sesión como administrador en Macsomenos y vuelve a pulsar 🔗.', 403: 'Esta función está habilitada únicamente para el administrador.', 404: 'El SKU o el título completo/precio no identifican un producto publicado. No se enviará un enlace.', 409: 'Hay varias coincidencias compatibles. No se enviará un producto arbitrario.', 429: 'Se alcanzó el límite de consultas. Espera un minuto.' };
            reject(Error(errors[status] || 'No se pudo consultar el resolver. Comprueba que la nueva API esté desplegada.'));
          } else resolve(body.product);
        }
      };
      const timeout = setTimeout(() => { cleanup(); reject(Error('El resolver no respondió. Comprueba que esté desplegado, inicia sesión como ADMIN y vuelve a pulsar 🔗. El navegador también puede aislar la ventana de Facebook.')); }, 60000);
      const closedTimer = setInterval(() => { if (popup.closed) { cleanup(); reject(Error('Se cerró la ventana del resolver antes de completar la consulta.')); } }, 500);
      window.addEventListener('message', receive);
    });
  }

  function setChatText(element, content) {
    element.focus();
    if (element instanceof HTMLTextAreaElement) {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      if (!setter) throw Error('No se pudo escribir en Facebook.');
      setter.call(element, content);
      element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: content }));
    } else {
      const range = document.createRange(), selection = window.getSelection();
      range.selectNodeContents(element); selection.removeAllRanges(); selection.addRange(range);
      if (!document.execCommand('insertText', false, content)) throw Error('Facebook no aceptó el texto.');
    }
  }

  async function sendChat(chat, content, ref) {
    const current = assertSameChat(chat);
    if (!isComposer(current.composer) || currentText(current.composer)) throw Error('El chat tiene un borrador o se cerró.');
    const sent = stored(SENT, {});
    if (sent[ref]) throw Error('Ya se registró un envío o intento para esta conversación y anuncio.');
    sent[ref] = { status: 'attempted', time: Date.now() };
    persist(SENT, sent);
    setChatText(current.composer, content);
    await pause(180);
    assertSameChat(chat);
    if (currentText(chat.composer) !== clean(content)) throw Error('Facebook modificó el borrador. No se envió.');
    const buttons = [...chat.scope.querySelectorAll('button,[role="button"]')].filter(element => {
      const label = norm([element.getAttribute('aria-label'), element.getAttribute('title')].filter(Boolean).join(' '));
      return visible(element) && !element.disabled && element.getAttribute('aria-disabled') !== 'true' && /^(enviar|send)( mensaje| message)?$/.test(label);
    });
    if (buttons.length > 1) throw Error('Hay varios botones de envío. El mensaje quedó como borrador.');
    // Una sola acción de envío. Nunca reintentar con un clic después de Enter.
    if (buttons.length === 1) buttons[0].click();
    else {
      chat.composer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
      chat.composer.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    }
    await pause(650);
    assertSameChat(chat);
    if (currentText(chat.composer)) throw Error('Facebook no confirmó el envío. Revisa el borrador y el chat; no se reintentará automáticamente.');
    sent[ref] = { status: 'sent', time: Date.now() };
    persist(SENT, sent);
  }

  function show(text, error = false) {
    let element = document.getElementById(STATUS);
    if (!element) {
      element = document.createElement('div'); element.id = STATUS; element.setAttribute('role', 'status');
      element.style.cssText = 'position:fixed;right:80px;bottom:147px;max-width:380px;padding:12px;z-index:2147483647;background:#175cd3;color:#fff;border-radius:10px;font:13px Arial,sans-serif;box-shadow:0 8px 20px #0004;white-space:pre-wrap';
      document.body.appendChild(element);
    }
    clearTimeout(statusTimer); element.style.background = error ? '#b42318' : '#175cd3'; element.textContent = text;
    if (error) statusTimer = setTimeout(() => element.remove(), 14000);
  }

  async function onPress(event) {
    if (!event.isTrusted || busy) return;
    busy = true;
    const button = document.getElementById(BUTTON);
    button.disabled = true; button.textContent = '…';
    let popup;
    try {
      const chat = snapshot();
      if (currentText(chat.composer)) throw Error('El chat contiene un borrador que no se reemplazará.');
      const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
      // Primera operación antes de cualquier await: conserva el permiso del clic.
      popup = window.open(`${SITE}/servmacso10/marketplace-resolver#${nonce}`, '_blank', 'popup,width=560,height=440');
      if (!popup) throw Error('Permite las ventanas emergentes de Macsomenos y vuelve a pulsar 🔗.');
      const sku = await readListingSku(chat);
      assertSameChat(chat);
      if (!sku && chat.missingReason) throw Error(`Facebook no expuso el SKU del anuncio ${chat.listingId} en la publicación. ${chat.missingReason} No se enviará un enlace.`);
      show('Consultando el anuncio mediante tu sesión ADMIN de Macsomenos…');
      const product = await resolveProduct(sku ? { ...chat, sku } : chat, popup, nonce);
      if (!product || typeof product.sku !== 'string' || !product.sku || product.available !== true || !['available', 'preorder'].includes(product.availability)) throw Error('El producto no está disponible: está vendido, reservado o la respuesta no es válida.');
      const url = new URL(product.url);
      if (url.origin !== SITE || !/^\/product\/[^/]+$/.test(url.pathname) || url.search || url.hash || url.username || url.password) throw Error('El resolver devolvió una URL de producto no válida.');
      const current = assertSameChat(chat);
      if (clean(current.scope.textContent).includes(url.href)) throw Error('Este enlace ya aparece en la conversación.');
      const ref = `${chat.listingId}|${chat.conversationId}|${product.sku}`;
      if (stored(SENT, {})[ref]) throw Error('Ya se registró un envío o intento para esta conversación y producto.');
      const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
      const greeting = hour >= 5 && hour < 12 ? 'Buenos días' : hour >= 12 && hour < 19 ? 'Buenas tardes' : 'Buenas noches';
      show(`SKU ${product.sku} verificado. Enviando al chat seleccionado…`);
      await sendChat(chat, `${greeting}, aquí le dejo el link de mi catálogo donde podrá ver más fotos y detalles del equipo:\n\n${url.href}`, ref);
      show(`El cuadro de mensaje quedó vacío tras el envío. SKU ${product.sku}\n${url.href}\nComprueba la entrega en Facebook.`);
      statusTimer = setTimeout(() => document.getElementById(STATUS)?.remove(), 9000);
    } catch (error) {
      show(error?.message || 'No se pudo resolver el anuncio.', true); console.warn(DEBUG, error);
    } finally {
      if (popup && !popup.closed) popup.close();
      busy = false; button.disabled = false; button.textContent = '🔗';
      mountButton();
    }
  }

  const buttonStyle = 'all:initial!important;position:fixed!important;inset:auto 18px 146px auto!important;display:flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important;width:54px!important;height:54px!important;min-width:54px!important;min-height:54px!important;max-width:54px!important;max-height:54px!important;margin:0!important;padding:0!important;border-radius:50%!important;border:0!important;background:#1877f2!important;color:#fff!important;font:bold 22px Arial,sans-serif!important;line-height:1!important;z-index:2147483647!important;box-shadow:0 8px 22px #0006!important;cursor:pointer!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;transform:none!important;filter:none!important;clip:auto!important;clip-path:none!important;overflow:visible!important;transition:none!important;animation:none!important';
  let canonicalButtonStyle;
  function mountButton() {
    if (!scriptActive || !document.documentElement) return;
    let button = document.getElementById(BUTTON);
    if (!button || button.dataset.macsoChatVersion !== VERSION) {
      const previous = button;
      button = document.createElement('button');
      button.id = BUTTON; button.type = 'button';
      button.dataset.macsoChatVersion = VERSION;
      button.title = `Enviar enlace del equipo en este chat · Solo ADMIN · v${VERSION}`;
      button.setAttribute('aria-label', 'Enviar enlace del catálogo de Macsomenos');
      button.addEventListener('click', onPress);
      if (previous) previous.replaceWith(button); // Descarta listeners de una versión obsoleta.
    }
    // Fuera del árbol que React sustituye al navegar; no depende del body del chat.
    if (button.parentElement !== document.documentElement) document.documentElement.appendChild(button);
    if (!canonicalButtonStyle || button.style.cssText !== canonicalButtonStyle) {
      button.style.cssText = buttonStyle;
      canonicalButtonStyle = button.style.cssText;
    }
    if (button.hidden) button.hidden = false;
    if (button.hasAttribute('inert')) button.removeAttribute('inert');
    if (button.hasAttribute('aria-hidden')) button.removeAttribute('aria-hidden');
    if (button.disabled !== busy) button.disabled = busy;
    if (button.textContent !== (busy ? '…' : '🔗')) button.textContent = busy ? '…' : '🔗';
  }

  function init() {
    document.dispatchEvent(new CustomEvent('macsomenos:chat-script-replaced'));
    mountButton();
    const rememberFocus = event => { if (isComposer(event.target)) focused = event.target; };
    document.addEventListener('focusin', rememberFocus, true);
    let queued = false;
    const repair = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; mountButton(); });
    };
    const observer = new MutationObserver(records => {
      const button = document.getElementById(BUTTON);
      if (!button || records.some(record => record.target === button || record.target === document.documentElement || record.target === document.body)) repair();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden', 'inert', 'aria-hidden'] });
    window.addEventListener('pageshow', repair);
    window.addEventListener('popstate', repair);
    window.addEventListener('resize', repair);
    document.addEventListener('macsomenos:chat-script-replaced', () => {
      scriptActive = false;
      observer.disconnect();
      document.removeEventListener('focusin', rememberFocus, true);
      window.removeEventListener('pageshow', repair);
      window.removeEventListener('popstate', repair);
      window.removeEventListener('resize', repair);
      document.getElementById(BUTTON)?.remove();
    }, { once: true });
    console.info(DEBUG, 'Activo. Solo consulta y envía después de un clic real en 🔗.');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
