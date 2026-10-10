try {
  const saved = localStorage.getItem("norman-theme");
  if (saved === "dark" || saved === "oled") document.documentElement.dataset.theme = saved;
} catch {
  // The sign-in page stays on the white background.
}

const form = document.querySelector("#login");
const note = document.querySelector("#note");
const google = document.querySelector("#google");

const demoEmail = "norman@demo.com";
const demoPassword = "demo";

function flash(kind, message) {
  form.classList.remove("is-good", "is-bad");
  void form.offsetWidth;
  form.classList.add(kind);
  note.textContent = message;
  window.setTimeout(() => form.classList.remove(kind), 700);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = form.email.value.trim().toLowerCase();
  const password = form.password.value;
  if (email === demoEmail && password === demoPassword) {
    flash("is-good", "Signed in");
    sessionStorage.setItem("norman-admin", "ok");
    window.setTimeout(() => {
      window.location.href = "admin.html";
    }, 650);
    return;
  }
  flash("is-bad", "Wrong email or password");
});

google.addEventListener("click", () => {
  flash("is-bad", "Google sign-in is not connected yet");
});

document.querySelector("#bypass").addEventListener("click", () => {
  sessionStorage.setItem("norman-admin", "ok");
  window.location.href = "admin.html";
});
