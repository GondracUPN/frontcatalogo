"use client";
import React from "react";
import styles from "./PhotoEditor.module.css";

type Point = { x: number; y: number; start?: boolean };
type Rect = { x: number; y: number; w: number; h: number };
type Selection = { points: Point[]; rect: Rect | null };
type HistoryEntry = { kind: "selection" | "image"; before: Selection; after: Selection };
type Reply = { bitmap?: ImageBitmap; before?: ImageBitmap; detail?: boolean; width?: number; height?: number; undoDepth?: number; changed?: boolean; blob?: Blob; error?: string };
const EMPTY_SELECTION: Selection = { points: [], rect: null };
const TOOLS = [
  { id: "brush", name: "Borrado inteligente", label: "Borrar", icon: "erase", hint: "Pinta sobre el texto que quieras eliminar." },
  { id: "rect", name: "Selección rectangular", label: "Selección", icon: "rect", hint: "Arrastra para rodear el texto. Puedes ajustar los bordes antes de aplicar." },
  { id: "heal", name: "Pincel corrector", label: "Corrector", icon: "heal", hint: "Elige una zona limpia de origen y pinta sobre la zona que quieres corregir." },
  { id: "clone", name: "Tampón de clonado", label: "Clonar", icon: "clone", hint: "Copia la textura de una zona cercana con un borde suave." },
  { id: "pan", name: "Desplazar", label: "Mover", icon: "move", hint: "Arrastra para recorrer la foto. Tu selección se conserva." },
];

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    erase: <><path d="m15 3 6 6-10 12H5l-4-4L15 3Z"/><path d="m6 12 7 7M10 21h11"/></>,
    rect: <><rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="3 3"/><path d="M2 4h4M4 2v4M18 20h4M20 18v4"/></>,
    heal: <><path d="m4 15 11-11a3.5 3.5 0 0 1 5 5L9 20a3.5 3.5 0 0 1-5-5Z"/><path d="m9 10 5 5M8 15h.01M11 12h.01M14 9h.01"/></>,
    clone: <><path d="M5 16h14l2 4H3l2-4ZM9 16v-5c0-2-2-3-2-5a5 5 0 0 1 10 0c0 2-2 3-2 5v5"/></>,
    move: <><path d="M12 2v20M2 12h20m-13-7 3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3m14-6 3 3-3 3"/></>,
    undo: <><path d="M8 4 3 9l5 5M3 9h11a7 7 0 0 1 0 14"/></>,
    redo: <><path d="m16 4 5 5-5 5m5-5H10a7 7 0 0 0 0 14"/></>,
    reset: <><path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/></>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    image: <><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    target: <><circle cx="12" cy="12" r="7"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function PhotoEditor({ source, onSave, onClose }: { source: File | string; onSave: (file: File) => Promise<void>; onClose: () => void }) {
  const dialog = React.useRef<HTMLDialogElement>(null), canvas = React.useRef<HTMLCanvasElement>(null), viewport = React.useRef<HTMLDivElement>(null);
  const worker = React.useRef<Worker | null>(null), sequence = React.useRef(0), callbacks = React.useRef(new Map<number, { resolve: (r: Reply) => void; reject: (e: Error) => void }>());
  const bitmap = React.useRef<ImageBitmap | null>(null), original = React.useRef<ImageBitmap | null>(null);
  const detailCanvas = React.useRef<HTMLCanvasElement>(null);
  const detail = React.useRef<{ bitmap: ImageBitmap; before: ImageBitmap; rect: Rect; view: typeof view; version: number } | null>(null);
  const [detailVersion, setDetailVersion] = React.useState(0);
  const [tool, setTool] = React.useState("brush"), [size, setSize] = React.useState(0.025), [hardness, setHardness] = React.useState(0.5);
  const [algorithm, setAlgorithm] = React.useState("telea"), [points, setPoints] = React.useState<Point[]>([]), [rect, setRect] = React.useState<Rect | null>(null);
  const [cloneSource, setCloneSource] = React.useState<Point | null>(null), [pickingSource, setPickingSource] = React.useState(false);
  const [view, setView] = React.useState({ zoom: 1, pan: { x: 0, y: 0 } }), [box, setBox] = React.useState({ w: 1, h: 1 });
  const viewRef = React.useRef(view);
  const { zoom, pan } = view;
  const [hover, setHover] = React.useState<Point | null>(null), [spaceHeld, setSpaceHeld] = React.useState(false);
  const pointerPan = React.useRef(false);
  const selectionBeforeTouch = React.useRef<{ points: Point[]; rect: Rect | null }>({ points: [], rect: null });
  const [version, setVersion] = React.useState(0), [dirty, setDirty] = React.useState(false), [busy, setBusy] = React.useState(true), [ready, setReady] = React.useState(false);
  const [history, setHistory] = React.useState<{ entries: HistoryEntry[]; cursor: number }>({ entries: [], cursor: 0 });
  const historyRef = React.useRef(history);
  const [error, setError] = React.useState("");
  const [showOriginal, setShowOriginal] = React.useState(false), [compare, setCompare] = React.useState(false), [split, setSplit] = React.useState(50);
  const [format, setFormat] = React.useState("image/png"), [quality, setQuality] = React.useState(98);
  const drawing = React.useRef(false), start = React.useRef<Point | null>(null), touches = React.useRef(new Map<number, { x: number; y: number }>()), gesture = React.useRef<{distance:number; x:number; y:number} | null>(null);
  const updateView = React.useCallback((next: typeof view) => { viewRef.current = next; setView(next); }, []);
  const zoomAt = React.useCallback((factor: number, x = 0, y = 0, dx = 0, dy = 0) => {
    const previous = viewRef.current;
    const next = Math.max(1, Math.min(32, previous.zoom * factor)), ratio = next / previous.zoom;
    updateView({ zoom: next, pan: { x: x - (x - previous.pan.x) * ratio + dx, y: y - (y - previous.pan.y) * ratio + dy } });
  }, [updateView]);

  const send = React.useCallback((type: string, payload: object = {}) => new Promise<Reply>((resolve, reject) => {
    const id = ++sequence.current;
    callbacks.current.set(id, { resolve, reject });
    worker.current?.postMessage({ id, type, ...payload });
  }), []);
  React.useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const bounds = element.getBoundingClientRect();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? bounds.height : 1);
      zoomAt(Math.exp(-Math.max(-500, Math.min(500, delta)) * .002), event.clientX - bounds.left - bounds.width / 2, event.clientY - bounds.top - bounds.height / 2);
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [zoomAt]);
  React.useEffect(() => {
    const pendingCallbacks = callbacks.current;
    dialog.current?.showModal();
    const w = new Worker("/photo-editor-worker.js");worker.current = w;
    w.onmessage = ({ data }) => {
      const callback = callbacks.current.get(data.id);callbacks.current.delete(data.id);
      if (data.error) callback?.reject(new Error(data.error));
      else {
        if (data.bitmap && !data.detail) { bitmap.current?.close();bitmap.current = data.bitmap;setVersion(v => v + 1);setDirty(Boolean(data.changed)); }
        callback?.resolve(data);
      }
    };
    w.onerror = () => { setError("No se pudo cargar el procesador local");setBusy(false);callbacks.current.forEach(c => c.reject(new Error("El procesador falló")));callbacks.current.clear(); };
    let active = true;
    (async () => {
      const file = typeof source === "string" ? await fetch(source, { signal: AbortSignal.timeout(20000) }).then(r => { if (!r.ok) throw new Error("No se pudo cargar la foto");return r.blob(); }) : source;
      if (file.size > 64*1024*1024) throw new Error("Máximo 64 MB por foto");
      const result = await send("load", { file });
      if (!active) return;
      original.current = await createImageBitmap(result.bitmap!);setReady(true);
    })().catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setBusy(false); });
    const observer = new ResizeObserver(entries => { const b = entries[0].contentRect;setBox({w:b.width,h:b.height}); });
    if (viewport.current) observer.observe(viewport.current);
    return () => { active=false;observer.disconnect();w.terminate();worker.current=null;bitmap.current?.close();original.current?.close();detail.current?.bitmap.close();detail.current?.before.close();pendingCallbacks.clear(); };
  }, [source, send]);
  React.useEffect(() => {
    const c=canvas.current,b=bitmap.current;if(!c||!b)return;
    c.width=b.width;c.height=b.height;const ctx=c.getContext("2d")!;
    ctx.drawImage(showOriginal && original.current ? original.current : b,0,0);
    if(compare && original.current){ctx.save();ctx.beginPath();ctx.rect(0,0,c.width*split/100,c.height);ctx.clip();ctx.drawImage(original.current,0,0);ctx.restore();}
    if(showOriginal)return;
    ctx.fillStyle="rgba(244,63,94,.4)";ctx.strokeStyle="rgba(244,63,94,.6)";ctx.lineWidth=size*c.width;ctx.lineCap="round";ctx.lineJoin="round";
    if(rect)ctx.fillRect(rect.x*c.width,rect.y*c.height,rect.w*c.width,rect.h*c.height);
    if(points.length){ctx.beginPath();points.forEach((p,i)=>{if(i&&!p.start)ctx.lineTo(p.x*c.width,p.y*c.height);else ctx.moveTo(p.x*c.width,p.y*c.height);});ctx.stroke();for(const p of points){ctx.beginPath();ctx.arc(p.x*c.width,p.y*c.height,size*c.width/2,0,Math.PI*2);ctx.fill();}}
    if(cloneSource){ctx.strokeStyle="#00ff99";ctx.lineWidth=2;ctx.beginPath();ctx.arc(cloneSource.x*c.width,cloneSource.y*c.height,8,0,Math.PI*2);ctx.stroke();}
  }, [version, points, rect, size, showOriginal, compare, split, cloneSource]);
  React.useEffect(() => {
    if(!ready || zoom<=1)return;
    let active=true;
    const timer=setTimeout(async()=>{
      const image=canvas.current?.getBoundingClientRect(),area=viewport.current?.getBoundingClientRect();
      if(!image||!area)return;
      const left=Math.max(image.left,area.left),top=Math.max(image.top,area.top),right=Math.min(image.right,area.right),bottom=Math.min(image.bottom,area.bottom);
      if(right<=left||bottom<=top)return;
      const r={x:(left-image.left)/image.width,y:(top-image.top)/image.height,w:(right-left)/image.width,h:(bottom-top)/image.height};
      try{
        const result=await send("detail",{rect:r,width:(right-left)*Math.min(devicePixelRatio,2),height:(bottom-top)*Math.min(devicePixelRatio,2)});
        if(!active){result.bitmap?.close();result.before?.close();return;}
        detail.current?.bitmap.close();detail.current?.before.close();
        detail.current={bitmap:result.bitmap!,before:result.before!,rect:r,view,version};setDetailVersion(v=>v+1);
      }catch{/* Keep the base preview available if detail rendering fails. */}
    },60);
    return()=>{active=false;clearTimeout(timer);};
  }, [ready,view,version,box,zoom,send]);
  React.useEffect(()=>{
    const overlay=detailCanvas.current,b=bitmap.current,d=detail.current;if(!overlay)return;
    const ratio=Math.min(devicePixelRatio,2);overlay.width=Math.round(box.w*ratio);overlay.height=Math.round(box.h*ratio);
    const ctx=overlay.getContext("2d")!;
    overlay.dataset.ready="false";
    if(!b||!d||d.view!==view||d.version!==version||zoom<=1)return;
    const fit=Math.min(box.w/b.width,box.h/b.height),w=b.width*fit*zoom,h=b.height*fit*zoom,left=box.w/2+pan.x-w/2,top=box.h/2+pan.y-h/2,r=d.rect;
    ctx.scale(ratio,ratio);
    const draw=(image:ImageBitmap)=>ctx.drawImage(image,left+r.x*w,top+r.y*h,r.w*w,r.h*h);
    draw(showOriginal?d.before:d.bitmap);
    overlay.dataset.ready="true";
    if(compare&&!showOriginal){ctx.save();ctx.beginPath();ctx.rect(left,top,w*split/100,h);ctx.clip();draw(d.before);ctx.restore();}
    if(showOriginal)return;
    ctx.translate(left,top);ctx.scale(w/b.width,h/b.height);ctx.fillStyle="rgba(244,63,94,.4)";ctx.strokeStyle="rgba(244,63,94,.6)";ctx.lineWidth=size*b.width;ctx.lineCap="round";ctx.lineJoin="round";
    if(rect)ctx.fillRect(rect.x*b.width,rect.y*b.height,rect.w*b.width,rect.h*b.height);
    if(points.length){ctx.beginPath();points.forEach((p,i)=>{if(i&&!p.start)ctx.lineTo(p.x*b.width,p.y*b.height);else ctx.moveTo(p.x*b.width,p.y*b.height);});ctx.stroke();for(const p of points){ctx.beginPath();ctx.arc(p.x*b.width,p.y*b.height,size*b.width/2,0,Math.PI*2);ctx.fill();}}
    if(cloneSource){ctx.strokeStyle="#00ff99";ctx.lineWidth=2;ctx.beginPath();ctx.arc(cloneSource.x*b.width,cloneSource.y*b.height,8,0,Math.PI*2);ctx.stroke();}
  },[detailVersion,view,version,box,zoom,pan,points,rect,size,showOriginal,compare,split,cloneSource]);
  const close = () => { if(busy)return;if((dirty||points.length||rect) && !confirm("¿Descartar los cambios sin guardar?"))return;onClose(); };
  const restoreSelection = (selection: Selection) => { setPoints(selection.points); setRect(selection.rect); };
  const updateHistory = (next: typeof history) => { historyRef.current = next; setHistory(next); };
  const recordHistory = (entry: HistoryEntry, undoDepth?: number) => {
    const entries = [...historyRef.current.entries.slice(0, historyRef.current.cursor), entry];
    if (undoDepth !== undefined) {
      while (entries.filter(e => e.kind === "image").length > undoDepth) entries.splice(0, entries.findIndex(e => e.kind === "image") + 1);
    }
    if (entries.length > 200) entries.splice(0, entries.length - 200);
    updateHistory({ entries, cursor: entries.length });
  };
  const recordSelection = (before: Selection, after: Selection) => {
    if (before.points === after.points && before.rect === after.rect) return;
    recordHistory({ kind: "selection", before, after });
  };
  const travelHistory = async (direction: "undo" | "redo") => {
    const current = historyRef.current, index = direction === "undo" ? current.cursor - 1 : current.cursor;
    const entry = current.entries[index];
    if (busy || !entry) return;
    setBusy(true); setError("");
    try {
      if (entry.kind === "image") await send(direction);
      restoreSelection(direction === "undo" ? entry.before : entry.after);
      updateHistory({ entries: current.entries, cursor: current.cursor + (direction === "undo" ? -1 : 1) });
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo recuperar el paso"); }
    finally { setBusy(false); }
  };
  const act = async (type: string, payload: object = {}) => {
    setBusy(true);setError("");try{
      const before = { points, rect }, result = await send(type,payload);
      if(type === "apply") recordHistory({kind:"image",before,after:EMPTY_SELECTION},result.undoDepth);
      if(type === "reset") updateHistory({entries:[],cursor:0});
      restoreSelection(EMPTY_SELECTION);
    }catch(e){setError(e instanceof Error?e.message:"No se pudo procesar");}finally{setBusy(false);}
  };
  const position=(e:React.PointerEvent):Point=>{const r=canvas.current!.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};};
  const fit=bitmap.current?Math.min(box.w/bitmap.current.width,box.h/bitmap.current.height):1;
  const selected=points.length>0 || Boolean(rect && rect.w>0 && rect.h>0);
  const selectedTool=TOOLS.find(t=>t.id===tool)!;
  const chooseTool=(next:string)=>{setTool(next);setPickingSource(false);};
  const save=async()=>{
    setBusy(true);setError("");
    try{const result=await send("export",{format,quality:quality/100});if(!result.blob)throw new Error("No se pudo exportar");await onSave(new File([result.blob],format==="image/png"?"foto-editada.png":"foto-editada.webp",{type:result.blob.type}));onClose();}
    catch(e){setError(e instanceof Error?e.message:"No se pudo guardar");}finally{setBusy(false);}
  };
  return <dialog ref={dialog} aria-label="Editar imagen" className={styles.dialog} onCancel={e=>{e.preventDefault();e.stopPropagation();close();}} onClick={e=>{e.stopPropagation();if(e.target===dialog.current)close();}}>
    <div className={styles.editor} onKeyDown={e=>{
      e.stopPropagation();
      const typing=e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLSelectElement;
      if(!typing&&(e.metaKey||e.ctrlKey)&&(e.key.toLowerCase()==="z"||e.key.toLowerCase()==="y")){e.preventDefault();void travelHistory(e.shiftKey||e.key.toLowerCase()==="y"?"redo":"undo");}
      if(e.code==="Space"&&(e.target===viewport.current||e.target===canvas.current)){e.preventDefault();setSpaceHeld(true);}
    }} onKeyUp={e=>{if(e.code==="Space")setSpaceHeld(false);}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setSpaceHeld(false);}}>
      <header className={styles.header}>
        <div className={styles.heading}><span className={styles.headingIcon}><Icon name="image"/></span><div><h2>Editar imagen</h2><p>Cuida los detalles. Protege la información.</p></div></div>
        <button type="button" aria-label="Cancelar" onClick={close} disabled={busy} className={styles.close}>Cancelar <Icon name="close"/></button>
      </header>
      <div className={styles.historyBar}>
        <button type="button" aria-label="Deshacer" title="Deshacer (Ctrl/Cmd + Z)" disabled={busy||history.cursor===0} onClick={()=>travelHistory("undo")} className={styles.historyButton}><Icon name="undo"/>Deshacer</button>
        <button type="button" aria-label="Rehacer" title="Rehacer (Ctrl/Cmd + Shift + Z)" disabled={busy||history.cursor===history.entries.length} onClick={()=>travelHistory("redo")} className={styles.historyButton}><Icon name="redo"/>Rehacer</button>
        <span className={styles.historyHint}>Cada trazo y cada retoque cuentan como un paso</span>
        <button type="button" disabled={busy||!ready||(!dirty&&!selected)} onClick={()=>{if(confirm("¿Restablecer la imagen original?"))act("reset");}} className={[styles.historyButton,styles.reset].join(" ")}><Icon name="reset"/>Restablecer</button>
      </div>
      <div className={styles.body}>
        <section className={styles.workspace} aria-label="Lienzo de edición">
          <div className={styles.tools} role="radiogroup" aria-label="Herramienta" onKeyDown={e=>{
            if(busy||!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;
            e.preventDefault();const current=TOOLS.findIndex(t=>t.id===tool),next=e.key==="Home"?0:e.key==="End"?TOOLS.length-1:(current+(e.key==="ArrowRight"?1:-1)+TOOLS.length)%TOOLS.length;
            chooseTool(TOOLS[next].id);e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next].focus();
          }}>
            {TOOLS.map(t=><button key={t.id} type="button" role="radio" tabIndex={tool===t.id?0:-1} aria-label={t.name} aria-checked={tool===t.id} title={t.name} disabled={busy} onClick={()=>chooseTool(t.id)} className={styles.tool}><Icon name={t.icon}/><span>{t.label}</span></button>)}
          </div>
      <div ref={viewport} tabIndex={0} aria-label="Área de edición: rueda para ampliar, espacio y arrastrar para desplazar" className={styles.viewport} style={{touchAction:"none"}}
          onPointerDown={e=>{
            if(busy||!ready||e.button===2)return;e.preventDefault();e.currentTarget.focus({preventScroll:true});e.currentTarget.setPointerCapture(e.pointerId);touches.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
            if(touches.current.size===2){const p=[...touches.current.values()];gesture.current={distance:Math.max(1,Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)),x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2};drawing.current=false;setPoints(selectionBeforeTouch.current.points);setRect(selectionBeforeTouch.current.rect);return;}
            selectionBeforeTouch.current={points,rect};
            pointerPan.current=tool==="pan"||spaceHeld||e.button===1;
            if(pointerPan.current){drawing.current=true;return;}
            if(e.target!==canvas.current)return;
            const p=position(e);if(pickingSource||e.altKey){setCloneSource(p);setPickingSource(false);return;}
            drawing.current=true;start.current=p;
            if(tool==="rect"){setPoints([]);setRect({x:p.x,y:p.y,w:0,h:0});}
            else if(tool!=="pan")setPoints(prev=>[...prev,{...p,start:true}]);
          }}
          onPointerMove={e=>{
            const bounds=viewport.current!.getBoundingClientRect();setHover({x:e.clientX-bounds.left,y:e.clientY-bounds.top});
            const previous=touches.current.get(e.pointerId);if(!previous)return;
            touches.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
            if(touches.current.size===2&&gesture.current){const p=[...touches.current.values()],last=gesture.current,distance=Math.max(1,Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)),x=(p[0].x+p[1].x)/2,y=(p[0].y+p[1].y)/2;zoomAt(distance/last.distance,last.x-bounds.left-bounds.width/2,last.y-bounds.top-bounds.height/2,x-last.x,y-last.y);gesture.current={distance,x,y};return;}
            if(!drawing.current)return;
            if(pointerPan.current){const v=viewRef.current;updateView({...v,pan:{x:v.pan.x+e.clientX-previous.x,y:v.pan.y+e.clientY-previous.y}});return;}
            const p=position(e);if(tool==="rect"&&start.current){const a=start.current;setRect({x:Math.min(a.x,p.x),y:Math.min(a.y,p.y),w:Math.abs(p.x-a.x),h:Math.abs(p.y-a.y)});}else setPoints(prev=>[...prev,p]);
          }} onPointerUp={e=>{if(drawing.current&&!pointerPan.current&&!gesture.current)recordSelection(selectionBeforeTouch.current,{points,rect});touches.current.delete(e.pointerId);drawing.current=false;gesture.current=null;}} onPointerCancel={e=>{if(drawing.current&&!pointerPan.current)restoreSelection(selectionBeforeTouch.current);touches.current.delete(e.pointerId);drawing.current=false;gesture.current=null;}} onPointerLeave={()=>setHover(null)}>
        <canvas ref={canvas} aria-label="Imagen y máscara de borrado" style={{position:"absolute",left:"50%",top:"50%",width:(bitmap.current?.width||1)*fit,height:(bitmap.current?.height||1)*fit,transform:`translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,touchAction:"none",cursor:tool==="pan"||spaceHeld?"grab":"crosshair"}} />
        <canvas ref={detailCanvas} aria-hidden="true" data-testid="zoom-detail" className="pointer-events-none absolute inset-0 h-full w-full" />
        {hover&&!busy&&!spaceHeld&&["brush","heal","clone"].includes(tool)&&<div aria-hidden="true" data-testid="brush-cursor" className="pointer-events-none absolute rounded-full border border-white" style={{left:hover.x,top:hover.y,width:size*(bitmap.current?.width||1)*fit*zoom,height:size*(bitmap.current?.width||1)*fit*zoom,transform:"translate(-50%,-50%)",boxShadow:"0 0 0 1px #111"}} />}
        {busy&&<div role="status" className={styles.loading}>Procesando en este dispositivo…</div>}
      </div>

          <div className={styles.viewBar}>
            <div className={styles.comparison}>
              <button type="button" aria-label="Mantener: ver original" title="Mantén pulsado para ver el original" className={styles.original} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);setShowOriginal(true);}} onPointerUp={()=>setShowOriginal(false)} onPointerCancel={()=>setShowOriginal(false)} onKeyDown={e=>{if(e.key===" ")setShowOriginal(true);}} onKeyUp={()=>setShowOriginal(false)}><Icon name="eye"/>Original</button>
              <label className={styles.compare}><input type="checkbox" checked={compare} onChange={e=>setCompare(e.target.checked)}/>Comparar</label>
            </div>
            <div className={styles.zoom}>
              <button type="button" aria-label="Alejar imagen" disabled={zoom<=1} onClick={()=>zoomAt(1/1.5)}>−</button>
              <output aria-label="Nivel de zoom">{Math.round(zoom*100)}%</output>
              <button type="button" aria-label="Acercar imagen" disabled={zoom>=32} onClick={()=>zoomAt(1.5)}>+</button>
              <button type="button" aria-label="Ajustar zoom" onClick={()=>updateView({zoom:1,pan:{x:0,y:0}})} className={styles.fit}>Ajustar</button>
            </div>
          </div>
        </section>
        <aside className={styles.inspector} aria-label="Ajustes de la herramienta">
          <h3 className={styles.sectionHeading}>{selectedTool.name}</h3><p className={styles.description}>{pickingSource?"Toca una zona limpia de la foto para elegir el origen.":selectedTool.hint}</p>
          {tool!=="pan"&&tool!=="rect"&&<label className={styles.field}><span className={styles.fieldTitle}>Tamaño del pincel <output>{Math.round(size*1000)/10}%</output></span><input aria-label="Tamaño del pincel" type="range" min="0.003" max="0.12" step="0.001" value={size} onChange={e=>setSize(Number(e.target.value))}/></label>}
          {(tool==="clone"||tool==="heal")&&<>
            <button type="button" aria-label="Elegir origen" data-picking={pickingSource} onClick={()=>setPickingSource(true)} className={styles.source}><Icon name="target"/>{pickingSource?"Selecciona el origen…":cloneSource?"Cambiar origen":"Elegir origen"}</button>
            <label className={styles.field}><span className={styles.fieldTitle}>Dureza del borde <output>{Math.round(hardness*100)}%</output></span><input aria-label="Dureza" type="range" min="0" max="1" step="0.05" value={hardness} onChange={e=>setHardness(Number(e.target.value))}/></label>
          </>}
          {tool==="rect"&&<div className={styles.rectFields}>{(["x","y","w","h"] as const).map(k=><label key={k}>{({x:"X",y:"Y",w:"Ancho",h:"Alto"})[k]} %<input aria-label={"Rectángulo "+k} type="number" disabled={!rect} min="0" max="100" value={Math.round((rect?.[k]||0)*1000)/10} onChange={e=>{if(!rect)return;const next={...rect,[k]:Math.max(0,Math.min(k==='w'?1-rect.x:k==='h'?1-rect.y:1,Number(e.target.value)/100))};recordSelection({points,rect},{points,rect:next});setRect(next);}}/></label>)}</div>}
          {compare&&<label className={styles.field}><span className={styles.fieldTitle}>Antes / después</span><input aria-label="Comparación" type="range" value={split} onChange={e=>setSplit(Number(e.target.value))}/></label>}
          <details className={styles.advanced}><summary>Ajustes de salida y borrado</summary>
            {(tool==="brush"||tool==="rect"||tool==="heal")&&<label className={styles.field}>Reconstrucción<select aria-label="Algoritmo" value={algorithm} onChange={e=>setAlgorithm(e.target.value)} className={styles.select}><option value="telea">Fondo suave · Telea</option><option value="ns">Seguir contornos · NS</option></select></label>}
            <label className={styles.field}>Formato de imagen<select aria-label="Compresión" value={format} onChange={e=>setFormat(e.target.value)} className={styles.select}><option value="image/png">PNG · sin pérdida</option><option value="image/webp">WebP · archivo más ligero</option></select></label>
            {format!=="image/png"&&<label className={styles.field}><span className={styles.fieldTitle}>Calidad <output>{quality}%</output></span><input aria-label="Calidad" type="range" min="90" max="100" value={quality} onChange={e=>setQuality(Number(e.target.value))}/></label>}
          </details>
          <div className={styles.tip}><Icon name="move"/><span>Amplía con la rueda o con dos dedos. Mantén Espacio y arrastra para moverte sin cambiar de herramienta.</span></div>
        </aside>
      </div>
      {error&&<p role="alert" className={styles.error}>{error}</p>}
      <footer className={styles.footer}>
        <div className={styles.status} data-selected={selected}><span className={styles.statusDot}/>{selected?"Selección lista para aplicar":dirty?"Retoque aplicado · listo para guardar":"Selecciona la zona que quieres retocar"}</div>
        <div className={styles.actions}>
          <button type="button" disabled={busy||!selected||(tool==="clone"&&!cloneSource)} className={styles.apply} onClick={()=>act("apply",{op:{tool,points,rect,size,hardness,algorithm,source:cloneSource}})}><Icon name="erase"/>Aplicar borrado</button>
          <button type="button" disabled={busy||!dirty||selected} className={styles.save} onClick={save}><Icon name="check"/>Guardar cambios</button>
        </div>
      </footer>
    </div>
  </dialog>;
}
