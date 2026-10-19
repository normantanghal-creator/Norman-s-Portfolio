const contact = {
  calendar: "https://cal.com/",
  email: "norman@demo.com",
};

function surfaceIsDark(element) {
  let node = element.parentElement;
  while (node) {
    const color = getComputedStyle(node).backgroundColor;
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      const alpha = match[4] === undefined ? 1 : Number(match[4]);
      if (alpha > 0.05) {
        const luminance =
          (0.2126 * Number(match[1]) + 0.7152 * Number(match[2]) + 0.0722 * Number(match[3])) / 255;
        return luminance < 0.5;
      }
    }
    node = node.parentElement;
  }
  return false;
}

const themeButton = document.querySelector(".theme");

function paintDemos() {
  document.querySelectorAll(".demo").forEach((demo) => {
    demo.classList.toggle("is-dark", !surfaceIsDark(demo));
  });
}

const themeOrder = ["light", "dark", "oled"];

function currentTheme() {
  const theme = document.documentElement.dataset.theme;
  return theme === "dark" || theme === "oled" ? theme : "light";
}

function applyTheme(theme) {
  if (theme === "light") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("norman-theme", theme);
  } catch {
    // The switch still works on this page.
  }
  syncThemeButton();
}

function syncThemeButton() {
  if (!themeButton) return;
  const theme = currentTheme();
  const next = themeOrder[(themeOrder.indexOf(theme) + 1) % themeOrder.length];
  themeButton.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
  themeButton.setAttribute("aria-label", `Use ${next} mode`);
}

try {
  const saved = localStorage.getItem("norman-theme");
  if (saved === "dark" || saved === "oled") applyTheme(saved);
} catch {
  // Storage can be blocked. The page stays on the white background.
}

function starredPhotos(library, limit) {
  return library.photos
    .filter((photo) => photo.starred && safeImage(photo.image))
    .sort((a, b) => (a.starredAt || 0) - (b.starredAt || 0))
    .slice(0, limit);
}

function paintFeatured(library) {
  const grid = document.querySelector("#featured");
  if (!grid) return;
  const photos = starredPhotos(library, 4);
  if (!photos.length) return;
  grid.replaceChildren();
  photos.forEach((photo) => {
    const article = document.createElement("article");
    article.className = "card";
    const frame = document.createElement("div");
    frame.className = "frame";
    const demo = document.createElement("div");
    demo.className = "demo";
    demo.setAttribute("role", "img");
    demo.setAttribute("aria-label", photo.title || "Photograph");
    const img = document.createElement("img");
    img.src = safeImage(photo.image);
    img.alt = "";
    demo.appendChild(img);
    frame.appendChild(demo);
    const copy = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = photo.title || "Untitled";
    const caption = document.createElement("p");
    caption.textContent = photo.caption;
    copy.append(title, caption);
    article.append(frame, copy);
    if (photo.category) {
      const tags = document.createElement("div");
      tags.className = "tags";
      const tag = document.createElement("span");
      tag.textContent = photo.category;
      tags.appendChild(tag);
      article.appendChild(tags);
    }
    grid.appendChild(article);
  });
}

function scrollPhotos(library) {
  return library.photos
    .filter((photo) => photo.scroll && safeImage(photo.image))
    .sort((a, b) => (a.scrollAt || 0) - (b.scrollAt || 0))
    .slice(0, 3);
}

function paintTakeoverPhotos(library) {
  const windowEl = document.querySelector(".takeover-window");
  if (!windowEl) return;
  const photos = scrollPhotos(library);
  if (!photos.length) return;
  windowEl.replaceChildren();
  photos.forEach((photo) => {
    const article = document.createElement("article");
    article.className = "take-card";
    const copy = document.createElement("div");
    copy.className = "take-copy";
    const title = document.createElement("h3");
    title.textContent = photo.title || "Untitled";
    const caption = document.createElement("p");
    caption.textContent = photo.caption;
    copy.append(title, caption);
    const frame = document.createElement("div");
    frame.className = "take-photo";
    const img = document.createElement("img");
    img.src = safeImage(photo.image);
    img.alt = "";
    frame.appendChild(img);
    article.append(copy, frame);
    windowEl.appendChild(article);
  });
}

syncThemeButton();
if (typeof loadLibrary === "function" && document.querySelector("#featured")) {
  const local = loadLibrary();
  paintFeatured(local);
  paintTakeoverPhotos(local);
  fetchLibrary().then((library) => {
    if (!library) return;
    paintFeatured(library);
    paintTakeoverPhotos(library);
    paintDemos();
  });
}
paintDemos();

if (themeButton) {
  themeButton.addEventListener("click", () => {
    const theme = currentTheme();
    const next = themeOrder[(themeOrder.indexOf(theme) + 1) % themeOrder.length];
    applyTheme(next);
    paintDemos();
    themeButton.classList.remove("is-flipping");
    void themeButton.offsetWidth;
    themeButton.classList.add("is-flipping");
  });
}

