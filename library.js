const LIBRARY_KEY = "norman-library";

const seedLibrary = {
  categories: ["Coast", "Rooms", "Street", "Night"],
  photos: [
    { id: "north-shore", title: "North Shore", caption: "A demo sentence about pale water.", category: "Coast", date: "2024-06-12", image: "" },
    { id: "high-road", title: "High Road", caption: "A demo sentence about a long empty road.", category: "Coast", date: "2024-08-03", image: "" },
    { id: "hotel-rooms", title: "Hotel Rooms", caption: "A demo sentence about the hour before checkout.", category: "Rooms", date: "2023-11-19", image: "" },
    { id: "green-room", title: "Green Room", caption: "A demo sentence about trees holding the afternoon.", category: "Rooms", date: "2025-01-22", image: "" },
    { id: "sunday-market", title: "Sunday Market", caption: "A demo sentence about fruit and early hands.", category: "Street", date: "2024-02-04", image: "" },
    { id: "after-dark", title: "After Dark", caption: "A demo sentence about lamps and wet pavement.", category: "Night", date: "2023-09-30", image: "" },
  ],
  heroTitle: "Norman photographs weather, rooms, and quiet streets",
  heroText:
    "Demo sentences about light, coastlines, and the hour before a room is packed up. Swap this for the real introduction when you have it.",
  heroImage: "",
  heroStyle: "overlay",
  about:
    "Norman photographs weather, rooms, and the quiet stretch after the shops close. These are demo sentences about light, waiting, and people who stay still for a moment. Swap this block for the real introduction when it is ready. The note to keep is simple: leave the pictures honest, and leave room for the person in front of the lens.",
  services: [
    { title: "Demo", text: "A demo sentence about a service. Swap this when the real list is ready." },
    { title: "Demo", text: "A demo sentence about a service. Swap this when the real list is ready." },
    { title: "Demo", text: "A demo sentence about a service. Swap this when the real list is ready." },
  ],
};

const SERVICES_MIN = 3;
const SERVICES_MAX = 8;

function cleanServices(list) {
  const services = (Array.isArray(list) ? list : [])
    .slice(0, SERVICES_MAX)
    .map((item) => ({ title: safeText(item && item.title, 60), text: safeText(item && item.text, 280) }))
    .filter((item) => item.title);
  return services.length >= SERVICES_MIN ? services : structuredClone(seedLibrary.services);
}

function safeText(value, max) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

function safeImage(value) {
  const image = String(value || "");
  if (!image || image.length > 7500000) return "";
  if (/^https:\/\/[^\s"'<>\\]+$/i.test(image)) return image.length <= 2048 ? image : "";
  if (!/^data:image\/(jpeg|png|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(image)) return "";
  return image;
}

function cleanPhoto(photo, index) {
  if (!photo || typeof photo !== "object") return null;
  const seeded = seedLibrary.photos.find((item) => item.id === photo.id);
  const date = String(photo.date || (seeded ? seeded.date : ""));
  return {
    id: safeText(photo.id, 80).replace(/[^a-zA-Z0-9_-]/g, "") || `photo-${index}`,
    title: safeText(photo.title, 140),
    caption: safeText(photo.caption, 600),
    category: safeText(photo.category, 80),
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
    image: safeImage(photo.image),
    later: photo.later === true,
    starred: photo.starred === true,
    starredAt: photo.starred === true && Number.isFinite(Number(photo.starredAt)) ? Number(photo.starredAt) : 0,
    scroll: photo.scroll === true,
    scrollAt: photo.scroll === true && Number.isFinite(Number(photo.scrollAt)) ? Number(photo.scrollAt) : 0,
  };
}

const warmedPhotos = [];

function warmPhotos(list) {
  (Array.isArray(list) ? list : []).forEach((photo) => {
    const src = safeImage(photo && photo.image);
    if (!src || warmedPhotos.some((img) => img.src === src)) return;
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    warmedPhotos.push(img);
  });
}

function loadLibrary() {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return structuredClone(seedLibrary);
    return cleanLibrary(JSON.parse(raw));
  } catch {
    return structuredClone(seedLibrary);
  }
}

async function fetchLibrary() {
  try {
    const res = await fetch("/api/library", { cache: "no-store" });
    if (!res.ok) return null;
    const body = await res.json();
    return body.library ? cleanLibrary(body.library) : null;
  } catch {
    return null;
  }
}

function cleanLibrary(data) {
  if (!data || !Array.isArray(data.photos) || !Array.isArray(data.categories)) {
    return structuredClone(seedLibrary);
  }
  const seen = new Set();
  const photos = [];
  data.photos.forEach((photo, index) => {
    const clean = cleanPhoto(photo, index);
    if (!clean || seen.has(clean.id)) return;
    seen.add(clean.id);
    photos.push(clean);
  });
  const categories = [];
  data.categories.forEach((name) => {
    const clean = safeText(name, 80);
    if (clean && !categories.includes(clean)) categories.push(clean);
  });
  return {
    categories: categories.length ? categories : structuredClone(seedLibrary.categories),
    photos,
    about: safeText(data.about, 1200) || seedLibrary.about,
    heroTitle: safeText(data.heroTitle, 140) || seedLibrary.heroTitle,
    heroText: "heroText" in data ? safeText(data.heroText, 280) : seedLibrary.heroText,
    heroImage: safeImage(data.heroImage),
    heroStyle: data.heroStyle === "solid" ? "solid" : "overlay",
    services: cleanServices(data.services),
  };
}

function saveLibrary(data) {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function playTone(steps, type) {
  try {
    if (localStorage.getItem("norman-mute") === "1") return;
  } catch {
    // Sound still plays if storage is blocked.
  }
  const ctx = new AudioContext();
  const now = ctx.currentTime;
  steps.forEach((step, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = step.freq;
    const start = now + step.at;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.07, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + step.len);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + step.len);
    if (index === steps.length - 1) {
      osc.onended = () => ctx.close();
    }
  });
}

function soundOk() {
  playTone(
    [
      { freq: 523, at: 0, len: 0.12 },
      { freq: 784, at: 0.1, len: 0.2 },
    ],
    "sine",
  );
}

function soundBad() {
  playTone(
    [
      { freq: 146, at: 0, len: 0.16 },
      { freq: 98, at: 0.12, len: 0.28 },
    ],
    "square",
  );
}

function soundDelete() {
  playTone(
    [
      { freq: 196, at: 0, len: 0.07 },
      { freq: 131, at: 0.08, len: 0.16 },
      { freq: 82, at: 0.2, len: 0.24 },
    ],
    "triangle",
  );
}

function soundStar() {
  playTone(
    [
      { freq: 988, at: 0, len: 0.07 },
      { freq: 1319, at: 0.06, len: 0.08 },
      { freq: 1760, at: 0.12, len: 0.16 },
    ],
    "sine",
  );
}

function soundUnstar() {
  playTone(
    [
      { freq: 1760, at: 0, len: 0.06 },
      { freq: 1319, at: 0.05, len: 0.07 },
      { freq: 988, at: 0.1, len: 0.14 },
    ],
    "sine",
  );
}
