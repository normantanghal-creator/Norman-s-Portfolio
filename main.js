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
    img.alt = "";
    img.loading = "eager";
    img.decoding = "async";
    img.src = safeImage(photo.image);
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
    .slice(0, 6);
}

function paintTakeoverPhotos(library) {
  const windowEl = document.querySelector(".takeover-window");
  if (!windowEl) return;
  const photos = scrollPhotos(library);
  if (!photos.length) return;
  const section = document.querySelector(".takeover");
  if (section) section.style.setProperty("--take-steps", String(Math.max(1, photos.length - 1)));
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
    img.alt = "";
    img.loading = "eager";
    img.decoding = "async";
    img.src = safeImage(photo.image);
    frame.appendChild(img);
    article.append(copy, frame);
    windowEl.appendChild(article);
  });
}

syncThemeButton();
if (typeof loadLibrary === "function" && document.querySelector("#featured")) {
  fetchLibrary().then((remote) => {
    const library = remote || loadLibrary();
    warmPhotos(library.photos);
    paintFeatured(library);
    paintTakeoverPhotos(library);
    paintHero(library);
    paintServices(library.services);
    paintAboutText(library.about);
    document.querySelectorAll(".is-loading").forEach((element) => element.classList.remove("is-loading"));
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

function paintHero(library) {
  const hero = document.querySelector(".hero");
  const title = document.querySelector(".hero h1");
  const lede = document.querySelector(".hero .lede");
  if (!hero || !title || !library) return;
  title.textContent = library.heroTitle || title.textContent;
  if (lede) {
    lede.textContent = library.heroText || "";
    lede.hidden = !library.heroText;
  }
  const photo = document.querySelector(".hero-photo");
  const image = library.heroImage ? `url("${String(library.heroImage).replace(/["\\]/g, "")}")` : "";
  const solid = library.heroStyle === "solid" && image;
  hero.classList.toggle("is-overlay", Boolean(image) && !solid);
  hero.classList.toggle("is-solid", Boolean(solid));
  hero.style.backgroundImage = "";
  if (image) hero.style.setProperty("--hero-image", image);
  else hero.style.removeProperty("--hero-image");
  if (photo) photo.hidden = !solid;
}

function paintAboutText(text) {
  if (!aboutCopy) return;
  aboutWords.length = 0;
  aboutCopy.textContent = "";
  for (const word of text.trim().split(/\s+/)) {
    const span = document.createElement("span");
    span.textContent = word;
    aboutCopy.appendChild(span);
    aboutCopy.appendChild(document.createTextNode(" "));
    aboutWords.push(span);
  }
}

function paintServices(services) {
  const serviceRows = { 3: [3], 4: [2, 2], 5: [3, 2], 6: [3, 3], 7: [4, 3], 8: [4, 4] };
  const row = document.querySelector(".service-row");
  if (!row || !serviceRows[services.length]) return;
  const spans = serviceRows[services.length].flatMap((count) => Array(count).fill(12 / count));
  row.replaceChildren();
  services.forEach((service, index) => {
    const article = document.createElement("article");
    article.style.setProperty("--span", String(spans[index]));
    const title = document.createElement("h3");
    title.textContent = service.title;
    const text = document.createElement("p");
    text.textContent = service.text;
    article.append(title, text);
    row.appendChild(article);
  });
}

if (aboutCopy) paintAboutText(aboutCopy.textContent);

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

const phoneScroll = window.matchMedia("(max-width: 980px)");

function onPhone() {
  return phoneScroll.matches;
}

function onMac() {
  return /Macintosh|Mac OS X/.test(navigator.userAgent);
}

function usesNativeScroll() {
  return onPhone() || onMac();
}

function pinStick() {
  if (window.matchMedia("(max-width: 700px)").matches) return 0;
  return onPhone() ? navHeight() : 64;
}

function navHeight() {
  const nav = document.querySelector(".nav");
  return nav ? nav.offsetHeight : 0;
}

function syncNavSpace() {
  if (!onPhone()) return;
  const space = `${navHeight()}px`;
  if (document.documentElement.style.getPropertyValue("--nav-space") !== space) {
    document.documentElement.style.setProperty("--nav-space", space);
  }
}

function paintNav(scrollY) {
  const links = [...document.querySelectorAll(".nav-links a[href^='#']:not(.contact-btn)")];
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
  const lead = onPhone() ? navHeight() + 16 : 120;
  sections.forEach((section) => {
    if (section.top - lead <= scrollY) currentId = section.id;
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

function holdMotion(progress, hold = 0.46) {
  if (progress <= hold) return 0;
  const t = (progress - hold) / (1 - hold);
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

function stackRange() {
  if (!takeover || !takeoverPin) return null;
  const cards = takeover.querySelectorAll(".take-card").length;
  if (!cards || cards < 2) return null;
  if (takeover.style.height) takeover.style.height = "";
  const stick = pinStick();
  const top = layoutTop(takeover);
  const travel = Math.max(0, takeover.offsetHeight - takeoverPin.offsetHeight);
  if (travel < 40) return null;
  return { start: top - stick, end: top - stick + travel };
}

function paintTakeover(scrollY) {
  const takeCards = takeover ? [...takeover.querySelectorAll(".take-card")] : [];
  if (!takeover || !takeoverPin || takeCards.length === 0) return;
  if (takeCards.length < 2) {
    if (takeover.style.height) takeover.style.height = "";
    takeover.classList.add("is-still");
    takeoverPin.style.transform = "";
    takeCards.forEach((card) => {
      card.style.transform = "";
      card.querySelectorAll("h3, p").forEach((line) => {
        line.style.opacity = "";
      });
    });
    return;
  }
  takeover.classList.remove("is-still");
  const phone = onPhone();
  const frame = takeover.querySelector(".takeover-window");
  const cover = frame ? frame.offsetHeight : takeoverPin.offsetHeight;
  const last = takeCards.length - 1;
  const paintCards = (progressFor) => {
    takeCards.forEach((card, index) => {
      card.style.zIndex = String(index + 1);
      const progress = progressFor(index);
      const motion = index === 0 ? 1 : holdMotion(progress, 0);
      const offset = index === 0 ? 0 : (1 - motion) * cover;
      card.style.transform = `translate3d(0, ${offset}px, 0)`;
      const next = index < last ? progressFor(index + 1) : 0;
      const nextMotion = index < last ? holdMotion(next, 0) : 0;
      let textOpacity = index === 0 ? 1 : motion < 0.4 ? 0 : Math.min(1, (motion - 0.4) / 0.45);
      if (phone) textOpacity = motion >= 0.98 && nextMotion < 0.08 ? 1 : 0;
      else if (index < last) {
        const fadeOut = nextMotion === 0 ? 1 : Math.max(0, 1 - nextMotion / 0.35);
        textOpacity *= fadeOut;
      }
      card.querySelectorAll("h3, p").forEach((line) => {
        line.style.opacity = String(textOpacity);
      });
    });
  };
  const range = stackRange();
  const stick = pinStick();
  if (!range) return;
  const top = layoutTop(takeover);
  const local = scrollY - (top - stick);
  const travel = Math.max(1, takeover.offsetHeight - takeoverPin.offsetHeight);
  const pinned = Math.min(travel, Math.max(0, local));
  takeoverPin.style.transform = usesNativeScroll() ? "" : `translate3d(0, ${pinned}px, 0)`;

  const dwell = phone ? 0 : Math.min(window.innerHeight * 0.6, travel * 0.45);
  const motionTravel = Math.max(1, travel - dwell);
  const segment = motionTravel / Math.max(1, takeCards.length - 1);
  paintCards((index) => (
    index === 0 ? 1 : Math.min(1, Math.max(0, (local - (index - 1) * segment) / segment))
  ));
}

function paintAbout(scrollY) {
  const aboutTrack = document.querySelector(".about-track");
  const aboutPin = document.querySelector(".about-pin");
  if (!aboutTrack || !aboutPin || aboutWords.length === 0) return;
  const stick = pinStick();
  const top = layoutTop(aboutTrack);
  let span;
  if (onPhone()) {
    aboutPin.style.transform = "";
    const enter = top - window.innerHeight * 0.92;
    const arrive = top - stick - 12;
    span = Math.min(1, Math.max(0, (scrollY - enter) / Math.max(1, arrive - enter)));
  } else {
    const local = scrollY - (top - stick);
    const travel = Math.max(1, aboutTrack.offsetHeight - aboutPin.offsetHeight);
    const pinned = Math.min(travel, Math.max(0, local));
    aboutPin.style.transform = usesNativeScroll() ? "" : `translate3d(0, ${pinned}px, 0)`;
    span = Math.min(1, Math.max(0, pinned / travel));
  }

  const effect = Math.min(1, Math.max(0, (span - 0.14) / 0.72));
  const stepped = Math.min(aboutWords.length, Math.ceil((effect * aboutWords.length) / 5) * 5);
  aboutWords.forEach((word, index) => {
    word.classList.toggle("is-on", index < stepped);
  });
}

if (root) {
  const syncNativeClass = () => document.documentElement.classList.toggle("is-native-scroll", onMac() && !onPhone());
  syncNativeClass();
  let target = 0;
  let current = 0;
  let heading = null;
  let glide = null;

  function clamp(value) {
    return Math.min(maxScroll(), Math.max(0, value));
  }

  function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  }

  function aboutRange() {
    const aboutTrack = document.querySelector(".about-track");
    const aboutPin = document.querySelector(".about-pin");
    if (!aboutTrack || !aboutPin) return null;
    const stick = pinStick();
    const top = layoutTop(aboutTrack);
    const travel = Math.max(0, aboutTrack.offsetHeight - aboutPin.offsetHeight);
    if (travel < 40) return null;
    return { start: top - stick, end: top - stick + travel };
  }

  function glideY(from, to, t) {
    const jumps = [aboutRange(), stackRange()]
      .filter((range) => range && from < range.end && to > range.end)
      .map((range) => ({ cut: Math.max(from, range.start), end: range.end }))
      .sort((a, b) => a.cut - b.cut);
    const skip = jumps.reduce((sum, jump) => sum + (jump.end - jump.cut), 0);
    let y = from + Math.max(0, to - from - skip) * easeInOut(t);
    jumps.forEach((jump) => {
      if (y > jump.cut) y += jump.end - jump.cut;
    });
    return y;
  }

  function cancelGlide() {
    if (!glide) return;
    if (!usesNativeScroll()) target = current;
    glide = null;
  }

  function goTo(element, offset) {
    const native = usesNativeScroll();
    const gap = onPhone() ? navHeight() + 12 : offset;
    if (onPhone()) syncNavSpace();
    const top = native ? Math.max(0, layoutTop(element) - gap) : clamp(layoutTop(element) - gap);
    if (element.id === "book") {
      heading = null;
      glide = { element, offset: gap, from: native ? window.scrollY : current, to: top, start: performance.now(), duration: 2000 };
      return;
    }
    cancelGlide();
    if (native) {
      heading = { element, offset: gap };
      window.scrollTo(0, top);
      return;
    }
    heading = { element, offset };
    target = top;
  }

  window.addEventListener(
    "wheel",
    (event) => {
      if (usesNativeScroll()) {
        heading = null;
        cancelGlide();
        return;
      }
      event.preventDefault();
      heading = null;
      cancelGlide();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      target = clamp(target + event.deltaY * unit);
    },
    { passive: false },
  );

  let lastTouch = null;
  window.addEventListener(
    "touchstart",
    (event) => {
      if (usesNativeScroll()) {
        heading = null;
        cancelGlide();
      }
      lastTouch = event.touches[0].clientY;
    },
    { passive: true },
  );
  window.addEventListener(
    "touchmove",
    (event) => {
      if (usesNativeScroll()) return;
      if (lastTouch === null) return;
      const y = event.touches[0].clientY;
      heading = null;
      cancelGlide();
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
    if (usesNativeScroll()) {
      heading = null;
      cancelGlide();
      return;
    }
    const tag = event.target && event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    const viewer = document.querySelector("#viewer");
    if (viewer && !viewer.hidden) return;
    const step = event.key === "PageDown" || event.key === "PageUp" ? window.innerHeight * 0.85 : 80;
    if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Home", "End"].includes(event.key)) {
      heading = null;
      cancelGlide();
    }
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
    syncNativeClass();
    target = clamp(target);
  });

  if (location.hash.length > 1) {
    const element = document.getElementById(location.hash.slice(1));
    if (element) {
      goTo(element, 24);
      if (element.id !== "book") current = target;
    }
    history.replaceState(null, "", location.pathname + location.search);
  }

  function frame() {
    if (usesNativeScroll()) {
      if (onPhone()) syncNavSpace();
      if (glide) {
        glide.to = Math.max(0, layoutTop(glide.element) - glide.offset);
        const t = Math.min(1, (performance.now() - glide.start) / glide.duration);
        window.scrollTo(0, glideY(glide.from, glide.to, t));
        if (t === 1) glide = null;
      } else if (heading) {
        const top = Math.max(0, layoutTop(heading.element) - heading.offset);
        if (Math.abs(window.scrollY - top) > 1) window.scrollTo(0, top);
      }
      root.style.transform = "none";
      const y = window.scrollY;
      paintAbout(y);
      paintTakeover(y);
      paintNav(y);
      requestAnimationFrame(frame);
      return;
    }
    if (glide) {
      glide.to = clamp(layoutTop(glide.element) - glide.offset);
      const t = Math.min(1, (performance.now() - glide.start) / glide.duration);
      current = glideY(glide.from, glide.to, t);
      target = t === 1 ? glide.to : current;
      if (t === 1) glide = null;
    } else {
      if (heading) target = clamp(layoutTop(heading.element) - heading.offset);
      current += (target - current) * 0.045;
      if (Math.abs(target - current) < 0.4) current = target;
    }
    root.style.transform = `translate3d(0, ${-current}px, 0)`;
    paintAbout(current);
    paintTakeover(current);
    paintNav(current);
    requestAnimationFrame(frame);
  }

  if (usesNativeScroll()) {
    if (onPhone()) syncNavSpace();
    root.style.transform = "none";
  } else root.style.transform = `translate3d(0, ${-current}px, 0)`;
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
      hourCycle: "h23",
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
