import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { revalidateTag } from "next/cache";
import { requireStaff } from "../../_admin-auth";
import { ALLOWED_IMAGE_MIME } from "../../_image-protection";
import { isCloudinaryConfigured, plannedProductImageUrl, uploadImageToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const authError = await requireStaff(req);
  if (authError) return authError;
  const token = req.cookies.get("token")?.value;
  const base = (process.env.API_BASE_URL || "http://127.0.0.1:3101").replace(/\/+$/, "");
  const headers = {Authorization:`Bearer ${token}`,"Content-Type":"application/json","x-sync-secret":process.env.CATALOG_SYNC_SECRET || ""};
  let plannedUrl = "", productId = "";
  try {
    const form = await req.formData();
    const file = form.get("file");
    const id = String(form.get("productId") || "");
    productId = id;
    const old = String(form.get("url_old") || "");
    if (!/^[0-9a-f-]{36}$/i.test(id) || !(file instanceof File) || !ALLOWED_IMAGE_MIME.has(file.type) || !file.size || file.size > 64*1024*1024) return NextResponse.json({ok:false,message:"Imagen inválida (máximo 64 MB)"},{status:400});
    const access = await fetch(`${base}/admin/public/${id}/photos/access?url=${encodeURIComponent(old)}`,{headers,cache:"no-store",signal:AbortSignal.timeout(15000)});
    if (!access.ok || !(await access.json()).ok) return NextResponse.json({ok:false,message:"No tienes acceso a esta imagen"},{status:access.status === 401 ? 401 : 403});
    const buffer = await sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:50000000}).rotate().png().toBuffer();
    const publicId = randomUUID();
    const cloud = isCloudinaryConfigured();
    if (!cloud && process.env.NODE_ENV === "production") throw new Error("Cloudinary no está configurado");
    const planned = cloud ? plannedProductImageUrl(publicId) : `/uploads/wm-${publicId}.png`;
    plannedUrl = planned;
    const reservation = await fetch(`${base}/admin/public/${id}/photos/reserve`,{method:"POST",headers,body:JSON.stringify({url_old:old,url_new:planned}),signal:AbortSignal.timeout(15000)});
    if (!reservation.ok) throw new Error("No se pudo reservar el reemplazo");
    let url = planned;
    if (cloud) {
      const uploaded = await uploadImageToCloudinary(buffer,{scope:"products",publicId});
      if (!uploaded.secure_url || !uploaded.bytes) throw new Error("Cloudinary no confirmó la subida");
      // Use the stable unversioned URL reserved above; its public_id is unique.
      url = planned;
    } else {
      const root = process.env.UPLOAD_DIR || path.join(process.cwd(),"public","uploads");
      await fs.mkdir(root,{recursive:true});
      await fs.writeFile(path.join(root,path.basename(url)),buffer,{flag:"wx"});
    }
    const res = await fetch(`${base}/admin/public/${id}/photos/replace`,{method:"POST",headers,body:JSON.stringify({url_old:old,url_new:url}),signal:AbortSignal.timeout(60000)});
    const result = await res.json();
    if (res.ok && result.ok) { revalidateTag("catalog-products"); revalidateTag("catalog-staged"); }
    return NextResponse.json(result,{status:res.status});
  } catch (e) {
    if (plannedUrl && productId) {
      try {
        const check = await fetch(`${base}/admin/public/${productId}/photos/access?url=${encodeURIComponent(plannedUrl)}`, { headers, cache: "no-store", signal: AbortSignal.timeout(10000) });
        if (check.ok && (await check.json()).ok) {
          revalidateTag("catalog-products"); revalidateTag("catalog-staged");
          return NextResponse.json({ ok: true, url: plannedUrl });
        }
      } catch { /* The reservation remains available for a safe retry. */ }
    }
    // The reserved outbox cleans uncommitted files after a crash or failed commit.
    // Never delete immediately on an ambiguous network error after COMMIT.
    return NextResponse.json({ok:false,message:e instanceof Error ? e.message : "No se pudo reemplazar"},{status:500});
  }
}
