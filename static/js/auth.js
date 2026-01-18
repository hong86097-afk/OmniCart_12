const msg = document.getElementById("msg");
const show = (t, type="success") => msg.innerHTML = `<div class="alert alert-${type}">${t}</div>`;

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  const res = await fetch("/api/login", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (!res.ok) return show(data.error || "Login failed", "danger");

  show("Login success ✅");
  window.location.href = "/dashboard";
});
