import { signedInUser } from "./_session.js";
import { storageLimit, storageReady, usedBytes } from "./_r2.js";

const noStore = { "Cache-Control": "no-store" };

export async function GET(request) {
  if (!(await signedInUser(request))) return Response.json({ error: "Sign in first" }, { status: 401, headers: noStore });
  if (!storageReady()) return Response.json({ error: "Photo storage is not set up" }, { status: 503, headers: noStore });
  try {
    return Response.json({ used: await usedBytes(), limit: storageLimit }, { headers: noStore });
  } catch (error) {
    console.error("Storage check failed:", error.message);
    return Response.json({ error: "Could not check storage" }, { status: 502, headers: noStore });
  }
}
