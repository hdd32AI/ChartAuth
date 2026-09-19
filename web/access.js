const key = "chartauth_access",
  form = document.getElementById("access-form"),
  error = document.getElementById("access-error"),
  button = document.getElementById("access-submit");
async function call(route, body, token) {
  const headers = {
    "Content-Type": "application/json",
    apikey: window.LAB_PUBLIC_KEY,
    Authorization: "Bearer " + window.LAB_PUBLIC_KEY,
  };
  if (token) headers["x-access-token"] = token;
  const r = await fetch(window.LAB_API + "/" + route, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "Access could not be verified");
  return data;
}
async function enter(token) {
  const page = /\/(notes|paper(?:\.html)?)\/?$/.test(location.pathname)
    ? "paper"
    : "index";
  const data = await call("portal", { page }, token);
  localStorage.setItem(key, token);
  document.open();
  document.write(data.html);
  document.close();
}
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  button.disabled = true;
  button.textContent = "Opening your workspace…";
  error.textContent = "";
  try {
    const data = await call("login", {
      password: document.getElementById("access-password").value,
    });
    await enter(data.token);
  } catch (e) {
    error.textContent = e.message;
    button.disabled = false;
    button.textContent = "Enter workspace ↗";
  }
});
document.getElementById("access-show").onclick = () => {
  const p = document.getElementById("access-password");
  p.type = p.type === "password" ? "text" : "password";
  document.getElementById("access-show").textContent =
    p.type === "password" ? "Show" : "Hide";
};
const previous = localStorage.getItem(key);
if (previous)
  enter(previous).catch(() => {
    localStorage.removeItem(key);
  });
