/* global cv */
// All image bytes remain on this device. OpenCV is served from this installation.
let engine;
let canvas,
  original,
  history = [],
  cursor = 0,
  historyBytes = 0,
  historyTrimmed = false;
const LIMIT = 96 * 1024 * 1024;
function opencv() {
  if (!engine)
    engine = new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("OpenCV tardó demasiado en cargar")),
        45000,
      );
      try {
        importScripts("/photo-editor-vendor/opencv.js");
        const ready = () => {
          clearTimeout(timeout);
          if (typeof cv.inpaint !== "function")
            reject(new Error("Esta instalación de OpenCV no incluye inpaint"));
          else resolve({ cv });
        };
        if (cv.Mat) ready();
        else cv.onRuntimeInitialized = ready;
      } catch (e) {
        clearTimeout(timeout);
        reject(e);
      }
    });
  return engine;
}
function context(c) {
  return c.getContext("2d", { willReadFrequently: true });
}
function illuminationPlane(before, mask) {
  const { width: w, height: h, data } = before;
  const matrix = Array.from({ length: 3 }, () => [0, 0, 0]);
  const rhs = Array.from({ length: 3 }, () => [0, 0, 0]);
  const stride = Math.max(1, Math.floor(Math.sqrt((w * h) / 20000)));
  let n = 0;
  for (let y = 0; y < h; y += stride)
    for (let x = 0; x < w; x += stride) {
      const i = (y * w + x) * 4;
      if (mask.data[i + 3]) continue;
      const v = [1, x / w - 0.5, y / h - 0.5];
      n++;
      for (let a = 0; a < 3; a++) {
        for (let b = 0; b < 3; b++) matrix[a][b] += v[a] * v[b];
        for (let c = 0; c < 3; c++) rhs[c][a] += v[a] * data[i + c];
      }
    }
  if (n < 32) return null;
  const coefficients = [];
  for (let c = 0; c < 3; c++) {
    const rows = matrix.map((r, i) => [...r, rhs[c][i]]);
    for (let k = 0; k < 3; k++) {
      let pivot = k;
      for (let i = k + 1; i < 3; i++)
        if (Math.abs(rows[i][k]) > Math.abs(rows[pivot][k])) pivot = i;
      [rows[k], rows[pivot]] = [rows[pivot], rows[k]];
      const d = rows[k][k];
      if (Math.abs(d) < 1e-8) return null;
      for (let j = k; j < 4; j++) rows[k][j] /= d;
      for (let i = 0; i < 3; i++)
        if (i !== k) {
          const f = rows[i][k];
          for (let j = k; j < 4; j++) rows[i][j] -= f * rows[k][j];
        }
    }
    coefficients.push(rows.map((r) => r[3]));
  }
  let error = 0;
  for (let y = 0; y < h; y += stride)
    for (let x = 0; x < w; x += stride) {
      const i = (y * w + x) * 4;
      if (mask.data[i + 3]) continue;
      for (let c = 0; c < 3; c++) {
        const a = coefficients[c];
        const d =
          data[i + c] - (a[0] + a[1] * (x / w - 0.5) + a[2] * (y / h - 0.5));
        error += d * d;
      }
    }
  // Only a truly smooth neighborhood qualifies. Textures/reflections use inpaint.
  return Math.sqrt(error / (n * 3)) < 0.65 ? coefficients : null;
}
function preview() {
  const scale = Math.min(1, 1600 / Math.max(canvas.width, canvas.height));
  const p = new OffscreenCanvas(
    Math.round(canvas.width * scale),
    Math.round(canvas.height * scale),
  );
  context(p).drawImage(canvas, 0, 0, p.width, p.height);
  return p.transferToImageBitmap();
}
function bounds(op) {
  const w = canvas.width,
    h = canvas.height,
    r = (op.size * w) / 2;
  let xs = op.points.map((p) => p.x * w),
    ys = op.points.map((p) => p.y * h);
  if (op.rect) {
    xs = [op.rect.x * w, (op.rect.x + op.rect.w) * w];
    ys = [op.rect.y * h, (op.rect.y + op.rect.h) * h];
  }
  const pad = Math.max(32, Math.ceil(r * 2));
  const x = Math.max(0, Math.floor(Math.min(...xs) - r - pad)),
    y = Math.max(0, Math.floor(Math.min(...ys) - r - pad));
  return {
    x,
    y,
    w: Math.min(w - x, Math.ceil(Math.max(...xs) + r + pad) - x),
    h: Math.min(h - y, Math.ceil(Math.max(...ys) + r + pad) - y),
  };
}
async function apply(op) {
  const b = bounds(op);
  if (b.w * b.h > 12000000)
    throw new Error(
      "Selecciona una región más pequeña (máximo 12 MP por aplicación)",
    );
  const ctx = context(canvas),
    before = ctx.getImageData(b.x, b.y, b.w, b.h);
  const maskCanvas = new OffscreenCanvas(b.w, b.h),
    m = context(maskCanvas);
  m.fillStyle = "white";
  m.strokeStyle = "white";
  m.lineCap = "round";
  m.lineJoin = "round";
  m.lineWidth = op.size * canvas.width;
  if (op.rect)
    m.fillRect(
      op.rect.x * canvas.width - b.x,
      op.rect.y * canvas.height - b.y,
      op.rect.w * canvas.width,
      op.rect.h * canvas.height,
    );
  else {
    m.beginPath();
    op.points.forEach((p, i) => {
      const x = p.x * canvas.width - b.x,
        y = p.y * canvas.height - b.y;
      if (i === 0 || p.start) m.moveTo(x, y);
      else m.lineTo(x, y);
    });
    m.stroke();
    for (const p of op.points) {
      m.beginPath();
      m.arc(
        p.x * canvas.width - b.x,
        p.y * canvas.height - b.y,
        (op.size * canvas.width) / 2,
        0,
        Math.PI * 2,
      );
      m.fill();
    }
  }
  const mask = m.getImageData(0, 0, b.w, b.h),
    after = new ImageData(new Uint8ClampedArray(before.data), b.w, b.h);
  if (op.tool === "clone" || (op.tool === "heal" && op.source)) {
    if (!op.source) throw new Error("Elige un origen para clonar");
    const anchor = op.rect ? { x: op.rect.x, y: op.rect.y } : op.points[0];
    const dx = Math.round((op.source.x - anchor.x) * canvas.width),
      dy = Math.round((op.source.y - anchor.y) * canvas.height);
    const sourceCanvas = new OffscreenCanvas(b.w, b.h),
      s = context(sourceCanvas);
    s.drawImage(canvas, b.x + dx, b.y + dy, b.w, b.h, 0, 0, b.w, b.h);
    const sample = s.getImageData(0, 0, b.w, b.h).data;
    // Healing transfers texture while matching the surrounding color/lighting.
    let dst = [0, 0, 0],
      src = [0, 0, 0],
      count = 0;
    if (op.tool === "heal")
      for (let i = 0; i < sample.length; i += 4)
        if (!mask.data[i + 3] && sample[i + 3]) {
          for (let c = 0; c < 3; c++) {
            dst[c] += before.data[i + c];
            src[c] += sample[i + c];
          }
          count++;
        }
    for (let y = 0; y < b.h; y++)
      for (let x = 0; x < b.w; x++) {
        const i = (y * b.w + x) * 4;
        if (!mask.data[i + 3] || !sample[i + 3]) continue;
        let alpha = mask.data[i + 3] / 255;
        // Distance to unselected pixels gives a controllable, soft clone boundary.
        const feather = Math.max(
          1,
          Math.min(24, (op.size * canvas.width * (1 - op.hardness)) / 2),
        );
        for (let d = 1; d <= feather; d++) {
          if (
            x - d < 0 ||
            y - d < 0 ||
            x + d >= b.w ||
            y + d >= b.h ||
            !mask.data[(y * b.w + x - d) * 4 + 3] ||
            !mask.data[(y * b.w + x + d) * 4 + 3] ||
            !mask.data[((y - d) * b.w + x) * 4 + 3] ||
            !mask.data[((y + d) * b.w + x) * 4 + 3]
          ) {
            alpha *= d / feather;
            break;
          }
        }
        for (let c = 0; c < 3; c++) {
          const corrected =
            sample[i + c] + (count ? (dst[c] - src[c]) / count : 0);
          after.data[i + c] =
            before.data[i + c] * (1 - alpha) +
            Math.max(0, Math.min(255, corrected)) * alpha;
        }
      }
  } else {
    const { cv } = await opencv();
    let rgba, rgb, mono, result;
    try {
      rgba = cv.matFromImageData(before);
      rgb = new cv.Mat();
      cv.cvtColor(rgba, rgb, cv.COLOR_RGBA2RGB);
      mono = new cv.Mat(b.h, b.w, cv.CV_8UC1);
      for (let i = 0; i < b.w * b.h; i++)
        mono.data[i] = mask.data[i * 4 + 3] ? 255 : 0;
      result = new cv.Mat();
      cv.inpaint(
        rgb,
        mono,
        result,
        Math.max(2, Math.min(12, (op.size * canvas.width) / 8)),
        op.algorithm === "ns" ? cv.INPAINT_NS : cv.INPAINT_TELEA,
      );
      const plane = illuminationPlane(before, mask);
      // Exact preservation outside the mask, including alpha.
      for (let i = 0; i < b.w * b.h; i++)
        if (mono.data[i])
          for (let c = 0; c < 3; c++) {
            const a = plane?.[c];
            after.data[i * 4 + c] = a
              ? Math.round(
                  a[0] +
                    a[1] * ((i % b.w) / b.w - 0.5) +
                    a[2] * (Math.floor(i / b.w) / b.h - 0.5),
                )
              : result.data[i * 3 + c];
          }
    } finally {
      for (const mat of [rgba, rgb, mono, result]) mat?.delete();
    }
  }
  ctx.putImageData(after, b.x, b.y);
  history = history.slice(0, cursor);
  history.push({ b, before, after });
  cursor++;
  historyBytes = history.reduce(
    (n, p) => n + p.before.data.byteLength + p.after.data.byteLength,
    0,
  );
  while (historyBytes > LIMIT && history.length > 1) {
    const removed = history.shift();
    historyBytes -=
      removed.before.data.byteLength + removed.after.data.byteLength;
    cursor--;
    historyTrimmed = true;
  }
}
self.onmessage = async ({ data }) => {
  try {
    if (data.type === "load") {
      const bitmap = await createImageBitmap(data.file, {
        imageOrientation: "from-image",
      });
      if (bitmap.width * bitmap.height > 50000000) {
        bitmap.close();
        throw new Error("Máximo 50 MP. Exporta una copia más pequeña.");
      }
      original = bitmap;
      canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      context(canvas).drawImage(bitmap, 0, 0);
      history = [];
      cursor = 0;
      historyBytes = 0;
      historyTrimmed = false;
    } else if (data.type === "apply") await apply(data.op);
    else if (data.type === "undo" && cursor) {
      const p = history[--cursor];
      context(canvas).putImageData(p.before, p.b.x, p.b.y);
    } else if (data.type === "redo" && cursor < history.length) {
      const p = history[cursor++];
      context(canvas).putImageData(p.after, p.b.x, p.b.y);
    } else if (data.type === "reset") {
      context(canvas).clearRect(0, 0, canvas.width, canvas.height);
      context(canvas).drawImage(original, 0, 0);
      history = [];
      cursor = 0;
      historyBytes = 0;
      historyTrimmed = false;
    } else if (data.type === "detail") {
      const r = data.rect,
        x = r.x * canvas.width,
        y = r.y * canvas.height,
        w = r.w * canvas.width,
        h = r.h * canvas.height;
      const scale = Math.min(
        1,
        2048 / Math.max(w, h),
        data.width / w,
        data.height / h,
      );
      const tile = new OffscreenCanvas(
        Math.max(1, Math.round(w * scale)),
        Math.max(1, Math.round(h * scale)),
      );
      context(tile).drawImage(
        canvas,
        x,
        y,
        w,
        h,
        0,
        0,
        tile.width,
        tile.height,
      );
      const bitmap = tile.transferToImageBitmap();
      context(tile).drawImage(
        original,
        x,
        y,
        w,
        h,
        0,
        0,
        tile.width,
        tile.height,
      );
      const before = tile.transferToImageBitmap();
      self.postMessage({ id: data.id, detail: true, bitmap, before, rect: r }, [
        bitmap,
        before,
      ]);
      return;
    } else if (data.type === "export") {
      const blob = await canvas.convertToBlob({
        type: data.format || "image/png",
        quality: data.quality || 0.98,
      });
      self.postMessage({ id: data.id, blob });
      return;
    }
    const bitmap = preview();
    self.postMessage(
      {
        id: data.id,
        bitmap,
        width: canvas.width,
        height: canvas.height,
        undo: cursor > 0,
        redo: cursor < history.length,
        undoDepth: cursor,
        changed: cursor > 0 || historyTrimmed,
      },
      [bitmap],
    );
  } catch (e) {
    self.postMessage({
      id: data.id,
      error: e.message || "No se pudo procesar la imagen",
    });
  }
};
