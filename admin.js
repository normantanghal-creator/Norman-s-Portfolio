if (sessionStorage.getItem("norman-admin") !== "ok") {
  window.location.replace("login.html");
}

const themeButton = document.querySelector("#theme");
const themeOrder = ["light", "dark", "oled"];
const themeNames = { light: "light", dark: "charcoal", oled: "OLED" };

function currentTheme() {
  const theme = document.documentElement.dataset.theme;
  return theme === "dark" || theme === "oled" ? theme : "light";
}

function syncThemeButton() {
  if (!themeButton) return;
  const next = themeOrder[(themeOrder.indexOf(currentTheme()) + 1) % themeOrder.length];
  themeButton.setAttribute("aria-label", `Use ${themeNames[next]} mode`);
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

try {
  const saved = localStorage.getItem("norman-theme");
  applyTheme(saved === "dark" || saved === "oled" ? saved : "light");
} catch {
  applyTheme("light");
}

if (themeButton) {
  themeButton.addEventListener("click", () => {
    const next = themeOrder[(themeOrder.indexOf(currentTheme()) + 1) % themeOrder.length];
    applyTheme(next);
    themeButton.classList.remove("is-flipping");
    void themeButton.offsetWidth;
    themeButton.classList.add("is-flipping");
  });
}

const userPhoto = document.querySelector("#user-photo");
const savedPhoto = sessionStorage.getItem("norman-photo");
if (userPhoto) {
  if (savedPhoto) userPhoto.src = savedPhoto;
  else userPhoto.hidden = true;
  userPhoto.addEventListener("error", () => {
    userPhoto.hidden = true;
  });
}

const data = loadLibrary();
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function photoFileOk(file) {
  if (!file || file.size <= 0 || file.size > 75 * 1024 * 1024) return false;
  const ext = (file.name.match(/\.[^.]+$/) || [""])[0].toLowerCase();
  const photoExt = ext === ".jpg" || ext === ".jpeg" || ext === ".png" || ext === ".webp" || ext === ".gif";
  if (ext && !photoExt) return false;
  return imageTypes.has(file.type) || photoExt;
}

function persist() {
  if (saveLibrary(data)) return true;
  soundBad();
  return false;
}
const library = document.querySelector("#library");
const overview = document.querySelector("#overview");
const review = document.querySelector("#review");
const restore = document.querySelector("#restore");
const search = document.querySelector("#search");
const upload = document.querySelector("#upload");
const categoriesForm = document.querySelector("#categories");
const categoryList = document.querySelector("#category-list");
const edit = document.querySelector("#edit");
const editFields = document.querySelector("#edit-fields");
const emptyEdit = document.querySelector("#empty-edit");
const modal = document.querySelector("#modal");
const suggest = document.querySelector("#suggest");
let selected = "";
let reviewIndex = 0;

function fillSelect(select) {
  if (!select) return;
  select.replaceChildren();
  data.categories.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

let view = "";
let starPopId = "";

function clearEdit() {
  selected = "";
  edit.reset();
  editFields.hidden = true;
  emptyEdit.hidden = false;
  if (restore) restore.hidden = true;
}

function showPanel(name) {
  if (name !== "library" && name !== "later") clearEdit();
  view = name;
  document.querySelectorAll(".rail nav button").forEach((button) => {
    button.classList.toggle("is-on", button.dataset.panel === name);
  });
  const showPhotos = name === "library" || name === "later";
  overview.hidden = name !== "overview";
  library.hidden = !showPhotos;
  review.hidden = name !== "review";
  upload.hidden = name !== "upload";
  categoriesForm.hidden = name !== "categories";
  document.querySelector("#cat-add").hidden = name !== "categories";
  if (name !== "categories") document.querySelector("#cat-prompt").classList.remove("is-on");
  edit.hidden = !showPhotos;
  const title = document.querySelector("#list-title");
  if (title) {
    if (name === "overview") title.textContent = "Overview";
    else if (name === "review") title.textContent = "Review";
    else if (name === "later") title.textContent = "Later";
    else if (name === "upload") title.textContent = "Upload";
    else if (name === "categories") title.textContent = "Categories";
    else title.textContent = "Photographs";
  }
  renderList();
}

function missingBits(photo) {
  const bits = [];
  if (!photo.title || photo.title === "Untitled") bits.push("title");
  if (!photo.caption) bits.push("caption");
  if (!photo.category) bits.push("category");
  if (!photo.date) bits.push("date");
  if (!photo.image) bits.push("photograph");
  return bits;
}

function reviewQueue() {
  return data.photos.filter((photo) => !photo.later && missingBits(photo).length);
}

function photoText(photo) {
  return [photo.title, photo.caption, photo.category, photo.date, photo.id].filter(Boolean).join(" ").toLowerCase();
}

function renderSuggestions() {
  const term = search.value.trim().toLowerCase();
  if (!suggest) return;
  suggest.replaceChildren();
  if (!term) {
    suggest.hidden = true;
    return;
  }
  const matches = data.photos.filter((photo) => photoText(photo).includes(term)).slice(0, 6);
  suggest.hidden = matches.length === 0;
  matches.forEach((photo) => {
    const button = document.createElement("button");
    button.type = "button";
    const title = document.createElement("strong");
    title.textContent = photo.title;
    const meta = document.createElement("small");
    meta.textContent = [photo.category, photo.date, photo.caption].filter(Boolean).join(" · ");
    button.append(title, meta);
    button.addEventListener("click", () => {
      search.value = photo.title;
      suggest.hidden = true;
      showPanel("library");
      selectPhoto(photo.id);
    });
    suggest.appendChild(button);
  });
}

function renderList() {
  const term = search.value.trim().toLowerCase();
  let matches = data.photos.filter((photo) => photoText(photo).includes(term));
  if (view === "later") matches = matches.filter((photo) => photo.later);
  const count = document.querySelector("#lib-count");
  const catCount = document.querySelector("#cat-count");
  const missing = document.querySelector("#missing-count");
  const laterCount = document.querySelector("#later-count");
  const note = document.querySelector("#list-note");
  const setup = document.querySelector("#setup-count");
  const reviewTotal = reviewQueue().length;
  const laterTotal = data.photos.filter((photo) => photo.later).length;
  if (count) count.textContent = String(data.photos.length);
  if (catCount) catCount.textContent = String(data.categories.length);
  if (laterCount) laterCount.textContent = String(laterTotal);
  if (missing) missing.textContent = String(reviewTotal);
  const withFile = data.photos.filter((photo) => photo.image).length;
  const ovPhotos = document.querySelector("#ov-photos");
  const ovFiles = document.querySelector("#ov-files");
  const ovCats = document.querySelector("#ov-cats");
  const ovNames = document.querySelector("#ov-cat-names");
  const ovReview = document.querySelector("#ov-review");
  const ovLater = document.querySelector("#ov-later");
  if (ovPhotos) ovPhotos.textContent = String(data.photos.length);
  if (ovFiles) ovFiles.textContent = `${withFile} with a file`;
  if (ovCats) ovCats.textContent = String(data.categories.length);
  if (ovNames) ovNames.textContent = data.categories.join(" · ");
  if (ovReview) ovReview.textContent = String(reviewTotal);
  if (ovLater) ovLater.textContent = String(laterTotal);
  if (note) {
    if (view === "overview") note.textContent = "What is on the site, and what still needs you.";
    else if (view === "review") note.textContent = reviewTotal ? `${reviewTotal} still missing something` : "Nothing to review";
    else if (view === "later") note.textContent = laterTotal ? "Set aside for later. Nothing here is deleted." : "Nothing set aside";
    else if (view === "upload") note.textContent = "Add photographs here. Titles can be filled in as they upload.";
    else if (view === "categories") note.textContent = "These groups show up on the work page.";
    else note.textContent = `${matches.length} photographs`;
  }
  if (setup) {
    const doneSteps = Number(Boolean(data.photos.length)) + Number(data.photos.some((photo) => photo.image)) + Number(data.categories.length > 1);
    setup.textContent = `${doneSteps} of 3`;
  }
  if (view === "review") {
    renderReview();
    starPopId = "";
    return;
  }
  library.replaceChildren();
  matches.forEach((photo) => {
    const row = document.createElement("div");
    row.className = photo.id === selected ? "photo-row is-on" : "photo-row";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "photo-open";
    const thumb = document.createElement("div");
    thumb.className = "demo";
    const src = safeImage(photo.image);
    if (src) {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      thumb.appendChild(img);
    }
    const copy = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = photo.title;
    const meta = document.createElement("small");
    const gaps = missingBits(photo);
    meta.textContent = view === "later" && gaps.length ? gaps.join(" · ") : photo.category;
    copy.append(title, meta);
    open.append(thumb, copy);
    open.addEventListener("click", () => selectPhoto(photo.id));
    row.appendChild(open);
    if (view === "library") row.appendChild(starButton(photo));
    library.appendChild(row);
  });
  starPopId = "";
}

function starButton(photo) {
  const star = document.createElement("button");
  star.type = "button";
  star.className = photo.starred ? "star is-on" : "star";
  if (photo.id === starPopId) star.classList.add("is-pop");
  star.setAttribute("aria-pressed", photo.starred ? "true" : "false");
  star.setAttribute("aria-label", photo.starred ? "Remove from featured work" : "Star for featured work");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "22");
  svg.setAttribute("height", "22");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M12 3.2 14.55 8.86 20.7 9.5 16.1 13.72 17.4 19.78 12 16.7 6.6 19.78 7.9 13.72 3.3 9.5 9.45 8.86Z");
  svg.appendChild(path);
  star.appendChild(svg);
  star.addEventListener("click", () => toggleStar(photo));
  return star;
}

function toggleStar(photo) {
  const snapshot = data.photos.map((item) => ({
    id: item.id,
    starred: item.starred === true,
    starredAt: item.starredAt || 0,
  }));
  if (photo.starred) {
    photo.starred = false;
    photo.starredAt = 0;
    starPopId = "";
  } else {
    const starred = data.photos
      .filter((item) => item.starred && item.id !== photo.id)
      .sort((a, b) => (a.starredAt || 0) - (b.starredAt || 0));
    while (starred.length >= 4) {
      const oldest = starred.shift();
      oldest.starred = false;
      oldest.starredAt = 0;
    }
    photo.starred = true;
    photo.starredAt = Date.now();
    starPopId = photo.id;
  }
  if (!persist()) {
    snapshot.forEach((saved) => {
      const item = data.photos.find((entry) => entry.id === saved.id);
      if (!item) return;
      item.starred = saved.starred;
      item.starredAt = saved.starredAt;
    });
    starPopId = "";
    soundBad();
    return;
  }
  if (photo.starred) soundStar();
  renderList();
}

function selectPhoto(id) {
  const photo = data.photos.find((item) => item.id === id);
  if (!photo) return;
  selected = id;
  emptyEdit.hidden = true;
  editFields.hidden = false;
  edit.id.value = photo.id;
  edit.title.value = photo.title;
  edit.caption.value = photo.caption;
  edit.category.value = photo.category;
  edit.date.value = photo.date || "";
  edit.image.value = "";
  restore.hidden = !photo.later;
  renderList();
}

function done(title, copy) {
  document.querySelector("#modal-title").textContent = title;
  document.querySelector("#modal-copy").textContent = copy;
  modal.classList.add("is-on");
  soundOk();
}

const reviewFrame = document.querySelector("#review-frame");
const reviewEmpty = document.querySelector("#review-empty");
const reviewBars = document.querySelector("#review-bars");
const reviewPhoto = document.querySelector("#review-photo");
const reviewGaps = document.querySelector("#review-gaps");
const reviewTitle = document.querySelector("#review-title");
const reviewCaption = document.querySelector("#review-caption");
const reviewCategory = document.querySelector("#review-category");
const reviewDate = document.querySelector("#review-date");
const reviewFile = document.querySelector("#review-file");

function currentReview() {
  const queue = reviewQueue();
  if (!queue.length) return null;
  if (reviewIndex >= queue.length) reviewIndex = 0;
  return queue[reviewIndex];
}

function renderReview() {
  const queue = reviewQueue();
  const photo = currentReview();
  reviewFrame.hidden = !photo;
  reviewEmpty.hidden = Boolean(photo);
  if (!photo) return;
  reviewBars.replaceChildren();
  queue.forEach((item, index) => {
    const bar = document.createElement("span");
    if (index < reviewIndex) bar.classList.add("is-done");
    if (index === reviewIndex) bar.classList.add("is-on");
    reviewBars.appendChild(bar);
  });
  reviewPhoto.replaceChildren();
  const src = safeImage(photo.image);
  if (src) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    reviewPhoto.appendChild(img);
  } else {
    const empty = document.createElement("span");
    empty.textContent = "No photograph yet";
    reviewPhoto.appendChild(empty);
  }
  const gaps = missingBits(photo);
  reviewGaps.textContent = gaps.length ? `Missing ${gaps.join(", ")}` : "Ready to save";
  reviewTitle.value = !photo.title || photo.title === "Untitled" ? "" : photo.title;
  reviewCaption.value = photo.caption || "";
  fillSelect(reviewCategory);
  reviewCategory.value = photo.category || data.categories[0] || "";
  reviewDate.value = photo.date || "";
}

