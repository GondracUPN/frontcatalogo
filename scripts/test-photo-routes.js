const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const Module=require('node:module');
const {build}=require('esbuild');
const sharp=require('sharp');
const {NextRequest}=require('next/server');

async function main(){
  const root=path.resolve(__dirname,'..'),temp=await fs.mkdtemp(path.join(os.tmpdir(),'photo-routes-'));
  const originalEnv={...process.env},originalFetch=global.fetch;
  const state={cloud:true,watermarks:0,uploads:[],deleted:[],calls:[],access:true,role:'ADMIN',failUpload:false,committed:new Set(),lostResponse:false};
  global.__photoRouteTest=state;
  process.env.PHOTO_DELETE_SECRET='synthetic-photo-secret';process.env.CATALOG_SYNC_SECRET='synthetic-sync-secret';process.env.REVALIDATE_SECRET='synthetic-revalidate-secret';
  process.env.UPLOAD_DIR=temp;process.env.ORIGINAL_UPLOAD_DIR=path.join(temp,'originals');
  const nativeRequire=Module.createRequire(path.join(root,'package.json'));
  const compile=async(relative)=>{
    const result=await build({entryPoints:[path.join(root,relative)],bundle:true,platform:'node',format:'cjs',write:false,packages:'external',plugins:[{name:'photo-test-mocks',setup(b){
      b.onResolve({filter:/cloudinary$|_image-protection$|^next\/cache$/},args=>({path:args.path,namespace:'photo-test'}));
      b.onLoad({filter:/.*/,namespace:'photo-test'},args=>{
        if(args.path==='next/cache')return{contents:'exports.revalidateTag=()=>{}'};
        if(args.path.includes('cloudinary'))return{contents:`
          exports.isCloudinaryConfigured=()=>global.__photoRouteTest.cloud;
          exports.plannedProductImageUrl=id=>'https://res.cloudinary.com/test/image/upload/macsomenos/productos/'+id+'.png';
          exports.publicIdFromCloudinaryUrl=url=>{try{const u=new URL(url);return u.hostname==='res.cloudinary.com'?u.pathname.split('/image/upload/')[1]?.replace(/\\.png$/,'')||'':''}catch{return ''}};
          exports.uploadImageToCloudinary=async(input,options)=>{const s=global.__photoRouteTest;if(s.failUpload)throw Error('simulated upload error');s.uploads.push(input);return {secure_url:exports.plannedProductImageUrl(options.publicId),bytes:input.length}};
          exports.deleteCloudinaryImageByUrl=async url=>{global.__photoRouteTest.deleted.push(url);return true;};`};
        return{contents:`const fs=require('node:fs/promises');exports.ALLOWED_IMAGE_MIME=new Set(['image/png','image/jpeg','image/webp']);exports.EXT_BY_MIME={'image/png':'.png'};exports.privateOriginalsDir=()=>process.env.ORIGINAL_UPLOAD_DIR;exports.watermarkBuffer=async b=>{global.__photoRouteTest.watermarks++;return b;};exports.applyWatermark=async(b,p)=>{global.__photoRouteTest.watermarks++;await fs.writeFile(p,b);};`};
      });
    }}]});
    const m={exports:{}};new Function('require','module','exports',Buffer.from(result.outputFiles[0].contents).toString())(nativeRequire,m,m.exports);return m.exports;
  };
  const makeRequest=(route,body,token=true,internal=false)=>new NextRequest('http://localhost'+route,{method:'POST',headers:{...(token?{cookie:'token=synthetic-token'}:{}),...(internal?{'x-photo-delete-secret':process.env.PHOTO_DELETE_SECRET}:{}),...(!(body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body instanceof FormData?body:JSON.stringify(body)});
  const image=await sharp({create:{width:64,height:40,channels:3,background:{r:180,g:190,b:200}}}).png().toBuffer();
  const form=(type='image/png',buffer=image)=>{const f=new FormData();f.set('file',new File([buffer],'test.png',{type}));f.set('productId','aaaaaaaa-1111-4111-8111-111111111111');f.set('url_old','/uploads/wm-old.png');return f;};
  try{
    global.fetch=async(url,options={})=>{
      state.calls.push({url:String(url),options});
      if(String(url).endsWith('/auth/me'))return Response.json({role:state.role});
      if(String(url).includes('/photos/access')){const imageUrl=new URL(url).searchParams.get('url');return Response.json({ok:state.access&&(imageUrl==='/uploads/wm-old.png'||state.committed.has(imageUrl))});}
      if(String(url).includes('/photos/reserve')){assert.equal(options.headers['x-sync-secret'],process.env.CATALOG_SYNC_SECRET);return Response.json({ok:true});}
      if(String(url).includes('/photos/replace')){const next=JSON.parse(options.body).url_new;state.committed.add(next);if(state.lostResponse)throw Error('response lost after commit');return Response.json({ok:true,url:next});}
      throw Error('Unexpected network request in tests: '+url);
    };
    const replace=await compile('app/api/admin/upload/replace/route.ts');
    assert.equal((await replace.POST(makeRequest('/api/admin/upload/replace',form(),false))).status,401);
    state.access=false;assert.equal((await replace.POST(makeRequest('/api/admin/upload/replace',form()))).status,403);assert.equal(state.uploads.length,0);
    state.access=true;assert.equal((await replace.POST(makeRequest('/api/admin/upload/replace',form('text/plain')))).status,400);
    const result=await replace.POST(makeRequest('/api/admin/upload/replace',form()));assert.equal(result.status,200);assert.equal(state.watermarks,0,'saved image is not watermarked twice');
    assert.equal(state.uploads.length,1);const decoded=await sharp(state.uploads[0]).metadata();assert.equal(decoded.width,64);assert.equal(decoded.height,40);
    assert.ok(state.calls.findIndex(c=>c.url.endsWith('/photos/reserve'))<state.calls.findIndex(c=>c.url.endsWith('/photos/replace')));
    state.failUpload=true;const commits=state.calls.filter(c=>c.url.endsWith('/photos/replace')).length;
    assert.equal((await replace.POST(makeRequest('/api/admin/upload/replace',form()))).status,500);assert.equal(state.calls.filter(c=>c.url.endsWith('/photos/replace')).length,commits,'no DB commit after upload failure');state.failUpload=false;
    state.lostResponse=true;assert.equal((await replace.POST(makeRequest('/api/admin/upload/replace',form()))).status,200,'recover committed URL after ambiguous network failure');state.lostResponse=false;
    // EXIF 6 rotates 40x64 input to 64x40, without touching inventory metadata.
    const exif=await sharp({create:{width:40,height:64,channels:3,background:'silver'}}).jpeg().withMetadata({orientation:6}).toBuffer();
    await replace.POST(makeRequest('/api/admin/upload/replace',form('image/jpeg',exif)));const oriented=await sharp(state.uploads.at(-1)).metadata();assert.equal(oriented.width,64);assert.equal(oriented.height,40);
    const upload=await compile('app/api/admin/upload/route.ts');await upload.POST(makeRequest('/api/admin/upload',form()));assert.equal(state.watermarks,1,'new image watermarked once');
    state.cloud=false;await upload.POST(makeRequest('/api/admin/upload',form()));assert.equal(state.watermarks,2);assert.ok(!(await fs.readdir(temp)).includes('originals'),'no new retained original');
    const deleteFile=await compile('app/api/admin/photos/delete-file/route.ts');
    const photoSecret=process.env.PHOTO_DELETE_SECRET;
    delete process.env.PHOTO_DELETE_SECRET;
    assert.equal((await deleteFile.POST(makeRequest('/api/admin/photos/delete-file',{url:'/uploads/wm-old.png'},false,true))).status,503,'missing delete secret fails closed');
    process.env.PHOTO_DELETE_SECRET=photoSecret;
    const revalidateOnly=new NextRequest('http://localhost/api/admin/photos/delete-file',{method:'POST',headers:{'Content-Type':'application/json','x-revalidate-secret':process.env.REVALIDATE_SECRET},body:JSON.stringify({url:'/uploads/wm-old.png'})});
    assert.equal((await deleteFile.POST(revalidateOnly)).status,401,'revalidation secret cannot delete photos');
    await fs.mkdir(process.env.ORIGINAL_UPLOAD_DIR);await fs.writeFile(path.join(temp,'wm-old.png'),image);await fs.writeFile(path.join(process.env.ORIGINAL_UPLOAD_DIR,'old.png'),image);
    assert.equal((await deleteFile.POST(makeRequest('/api/admin/photos/delete-file',{url:'/uploads/wm-old.png'},false))).status,401);
    assert.equal((await deleteFile.POST(makeRequest('/api/admin/photos/delete-file',{url:'/uploads/wm-old.png'},false,true))).status,200);
    await assert.rejects(()=>fs.access(path.join(temp,'wm-old.png')));await assert.rejects(()=>fs.access(path.join(process.env.ORIGINAL_UPLOAD_DIR,'old.png')));
    assert.equal((await deleteFile.POST(makeRequest('/api/admin/photos/delete-file',{url:'/uploads/../private.png'},false,true))).status,400);
    console.log('test-photo-routes.js ok: auth, ownership, MIME, upload failure, EXIF, original resolution, watermark counts, reserved upload, local + private deletion');
  }finally{
    process.env=originalEnv;global.fetch=originalFetch;delete global.__photoRouteTest;
    // Remove only exact test files and its known empty directories.
    for(const file of await fs.readdir(temp))if(file!=='originals')await fs.unlink(path.join(temp,file));
    await fs.rmdir(path.join(temp,'originals')).catch(()=>{});await fs.rmdir(temp);
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
