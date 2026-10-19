import { signedInUser } from "./_session.js";
import { readObject, storageReady, writeObject } from "./_r2.js";
import { cleanLibrary, libraryKey } from "./_library.js";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  if (!storageReady()) return Response.json({ library: null }, { headers: noStore });
  try {
    const raw = await readObject(libraryKey);
    return Response.json({ library: raw ? cleanLibrary(JSON.parse(raw)) : null }, { headers: noStore });
  } catch (error) {
    console.error("Library read failed:", error.message);
    return Response.json({ error: "Could not read the library" }, { status: 502, headers: noStore });
  }
}

export async function PUT(request) {
  if (!(await signedInUser(request))) return Response.json({ error: "Sign in first" }, { status: 401, headers: noStore });
  if (!storageReady()) return Response.json({ error: "Photo storage is not set up" }, { status: 503, headers: noStore });
  const raw = await request.text();
  if (raw.length > 3_000_000) return Response.json({ error: "Library is too large" }, { status: 413, headers: noStore });
  let library = null;
  try {
    library = cleanLibrary(JSON.parse(raw));
  } catch {
    library = null;
  }
  if (!library) return Response.json({ error: "Library is not valid" }, { status: 400, headers: noStore });
  try {
    await writeObject(libraryKey, JSON.stringify(library), "application/json");
  } catch (error) {
    console.error("Library write failed:", error.message);
    return Response.json({ error: "Could not save the library" }, { status: 502, headers: noStore });
  }
  return Response.json({ ok: true }, { headers: noStore });
}
