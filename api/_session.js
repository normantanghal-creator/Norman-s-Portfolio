import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";

const cookieName = "norman_session";
const maxAge = 7 * 24 * 60 * 60;
const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function secret() {
  return new TextEncoder().encode(process.env.SESSION_SECRET || "");
}

function allowedEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function googleClientId() {
  const ready = process.env.GOOGLE_CLIENT_ID && (process.env.SESSION_SECRET || "").length >= 32 && allowedEmails().length;
  return ready ? process.env.GOOGLE_CLIENT_ID : null;
}

export async function verifyGoogle(credential) {
  const { payload } = await jwtVerify(credential, googleKeys, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const email = String(payload.email || "").toLowerCase();
  if (payload.email_verified !== true || !allowedEmails().includes(email)) return null;
  return {
    email,
    name: String(payload.name || payload.given_name || "").slice(0, 80),
    picture: String(payload.picture || "").slice(0, 500),
  };
}

export async function sessionCookie(user) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(secret());
  return `${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export async function signedInUser(request) {
  if (!googleClientId()) return null;
  const cookies = request.headers.get("cookie") || "";
  const match = cookies.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`));
  if (!match) return null;
  try {
    const { payload } = await jwtVerify(match.slice(cookieName.length + 1), secret(), { algorithms: ["HS256"] });
    const email = String(payload.email || "").toLowerCase();
    if (!allowedEmails().includes(email)) return null;
    return { email, name: String(payload.name || ""), picture: String(payload.picture || "") };
  } catch {
    return null;
  }
}
