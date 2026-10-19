const covers = document.querySelector("#covers");
const catBox = document.querySelector("#categories");
const density = document.querySelector("#density");
const count = document.querySelector("#photo-count");

if (covers && catBox && density) {
  let library = loadLibrary();
  const viewer = document.querySelector("#viewer");
  const viewerPhoto = document.querySelector("#viewer-photo");
  const viewerTitle = document.querySelector("#viewer-title");
  const viewerCaption = document.querySelector("#viewer-caption");
  let category = "All";
  let cols = 3;
  let openIndex = -1;

  function photos() {
    if (category === "All") return library.photos;
    return library.photos.filter((photo) => photo.category === category);
  }

  function renderCats() {
    const names = ["All", ...library.categories];
    const label = document.querySelector("#category-label");
    const menu = document.querySelector("#category-menu");
    if (label) label.textContent = category;
    catBox.replaceChildren();
    names.forEach((name) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = name;
      button.className = name === category ? "is-on" : "";
      button.addEventListener("click", () => {
        category = name;
        if (menu) menu.open = false;
        renderCats();
        renderCovers();
      });
      catBox.appendChild(button);
    });
  }

  function renderCovers() {
    const list = photos();
    if (count) count.textContent = String(list.length);
    covers.classList.add("is-refit");
    window.setTimeout(() => {
      covers.replaceChildren();
      covers.classList.remove("is-loading");
      if (count) count.classList.remove("is-loading");
      covers.style.setProperty("--cols", String(cols));
      list.forEach((photo) => {
        const article = document.createElement("article");
        article.className = "cover";
        article.dataset.id = photo.id;
        const frame = document.createElement("div");
        frame.className = "demo";
        frame.setAttribute("role", "img");
        frame.setAttribute("aria-label", photo.title || "Photograph");
        const src = safeImage(photo.image);
        if (src) {
          const img = document.createElement("img");
          img.src = src;
          img.alt = "";
          frame.appendChild(img);
        }
        const meta = document.createElement("div");
        meta.className = "meta";
        const title = document.createElement("strong");
        title.textContent = photo.title;
        const caption = document.createElement("span");
        caption.textContent = photo.caption;
        meta.append(title, caption);
        article.append(frame, meta);
        article.addEventListener("click", () => openViewer(list.indexOf(photo)));
        covers.appendChild(article);
      });
      paintDemos();
      window.setTimeout(() => covers.classList.remove("is-refit"), 30);
    }, 160);
  }

  density.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      cols = Number(button.dataset.cols);
      const label = document.querySelector("#density-label");
      if (label) label.textContent = `${cols}s`;
      density.querySelectorAll("button").forEach((item) => {
        item.classList.toggle("is-on", item === button);
      });
      density.open = false;
      renderCovers();
    });
  });

  function paintViewer() {
    const list = photos();
    const photo = list[openIndex];
    if (!photo || !viewer) return;
    viewerPhoto.replaceChildren();
    const src = safeImage(photo.image);
    if (src) {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      viewerPhoto.appendChild(img);
    }
    viewerTitle.textContent = photo.title;
    viewerCaption.textContent = photo.caption;
  }

  function openViewer(index) {
    const list = photos();
    if (!list.length || !viewer) return;
    openIndex = (index + list.length) % list.length;
    viewer.hidden = false;
    paintViewer();
  }

  function closeViewer() {
    openIndex = -1;
    if (viewer) viewer.hidden = true;
  }

  if (viewer) {
    viewer.addEventListener("click", (event) => {
      if (event.target.closest(".viewer-photo, figcaption, .viewer-arrow")) return;
      closeViewer();
    });
    viewer.querySelectorAll(".viewer-arrow").forEach((button) => {
      button.addEventListener("click", () => openViewer(openIndex + Number(button.dataset.dir)));
    });
    document.addEventListener("keydown", (event) => {
      if (viewer.hidden) return;
      if (event.key === "Escape") closeViewer();
      if (event.key === "ArrowRight") openViewer(openIndex + 1);
      if (event.key === "ArrowLeft") openViewer(openIndex - 1);
    });
  }

  fetchLibrary().then((remote) => {
    if (remote) library = remote;
    renderCats();
    renderCovers();
  });
}
