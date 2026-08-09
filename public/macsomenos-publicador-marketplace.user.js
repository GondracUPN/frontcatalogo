// ==UserScript==
// @name         MacsoMenos - Publicador de Facebook Marketplace
// @namespace    macsomenos-marketplace
// @version      4.4.1
// @description  Recupera productos preparados desde MacsoMenos y rellena Facebook Marketplace sin publicar
// @match        https://www.facebook.com/*
// @match        https://facebook.com/*
// @match        https://*.facebook.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @connect      127.0.0.1
// @connect      localhost
// @connect      backcatalogo.onrender.com
// @connect      *
// @run-at       document-start
// @noframes
// ==/UserScript==

(function () {
  "use strict";

  const API_BASES = [
    "https://backcatalogo.onrender.com",
    "http://127.0.0.1:3101",
    "http://localhost:3101",
  ];
  const CACHE_KEY = "macsomenos_marketplace_product_v4";
  const FACEBOOK_CREATE_URL = "https://www.facebook.com/marketplace/create/item";
  const OPEN_AFTER_NAVIGATION_KEY = "macsomenos_marketplace_open_after_navigation";
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  async function waitFor(factory, timeout = 1500, interval = 50) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
      const result = factory();
      if (result) return result;
      await sleep(interval);
    }
    return null;
  }
  const normalize = (value) => String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim().toLowerCase();
  const escapeHtml = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  const visible = (element) => {
    if (!element) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  };

  function requestJson(url) {
    return new Promise((resolve, reject) => {
      const requester = typeof GM_xmlhttpRequest === "function"
        ? GM_xmlhttpRequest
        : (typeof GM !== "undefined" && typeof GM.xmlHttpRequest === "function" ? GM.xmlHttpRequest.bind(GM) : null);
      if (!requester) {
        reject(new Error("Tampermonkey no habilitó GM_xmlhttpRequest"));
        return;
      }
      const details = {
        method: "GET",
        url,
        headers: { Accept: "application/json" },
        timeout: 45000,
        onload(response) {
          if (response.status < 200 || response.status >= 300) {
            reject(new Error(`Backend respondió ${response.status}`));
            return;
          }
          try { resolve(JSON.parse(response.responseText)); }
          catch { reject(new Error("Respuesta inválida del backend")); }
        },
        onerror: (response) => reject(new Error(`No se pudo conectar con ${url}${response?.error ? `: ${response.error}` : ""}`)),
        ontimeout: () => reject(new Error("El backend tardó demasiado en responder")),
      };
      try {
        const result = requester(details);
        if (result && typeof result.catch === "function") result.catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  function requestImage(url) {
    return new Promise((resolve, reject) => {
      const requester = typeof GM_xmlhttpRequest === "function"
        ? GM_xmlhttpRequest
        : (typeof GM !== "undefined" && typeof GM.xmlHttpRequest === "function" ? GM.xmlHttpRequest.bind(GM) : null);
      if (!requester) {
        reject(new Error("Tampermonkey no habilitó la descarga de imágenes"));
        return;
      }
      const details = {
        method: "GET",
        url,
        responseType: "blob",
        timeout: 20000,
        onload(response) {
          if (response.status < 200 || response.status >= 300) {
            reject(new Error(`Imagen respondió ${response.status}`));
            return;
          }
          const contentType = String(response.responseHeaders || "").match(/content-type:\s*([^;\r\n]+)/i)?.[1] || "image/jpeg";
          const blob = response.response instanceof Blob ? response.response : new Blob([response.response], { type: contentType });
          if (!blob.size) {
            reject(new Error("Imagen vacía"));
            return;
          }
          resolve({ blob, contentType });
        },
        onerror: () => reject(new Error(`No se pudo descargar ${url}`)),
        ontimeout: () => reject(new Error(`Tiempo agotado descargando ${url}`)),
      };
      try {
        const result = requester(details);
        if (result && typeof result.catch === "function") result.catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  async function loadLatestFromBackend() {
    let lastError = null;
    for (const base of API_BASES) {
      try {
        const response = await requestJson(`${base}/marketplace-bridge/latest`);
        if (!response?.data) throw new Error("El backend no devolvió el producto");
        await Promise.resolve(GM_setValue(CACHE_KEY, response.data));
        return response.data;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("No se pudo recuperar el producto desde el backend de MacsoMenos");
  }

  function relatedText(element) {
    const values = [element?.getAttribute?.("aria-label"), element?.getAttribute?.("placeholder"), element?.closest?.("label")?.textContent];
    let parent = element?.parentElement;
    for (let level = 0; parent && level < 3; level += 1, parent = parent.parentElement) {
      const value = String(parent.textContent || "");
      if (value.length < 250) values.push(value);
    }
    return normalize(values.filter(Boolean).join(" "));
  }

  function findControlInExactLabel(name, selector) {
    const expected = normalize(name);
    const labels = [...document.querySelectorAll("label")].filter(visible);
    for (const label of labels) {
      const namedElement = [...label.querySelectorAll("span")]
        .find((span) => normalize(span.textContent) === expected);
      if (!namedElement) continue;
      const control = label.querySelector(selector);
      if (control && visible(control)) return control;
    }
    return null;
  }

  function findField(name, selector) {
    const expected = normalize(name);
    const exactLabelControl = findControlInExactLabel(name, selector);
    if (exactLabelControl) return exactLabelControl;
    const fields = [...document.querySelectorAll(selector)].filter(visible);
    return fields.find((field) => normalize(field.getAttribute("aria-label")) === expected || normalize(field.getAttribute("placeholder")) === expected)
      || fields.find((field) => relatedText(field).includes(expected))
      || null;
  }

  const findInput = (name) => findField(name, 'input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])');
  const findTextArea = (name) => findField(name, 'textarea,[contenteditable="true"]');

  function setInput(input, value) {
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) return false;
    input.focus();
    setter.call(input, String(value ?? ""));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function setTextArea(field, value) {
    if (!field) return false;
    const content = String(value ?? "");
    field.focus();
    if (field.getAttribute("contenteditable") === "true") {
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, content);
      field.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    if (!setter) return false;
    setter.call(field, content);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  async function openMoreDetails() {
    const text = [...document.querySelectorAll('span,div,button,[role="button"]')]
      .filter(visible).find((element) => normalize(element.textContent) === "mas detalles");
    if (!text) return false;
    const button = text.closest('button,[role="button"]') || text;
    if (button.getAttribute("aria-expanded") !== "true") {
      button.click();
      await waitFor(() => findTextArea("Descripción") || findTextArea("Descripcion") || findControlInExactLabel("Etiquetas de productos", "textarea"), 1200);
    }
    return true;
  }

  function findSelect(name) {
    const expected = normalize(name);
    const candidates = [...document.querySelectorAll('[role="combobox"],[aria-haspopup="listbox"],[aria-haspopup="menu"]')].filter(visible);
    return candidates.find((element) => String(element.getAttribute("aria-labelledby") || "").split(/\s+/).some((id) => normalize(document.getElementById(id)?.textContent) === expected))
      || candidates.find((element) => normalize(element.getAttribute("aria-label")).includes(expected))
      || candidates.find((element) => relatedText(element).includes(expected))
      || null;
  }

  async function selectOption(fieldName, values) {
    const select = findSelect(fieldName);
    if (!select) return false;
    const currentText = normalize(select.textContent);
    const normalizedValues = values.map(normalize).filter(Boolean);
    if (normalizedValues.some((value) => currentText.includes(value))) return true;
    select.click();
    const expected = normalizedValues;
    const option = await waitFor(() => {
      const options = [...document.querySelectorAll('[role="option"],[role="menuitem"],[role="menuitemradio"],[role="radio"],span,div')].filter(visible);
      return options.find((element) => expected.includes(normalize(element.textContent)))
        || options.find((element) => expected.some((value) => normalize(element.textContent).startsWith(value)));
    }, 1400);
    if (!option) return false;
    (option.closest('[role="option"],[role="menuitem"],[role="menuitemradio"],[role="radio"],button,[role="button"]') || option).click();
    await sleep(120);
    return true;
  }

  async function fillTags(tags) {
    if (!Array.isArray(tags) || !tags.length) return 0;
    let input = findControlInExactLabel("Etiquetas de productos", "textarea,input,[contenteditable=\"true\"]")
      || findControlInExactLabel("Etiquetas del producto", "textarea,input,[contenteditable=\"true\"]")
      || findControlInExactLabel("Etiquetas de producto", "textarea,input,[contenteditable=\"true\"]")
      || findControlInExactLabel("Product tags", "textarea,input,[contenteditable=\"true\"]");
    if (!input) {
      const label = [...document.querySelectorAll('label,span,div')]
        .filter(visible)
        .find((element) => {
          const value = normalize(element.textContent);
          return value.includes("etiqueta") && value.length < 100;
        });
      let container = label;
      for (let level = 0; container && level < 5 && !input; level += 1, container = container.parentElement) {
        input = container.querySelector?.('textarea,input:not([type="hidden"]),[contenteditable="true"]') || null;
      }
    }
    if (!input) return 0;
    const tagLabel = input.closest("label");
    const tagList = tagLabel?.querySelector('[role="list"]');
    let inserted = 0;
    for (const tag of tags) {
      const cleanTag = String(tag || "").trim();
      if (!cleanTag) continue;
      const beforeCount = tagList?.children?.length ?? 0;
      input.focus();
      if (input.getAttribute?.("contenteditable") === "true") {
        document.execCommand("selectAll", false, null);
        document.execCommand("insertText", false, cleanTag);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      } else if (input instanceof HTMLTextAreaElement) {
        setTextArea(input, cleanTag);
      } else {
        setInput(input, cleanTag);
      }
      await sleep(40);
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keypress", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
      await sleep(120);
      const afterCount = tagList?.children?.length ?? 0;
      const currentValue = input.getAttribute?.("contenteditable") === "true" ? String(input.textContent || "").trim() : String(input.value || "").trim();
      if (afterCount > beforeCount || !currentValue) {
        inserted += 1;
        continue;
      }
      const expected = normalize(cleanTag);
      const suggestion = [...document.querySelectorAll('[role="option"],[role="menuitem"]')]
        .filter(visible)
        .find((element) => normalize(element.textContent) === expected);
      if (suggestion) {
        suggestion.click();
        await sleep(80);
        inserted += 1;
      }
    }
    return inserted;
  }

  async function fillBrand() {
    const input = findControlInExactLabel("Marca", "input") || findControlInExactLabel("Brand", "input");
    if (input) {
      setInput(input, "Apple");
      const appleOption = await waitFor(() => [...document.querySelectorAll('[role="option"],[role="menuitem"],[role="button"],span,div')]
        .filter(visible)
        .find((element) => normalize(element.textContent) === "apple"), 600);
      if (appleOption) {
        (appleOption.closest('[role="option"],[role="menuitem"],[role="button"],button') || appleOption).click();
        await sleep(80);
      }
      return true;
    }
    return selectOption("Marca", ["Apple"]);
  }

  function imageFileName(url, index, contentType) {
    const extensionByType = { "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/heic": "heic", "image/heif": "heif" };
    let sourceName = "";
    try { sourceName = decodeURIComponent(new URL(url).pathname.split("/").pop() || "").replace(/[^a-zA-Z0-9._-]/g, "-"); }
    catch {}
    if (/\.(?:jpe?g|png|webp|gif|heic|heif)$/i.test(sourceName)) return `${index + 1}-${sourceName}`;
    return `producto-${index + 1}.${extensionByType[String(contentType).toLowerCase()] || "jpg"}`;
  }

  async function fillImages(imageUrls) {
    const urls = Array.from(new Set((Array.isArray(imageUrls) ? imageUrls : []).map((url) => String(url || "").trim()).filter(Boolean)));
    if (!urls.length) return { uploaded: 0, total: 0 };
    const downloaded = new Array(urls.length);
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < urls.length) {
        const index = nextIndex++;
        try {
          downloaded[index] = await requestImage(urls[index]);
        } catch (error) {
          console.warn("[MacsoMenos Marketplace] Foto omitida:", urls[index], error);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, urls.length) }, () => worker()));
    const input = [...document.querySelectorAll('input[type="file"]')]
      .find((element) => element.multiple && normalize(element.getAttribute("accept")).includes("image"));
    if (!input) return { uploaded: 0, total: urls.length };
    const transfer = new DataTransfer();
    downloaded.forEach((download, index) => {
      if (!download) return;
      const { blob, contentType } = download;
      transfer.items.add(new File([blob], imageFileName(urls[index], index, contentType), { type: contentType || blob.type || "image/jpeg", lastModified: Date.now() }));
    });
    if (!transfer.files.length) return { uploaded: 0, total: urls.length };
    input.files = transfer.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await waitFor(() => [...document.querySelectorAll('[role="status"]')].some((element) => /\d+\s+fotos?\s+adjuntas?/i.test(String(element.textContent || ""))), 2500, 100);
    return { uploaded: transfer.files.length, total: urls.length };
  }

  async function fillFacebook(product) {
    const results = [];
    const photosPromise = fillImages(product.images);
    results.push(setInput(findInput("Título"), product.titulo) ? "Título ✅" : "Título ❌");
    await sleep(80);
    results.push(setInput(findInput("Precio"), product.precio) ? "Precio ✅" : "Precio ❌");
    await sleep(100);
    const category = await selectOption("Categoría", ["Electrónica e informática"]);
    results.push(category ? "Categoría ✅" : "Categoría ⚠️");
    await sleep(120);
    const brand = await fillBrand();
    results.push(brand ? "Marca: Apple ✅" : "Marca: Apple ⚠️");
    const isNew = normalize(product.estadoMarketplace).includes("nuevo") && !normalize(product.estadoMarketplace).includes("usado");
    const condition = await selectOption("Estado", isNew ? ["Nuevo"] : ["Usado: como nuevo", "Usado - Como nuevo", "Usado como nuevo"]);
    results.push(condition ? "Estado ✅" : "Estado ⚠️");
    await openMoreDetails();
    const skuInput = findInput("SKU") || findInput("Número de SKU") || findInput("Numero de SKU");
    results.push(setInput(skuInput, product.sku) ? "SKU ✅" : "SKU ⚠️");
    await sleep(80);
    results.push(setTextArea(findTextArea("Descripción") || findTextArea("Descripcion"), product.descripcion) ? "Descripción ✅" : "Descripción ❌");
    const insertedTags = await fillTags(product.etiquetas);
    results.push(insertedTags > 0 ? `Etiquetas ${insertedTags}/${product.etiquetas.length} ✅` : "Etiquetas ⚠️");
    const photos = await photosPromise;
    results.unshift(photos.total === 0 ? "Fotos: no recibidas ⚠️" : photos.uploaded > 0 ? `Fotos ${photos.uploaded}/${photos.total} ✅` : "Fotos ❌");
    return results;
  }

  let lastChatComposer = null;
  let chatButtonUpdateTimer = null;

  function composerText(composer) {
    if (!composer) return "";
    return String("value" in composer ? composer.value : composer.textContent || "").trim();
  }

  function isChatComposer(element) {
    if (!(element instanceof HTMLElement) || !visible(element)) return false;
    if (!element.matches('textarea, [contenteditable="true"][role="textbox"]')) return false;
    const description = normalize([
      element.getAttribute("aria-label"),
      element.getAttribute("placeholder"),
      element.getAttribute("data-lexical-editor"),
    ].filter(Boolean).join(" "));
    const chatLocation = location.pathname.includes("/messages") || location.pathname.includes("/marketplace/inbox");
    const insideDialog = Boolean(element.closest('[role="dialog"]'));
    const messageLabel = /mensaje|message|escribe|write/.test(description);
    return messageLabel && (insideDialog || chatLocation);
  }

  function findOpenChatComposer() {
    if (isChatComposer(lastChatComposer) && lastChatComposer.isConnected) return lastChatComposer;
    if (isChatComposer(document.activeElement)) return document.activeElement;
    const candidates = [...document.querySelectorAll('textarea, [contenteditable="true"][role="textbox"]')]
      .filter(isChatComposer)
      .sort((left, right) => right.getBoundingClientRect().right - left.getBoundingClientRect().right);
    return candidates[0] || null;
  }

  function setComposerText(composer, message) {
    composer.focus();
    if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
      const prototype = composer instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      if (setter) setter.call(composer, message);
      else composer.value = message;
      composer.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: message }));
      composer.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(composer);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("insertText", false, message);
  }

  async function sendOneChatMessage(composer, message) {
    setComposerText(composer, message);
    await sleep(180);
    if (composerText(composer) === `${message}${message}`) {
      composer.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(composer);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand("insertText", false, message);
      await sleep(120);
    }
    if (composerText(composer) !== message) {
      throw new Error("Facebook duplicó o modificó el texto antes de enviarlo");
    }
    const enterOptions = { bubbles: true, cancelable: true, key: "Enter", code: "Enter", keyCode: 13, which: 13 };
    composer.dispatchEvent(new KeyboardEvent("keydown", enterOptions));
    composer.dispatchEvent(new KeyboardEvent("keyup", enterOptions));
    const cleared = await waitFor(() => !composerText(composer), 1800, 60);
    if (cleared) return true;

    const scope = composer.closest('[role="dialog"]') || document;
    const sendButton = [...scope.querySelectorAll('button, [role="button"]')].find((button) => {
      if (!visible(button)) return false;
      const label = normalize(`${button.getAttribute("aria-label") || ""} ${button.getAttribute("title") || ""}`);
      return label === "enviar" || label === "send" || label.startsWith("enviar mensaje") || label.startsWith("send message");
    });
    if (!sendButton) throw new Error("Facebook no permitió enviar el mensaje");
    sendButton.click();
    return Boolean(await waitFor(() => !composerText(composer), 1200, 60));
  }

  function greetingForLocalTime() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Muy buenos dias";
    if (hour >= 12 && hour < 19) return "Muy buenas tardes";
    return "Muy buenas noches";
  }

  function showChatToast(message, isError = false) {
    document.getElementById("macsomenos-chat-toast")?.remove();
    const toast = document.createElement("div");
    toast.id = "macsomenos-chat-toast";
    toast.textContent = message;
    toast.style.cssText = `position:fixed;right:82px;bottom:92px;max-width:310px;z-index:2147483647;padding:10px 13px;border-radius:10px;background:${isError ? "#b42318" : "#067647"};color:#fff;font:600 13px Arial,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.3)`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), isError ? 5000 : 2500);
  }

  async function sendQuickChatReply(button) {
    let composer = findOpenChatComposer();
    if (!composer) throw new Error("Haz clic primero en el cuadro del chat que quieres responder");
    if (composerText(composer)) throw new Error("El chat tiene un borrador. Bórralo o envíalo antes de usar la respuesta rápida");
    const dialog = composer.closest('[role="dialog"]');
    const messages = [greetingForLocalTime(), "Si aun lo tengo disponible", "Le interesa?"];
    button.disabled = true;
    button.textContent = "…";
    for (let index = 0; index < messages.length; index += 1) {
      if (index > 0) {
        const nextComposer = await waitFor(() => {
          const candidate = dialog
            ? [...dialog.querySelectorAll('textarea, [contenteditable="true"][role="textbox"]')].find(isChatComposer)
            : findOpenChatComposer();
          return candidate || null;
        }, 1800, 60);
        if (!nextComposer) throw new Error("El chat se cerró antes de completar la respuesta");
        composer = nextComposer;
      }
      if (!(await sendOneChatMessage(composer, messages[index]))) throw new Error(`No se pudo enviar el mensaje ${index + 1}`);
      await sleep(1400);
    }
    showChatToast("Respuesta rápida enviada al chat abierto");
  }

  function updateQuickChatButton() {
    const composer = findOpenChatComposer();
    let button = document.getElementById("macsomenos-quick-chat");
    if (!composer) {
      button?.remove();
      return;
    }
    if (button) return;
    button = document.createElement("button");
    button.id = "macsomenos-quick-chat";
    button.type = "button";
    button.title = "Enviar respuesta rápida al chat abierto";
    button.setAttribute("aria-label", "Enviar tres mensajes de respuesta rápida al chat abierto");
    button.textContent = "💬3";
    button.style.cssText = "position:fixed;right:18px;bottom:82px;width:54px;height:54px;z-index:2147483647;border:0;border-radius:999px;background:#42b72a;color:#fff;font:bold 16px Arial,sans-serif;box-shadow:0 8px 25px rgba(0,0,0,.35);cursor:pointer;display:flex;align-items:center;justify-content:center";
    button.onclick = async () => {
      try { await sendQuickChatReply(button); }
      catch (error) { showChatToast(error instanceof Error ? error.message : "No se pudo enviar la respuesta", true); }
      finally {
        button.disabled = false;
        button.textContent = "💬3";
        updateQuickChatButton();
      }
    };
    document.body.appendChild(button);
  }

  function scheduleQuickChatButtonUpdate() {
    clearTimeout(chatButtonUpdateTimer);
    chatButtonUpdateTimer = setTimeout(updateQuickChatButton, 120);
  }

  document.addEventListener("focusin", (event) => {
    if (isChatComposer(event.target)) lastChatComposer = event.target;
    scheduleQuickChatButtonUpdate();
  }, true);

  function minimizePanel(panel) {
    if (!panel) return;
    panel.style.display = "none";
    const previousBall = document.getElementById("macsomenos-marketplace-ball");
    if (previousBall) previousBall.remove();
    const ball = document.createElement("button");
    ball.id = "macsomenos-marketplace-ball";
    ball.type = "button";
    ball.title = "Abrir publicador de Marketplace";
    ball.setAttribute("aria-label", "Abrir publicador de Marketplace");
    ball.textContent = "M";
    ball.style.cssText = "position:fixed;right:18px;bottom:18px;width:54px;height:54px;z-index:2147483647;border:0;border-radius:999px;background:#1877f2;color:#fff;font:bold 20px Arial,sans-serif;box-shadow:0 8px 25px rgba(0,0,0,.35);cursor:pointer;display:flex;align-items:center;justify-content:center";
    ball.onclick = () => {
      if (!location.pathname.includes("/marketplace/create/item")) {
        try { sessionStorage.setItem(OPEN_AFTER_NAVIGATION_KEY, "1"); }
        catch {}
        location.href = FACEBOOK_CREATE_URL;
        return;
      }
      ball.remove();
      panel.style.display = "block";
    };
    document.body.appendChild(ball);
  }

  function createPanel(product, error = "", startMinimized = false) {
    const previous = document.getElementById("macsomenos-marketplace-panel");
    if (previous) previous.remove();
    const previousBall = document.getElementById("macsomenos-marketplace-ball");
    if (previousBall) previousBall.remove();
    const panel = document.createElement("div");
    panel.id = "macsomenos-marketplace-panel";
    panel.style.cssText = "position:fixed;right:18px;bottom:18px;width:350px;max-height:82vh;overflow:auto;z-index:2147483647;padding:16px;border-radius:14px;background:#fff;color:#101828;font:14px Arial,sans-serif;box-shadow:0 8px 35px rgba(0,0,0,.35)";
    if (!product) {
      panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:10px"><div><strong style="font-size:17px">Publicador de Marketplace</strong><div style="margin-top:4px;color:#067647;font-size:11px;font-weight:bold">Tampermonkey activo · v4.4.1</div></div><button id="mm-minimize-empty" title="Minimizar" aria-label="Minimizar" style="width:32px;height:32px;border:0;border-radius:999px;background:#e4e6eb;font-size:22px;line-height:1;cursor:pointer">−</button></div>
        <p style="color:#b42318;line-height:1.5;word-break:break-word">${escapeHtml(error || "No se encontró un producto preparado.")}</p>
        <button id="mm-retry" style="width:100%;padding:10px;border:0;border-radius:8px;background:#1877f2;color:#fff;font-weight:700;cursor:pointer">Probar conexión con el backend</button>
        <div style="margin-top:8px;color:#667085;font-size:11px">Servidor: producción con respaldo local</div>`;
      document.body.appendChild(panel);
      document.getElementById("mm-minimize-empty").onclick = () => minimizePanel(panel);
      document.getElementById("mm-retry").onclick = async function () {
        this.disabled = true;
        this.textContent = "Conectando...";
        try { createPanel(await loadLatestFromBackend()); }
        catch (retryError) { createPanel(null, retryError instanceof Error ? retryError.message : "Conexión fallida"); }
      };
      if (startMinimized) minimizePanel(panel);
      return;
    }
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px"><div><strong style="font-size:17px">Publicador de Marketplace</strong><div style="margin-top:4px;color:#667085;font-size:12px">SKU: <strong>${escapeHtml(product.sku)}</strong></div></div><button id="mm-minimize" title="Minimizar" aria-label="Minimizar" style="width:32px;height:32px;line-height:1;border:0;border-radius:999px;background:#e4e6eb;font-size:22px;cursor:pointer">−</button></div>
      <div style="margin:12px 0;padding:10px;border-radius:9px;background:#f2f4f7;font-size:12px;line-height:1.5"><strong>Título</strong><br>${escapeHtml(product.titulo)}<br><br><strong>Precio</strong><br>S/ ${escapeHtml(product.precio)}</div>
      <button id="mm-fill" style="width:100%;padding:11px;border:0;border-radius:8px;background:#1877f2;color:#fff;font-weight:700;cursor:pointer">Rellenar Marketplace</button>
      <button id="mm-refresh" style="width:100%;margin-top:8px;padding:9px;border:0;border-radius:8px;background:#e4e6eb;cursor:pointer">Actualizar producto</button>
      <div id="mm-status" style="margin-top:12px;font-size:13px;line-height:1.6"></div>
      <div style="margin-top:10px;color:#667085;font-size:11px">El script nunca pulsa Publicar.</div>`;
    document.body.appendChild(panel);
    document.getElementById("mm-minimize").onclick = () => minimizePanel(panel);
    document.getElementById("mm-refresh").onclick = async function () {
      const status = document.getElementById("mm-status");
      this.disabled = true;
      this.textContent = "Buscando producto nuevo...";
      status.textContent = "Consultando el backend...";
      try { createPanel(await loadLatestFromBackend()); }
      catch (refreshError) {
        this.disabled = false;
        this.textContent = "Actualizar producto";
        status.textContent = refreshError instanceof Error ? refreshError.message : "No se pudo actualizar";
      }
    };
    document.getElementById("mm-fill").onclick = async function () {
      const status = document.getElementById("mm-status");
      this.disabled = true;
      this.textContent = "Rellenando...";
      try { status.innerHTML = (await fillFacebook(product)).map(escapeHtml).join("<br>"); }
      catch (fillError) { status.textContent = fillError instanceof Error ? fillError.message : "Error rellenando Facebook"; }
      finally { this.disabled = false; this.textContent = "Rellenar Marketplace"; }
    };
    if (startMinimized) minimizePanel(panel);
  }

  async function start() {
    if (!document.body) {
      await new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
    }
    let openAfterNavigation = false;
    try {
      openAfterNavigation = sessionStorage.getItem(OPEN_AFTER_NAVIGATION_KEY) === "1" && location.pathname.includes("/marketplace/create/item");
      if (openAfterNavigation) sessionStorage.removeItem(OPEN_AFTER_NAVIGATION_KEY);
    } catch {}
    const startMinimized = !openAfterNavigation;
    console.log("[MacsoMenos Marketplace] Publicador activo v4.4.1 en", location.href);
    new MutationObserver(scheduleQuickChatButtonUpdate).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-label", "contenteditable"] });
    updateQuickChatButton();
    createPanel(null, "Tampermonkey está activo. Consultando el backend...", startMinimized);
    try {
      const product = await loadLatestFromBackend();
      createPanel(product, "", startMinimized);
    } catch (error) {
      const cached = await Promise.resolve(GM_getValue(CACHE_KEY, null));
      createPanel(cached, error instanceof Error ? error.message : "No se pudo consultar el backend", startMinimized);
    }
  }

  start();
})();