const aboutCopy = document.querySelector(".about-copy");
const aboutWords = [];

if (aboutCopy) {
  const words = aboutCopy.textContent.trim().split(/\s+/);
  aboutCopy.textContent = "";
  for (const word of words) {
    const span = document.createElement("span");
    span.textContent = word;
    aboutCopy.appendChild(span);
    aboutCopy.appendChild(document.createTextNode(" "));
    aboutWords.push(span);
  }
}

const root = document.querySelector("#smooth");

function layoutTop(element) {
  let y = 0;
  let node = element;
  while (node && node !== document.body) {
    y += node.offsetTop;
    node = node.offsetParent;
  }
  return y;
}

function paintNav(scrollY) {
  const links = [...document.querySelectorAll(".nav-links a[href^='#']")];
  if (!links.length) return;
  const sections = links
    .map((link) => {
      const id = link.getAttribute("href").slice(1);
      const element = document.getElementById(id);
      return element ? { id, top: layoutTop(element) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.top - b.top);
  let currentId = "";
  sections.forEach((section) => {
    if (section.top - 120 <= scrollY) currentId = section.id;
  });
  links.forEach((link) => {
    const id = link.getAttribute("href").slice(1);
    if (id && id === currentId) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function maxScroll() {
  if (!root) return 0;
  const frame = document.querySelector(".stage-scroll");
  const height = frame ? frame.clientHeight : window.innerHeight;
  return Math.max(0, root.scrollHeight - height);
}

const takeover = document.querySelector(".takeover");
const takeoverPin = document.querySelector(".takeover-pin");

function holdMotion(progress) {
  const hold = 0.46;
  if (progress <= hold) return 0;
  const t = (progress - hold) / (1 - hold);
  return 1 - (1 - t) ** 3;
}

function paintTakeover(scrollY) {
  const takeCards = takeover ? [...takeover.querySelectorAll(".take-card")] : [];
  if (!takeover || !takeoverPin || takeCards.length === 0) return;
  const stick = 64;
  const top = layoutTop(takeover);
  const local = scrollY - (top - stick);
  const travel = Math.max(1, takeover.offsetHeight - takeoverPin.offsetHeight);
  const pinned = Math.min(travel, Math.max(0, local));
  takeoverPin.style.transform = `translate3d(0, ${pinned}px, 0)`;

  const segment = travel / Math.max(1, takeCards.length - 1);
  const last = takeCards.length - 1;
  takeCards.forEach((card, index) => {
    card.style.zIndex = String(index + 1);
    const progress =
      index === 0 ? 1 : Math.min(1, Math.max(0, (local - (index - 1) * segment) / segment));
    const motion = index === 0 ? 1 : holdMotion(progress);
    const offset = index === 0 ? 0 : (1 - motion) * (takeoverPin.offsetHeight + 8);
    card.style.transform = `translate3d(0, ${offset}px, 0)`;

    let textOpacity = index === 0 ? 1 : motion < 0.4 ? 0 : Math.min(1, (motion - 0.4) / 0.45);
    if (index < last) {
      const next = Math.min(1, Math.max(0, (local - index * segment) / segment));
      const nextMotion = holdMotion(next);
      const fadeOut = nextMotion === 0 ? 1 : Math.max(0, 1 - nextMotion / 0.35);
      textOpacity *= fadeOut;
    }
    card.querySelectorAll("h3, p").forEach((line) => {
      line.style.opacity = String(textOpacity);
    });
  });
}

function paintAbout(scrollY) {
  const aboutTrack = document.querySelector(".about-track");
  const aboutPin = document.querySelector(".about-pin");
  if (!aboutTrack || !aboutPin || aboutWords.length === 0) return;
  const stick = 64;
  const top = layoutTop(aboutTrack);
  const local = scrollY - (top - stick);
  const travel = Math.max(1, aboutTrack.offsetHeight - aboutPin.offsetHeight);
  const pinned = Math.min(travel, Math.max(0, local));
  aboutPin.style.transform = `translate3d(0, ${pinned}px, 0)`;

  const span = Math.min(1, Math.max(0, pinned / travel));
  const effect = Math.min(1, Math.max(0, (span - 0.14) / 0.72));
  const stepped = Math.min(aboutWords.length, Math.ceil((effect * aboutWords.length) / 5) * 5);
  aboutWords.forEach((word, index) => {
    word.classList.toggle("is-on", index < stepped);
  });
}

if (root) {
  let target = 0;
  let current = 0;

  function clamp(value) {
    return Math.min(maxScroll(), Math.max(0, value));
  }

  function goTo(element, offset) {
    target = clamp(layoutTop(element) - offset);
  }

  window.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      target = clamp(target + event.deltaY * unit);
    },
    { passive: false },
  );

  let lastTouch = null;
  window.addEventListener(
    "touchstart",
    (event) => {
      lastTouch = event.touches[0].clientY;
    },
    { passive: true },
  );
  window.addEventListener(
    "touchmove",
    (event) => {
      if (lastTouch === null) return;
      const y = event.touches[0].clientY;
      target = clamp(target + (lastTouch - y));
      lastTouch = y;
      event.preventDefault();
    },
    { passive: false },
  );
  window.addEventListener("touchend", () => {
    lastTouch = null;
  });

  window.addEventListener("keydown", (event) => {
    const tag = event.target && event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    const viewer = document.querySelector("#viewer");
    if (viewer && !viewer.hidden) return;
    const step = event.key === "PageDown" || event.key === "PageUp" ? window.innerHeight * 0.85 : 80;
    if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
      event.preventDefault();
      target = clamp(target + step);
    } else if (event.key === "ArrowUp" || event.key === "PageUp") {
      event.preventDefault();
      target = clamp(target - step);
    } else if (event.key === "Home") {
      event.preventDefault();
      target = 0;
    } else if (event.key === "End") {
      event.preventDefault();
      target = maxScroll();
    }
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href").slice(1);
      const element = document.getElementById(id);
      if (!element) return;
      event.preventDefault();
      goTo(element, 24);
    });
  });

  window.addEventListener("resize", () => {
    target = clamp(target);
  });

  if (location.hash.length > 1) {
    const element = document.getElementById(location.hash.slice(1));
    if (element) {
      target = clamp(layoutTop(element) - 24);
      current = target;
    }
  }

  function frame() {
    current += (target - current) * 0.045;
    if (Math.abs(target - current) < 0.4) current = target;
    root.style.transform = `translate3d(0, ${-current}px, 0)`;
    paintAbout(current);
    paintTakeover(current);
    paintNav(current);
    requestAnimationFrame(frame);
  }

  root.style.transform = `translate3d(0, ${-current}px, 0)`;
  paintAbout(current);
  paintTakeover(current);
  paintNav(current);
  requestAnimationFrame(frame);
}

