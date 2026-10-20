import { randomUUID } from "node:crypto";
import { signedInUser } from "./_session.js";
import { publicUrl, storageLimit, storageReady, uploadUrl, usedBytes } from "./_r2.js";

const noStore = { "Cache-Control": "no-store" };
const maxPhoto = 75 * 1024 * 1024;
const photoTypes = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export async function POST(request) {
  if (!(await signedInUser(request))) return Response.json({ error: "Sign in first" }, { status: 401, headers: noStore });
  if (!storageReady()) return Response.json({ error: "Photo storage is not set up" }, { status: 503, headers: noStore });
  let size = 0;
  let type = "";
  try {
    const body = await request.json();
    size = Number(body.size);
    type = String(body.type || "");
  } catch {
    size = 0;
  }
  const ext = photoTypes[type];
  if (!ext || !Number.isInteger(size) || size <= 0 || size > maxPhoto) {
    return Response.json({ error: "Photograph is too large" }, { status: 400, headers: noStore });
  }
  const key = `photos/${Date.now()}-${randomUUID()}.${ext}`;
  try {
    const used = await usedBytes();
    if (used + size > storageLimit) {
      return Response.json({ error: "Storage is full", used, limit: storageLimit }, { status: 507, headers: noStore });
    }
    return Response.json(
      { url: await uploadUrl(key, type, size), image: publicUrl(key), used: used + size, limit: storageLimit },
      { headers: noStore },
    );
  } catch (error) {
    console.error("Upload link failed:", error.message);
    return Response.json({ error: "Could not start the upload" }, { status: 502, headers: noStore });
  }
}