function stepReview(direction) {
  const queue = reviewQueue();
  if (queue.length < 2) return;
  reviewIndex = (reviewIndex + direction + queue.length) % queue.length;
  reviewFile.value = "";
  renderReview();
}

function ignoreReview() {
  const photo = currentReview();
  if (!photo) return;
  photo.later = true;
  if (!persist()) return;
  reviewFile.value = "";
  if (reviewIndex >= reviewQueue().length) reviewIndex = 0;
  renderList();
}

function saveReview() {
  const photo = currentReview();
  if (!photo) return;
  const file = reviewFile.files[0];
  const write = (image) => {
    photo.title = safeText(reviewTitle.value, 140);
    photo.caption = safeText(reviewCaption.value, 600);
    photo.category = data.categories.includes(reviewCategory.value) ? reviewCategory.value : data.categories[0] || "";
    photo.date = /^\d{4}-\d{2}-\d{2}$/.test(reviewDate.value) ? reviewDate.value : "";
    if (image) photo.image = image;
    if (!missingBits(photo).length) photo.later = false;
    if (!persist()) return;
    const saveBtn = document.querySelector("#review-save");
    saveBtn.classList.remove("is-saved");
    void saveBtn.offsetWidth;
    saveBtn.classList.add("is-saved");
    window.setTimeout(() => saveBtn.classList.remove("is-saved"), 700);
    reviewFile.value = "";
    if (reviewIndex >= reviewQueue().length) reviewIndex = 0;
    renderList();
    soundOk();
  };
  if (!file) {
    write("");
    return;
  }
  if (!photoFileOk(file)) {
    soundBad();
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("error", () => soundBad());
  reader.addEventListener("load", () => {
    const image = safeImage(String(reader.result));
    if (!image) {
      soundBad();
      return;
    }
    write(image);
  });
  reader.readAsDataURL(file);
}

const fileInput = document.querySelector("#file-input");
const drop = document.querySelector("#drop");
const dropStrong = document.querySelector("#drop-strong");
const dropOr = document.querySelector("#drop-or");
const queueEl = document.querySelector("#queue");
const dropStatus = document.querySelector("#drop-status");
const queueClear = document.querySelector("#queue-clear");
const maxBytes = 75 * 1024 * 1024;
const queue = [];

function formatMb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)}`;
}

function setHot(on, count) {
  drop.classList.toggle("is-hot", on);
  if (on) {
    const label = count === 1 ? "photograph" : "photographs";
    dropStrong.textContent = count ? `Release to upload ${count} ${label}` : "Release to upload";
    dropOr.hidden = true;
    return;
  }
  dropStrong.textContent = "Drop photographs here";
  dropOr.hidden = false;
}

function addFiles(fileList) {
  let rejected = false;
  Array.from(fileList).forEach((file) => {
    const allowed = photoFileOk(file) || (imageTypes.has(file.type) && file.size > maxBytes);
    const item = {
      id: `up-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file,
      title: safeText(file.name.replace(/\.[^.]+$/, ""), 140),
      caption: "",
      category: data.categories[0] || "",
      date: new Date().toISOString().slice(0, 10),
      preview: allowed ? URL.createObjectURL(file) : "",
      loaded: 0,
      seconds: 0,
      status: "uploading",
      photoId: "",
    };
    if (!allowed) {
      item.status = "rejected";
      item.message = "Photographs only";
    } else if (file.size > maxBytes) {
      item.status = "rejected";
      item.message = "Too large – max 75 MB";
    }
    queue.push(item);
    if (item.status === "rejected") {
      rejected = true;
      return;
    }
    startUpload(item);
  });
  if (rejected) soundBad();
  paintQueue();
}

