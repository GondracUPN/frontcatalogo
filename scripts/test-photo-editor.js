const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { build } = require('esbuild');
const { chromium } = require('@playwright/test');
const sharp = require('sharp');

async function main() {
  const root=path.resolve(__dirname,'..');
  const evidence=path.resolve(root,'../docs/evidencias/editor-fotos-2026-10-20');
  await fs.mkdir(evidence,{recursive:true});
  const entry=`import React from 'react';import{createRoot}from'react-dom/client';
    import PhotoEditor from './app/servmacso10/servicios/PhotoEditor';
    import {useProductPhotoEditor} from './app/servmacso10/servicios/useProductPhotoEditor';
    window.uploads=[];window.replacements=[];window.failUpload=false;
    function App(){const [images,setImages]=React.useState(location.search.includes('existing')?['/fixture.png','/second.png','/third.png']:[]);
      const e=useProductPhotoEditor({id:'aaaaaaaa-1111-4111-8111-111111111111'},images,setImages,async file=>{
        window.uploads.push(await file.arrayBuffer());return '/uploaded.png';});
      return <><input aria-label="Subir foto" type="file" onChange={v=>e.addFiles(v.target.files)}/><button onClick={async()=>{window.savedImages=await e.resolveImages();}}>Publicar prueba</button>
      {images.map((u,i)=><div key={u}><img src={u} width="80"/><button onClick={()=>e.edit(u)}>Editar {i+1}</button></div>)}{e.modal}</>;}
    createRoot(document.getElementById('root')).render(<App/>);`;
  const bundle=await build({stdin:{contents:entry,resolveDir:root,sourcefile:'photo-test.tsx',loader:'tsx'},outdir:path.join(root,'.photo-test-bundle'),bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
  const postcss=require('postcss');
  const css=await postcss([require('@tailwindcss/postcss')({base:root})]).process('@import "tailwindcss";',{from:path.join(root,'app/globals.css')});
  let fixture;
  const server=http.createServer(async(req,res)=>{
    try{
      if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles.find(f=>f.path.endsWith('.js')).contents);}
      else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css.css+'\n'+bundle.outputFiles.filter(f=>f.path.endsWith('.css')).map(f=>f.text).join('\n'));}
      else if(req.url==='/photo-editor-worker.js'||req.url==='/photo-editor-vendor/opencv.js'){res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(path.join(root,'public',req.url)));}
      else if(req.url.endsWith('.png')){res.setHeader('Content-Type','image/png');res.end(fixture);}
      else{res.setHeader('Content-Type','text/html');res.end('<!DOCTYPE html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/bundle.js"></script>');}
    }catch(e){res.statusCode=500;res.end(e.message);}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  let browser;
  try{
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage();page.on('pageerror',e=>console.error('browser:',e.message));
    await page.addInitScript(()=>{
      window.photoOperations=[];
      const NativeWorker=window.Worker;
      window.Worker=class extends NativeWorker {
        postMessage(data,...args){if(data.type==='apply')window.photoOperations.push(structuredClone(data.op));return super.postMessage(data,...args);}
      };
    });
    await page.goto(base);
    const results=[];
    const scenarios=['macbook-pantalla','iphone-imei','ipad-pantalla','ipad-grabado','macbook-inferior','mac-mini-base','imac','caja-etiqueta','identificador-pequeno','varias-zonas','watch-airpods-plastico'];
    for(let index=0;index<scenarios.length;index++){
      const result=await page.evaluate(async index=>{
        const w=640,h=480,c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');
        const data=ctx.createImageData(w,h);
        for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;const texture=index>=3&&index<=6?Math.sin(y*.17)*2:0;data.data[i]=170+x*.05+y*.025+texture;data.data[i+1]=180+x*.04+y*.03+texture;data.data[i+2]=190+x*.02+y*.035+texture;data.data[i+3]=255;}
        ctx.putImageData(data,0,0);const truth=new Uint8ClampedArray(data.data);
        ctx.font=index===8?'12px monospace':'20px monospace';ctx.fillStyle='#232323';ctx.fillText(index===1?'IMEI DEMO 000000000':'S/N DEMO TEST-1234',170,235);
        if(index===9)ctx.fillText('S/N DEMO ZONA 2',180,335);
        const before=ctx.getImageData(0,0,w,h);const beforeUrl=c.toDataURL('image/png');
        const blob=await new Promise(r=>c.toBlob(r,'image/png'));
        const worker=new Worker('/photo-editor-worker.js');let seq=0;
        const rpc=(type,args={})=>new Promise((resolve,reject)=>{const id=++seq;const timeout=setTimeout(()=>reject(Error('worker timeout')),60000);worker.onmessage=({data})=>{if(data.id!==id)return;clearTimeout(timeout);data.bitmap?.close();if(data.error)reject(Error(data.error));else resolve(data);};worker.onerror=e=>reject(Error(e.message));worker.postMessage({id,type,...args});});
        await rpc('load',{file:blob});
        const rects=[index===8?{x:165/w,y:222/h,w:150/w,h:18/h}:{x:160/w,y:210/h,w:290/w,h:38/h}];if(index===9)rects.push({x:165/w,y:310/h,w:285/w,h:38/h});
        for(const rect of rects)await rpc('apply',{op:{tool:'rect',rect,points:[],size:.01,algorithm:index%2?'ns':'telea',hardness:.5}});
        const afterBlob=(await rpc('export')).blob;
        const decoded=await createImageBitmap(afterBlob);ctx.drawImage(decoded,0,0);decoded.close();const after=ctx.getImageData(0,0,w,h);
        let outside=0,inside=0,beforeError=0,afterError=0;
        for(let y=0;y<h;y++)for(let x=0;x<w;x++){const masked=rects.some(r=>x>=Math.round(r.x*w)&&x<Math.round((r.x+r.w)*w)&&y>=Math.round(r.y*h)&&y<Math.round((r.y+r.h)*h));const i=(y*w+x)*4;for(let k=0;k<4;k++){const d=Math.abs(after.data[i+k]-before.data[i+k]);if(masked){inside+=d;beforeError+=Math.abs(before.data[i+k]-truth[i+k]);afterError+=Math.abs(after.data[i+k]-truth[i+k]);}else outside=Math.max(outside,d);}}
        const afterUrl=c.toDataURL('image/png');
        await rpc('undo');if(index===9)await rpc('undo');
        const undoBlob=(await rpc('export')).blob;const ub=await createImageBitmap(undoBlob);ctx.drawImage(ub,0,0);ub.close();const undo=ctx.getImageData(0,0,w,h).data;
        const undoExact=undo.every((v,i)=>v===before.data[i]);
        await rpc('redo');await rpc('reset');
        worker.terminate();return{beforeUrl,afterUrl,outside,inside,beforeError,afterError,undoExact};
      },index);
      assert.equal(result.outside,0,scenarios[index]+' outside mask');assert.ok(result.inside>0);assert.ok(result.afterError<result.beforeError*.65,scenarios[index]+' removes synthetic text: error ratio '+result.afterError/result.beforeError);assert.equal(result.undoExact,true);
      for(const [which,url]of [['antes',result.beforeUrl],['despues',result.afterUrl]])await fs.writeFile(path.join(evidence,`${scenarios[index]}-${which}.png`),Buffer.from(url.split(',')[1],'base64'));
      if(!fixture)fixture=Buffer.from(result.beforeUrl.split(',')[1],'base64');
      results.push({scenario:scenarios[index],outsideMax:result.outside,errorRatio:Number((result.afterError/result.beforeError).toFixed(4)),undoExact:result.undoExact});
    }
    const editSelection=async()=>{
      await page.getByRole('button',{name:'Editar 1',exact:true}).click();
      await page.getByRole('dialog',{name:'Editar imagen'}).waitFor();
      await page.getByRole('button',{name:'Restablecer',exact:true}).waitFor();
      await page.waitForFunction(()=>!document.querySelector('[role="status"]'));
      await page.getByRole('radio',{name:'Selección rectangular',exact:true}).click();
      const box=await page.getByLabel('Imagen y máscara de borrado').boundingBox();
      await page.mouse.move(box.x+box.width*.25,box.y+box.height*.43);await page.mouse.down();await page.mouse.move(box.x+box.width*.71,box.y+box.height*.52);await page.mouse.up();
      await page.getByRole('button',{name:'Aplicar borrado',exact:true}).click();
      await page.waitForFunction(()=>!document.querySelector('[role="status"]'));
    };
    for(const width of [375,768,1440]){
      await page.setViewportSize({width,height:900});await page.goto(base);
      await page.getByLabel('Subir foto').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:fixture});
      await editSelection();
      const overflow=await page.evaluate(()=>{const d=document.querySelector('dialog');return d.scrollWidth>d.clientWidth+1||document.documentElement.scrollWidth>innerWidth;});assert.equal(overflow,false,`no overflow at ${width}`);
      if(width>680){const bounds=await page.getByRole('dialog').boundingBox();assert.ok(Math.abs(bounds.x+bounds.width/2-width/2)<1,'desktop dialog is centered');}
      await page.screenshot({path:path.join(evidence,`editor-${width}.png`)});
      await page.getByRole('button',{name:'Deshacer',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[role="status"]'));
      await page.getByRole('button',{name:'Rehacer',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[role="status"]'));
      await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
      assert.equal(await page.evaluate(()=>window.uploads.length),0,'edit pending before upload');
      await page.getByRole('button',{name:'Publicar prueba'}).click();await page.waitForFunction(()=>window.savedImages?.length===1);
      assert.equal(await page.evaluate(()=>window.uploads.length),1,'one upload of edited file');
      assert.notDeepEqual(Buffer.from(await page.evaluate(()=>Array.from(new Uint8Array(window.uploads[0])))),fixture,'upload contains the edited pixels');
      await page.getByRole('button',{name:'Publicar prueba'}).click();assert.equal(await page.evaluate(()=>window.uploads.length),1,'no duplicate upload on retry');
    }
    // The user must be able to undo a stroke BEFORE applying it, as well as
    // undoing/redoing the resulting image. Exercise the actual buttons and keys.
    await page.setViewportSize({width:375,height:667});await page.goto(base+'?existing');
    await page.getByRole('button',{name:'Editar 1',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[role="status"]'));
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const historyCanvas=page.getByLabel('Imagen y máscara de borrado');
    const canvasPixels=()=>historyCanvas.evaluate(c=>c.toDataURL());
    const paint=async(x,y)=>{const b=await historyCanvas.boundingBox();await page.mouse.move(b.x+b.width*x,b.y+b.height*y);await page.mouse.down();await page.mouse.move(b.x+b.width*(x+.08),b.y+b.height*y);await page.mouse.up();};
    const cleanOriginal=await canvasPixels();await paint(.3,.45);const firstMask=await canvasPixels();assert.notEqual(firstMask,cleanOriginal);
    assert.equal(await page.getByRole('button',{name:'Deshacer',exact:true}).isEnabled(),true,'undo works before apply');
    await page.getByRole('button',{name:'Deshacer',exact:true}).click();assert.equal(await canvasPixels(),cleanOriginal,'undo removes pending stroke');
    assert.equal(await page.getByRole('button',{name:'Aplicar borrado',exact:true}).isDisabled(),true);
    await page.getByRole('button',{name:'Rehacer',exact:true}).click();assert.equal(await canvasPixels(),firstMask,'redo restores pending stroke');
    await paint(.55,.45);const secondMask=await canvasPixels();assert.notEqual(secondMask,firstMask);
    await page.getByRole('button',{name:'Deshacer',exact:true}).click();assert.equal(await canvasPixels(),firstMask,'one stroke per history step');
    await page.getByRole('button',{name:'Rehacer',exact:true}).click();assert.equal(await canvasPixels(),secondMask);
    await historyCanvas.click({position:{x:2,y:2},button:'middle'});await page.keyboard.press('Control+z');assert.equal(await canvasPixels(),firstMask,'Ctrl+Z undoes selection');
    await page.keyboard.press('Control+Shift+z');assert.equal(await canvasPixels(),secondMask,'Ctrl+Shift+Z redoes selection');
    await page.getByRole('button',{name:'Aplicar borrado',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[role="status"]'));const appliedPixels=await canvasPixels();
    await page.getByRole('button',{name:'Deshacer',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[role="status"]'));assert.equal(await canvasPixels(),secondMask,'undo applied edit restores image and mask');
    await page.getByRole('button',{name:'Deshacer',exact:true}).click();assert.equal(await canvasPixels(),firstMask);
    await page.getByRole('button',{name:'Deshacer',exact:true}).click();assert.equal(await canvasPixels(),cleanOriginal);
    assert.equal(await page.getByRole('button',{name:'Deshacer',exact:true}).isDisabled(),true);
    for(let n=0;n<3;n++){await page.getByRole('button',{name:'Rehacer',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[role="status"]'));}
    assert.equal(await canvasPixels(),appliedPixels,'redo returns exact applied pixels');
    await page.getByRole('button',{name:'Deshacer',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[role="status"]'));
    await paint(.45,.65);assert.equal(await page.getByRole('button',{name:'Rehacer',exact:true}).isDisabled(),true,'new stroke drops redo branch');
    const smallOverflow=await page.evaluate(()=>{const d=document.querySelector('dialog');return d.scrollWidth>d.clientWidth+1||document.documentElement.scrollWidth>innerWidth;});assert.equal(smallOverflow,false,'375x667 has no horizontal overflow');
    const saveBounds=await page.getByRole('button',{name:'Guardar cambios',exact:true}).boundingBox();assert.ok(saveBounds.y+saveBounds.height<=667,'mobile save action stays visible');
    await page.screenshot({path:path.join(evidence,'editor-movil-375x667.png')});
    page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Cancelar',exact:true}).click();
    await page.goto(base+'?existing');
    let replacementCalls=0;
    await page.route('**/api/admin/upload/replace',async route=>{replacementCalls++;await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({ok:false,message:'Fallo simulado de subida'})});});
    await editSelection();await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.getByRole('alert').waitFor();
    assert.equal(await page.locator('#root > div img').first().getAttribute('src'),'/fixture.png','failed upload preserves valid old image');
    await page.unroute('**/api/admin/upload/replace');
    await page.route('**/api/admin/upload/replace',async route=>{replacementCalls++;assert.ok(route.request().postDataBuffer().includes(Buffer.from('url_old')));await route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,url:'/edited.png'})});});
    await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
    assert.deepEqual(await page.locator('#root > div img').evaluateAll(imgs=>imgs.map(i=>i.getAttribute('src'))),['/edited.png','/second.png','/third.png']);assert.equal(replacementCalls,2);
    await page.goto(base+'?existing');await page.getByRole('button',{name:'Editar 1',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[role="status"]'));
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(replacementCalls,2,'cancel sends no replacement');
    await editSelection();page.once('dialog',d=>d.dismiss());await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').isVisible(),true,'Esc asks before discarding');
    page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
    // Precision regression: anchored zoom, panning without losing the mask and
    // source/destination coordinates sent to the real healing worker.
    await page.setViewportSize({width:768,height:900});await page.goto(base+'?existing');
    await page.getByRole('button',{name:'Editar 1',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[role="status"]'));
    await page.getByRole('radio',{name:'Pincel corrector',exact:true}).click();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const imageLocator=page.getByLabel('Imagen y máscara de borrado'),area=page.getByLabel('Área de edición: rueda para ampliar, espacio y arrastrar para desplazar');
    let imageBox=await imageLocator.boundingBox();
    const anchor={x:imageBox.x+imageBox.width*.35,y:imageBox.y+imageBox.height*.48};
    await page.mouse.move(anchor.x,anchor.y);await page.mouse.wheel(0,-600);
    await page.waitForFunction(()=>parseInt(document.querySelector('[aria-label="Nivel de zoom"]').textContent)>100);
    imageBox=await imageLocator.boundingBox();
    assert.ok(Math.abs((anchor.x-imageBox.x)/imageBox.width-.35)<.002,`zoom keeps the image point under the cursor: ${JSON.stringify({anchor,imageBox,zoom:await page.getByLabel('Nivel de zoom').textContent(),area:await area.boundingBox()})}`);
    assert.ok(Math.abs((anchor.y-imageBox.y)/imageBox.height-.48)<.002,'zoom keeps vertical anchor');
    assert.equal(await page.evaluate(()=>scrollY),0,'wheel does not scroll the page');
    await page.getByRole('button',{name:'Acercar imagen',exact:true}).click();
    const areaBox=await area.boundingBox();const sourcePoint={x:areaBox.x+areaBox.width/2-30,y:areaBox.y+areaBox.height/2-20};
    imageBox=await imageLocator.boundingBox();const expectedSource={x:(sourcePoint.x-imageBox.x)/imageBox.width,y:(sourcePoint.y-imageBox.y)/imageBox.height};
    await page.getByRole('button',{name:'Elegir origen',exact:true}).click();await page.mouse.click(sourcePoint.x,sourcePoint.y);
    const target={x:sourcePoint.x+40,y:sourcePoint.y+30};
    const expectedTarget={x:(target.x-imageBox.x)/imageBox.width,y:(target.y-imageBox.y)/imageBox.height};
    await page.mouse.move(target.x,target.y);
    const brushBox=await page.getByTestId('brush-cursor').boundingBox();assert.ok(Math.abs(brushBox.width-imageBox.width*.025)<1,'brush outline matches the zoomed selection');
    await page.mouse.down();await page.mouse.move(target.x+10,target.y+5);await page.mouse.up();
    await page.keyboard.down('Space');await page.mouse.move(target.x,target.y);await page.mouse.down();await page.mouse.move(target.x+25,target.y+15);await page.mouse.up();await page.keyboard.up('Space');
    const movedBox=await imageLocator.boundingBox();assert.ok(Math.abs(movedBox.x-imageBox.x-25)<1,`space and drag pans while healing: ${JSON.stringify({before:imageBox,after:movedBox})}`);
    await page.getByRole('radio',{name:'Desplazar',exact:true}).click();await page.getByRole('radio',{name:'Pincel corrector',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'Aplicar borrado',exact:true}).isEnabled(),true,'switching to pan preserves selection');
    await page.getByRole('button',{name:'Aplicar borrado',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[role="status"]'));
    const operation=await page.evaluate(()=>window.photoOperations.at(-1));
    assert.ok(Math.abs(operation.source.x-expectedSource.x)<.002&&Math.abs(operation.source.y-expectedSource.y)<.002,'healing source is accurate after zoom');
    assert.ok(Math.abs(operation.points[0].x-expectedTarget.x)<.002&&Math.abs(operation.points[0].y-expectedTarget.y)<.002,'healing destination is accurate after zoom and pan');
    await page.waitForFunction(()=>document.querySelector('[data-testid="zoom-detail"]').dataset.ready==='true');
    await page.screenshot({path:path.join(evidence,'editor-zoom-corrector.png')});
    page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Restablecer',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[role="status"]'));
    await page.getByRole('button',{name:'Ajustar zoom',exact:true}).click();
    const touchSession=await page.context().newCDPSession(page);await touchSession.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
    const center={x:areaBox.x+areaBox.width/2,y:areaBox.y+areaBox.height/2};
    await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:center.x-30,y:center.y,id:1},{x:center.x+30,y:center.y,id:2}]});
    await touchSession.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:center.x-60,y:center.y,id:1},{x:center.x+60,y:center.y,id:2}]});
    await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForFunction(()=>parseInt(document.querySelector('[aria-label="Nivel de zoom"]').textContent)>150);
    assert.equal(await page.getByRole('button',{name:'Aplicar borrado',exact:true}).isDisabled(),true,'pinching creates no accidental brush mark');
    await touchSession.detach();await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
    const manual=await page.evaluate(async()=>{
      const c=document.createElement('canvas');c.width=400;c.height=300;const ctx=c.getContext('2d');ctx.fillStyle='#aabbcc';ctx.fillRect(0,0,400,300);ctx.fillStyle='#ddddee';ctx.fillRect(30,30,60,60);ctx.fillStyle='#111111';ctx.fillRect(200,100,50,50);
      const before=ctx.getImageData(0,0,400,300).data;const blob=await new Promise(r=>c.toBlob(r));
      const worker=new Worker('/photo-editor-worker.js');let seq=0;const rpc=(type,op)=>new Promise((resolve,reject)=>{worker.onmessage=({data})=>{data.bitmap?.close();if(data.error)reject(Error(data.error));else resolve(data);};worker.postMessage({id:++seq,type,...op});});
      await rpc('load',{file:blob});const op={tool:'clone',points:[{x:.55,y:.42}],source:{x:.15,y:.2},size:.08,hardness:1};
      await rpc('apply',{op});const afterBlob=(await rpc('export')).blob;const b=await createImageBitmap(afterBlob);ctx.drawImage(b,0,0);b.close();const after=ctx.getImageData(0,0,400,300).data;
      const center=(126*400+220)*4;const copied=after[center]===221&&after[center+1]===221&&after[center+2]===238;
      let outside=0;for(let y=0;y<300;y++)for(let x=0;x<400;x++)if(Math.hypot(x-220,y-126)>18)for(let k=0;k<4;k++)outside=Math.max(outside,Math.abs(after[(y*400+x)*4+k]-before[(y*400+x)*4+k]));
      await rpc('reset');await rpc('apply',{op:{...op,tool:'heal',hardness:.3}});const healing=(await rpc('export')).blob.size>0;worker.terminate();return{copied,outside,healing};
    });assert.equal(manual.copied,true);assert.equal(manual.outside,0);assert.equal(manual.healing,true);
    const large=await sharp({create:{width:8000,height:6000,channels:3,background:'silver'}}).png().toBuffer();
    const largeResult=await page.evaluate(async base64=>{
      const blob=await fetch('data:image/png;base64,'+base64).then(r=>r.blob());const worker=new Worker('/photo-editor-worker.js');let seq=0;
      const rpc=(type,args={})=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('48 MP timeout')),60000);worker.onmessage=({data})=>{clearTimeout(timeout);data.detailWidth=data.bitmap?.width;data.detailHeight=data.bitmap?.height;data.bitmap?.close();data.before?.close();if(data.error)reject(Error(data.error));else resolve(data);};worker.onerror=e=>reject(Error(e.message));worker.postMessage({id:++seq,type,...args});});
      const loaded=await rpc('load',{file:blob});const detail=await rpc('detail',{rect:{x:.5,y:.5,w:.005,h:.005},width:256,height:256});await rpc('apply',{op:{tool:'rect',rect:{x:.5,y:.5,w:.005,h:.005},points:[],size:.003,algorithm:'telea'}});const result=await rpc('export');worker.terminate();return{width:loaded.width,height:loaded.height,bytes:result.blob.size,detailWidth:detail.detailWidth,detailHeight:detail.detailHeight};
    },large.toString('base64'));assert.equal(largeResult.width,8000);assert.equal(largeResult.height,6000);assert.ok(largeResult.bytes>0);assert.equal(largeResult.detailWidth,40,'zoom reads original pixels rather than enlarging the 1600px preview');assert.equal(largeResult.detailHeight,30);
    await fs.writeFile(path.join(evidence,'metrics.json'),JSON.stringify({scenarios:results,viewports:[375,768,1440],newUploadCount:1,replacementOrderPreserved:true,outsideMaskMax:0,manualTools:manual,largeImage:largeResult,zoom:{cursorAnchor:true,healingCoordinates:true,panPreservesMask:true,pinchDoesNotPaint:true},history:{pendingStrokes:true,appliedPixels:true,keyboardShortcuts:true,redoBranch:true},smallMobile:{width:375,height:667,actionsVisible:true}},null,2)+'\n');
    console.log('test-photo-editor.js ok: 11 synthetic scenarios, exact outside-mask pixels, undo/redo, new/existing/cancel/error flows, 375/768/1440');
  }finally{await browser?.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
