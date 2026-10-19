import { keyFromPublicUrl } from "./_r2.js";

export const libraryKey = "library.json";

function text(value, max) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

function stamp(on, value) {
  return on && Number.isFinite(Number(value)) ? Number(value) : 0;
}

export function cleanLibrary(input) {
  if (!input || !Array.isArray(input.photos) || !Array.isArray(input.categories)) return null;
  const categories = [];
  input.categories.slice(0, 200).forEach((name) => {
    const clean = text(name, 80);
    if (clean && !categories.includes(clean)) categories.push(clean);
  });
  const seen = new Set();
  const photos = [];
  input.photos.slice(0, 5000).forEach((photo, index) => {
    if (!photo || typeof photo !== "object") return;
    const id = text(photo.id, 80).replace(/[^a-zA-Z0-9_-]/g, "") || `photo-${index}`;
    if (seen.has(id)) return;
    seen.add(id);
    const date = String(photo.date || "");
    photos.push({
      id,
      title: text(photo.title, 140),
      caption: text(photo.caption, 600),
      category: text(photo.category, 80),
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
      image: keyFromPublicUrl(photo.image) ? String(photo.image) : "",
      later: photo.later === true,
      starred: photo.starred === true,
      starredAt: stamp(photo.starred === true, photo.starredAt),
      scroll: photo.scroll === true,
      scrollAt: stamp(photo.scroll === true, photo.scrollAt),
    });
  });
  const services = (Array.isArray(input.services) ? input.services : [])
    .slice(0, 8)
    .map((item) => ({ title: text(item && item.title, 60), text: text(item && item.text, 280) }))
    .filter((item) => item.title);
  const library = { categories, photos, about: text(input.about, 1200) };
  if (services.length >= 3) library.services = services;
  return library;
}
