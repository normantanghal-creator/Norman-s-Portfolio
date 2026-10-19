import { signedInUser } from "./_session.js";
import { deleteObject, keyFromPublicUrl, storageReady } from "./_r2.js";

const noStore = { "Cache-Control": "no-store" };

export async function DELETE(request) {
  if (!(await signedInUser(request))) return Response.json({ error: "Sign in first" }, { status: 401, headers: noStore });
  if (!storageReady()) return Response.json({ error: "Photo storage is not set up" }, { status: 503, headers: noStore });
  const key = keyFromPublicUrl(new URL(request.url).searchParams.get("image"));
  if (!key) return Response.json({ error: "Not a stored photograph" }, { status: 400, headers: noStore });
  try {
    await deleteObject(key);
  } catch (error) {
    console.error("Photo delete failed:", error.message);
    return Response.json({ error: "Could not delete the photograph" }, { status: 502, headers: noStore });
  }
  return Response.json({ ok: true }, { headers: noStore });
}