const bookCall = document.querySelector("#book-call");
const bookForm = document.querySelector("#book-form");

if (bookCall) {
  if (contact.calendar) {
    bookCall.href = contact.calendar;
    bookCall.target = "_blank";
    bookCall.rel = "noopener noreferrer";
  } else {
    bookCall.href = `mailto:${contact.email}?subject=${encodeURIComponent("Book a call")}`;
  }
}

document.querySelectorAll(".menu").forEach((menu) => {
  const summary = menu.querySelector("summary");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  menu.addEventListener("mouseenter", () => {
    if (finePointer.matches) menu.open = true;
  });
  menu.addEventListener("mouseleave", () => {
    if (finePointer.matches) menu.open = false;
  });
  if (summary) {
    summary.addEventListener("click", (event) => {
      if (finePointer.matches) event.preventDefault();
    });
  }
});

const saipan = document.querySelector(".saipan");
if (saipan) {
  const glyphs = "0123456789ABCDEF";
  let clockText = "";
  let hoveringClock = false;
  let glitchTimer = 0;
  const tickClock = () => {
    clockText = new Intl.DateTimeFormat("en-US", {
      timeZone: "Pacific/Saipan",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(new Date());
    saipan.dateTime = clockText;
    if (!hoveringClock) saipan.textContent = clockText;
  };
  const glitch = () => {
    const chars = clockText.split("");
    const spot = Math.floor(Math.random() * chars.length);
    if (chars[spot] !== ":" && chars[spot] !== " ") {
      chars[spot] = glyphs[Math.floor(Math.random() * glyphs.length)];
    }
    saipan.textContent = chars.join("");
  };
  saipan.addEventListener("pointerenter", () => {
    hoveringClock = true;
    window.clearInterval(glitchTimer);
    glitchTimer = window.setInterval(glitch, 90);
  });
  saipan.addEventListener("pointerleave", () => {
    hoveringClock = false;
    window.clearInterval(glitchTimer);
    saipan.textContent = clockText;
  });
  tickClock();
  window.setInterval(tickClock, 1000);
}

document.querySelectorAll(".brand").forEach((brand) => {
  let timer = 0;
  let armed = false;
  brand.addEventListener("pointerdown", () => {
    armed = false;
    timer = window.setTimeout(() => {
      armed = true;
      window.location.href = "login.html";
    }, 2000);
  });
  const cancel = () => window.clearTimeout(timer);
  brand.addEventListener("pointerup", cancel);
  brand.addEventListener("pointerleave", cancel);
  brand.addEventListener("pointercancel", cancel);
  brand.addEventListener("click", (event) => {
    if (!armed) return;
    event.preventDefault();
  });
});

if (bookForm) {
  bookForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(bookForm);
    const name = String(data.get("name") || "").trim();
    const message = String(data.get("message") || "").trim();
    const subject = encodeURIComponent(`Message from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name}`);
    window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`;
  });
}
