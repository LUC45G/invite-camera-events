import { v2 as cloudinary } from "cloudinary";
import { env } from "@/lib/env";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

// Firma para subida directa firmada: el cliente envía timestamp + folder a Cloudinary.
export function signUpload(folder: string) {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = {
    timestamp: String(timestamp),
    folder,
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
