import { randomUUID } from "node:crypto";
import { signedInUser } from "./_session.js";
import { publicUrl, storageLimit, storageReady, uploadUrl, usedBytes } from "./_r2.js";

const noStore = { "Cache-Control": "no-store" };
const maxPhoto = 50 * 1024 * 1024;

export async function POST(request) {
  if (!(await signedInUser(request))) return Response.json({ error: "Sign in first" }, { status: 401, headers: noStore });
  if (!storageReady()) return Response.json({ error: "Photo storage is not set up" }, { status: 503, headers: noStore });
  let size = 0;
  try {
    size = Number((await request.json()).size);
  } catch {
    size = 0;
  }
  if (!Number.isInteger(size) || size <= 0 || size > maxPhoto) {
    return Response.json({ error: "Photograph is too large" }, { status: 400, headers: noStore });
  }
  const key = `photos/${Date.now()}-${randomUUID()}.jpg`;
  try {
    const used = await usedBytes();
    if (used + size > storageLimit) {
      return Response.json({ error: "Storage is full", used, limit: storageLimit }, { status: 507, headers: noStore });
    }
    return Response.json(
      { url: await uploadUrl(key, "image/jpeg", size), image: publicUrl(key), used: used + size, limit: storageLimit },
      { headers: noStore },
    );
  } catch (error) {
    console.error("Upload link failed:", error.message);
    return Response.json({ error: "Could not start the upload" }, { status: 502, headers: noStore });
  }
}
