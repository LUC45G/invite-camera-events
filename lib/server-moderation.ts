import type { NSFWJS } from "nsfwjs";

let model: Promise<NSFWJS> | undefined;
let queue: Promise<unknown> = Promise.resolve();

async function classify(image: Buffer): Promise<number | null> {
  try {
    const tf = await import("@tensorflow/tfjs");
    if (!model) {
      model = (async () => {
        tf.enableProdMode();
        await tf.setBackend("cpu");
        await tf.ready();
        const { load } = await import("nsfwjs/core");
        const { MobileNetV2Model } = await import("nsfwjs/models/mobilenet_v2");
        return load("MobileNetV2", { modelDefinitions: [MobileNetV2Model] });
      })().catch((error) => { model = undefined; throw error; });
    }
    const classifier = await model;
    const { default: sharp } = await import("sharp");
    const pixels = await sharp(image, { limitInputPixels: 16_000_000 })
      .resize(224, 224, { fit: "fill" }).removeAlpha().toColourspace("srgb").raw().toBuffer();
    const tensor = tf.tensor3d(new Uint8Array(pixels), [224, 224, 3], "int32");
    try {
      const predictions = await classifier.classify(tensor);
      const score = Math.max(...predictions.filter((p) => ["Porn", "Hentai", "Sexy"].includes(p.className)).map((p) => p.probability));
      return Number.isFinite(score) && score >= 0 && score <= 1 ? score : null;
    } finally { tensor.dispose(); }
  } catch {
    // A classifier failure must never auto-approve a photo.
    return null;
  }
}

export function classifyNsfw(image: Buffer): Promise<number | null> {
  // Keep CPU inference and its tensors bounded to one image per process.
  const result = queue.then(() => classify(image));
  queue = result.then(() => undefined, () => undefined);
  return result;
}
