import { AwsClient } from "aws4fetch";

const env = () => ({
  account: process.env.R2_ACCOUNT_ID || "",
  keyId: process.env.R2_ACCESS_KEY_ID || "",
  key: process.env.R2_SECRET_ACCESS_KEY || "",
  bucket: process.env.R2_BUCKET || "",
  publicBase: (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, ""),
});

export function storageReady() {
  const { account, keyId, key, bucket, publicBase } = env();
  return Boolean(account && keyId && key && bucket && publicBase.startsWith("https://"));
}

export function publicUrl(key) {
  return `${env().publicBase}/${key}`;
}

export function keyFromPublicUrl(url) {
  const prefix = `${env().publicBase}/photos/`;
  const value = String(url || "");
  if (!value.startsWith(prefix)) return "";
  const key = value.slice(env().publicBase.length + 1);
  return /^photos\/[a-z0-9-]+\.jpg$/.test(key) ? key : "";
}

function client() {
  const { keyId, key } = env();
  return new AwsClient({ accessKeyId: keyId, secretAccessKey: key, service: "s3", region: "auto" });
}

function objectUrl(key) {
  const { account, bucket } = env();
  return `https://${account}.r2.cloudflarestorage.com/${bucket}/${key}`;
}

export async function readObject(key) {
  const res = await client().fetch(objectUrl(key));
  const body = await res.text();
  if (res.status === 404 && !body.includes("NoSuchBucket")) return null;
  if (!res.ok) throw new Error(`R2 read ${key} failed with ${res.status} ${(body.match(/<Code>([^<]+)<\/Code>/) || [])[1] || ""}`.trim());
  return body;
}

export async function writeObject(key, body, type) {
  const res = await client().fetch(objectUrl(key), { method: "PUT", body, headers: { "Content-Type": type } });
  if (!res.ok) throw new Error(`R2 write ${key} failed with ${res.status}`);
}

export async function deleteObject(key) {
  const res = await client().fetch(objectUrl(key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`R2 delete ${key} failed with ${res.status}`);
}

export async function uploadUrl(key, type) {
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", "600");
  const signed = await client().sign(new Request(url, { method: "PUT", headers: { "Content-Type": type } }), {
    aws: { signQuery: true, allHeaders: true },
  });
  return signed.url;
}
