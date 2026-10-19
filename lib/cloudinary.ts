import { v2 as cloudinary } from "cloudinary";
import { env } from "@/lib/env";
import { classifyNsfw } from "./server-moderation";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

// Firma para subida directa firmada: el cliente envía timestamp + folder a Cloudinary.
export function signUpload(folder: string, publicId: string) {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = {
    timestamp: String(timestamp),
    folder,
    public_id: publicId,
    overwrite: "false",
  };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    env.CLOUDINARY_API_SECRET,
  );
  return {
    timestamp,
    signature,
    apiKey: env.CLOUDINARY_API_KEY,
  };
}

// URL de thumbnail (w 480, f_auto, q_auto) para un publicId subido.
export function thumbnailUrl(publicId: string) {
  return cloudinary.url(publicId, {
    transformation: [{ width: 480, crop: "limit", quality: "auto", fetch_format: "auto" }],
    secure: true,
  });
}

export { cloudinary };

export async function verifyUploadedImage(publicId: string) {
  const resource = await cloudinary.api.resource(publicId, { resource_type: "image", type: "upload", timeout: 15000 });
  if (resource.public_id !== publicId || resource.resource_type !== "image" || !resource.format ||
    ![resource.bytes, resource.width, resource.height, resource.version].every((value) => Number.isFinite(Number(value)) && Number(value) > 0)) {
    throw new Error("Cloudinary no confirmó la imagen esperada");
  }
  return { width: Number(resource.width), height: Number(resource.height),
    mime: `image/${resource.format}`, sizeKb: Math.round(Number(resource.bytes) / 1024),
    version: Number(resource.version) };
}

export async function classifyUploadedImage(publicId: string, version: number): Promise<number | null> {
  try {
    const response = await fetch(cloudinary.url(publicId, { secure: true, version,
      transformation: [{ width: 224, height: 224, crop: "fit", fetch_format: "jpg" }] }),
    { signal: AbortSignal.timeout(15000) });
    if (!response.ok || !response.body) return null;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        length += part.value.byteLength;
        if (length > 1_000_000) return null;
        chunks.push(part.value);
      }
    } finally { await reader.cancel(); }
    return await classifyNsfw(Buffer.concat(chunks));
  } catch { return null; }
}
