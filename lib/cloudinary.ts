import { v2 as cloudinary } from "cloudinary";
import { env } from "@/lib/env";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

// Firma para signed uploads. Incluye el qr_token como contexto para
// que no se pueda firmar sin un QR válido.
export function signUpload(qrToken: string) {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = {
    timestamp: String(timestamp),
    context: `qr_token=${qrToken}`,
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

export { cloudinary };
