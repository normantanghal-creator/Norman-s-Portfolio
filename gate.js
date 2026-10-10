const gateKey = "norman-gate";

function gateOpen() {
  try {
    return localStorage.getItem(gateKey) === "ok";
  } catch {
    return false;
  }
}

function unlockGate() {
  try {
    localStorage.setItem(gateKey, "ok");
  } catch {
    // The page still opens for this visit.
  }
  document.documentElement.classList.remove("locked");
}

if (gateOpen()) unlockGate();

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#gate");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const password = form.password.value.trim().toLowerCase();
    if (password === "poi") {
      unlockGate();
      return;
    }
    form.classList.remove("is-bad");
    void form.offsetWidth;
    form.classList.add("is-bad");
    window.setTimeout(() => form.classList.remove("is-bad"), 420);
  });
});
