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
    img.src = gridImage(photo.image);
    markPhoto(img);
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
  photos.forEach((photo, index) => {
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
    img.loading = index === 0 ? "eager" : "lazy";
    img.decoding = "async";
    img.src = gridImage(photo.image);
    markPhoto(img);
    frame.appendChild(img);
    article.append(copy, frame);
    windowEl.appendChild(article);
  });
  forgetScrollMeasures();
}

function markPhoto(img) {
  const ready = () => img.classList.add("is-ready");
  if (img.complete) ready();
  else {
    img.addEventListener("load", ready, { once: true });
    img.addEventListener("error", ready, { once: true });
  }
}

async function revealHome(library) {
  paintFeatured(library);
  paintTakeoverPhotos(library);
  paintHero(library);
  paintServices(library.services);
  paintAboutText(library.about);
  await Promise.all([...document.querySelectorAll("#featured img, .take-photo img")].map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    });
  }));
  document.querySelectorAll(".is-loading").forEach((element) => element.classList.remove("is-loading"));
  paintDemos();
  lockPhoneFrames();
}

syncThemeButton();
if (typeof loadLibrary === "function" && document.querySelector("#featured")) {
  const cached = loadLibrary();
  let generation = 0;
  let shown = "";
  let shownAbout = "";
  const reveal = async (library) => {
    const ticket = ++generation;
    const sources = homePhotoSources(library);
    const key = sources.join("\n");
    await warmPhotos(sources);
    if (ticket !== generation) return;
    if (key && key === shown) {
      paintHero(library);
      paintServices(library.services);
      if (library.about !== shownAbout) {
        paintAboutText(library.about);
        shownAbout = library.about;
      }
      return;
    }
    await revealHome(library);
    if (ticket !== generation) return;
    shown = key;
    shownAbout = library.about;
  };
  if (homePhotoSources(cached).length) reveal(cached);
  fetchLibrary().then((remote) => reveal(remote || cached));
} else if (typeof fetchLibrary === "function" && typeof loadLibrary === "function") {
  const cached = loadLibrary();
  warmPhotos(homePhotoSources(cached));
  fetchLibrary().then((remote) => warmPhotos(homePhotoSources(remote || cached)));
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

function lockBox(element) {
  if (!onPhone() || !element || element.dataset.locked === "1" || element.hidden) return;
  const height = Math.round(element.getBoundingClientRect().height);
  if (height < 80) return;
  element.style.height = `${height}px`;
  element.style.minHeight = `${height}px`;
  element.dataset.locked = "1";
}

function lockPhoneFrames() {
  if (!onPhone()) return;
  const hero = document.querySelector(".hero");
  if (hero && (hero.classList.contains("is-overlay") || hero.classList.contains("is-solid"))) lockBox(hero);
  const heroPhoto = document.querySelector(".hero-photo");
  if (heroPhoto && !heroPhoto.hidden) lockBox(heroPhoto);
  if (takeover && !takeover.classList.contains("is-still")) lockBox(takeover);
}

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
  const heroSrc = gridImage(library.heroImage);
  const image = heroSrc ? `url("${heroSrc.replace(/["\\]/g, "")}")` : "";
  const solid = library.heroStyle === "solid" && image;
  hero.classList.toggle("is-overlay", Boolean(image) && !solid);
  hero.classList.toggle("is-solid", Boolean(solid));
  hero.style.backgroundImage = "";
  if (image) hero.style.setProperty("--hero-image", image);
  else hero.style.removeProperty("--hero-image");
  if (photo) photo.hidden = !solid;
  lockPhoneFrames();
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
  const serviceRows = { 1: [1], 2: [2], 3: [3], 4: [2, 2], 5: [3, 2], 6: [3, 3] };
  const section = document.querySelector("#services");
  const row = document.querySelector(".service-row");
  const list = Array.isArray(services) ? services : [];
  if (!section || !row) return;
  if (!serviceRows[list.length]) {
    section.hidden = true;
    row.replaceChildren();
    return;
  }
  section.hidden = false;
  const spans = serviceRows[list.length].flatMap((count) => Array(count).fill(12 / count));
  row.replaceChildren();
  list.forEach((service, index) => {
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

function onBrave() {
  return typeof navigator.brave !== "undefined";
}

function usesNativeScroll() {
  return onPhone() || onMac() || onBrave();
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

function hashId(href) {
  const hash = String(href || "").split("#")[1];
  return hash || "";
}

let navMark = "";
let navSnap = null;

function navSections() {
  if (navSnap) return navSnap;
  const lead = onPhone() ? navHeight() + 16 : 120;
  navSnap = {
    lead,
    items: [...document.querySelectorAll(".nav-links a[href*='#']")].flatMap((link) => {
      const id = hashId(link.getAttribute("href"));
      const element = id ? document.getElementById(id) : null;
      return element ? [{ id, link, top: layoutTop(element) }] : [];
    }).sort((a, b) => a.top - b.top),
  };
  return navSnap;
}

function paintNav(scrollY) {
  const snap = navSections();
  if (!snap.items.length) return;
  let currentId = "";
  snap.items.forEach((section) => {
    if (section.top - snap.lead <= scrollY) currentId = section.id;
  });
  if (currentId === navMark) return;
  navMark = currentId;
  snap.items.forEach((section) => {
    if (section.id === currentId) section.link.setAttribute("aria-current", "page");
    else section.link.removeAttribute("aria-current");
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

let takeSnap = null;

function takeSnapshot() {
  if (!takeover || !takeoverPin) return null;
  const count = takeover.querySelectorAll(".take-card").length;
  if (count < 2) return null;
  if (takeSnap && takeSnap.count === count) return takeSnap;
  const frame = takeover.querySelector(".takeover-window");
  takeSnap = {
    count,
    stick: pinStick(),
    top: layoutTop(takeover),
    travel: Math.max(1, takeover.offsetHeight - takeoverPin.offsetHeight),
    cover: frame ? frame.offsetHeight : takeoverPin.offsetHeight,
  };
  return takeSnap;
}

let aboutSnap = null;

function stackRange() {
  const snap = takeSnapshot();
  if (!snap || snap.travel < 40) return null;
  return { start: snap.top - snap.stick, end: snap.top - snap.stick + snap.travel };
}

function forgetScrollMeasures() {
  takeSnap = null;
  aboutSnap = null;
  navSnap = null;
  aboutMark = -1;
  navMark = "";
}

function paintTakeover(scrollY) {
  const takeCards = takeover ? [...takeover.querySelectorAll(".take-card")] : [];
  if (!takeover || !takeoverPin || takeCards.length === 0) return;
  if (takeCards.length < 2) {
    if (takeover.style.height) takeover.style.height = "";
    delete takeover.dataset.locked;
    takeover.classList.add("is-still");
    const takeIndex = takeover.querySelector(".take-index");
    if (takeIndex) takeIndex.hidden = true;
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
  const snap = takeSnapshot();
  if (!snap) return;
  const local = scrollY - (snap.top - snap.stick);
  if (local < -window.innerHeight || local > snap.travel) return;
  const phone = onPhone();
  let takeIndex = takeover.querySelector(".take-index");
  if (!takeIndex) {
    takeIndex = document.createElement("div");
    takeIndex.className = "take-index";
    takeoverPin.appendChild(takeIndex);
  } else if (takeIndex.parentElement !== takeoverPin) {
    takeoverPin.appendChild(takeIndex);
  }
  takeIndex.setAttribute("aria-hidden", "true");
  if (takeIndex.children.length !== takeCards.length) {
    takeIndex.replaceChildren();
    takeCards.forEach(() => takeIndex.appendChild(document.createElement("i")));
  }
  takeIndex.hidden = false;
  let cover = 0;
  const last = takeCards.length - 1;
  const paintCards = (progressFor) => {
    takeCards.forEach((card, index) => {
      card.style.zIndex = String(index + 1);
      const progress = progressFor(index);
      const motion = index === 0 ? 1 : holdMotion(progress, 0);
      const offset = index === 0 ? 0 : (1 - motion) * cover;
      const transform = `translate3d(0, ${offset}px, 0)`;
      if (card._shift !== transform) {
        card._shift = transform;
        card.style.transform = transform;
      }
      const next = index < last ? progressFor(index + 1) : 0;
      const nextMotion = index < last ? holdMotion(next, 0) : 0;
      let textOpacity = index === 0 ? 1 : motion < 0.4 ? 0 : Math.min(1, (motion - 0.4) / 0.45);
      if (phone) textOpacity = motion >= 0.98 && nextMotion < 0.08 ? 1 : 0;
      else if (index < last) {
        const fadeOut = nextMotion === 0 ? 1 : Math.max(0, 1 - nextMotion / 0.35);
        textOpacity *= fadeOut;
      }
      card.querySelectorAll("h3, p").forEach((line) => {
        if (line._fade === textOpacity) return;
        line._fade = textOpacity;
        line.style.opacity = String(textOpacity);
      });
      const presence = index === 0 ? 1 - nextMotion : motion * (index === last ? 1 : 1 - nextMotion);
      const tick = takeIndex.children[index];
      if (tick) {
        tick.style.width = `${10 + presence * 18}px`;
        tick.style.opacity = String(0.4 + presence * 0.6);
      }
    });
  };
  const travel = snap.travel;
  const pinned = Math.min(travel, Math.max(0, local));
  const pinShift = usesNativeScroll() ? "" : `translate3d(0, ${pinned}px, 0)`;
  if (takeoverPin._shift !== pinShift) {
    takeoverPin._shift = pinShift;
    takeoverPin.style.transform = pinShift;
  }
  if (local > travel) return;

  const steps = Math.max(1, takeCards.length - 1);
  const dwell = phone ? travel / (steps + 1) : Math.min(window.innerHeight * 0.6, travel * 0.45);
  const motionTravel = Math.max(1, travel - dwell);
  const segment = motionTravel / steps;
  cover = snap.cover;
  paintCards((index) => (
    index === 0 ? 1 : Math.min(1, Math.max(0, (local - (index - 1) * segment) / segment))
  ));
}

let aboutMark = -1;

function paintAbout(scrollY) {
  if (!aboutSnap) {
    const aboutTrack = document.querySelector(".about-track");
    const aboutPin = document.querySelector(".about-pin");
    if (!aboutTrack || !aboutPin) return;
    aboutSnap = {
      aboutPin,
      stick: pinStick(),
      top: layoutTop(aboutTrack),
      travel: Math.max(1, aboutTrack.offsetHeight - aboutPin.offsetHeight),
    };
  }
  if (aboutWords.length === 0) return;
  const { aboutPin, stick, top, travel } = aboutSnap;
  let span;
  if (onPhone()) {
    if (aboutPin.style.transform) aboutPin.style.transform = "";
    const enter = top - window.innerHeight * 0.92;
    const arrive = top - stick - 12;
    span = Math.min(1, Math.max(0, (scrollY - enter) / Math.max(1, arrive - enter)));
  } else {
    const local = scrollY - (top - stick);
    const pinned = Math.min(travel, Math.max(0, local));
    const shift = usesNativeScroll() ? "" : `translate3d(0, ${pinned}px, 0)`;
    if (aboutPin._shift !== shift) {
      aboutPin._shift = shift;
      aboutPin.style.transform = shift;
    }
    span = Math.min(1, Math.max(0, pinned / travel));
  }

  const effect = Math.min(1, Math.max(0, (span - 0.14) / 0.72));
  const stepped = Math.min(aboutWords.length, Math.ceil((effect * aboutWords.length) / 5) * 5);
  if (stepped === aboutMark) return;
  aboutMark = stepped;
  aboutWords.forEach((word, index) => {
    word.classList.toggle("is-on", index < stepped);
  });
}

if (root) {
  const syncNativeClass = () => document.documentElement.classList.toggle("is-native-scroll", (onMac() || onBrave()) && !onPhone());
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
      if (!onPhone()) heading = { element, offset: gap };
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
    forgetScrollMeasures();
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

  let paintedY = null;

  function frame() {
    if (usesNativeScroll()) {
      if (onPhone()) syncNavSpace();
      if (glide) {
        if (!onPhone()) glide.to = Math.max(0, layoutTop(glide.element) - glide.offset);
        const t = Math.min(1, (performance.now() - glide.start) / glide.duration);
        window.scrollTo(0, glideY(glide.from, glide.to, t));
        if (t === 1) glide = null;
      } else if (heading && !onPhone()) {
        const top = Math.max(0, layoutTop(heading.element) - heading.offset);
        if (Math.abs(window.scrollY - top) > 1) window.scrollTo(0, top);
      }
      if (root.style.transform) root.style.transform = "none";
      const y = window.scrollY;
      if (y !== paintedY || glide || heading) {
        paintedY = y;
        paintAbout(y);
        paintTakeover(y);
        paintNav(y);
      }
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
    const moved = Math.abs(current - paintedY) > 0.4 || glide || heading;
    if (moved) {
      paintedY = current;
      root.style.transform = `translate3d(0, ${-current}px, 0)`;
      paintAbout(current);
      paintTakeover(current);
      paintNav(current);
    }
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

const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");
if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  nav.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
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
