import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { Readable } from "node:stream";

const CLOUDINARY_FOLDERS = {
  products: "macsomenos/productos",
  clients: "macsomenos/clientes",
} as const;

type CloudinaryResource = {
  created_at?: string;
  secure_url?: string;
  url?: string;
};

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  );
}

function configureCloudinary() {
  if (process.env.CLOUDINARY_URL) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function uploadImageToCloudinary(
  input: Buffer,
  options: { scope: keyof typeof CLOUDINARY_FOLDERS; publicId?: string }
) {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary no está configurado");
  }
  configureCloudinary();

  return new Promise<UploadApiResponse>((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDERS[options.scope],
        public_id: options.publicId,
        resource_type: "image",
        overwrite: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("Cloudinary no devolvió resultado"));
        resolve(result);
      }
    );
    Readable.from(input).pipe(upload);
  });
}

export async function listCloudinaryImages(scope: keyof typeof CLOUDINARY_FOLDERS, maxResults = 100) {
  if (!isCloudinaryConfigured()) return [];
  configureCloudinary();

  const result = await cloudinary.api.resources({
    type: "upload",
    resource_type: "image",
    prefix: `${CLOUDINARY_FOLDERS[scope]}/`,
    max_results: maxResults,
  });
  const resources: CloudinaryResource[] = Array.isArray(result?.resources) ? result.resources : [];
  return resources
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .map((resource) => String(resource.secure_url || resource.url || ""))
    .filter(Boolean);
}

export async function deleteCloudinaryImageByUrl(url: string) {
  if (!isCloudinaryConfigured()) return false;
  const publicId = publicIdFromCloudinaryUrl(url);
  if (!publicId) return false;
  configureCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  return true;
}

function publicIdFromCloudinaryUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("cloudinary.com")) return "";
    const marker = "/image/upload/";
    const index = parsed.pathname.indexOf(marker);
    if (index < 0) return "";
    const afterUpload = parsed.pathname.slice(index + marker.length);
    const parts = afterUpload.split("/").filter(Boolean);
    const withoutVersion = parts[0]?.match(/^v\d+$/) ? parts.slice(1) : parts;
    const joined = withoutVersion.join("/");
    return joined.replace(/\.[a-z0-9]+$/i, "");
  } catch {
    return "";
  }
}
