import sharp from "sharp";

export const maxDuration = 60;

const allowedWidths = new Set([1400, 2200]);

function allowedOrigin() {
  const base = (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
  if (!base.startsWith("https://")) return "";
  try {
    return new URL(base).origin;
  } catch {
    return "";
  }
}

export async function GET(request) {
  const url = new URL(request.url);
  const src = url.searchParams.get("src") || "";
  const width = Number(url.searchParams.get("w"));
  const origin = allowedOrigin();
  let image;
  try {
    image = new URL(src);
  } catch {
    return new Response("Bad photograph", { status: 400 });
  }
  if (!origin || image.origin !== origin || image.search || !/^\/photos\/[a-z0-9.-]+\.(jpe?g|png|webp)$/i.test(image.pathname)) {
    return new Response("Bad photograph", { status: 400 });
  }
  const size = allowedWidths.has(width) ? width : 1400;
  const upstream = await fetch(image, { redirect: "error" });
  if (!upstream.ok) return new Response("Missing photograph", { status: 404 });
  const type = upstream.headers.get("content-type") || "";
  if (!type.startsWith("image/")) return new Response("Not a photograph", { status: 415 });
  const bytes = Buffer.from(await upstream.arrayBuffer());
  const out = await sharp(bytes, { limitInputPixels: 180_000_000, sequentialRead: true })
    .rotate()
    .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 74 })
    .toBuffer();
  return new Response(out, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
