import { randomUUID } from "node:crypto";
import { signedInUser } from "./_session.js";
import { publicUrl, storageReady, uploadUrl } from "./_r2.js";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request) {
  if (!(await signedInUser(request))) return Response.json({ error: "Sign in first" }, { status: 401, headers: noStore });
  if (!storageReady()) return Response.json({ error: "Photo storage is not set up" }, { status: 503, headers: noStore });
  const key = `photos/${Date.now()}-${randomUUID()}.jpg`;
  try {
    return Response.json({ url: await uploadUrl(key, "image/jpeg"), image: publicUrl(key) }, { headers: noStore });
  } catch (error) {
    console.error("Upload link failed:", error.message);
    return Response.json({ error: "Could not start the upload" }, { status: 502, headers: noStore });
  }
}
