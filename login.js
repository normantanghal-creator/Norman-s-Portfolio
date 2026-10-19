try {
  const saved = localStorage.getItem("norman-theme");
  if (saved === "dark" || saved === "oled") document.documentElement.dataset.theme = saved;
} catch {
  // The sign-in page stays on the white background.
}

const form = document.querySelector("#login");
const note = document.querySelector("#note");
const googleButton = document.querySelector("#google");
const googleSlot = document.querySelector("#google-slot");

const demoEmail = "norman@demo.com";
const demoPassword = "demo";

function flash(kind, message) {
  form.classList.remove("is-good", "is-bad");
  void form.offsetWidth;
  form.classList.add(kind);
  note.textContent = message;
  window.setTimeout(() => form.classList.remove(kind), 700);
}

function openAdmin(delay) {
  sessionStorage.setItem("norman-admin", "ok");
  window.setTimeout(() => {
    window.location.href = "admin.html";
  }, delay);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = form.email.value.trim().toLowerCase();
  const password = form.password.value;
  if (email === demoEmail && password === demoPassword) {
    flash("is-good", "Signed in");
    openAdmin(650);
    return;
  }
  flash("is-bad", "Wrong email or password");
});

googleButton.addEventListener("click", () => {
  flash("is-bad", "Google sign-in is not connected yet");
});

document.querySelector("#bypass").addEventListener("click", () => openAdmin(0));

async function signInWithGoogle(response) {
  try {
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential }),
    });
    if (res.ok) {
      const { user } = await res.json();
      flash("is-good", user.name ? `Signed in as ${user.name}` : "Signed in");
      openAdmin(650);
      return;
    }
    flash("is-bad", res.status === 403 ? "This Google account can't open the admin" : "Google sign-in failed. Try again.");
  } catch {
    flash("is-bad", "Google sign-in failed. Try again.");
  }
}

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function connectGoogle() {
  let session;
  try {
    const res = await fetch("/api/session", { cache: "no-store" });
    if (!res.ok) return;
    session = await res.json();
  } catch {
    return;
  }
  if (session.user) {
    openAdmin(0);
    return;
  }
  if (!session.google) return;
  try {
    await loadGoogleScript();
  } catch {
    return;
  }
  window.google.accounts.id.initialize({ client_id: session.google, callback: signInWithGoogle });
  window.google.accounts.id.renderButton(googleSlot, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "signin_with",
    shape: "rectangular",
    logo_alignment: "center",
    width: Math.min(400, googleSlot.parentElement.clientWidth - 56),
  });
  form.classList.add("is-google");
  googleSlot.hidden = false;
}

connectGoogle();
