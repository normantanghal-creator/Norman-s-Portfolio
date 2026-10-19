import { googleClientId, sessionCookie, signedInUser, verifyGoogle } from "./_session.js";
import { storageReady } from "./_r2.js";

const noStore = { "Cache-Control": "no-store" };

export async function GET(request) {
  return Response.json(
    { user: await signedInUser(request), google: googleClientId(), storage: storageReady() },
    { headers: noStore },
  );
}

export async function POST(request) {
  if (!googleClientId()) return Response.json({ error: "Google sign-in is not set up" }, { status: 503, headers: noStore });
  let credential = "";
  try {
    credential = String((await request.json()).credential || "");
  } catch {
    return Response.json({ error: "Missing Google credential" }, { status: 400, headers: noStore });
  }
  let user = null;
  try {
    user = await verifyGoogle(credential);
  } catch (error) {
    console.error("Google token rejected:", error.code || error.message);
    return Response.json({ error: "Google sign-in could not be verified" }, { status: 401, headers: noStore });
  }
  if (!user) return Response.json({ error: "This Google account is not allowed" }, { status: 403, headers: noStore });
  return Response.json({ user }, { headers: { ...noStore, "Set-Cookie": await sessionCookie(user) } });
}
