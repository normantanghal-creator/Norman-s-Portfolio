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

function syncThemeButton() {
  if (!themeButton) return;
  const light = document.documentElement.dataset.theme === "light";
  themeButton.setAttribute("aria-pressed", light ? "true" : "false");
  themeButton.setAttribute("aria-label", light ? "Use a dark background" : "Use a light background");
}

try {
  if (localStorage.getItem("norman-theme") === "light") {
    document.documentElement.dataset.theme = "light";
  }
} catch {
  // Storage can be blocked. The page stays on the dark background.
}

syncThemeButton();
paintDemos();

if (themeButton) {
  themeButton.addEventListener("click", () => {
    const light = document.documentElement.dataset.theme === "light";
    if (light) delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = "light";
    try {
      localStorage.setItem("norman-theme", light ? "dark" : "light");
    } catch {
      // The switch still works for this page.
    }
    syncThemeButton();
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

function maxScroll() {
  if (!root) return 0;
  return Math.max(0, root.scrollHeight - window.innerHeight);
}

const takeover = document.querySelector(".takeover");
const takeoverPin = document.querySelector(".takeover-pin");
const takeCards = takeover ? [...takeover.querySelectorAll(".take-card")] : [];

function holdMotion(progress) {
  const hold = 0.46;
  if (progress <= hold) return 0;
  const t = (progress - hold) / (1 - hold);
  return 1 - (1 - t) ** 3;
}

function paintTakeover(scrollY) {
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
    requestAnimationFrame(frame);
  }

  root.style.transform = `translate3d(0, ${-current}px, 0)`;
  paintAbout(current);
  paintTakeover(current);
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
