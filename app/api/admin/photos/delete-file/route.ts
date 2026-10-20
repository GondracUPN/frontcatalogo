import { timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { deleteCloudinaryImageByUrl, publicIdFromCloudinaryUrl, plannedProductImageUrl } from "@/lib/cloudinary";
import { privateOriginalsDir } from "../../_image-protection";

export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const expected = Buffer.from(process.env.REVALIDATE_SECRET || "");
  const actual = Buffer.from(req.headers.get("x-revalidate-secret") || "");
  if (!expected.length || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ok:false},{status:401});
  try {
    const { url } = await req.json();
    const publicId = publicIdFromCloudinaryUrl(String(url));
    if (publicId.startsWith("macsomenos/productos/")) {
      // Never allow deletion in another Cloudinary account.
      const cloud = new URL(plannedProductImageUrl("account-check")).pathname.split("/")[1];
      if (!cloud || new URL(url).pathname.split("/")[1] !== cloud) throw new Error("Cuenta Cloudinary inválida");
      if (!await deleteCloudinaryImageByUrl(url)) throw new Error("Borrado no configurado");
    } else {
      if (!/^\/uploads\/wm-[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp|avif)$/.test(url)) return NextResponse.json({ok:false},{status:400});
      const name = path.basename(url);
      const root = process.env.UPLOAD_DIR || path.join(process.cwd(),"public","uploads");
      // Exact basenames only; never enumerate or delete directories.
      const candidates = [path.join(root,name),path.join(root,name.slice(3)),path.join(privateOriginalsDir("uploads"),name.slice(3))];
      for (const file of candidates) await fs.unlink(file).catch(e => { if (e.code !== "ENOENT") throw e; });
    }
    return NextResponse.json({ok:true});
  } catch {
    return NextResponse.json({ok:false,message:"No se pudo borrar el archivo; se reintentará"},{status:500});
  }
}