function startUpload(item) {
  item.status = "uploading";
  item.loaded = 0;
  item.message = "";
  const started = performance.now();
  const duration = Math.min(2800, Math.max(800, item.file.size / 12000));
  const step = (now) => {
    if (item.status !== "uploading") return;
    const gone = now - started;
    const progress = Math.min(1, gone / duration);
    item.loaded = item.file.size * progress;
    item.seconds = Math.max(0, Math.ceil((duration - gone) / 1000));
    paintQueue();
    if (progress < 1) {
      item.frame = requestAnimationFrame(step);
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("error", () => {
      item.status = "failed";
      item.message = "Upload failed";
      soundBad();
      paintQueue();
    });
    reader.addEventListener("load", async () => {
      const photoId = item.photoId || `photo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      item.photoId = photoId;
      const existing = data.photos.find((photo) => photo.id === photoId);
      const photo = existing || {
        id: photoId,
        title: safeText(item.title, 140) || "Untitled",
        caption: safeText(item.caption, 600),
        category: data.categories.includes(item.category) ? item.category : data.categories[0] || "",
        date: /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : new Date().toISOString().slice(0, 10),
        image: "",
      };
      const kept = existing ? existing.image : "";
      const image = await shrinkPhoto(String(reader.result));
      if (!image) {
        item.status = "failed";
        item.message = "Photographs only";
        soundBad();
        paintQueue();
        return;
      }
      photo.title = safeText(item.title, 140) || "Untitled";
      photo.caption = safeText(item.caption, 600);
      photo.category = data.categories.includes(item.category) ? item.category : photo.category;
      photo.date = /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : photo.date;
      photo.image = image;
      if (!existing) data.photos.unshift(photo);
      if (!saveLibrary(data)) {
        if (!existing) data.photos.shift();
        else photo.image = kept;
        item.status = "failed";
        item.message = "Not enough room to save";
        soundBad();
        paintQueue();
        return;
      }
      item.status = "done";
      item.loaded = item.file.size;
      item.seconds = 0;
      renderList();
      paintQueue();
      if (!queue.some((entry) => entry.status === "uploading")) soundOk();
    });
    reader.readAsDataURL(item.file);
  };
  item.frame = requestAnimationFrame(step);
}

function paintQueue() {
  upload.classList.toggle("has-files", queue.length > 0);
  queueEl.hidden = queue.length === 0;
  queue.forEach((item) => {
    let row = queueEl.querySelector(`[data-id="${item.id}"]`);
    if (!row) {
      row = document.createElement("div");
      row.className = "queue-row";
      row.dataset.id = item.id;
      const thumb = document.createElement("img");
      thumb.className = "queue-thumb";
      thumb.alt = "";
      if (item.preview) thumb.src = item.preview;
      const copy = document.createElement("div");
      copy.className = "queue-copy";
      const title = document.createElement("input");
      title.className = "queue-title";
      title.value = item.title;
      title.setAttribute("aria-label", "Title");
      title.addEventListener("input", () => {
        item.title = title.value;
        syncQueuedPhoto(item);
      });
      const caption = document.createElement("input");
      caption.className = "queue-field";
      caption.placeholder = "Caption";
      caption.setAttribute("aria-label", "Caption");
      caption.addEventListener("input", () => {
        item.caption = caption.value;
        syncQueuedPhoto(item);
      });
      const date = document.createElement("input");
      date.className = "queue-field";
      date.value = item.date;
      date.setAttribute("aria-label", "Date");
      date.addEventListener("input", () => {
        item.date = date.value;
        syncQueuedPhoto(item);
      });
      const cat = document.createElement("div");
      cat.className = "queue-cat";
      const catBtn = document.createElement("button");
      catBtn.type = "button";
      catBtn.className = "queue-cat-btn";
      catBtn.textContent = item.category || "Category";
      const catMenu = document.createElement("div");
      catMenu.className = "queue-cat-menu";
      catMenu.hidden = true;
      const catList = document.createElement("div");
      catList.className = "queue-cat-list";
      const catAdd = document.createElement("input");
      catAdd.className = "queue-cat-new";
      catAdd.placeholder = "Add a category";
      catAdd.setAttribute("aria-label", "New category");
      catAdd.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        const name = safeText(catAdd.value, 80);
        if (!addCategory(name)) return;
        item.category = name;
        catAdd.value = "";
        catMenu.hidden = true;
        syncQueuedPhoto(item);
        refreshQueueMenus();
      });
      catAdd.addEventListener("click", (event) => event.stopPropagation());
      catBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        const willOpen = catMenu.hidden;
        document.querySelectorAll(".queue-cat-menu").forEach((menu) => {
          menu.hidden = true;
        });
        catMenu.hidden = !willOpen;
      });
      catMenu.addEventListener("click", (event) => event.stopPropagation());
      catMenu.append(catList, catAdd);
      cat.append(catBtn, catMenu);
      const metaRow = document.createElement("div");
      metaRow.className = "queue-meta";
      const check = document.createElement("span");
      check.className = "queue-check";
      check.setAttribute("aria-hidden", "true");
      check.appendChild(uploadCheck());
      const meta = document.createElement("small");
      metaRow.append(check, meta);
      const bar = document.createElement("div");
      bar.className = "queue-bar";
      const fill = document.createElement("span");
      bar.appendChild(fill);
      copy.append(title, caption, date, cat, metaRow, bar);
      attachCalendar(date);
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "queue-retry";
      retry.setAttribute("aria-label", "Upload again");
      retry.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13 8a5 5 0 1 1-1.4-3.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M12.2 2.2v3h-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      retry.addEventListener("click", () => {
        if (retry.classList.contains("is-spin")) return;
        if (reduceMotion()) {
          startUpload(item);
          return;
        }
        retry.classList.add("is-spin");
        window.setTimeout(() => {
          retry.classList.remove("is-spin");
          startUpload(item);
        }, 200);
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "queue-x";
      remove.setAttribute("aria-label", "Remove");
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        if (row.classList.contains("is-leaving")) return;
        const dropRow = () => {
          if (!row.isConnected) return;
          if (item.frame) cancelAnimationFrame(item.frame);
          if (item.preview) URL.revokeObjectURL(item.preview);
          const index = queue.findIndex((entry) => entry.id === item.id);
          if (index >= 0) queue.splice(index, 1);
          row.remove();
          paintQueue();
        };
        if (reduceMotion()) {
          dropRow();
          return;
        }
        row.style.height = `${row.getBoundingClientRect().height}px`;
        row.classList.add("is-leaving");
        remove.classList.add("is-out");
        void row.offsetHeight;
        row.style.height = "0px";
        row.classList.add("is-gone");
        window.setTimeout(dropRow, 210);
      });
      row.append(thumb, copy, retry, remove);
      queueEl.appendChild(row);
      refreshQueueMenus();
    }
    if (row.classList.contains("is-leaving")) return;
    const meta = row.querySelector("small");
    const fill = row.querySelector(".queue-bar span");
    const retry = row.querySelector(".queue-retry");
    const failed = item.status === "failed" || item.status === "rejected";
    row.classList.toggle("is-done", item.status === "done");
    row.classList.toggle("is-failed", failed);
    if (failed && !row.classList.contains("is-shake")) {
      row.classList.add("is-shake");
    }
    if (!failed) row.classList.remove("is-shake");
    if (!retry.classList.contains("is-spin")) retry.hidden = item.status !== "failed";
    if (item.status === "rejected") meta.textContent = item.message;
    else if (item.status === "failed") meta.textContent = "Upload failed";
    else if (item.status === "done") meta.textContent = `${formatMb(item.file.size)} MB · Uploaded`;
    else meta.textContent = `${formatMb(item.loaded)} of ${formatMb(item.file.size)} MB · ${item.seconds}s left`;
    const width = item.status === "rejected" ? 0 : item.file.size ? Math.min(100, (item.loaded / item.file.size) * 100) : 0;
    fill.style.width = `${width}%`;
  });
  const doneCount = queue.filter((item) => item.status === "done").length;
  const active = queue.some((item) => item.status === "uploading");
  const failed = queue.some((item) => item.status === "failed" || item.status === "rejected");
  queueClear.hidden = queue.length === 0 || active;
  if (!queue.length) dropStatus.textContent = "No photographs yet";
  else if (active) {
    const loaded = queue.reduce((sum, item) => sum + item.loaded, 0);
    const total = queue.reduce((sum, item) => sum + item.file.size, 0);
    dropStatus.textContent = `Uploading ${doneCount + queue.filter((item) => item.status === "uploading").length} of ${queue.length} · ${formatMb(loaded)} of ${formatMb(total)} MB`;
  } else dropStatus.textContent = `${doneCount} of ${queue.length} uploaded`;
  dropStatus.classList.toggle("is-warn", failed && !active);
}

document.addEventListener("click", () => {
  document.querySelectorAll(".queue-cat-menu").forEach((menu) => {
    menu.hidden = true;
  });
  document.querySelectorAll(".cal-pop").forEach((pop) => {
    pop.hidden = true;
  });
});

function shrinkPhoto(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const max = 1600;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve("");
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(safeImage(canvas.toDataURL("image/jpeg", 0.82)));
    };
    img.onerror = () => resolve("");
    img.src = dataUrl;
  });
}

const calMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const calDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function attachCalendar(input) {
  if (!input || input.dataset.cal || !input.parentNode) return;
  input.dataset.cal = "1";
  input.type = "text";
  input.readOnly = true;
  input.classList.add("date-field");
  input.placeholder = "Choose a date";
  const wrap = document.createElement("div");
  wrap.className = "date-wrap";
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  const pop = document.createElement("div");
  pop.className = "cal-pop";
  pop.hidden = true;
  wrap.appendChild(pop);
  const start = /^\d{4}-\d{2}-\d{2}$/.test(input.value)
    ? new Date(Number(input.value.slice(0, 4)), Number(input.value.slice(5, 7)) - 1, 1)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let shown = start;

  function paint() {
    const year = shown.getFullYear();
    const month = shown.getMonth();
    pop.replaceChildren();
    const head = document.createElement("div");
    head.className = "cal-head";
    const prev = document.createElement("button");
    prev.type = "button";
    prev.setAttribute("aria-label", "Previous month");
    prev.textContent = "‹";
    const label = document.createElement("strong");
    label.textContent = `${calMonths[month]} ${year}`;
    const next = document.createElement("button");
    next.type = "button";
    next.setAttribute("aria-label", "Next month");
    next.textContent = "›";
    prev.addEventListener("click", (event) => {
      event.stopPropagation();
      shown = new Date(year, month - 1, 1);
      paint();
    });
    next.addEventListener("click", (event) => {
      event.stopPropagation();
      shown = new Date(year, month + 1, 1);
      paint();
    });
    head.append(prev, label, next);
    const grid = document.createElement("div");
    grid.className = "cal-grid";
    calDays.forEach((name) => {
      const cell = document.createElement("span");
      cell.textContent = name;
      grid.appendChild(cell);
    });
    const offset = new Date(year, month, 1).getDay();
    const count = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < offset; i += 1) grid.appendChild(document.createElement("span"));
    const today = new Date();
    for (let day = 1; day <= count; day += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(day);
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (iso === input.value) button.classList.add("is-on");
      if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === day) button.classList.add("is-today");
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        input.value = iso;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        pop.hidden = true;
      });
      grid.appendChild(button);
    }
    pop.append(head, grid);
  }

  input.addEventListener("click", (event) => {
    event.stopPropagation();
    document.querySelectorAll(".cal-pop").forEach((el) => {
      if (el !== pop) el.hidden = true;
    });
    pop.hidden = !pop.hidden;
    if (!pop.hidden) paint();
  });
  pop.addEventListener("click", (event) => event.stopPropagation());
}

document.querySelector("#browse").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  addFiles(fileInput.files);
  fileInput.value = "";
});
drop.addEventListener("dragover", (event) => {
  event.preventDefault();
  setHot(true, event.dataTransfer.items.length);
});
drop.addEventListener("dragleave", (event) => {
  if (drop.contains(event.relatedTarget)) return;
  setHot(false);
});
drop.addEventListener("drop", (event) => {
  event.preventDefault();
  setHot(false);
  addFiles(event.dataTransfer.files);
});
let queueLeaving = false;

function reduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function uploadCheck() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 16 16");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M3.2 8.3 6.3 11.4 12.8 4.6");
  svg.appendChild(path);
  return svg;
}

function emptyQueue() {
  for (let index = queue.length - 1; index >= 0; index -= 1) {
    const item = queue[index];
    if (item.status === "uploading") continue;
    if (item.frame) cancelAnimationFrame(item.frame);
    if (item.preview) URL.revokeObjectURL(item.preview);
    queue.splice(index, 1);
  }
  queueEl.replaceChildren();
  queueEl.classList.remove("is-leaving");
  queueEl.style.removeProperty("--queue-h");
  queueClear.classList.remove("is-on");
  queueLeaving = false;
  paintQueue();
}

queueClear.addEventListener("click", () => {
  if (queueLeaving || !queue.length) return;
  if (reduceMotion()) {
    emptyQueue();
    return;
  }
  queueLeaving = true;
  queueClear.classList.add("is-on");
  queueEl.style.setProperty("--queue-h", `${queueEl.offsetHeight}px`);
  queueEl.classList.add("is-leaving");
  window.setTimeout(emptyQueue, 240);
});

document.querySelectorAll(".rail nav button").forEach((button) => {
  button.addEventListener("click", () => showPanel(button.dataset.panel));
});

document.querySelector("#review-back").addEventListener("click", () => stepReview(-1));
document.querySelector("#review-next").addEventListener("click", () => stepReview(1));
document.querySelector("#review-ignore").addEventListener("click", ignoreReview);
document.querySelector("#review-save").addEventListener("click", saveReview);
restore.addEventListener("click", () => {
  const photo = data.photos.find((item) => item.id === selected);
  if (!photo) return;
  photo.later = false;
  if (!persist()) return;
  restore.hidden = true;
  showPanel("review");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== search) {
    event.preventDefault();
    search.focus();
    return;
  }
  if (view !== "review") return;
  const tag = document.activeElement ? document.activeElement.tagName : "";
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  if (event.key === "ArrowLeft") stepReview(-1);
  if (event.key === "ArrowRight") stepReview(1);
});

search.addEventListener("input", () => {
  renderSuggestions();
  renderList();
});

const catPrompt = document.querySelector("#cat-prompt");
const catName = document.querySelector("#cat-name");

document.querySelector("#cat-add").addEventListener("click", () => {
  catName.value = "";
  catPrompt.classList.add("is-on");
  catName.focus();
});

document.querySelector("#cat-cancel").addEventListener("click", () => {
  catPrompt.classList.remove("is-on");
});

document.querySelector("#cat-save").addEventListener("click", () => {
  if (!addCategory(catName.value)) return;
  catPrompt.classList.remove("is-on");
});

catName.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    if (!addCategory(catName.value)) return;
    catPrompt.classList.remove("is-on");
  }
  if (event.key === "Escape") catPrompt.classList.remove("is-on");
});

function syncQueuedPhoto(item) {
  if (!item.photoId) return;
  const photo = data.photos.find((entry) => entry.id === item.photoId);
  if (!photo) return;
  photo.title = safeText(item.title, 140) || "Untitled";
  photo.caption = safeText(item.caption, 600);
  photo.date = /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : photo.date;
  if (data.categories.includes(item.category)) photo.category = item.category;
  persist();
  renderList();
}

function refreshQueueMenus() {
  if (!queueEl) return;
  queueEl.querySelectorAll(".queue-cat").forEach((box) => {
    const row = box.closest(".queue-row");
    const item = queue.find((entry) => entry.id === row.dataset.id);
    if (!item) return;
    const list = box.querySelector(".queue-cat-list");
    const label = box.querySelector(".queue-cat-btn");
    list.replaceChildren();
    data.categories.forEach((name) => {
      const choice = document.createElement("button");
      choice.type = "button";
      choice.textContent = name;
      if (name === item.category) choice.classList.add("is-on");
      choice.addEventListener("click", () => {
        item.category = name;
        label.textContent = name;
        box.querySelector(".queue-cat-menu").hidden = true;
        syncQueuedPhoto(item);
        refreshQueueMenus();
      });
      list.appendChild(choice);
    });
    label.textContent = item.category || "Category";
  });
}

function refreshCategorySelects() {
  const chosen = edit.category.value;
  fillSelect(edit.category);
  fillSelect(reviewCategory);
  if (data.categories.includes(chosen)) edit.category.value = chosen;
  refreshQueueMenus();
}

function addCategory(name) {
  const clean = safeText(name, 80);
  if (!clean || data.categories.includes(clean)) return false;
  data.categories.push(clean);
  if (!persist()) {
    data.categories.pop();
    return false;
  }
  refreshCategorySelects();
  renderCategories();
  return true;
}

function deleteCategory(name) {
  const previousCategories = data.categories.slice();
  const previousPhotos = data.photos.map((photo) => photo.category);
  const fallback = data.categories.find((item) => item !== name) || "";
  data.categories = data.categories.filter((item) => item !== name);
  data.photos.forEach((photo) => {
    if (photo.category === name) photo.category = fallback;
  });
  if (!persist()) {
    data.categories = previousCategories;
    data.photos.forEach((photo, index) => {
      photo.category = previousPhotos[index];
    });
    return;
  }
  soundDelete();
  refreshCategorySelects();
  renderCategories();
  renderList();
}

function renderCategories() {
  categoryList.replaceChildren();
  data.categories.forEach((name) => {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "cat-delete";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => deleteCategory(name));
    item.append(label, remove);
    categoryList.appendChild(item);
  });
}

edit.addEventListener("submit", (event) => {
  event.preventDefault();
  const photo = data.photos.find((item) => item.id === edit.id.value);
  if (!photo) return;
  const file = edit.image.files[0];
  const write = (image) => {
    photo.title = safeText(edit.title.value, 140);
    photo.caption = safeText(edit.caption.value, 600);
    photo.category = data.categories.includes(edit.category.value) ? edit.category.value : data.categories[0] || "";
    photo.date = /^\d{4}-\d{2}-\d{2}$/.test(edit.date.value) ? edit.date.value : "";
    if (image) photo.image = image;
    if (!missingBits(photo).length) photo.later = false;
    restore.hidden = !photo.later;
    edit.image.value = "";
    if (!persist()) return;
    renderList();
    done("Saved", "The photograph was updated.");
  };
  if (!file) {
    write("");
    return;
  }
  if (!photoFileOk(file)) {
    soundBad();
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("error", () => soundBad());
  reader.addEventListener("load", () => {
    const image = safeImage(String(reader.result));
    if (!image) {
      soundBad();
      return;
    }
    write(image);
  });
  reader.readAsDataURL(file);
});

const confirm = document.querySelector("#confirm");
const skipDeleteAsk = document.querySelector("#skip-delete-ask");
const deleteQuietKey = "norman-delete-quiet-until";
const deleteQuietFor = 7 * 24 * 60 * 60 * 1000;

function deleteIsQuiet() {
  try {
    const until = Number(localStorage.getItem(deleteQuietKey));
    if (!until) return false;
    if (Date.now() >= until) {
      localStorage.removeItem(deleteQuietKey);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function removeSelected() {
  const index = data.photos.findIndex((item) => item.id === selected);
  if (index < 0) return;
  const removed = data.photos.splice(index, 1)[0];
  if (!persist()) {
    data.photos.splice(index, 0, removed);
    return;
  }
  clearEdit();
  renderList();
  soundDelete();
}

document.querySelector("#remove").addEventListener("click", () => {
  if (!selected) return;
  if (deleteIsQuiet()) {
    removeSelected();
    return;
  }
  skipDeleteAsk.checked = false;
  confirm.classList.add("is-on");
});

document.querySelector("#confirm-cancel").addEventListener("click", () => {
  confirm.classList.remove("is-on");
});

document.querySelector("#confirm-delete").addEventListener("click", () => {
  if (skipDeleteAsk.checked) {
    try {
      localStorage.setItem(deleteQuietKey, String(Date.now() + deleteQuietFor));
    } catch {
      // The warning still closes for this delete.
    }
  }
  confirm.classList.remove("is-on");
  removeSelected();
});

const mute = document.querySelector("#mute");

function syncMute() {
  let muted = false;
  try {
    muted = localStorage.getItem("norman-mute") === "1";
  } catch {
    muted = false;
  }
  mute.classList.toggle("is-muted", muted);
  mute.setAttribute("aria-pressed", muted ? "true" : "false");
  mute.setAttribute("aria-label", muted ? "Unmute sounds" : "Mute sounds");
}

syncMute();
mute.addEventListener("click", () => {
  mute.classList.remove("is-anim");
  void mute.offsetWidth;
  mute.classList.add("is-anim");
  try {
    const muted = localStorage.getItem("norman-mute") === "1";
    localStorage.setItem("norman-mute", muted ? "0" : "1");
  } catch {
    // The icon still flips for this page.
  }
  syncMute();
});

document.querySelector("#modal-close").addEventListener("click", () => {
  modal.classList.remove("is-on");
});

document.querySelectorAll("[data-jump]").forEach((button) => {
  button.addEventListener("click", () => showPanel(button.dataset.jump));
});

fillSelect(edit.category);
renderCategories();
attachCalendar(document.querySelector("#review-date"));
attachCalendar(edit.date);
showPanel("overview");
