const signedIn = sessionStorage.getItem("norman-admin") === "ok";
window.location.replace(signedIn ? "../admin.html" : "../login.html");
