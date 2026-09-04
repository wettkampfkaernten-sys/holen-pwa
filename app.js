const STORAGE = "holen-settings-v1";
const HISTORY = "holen-history-v1";
const DEFAULT_API = "https://nuko-c.meowing.de";

const $ = (id) => document.getElementById(id);
const form = $("form");
const statusEl = $("status");
const pickerEl = $("picker");
const sheet = $("sheet");

let settings = loadSettings();
let bearer = null;
let turnstileWidget = null;

function loadSettings() {
  try {
    return { apiUrl: DEFAULT_API, apiKey: "", ...JSON.parse(localStorage.getItem(STORAGE) || "{}") };
  } catch {
    return { apiUrl: DEFAULT_API, apiKey: "" };
  }
}

function saveSettings() {
  localStorage.setItem(STORAGE, JSON.stringify({
    apiUrl: settings.apiUrl.replace(/\/$/, ""),
    apiKey: settings.apiKey.trim(),
  }));
}

function setStatus(text, err = false) {
  statusEl.hidden = !text;
  statusEl.textContent = text;
  statusEl.classList.toggle("err", err);
}

function apiBase() {
  return (settings.apiUrl || DEFAULT_API).replace(/\/$/, "");
}

function authHeaders() {
  const headers = { Accept: "application/json", "Content-Type": "application/json" };
  if (settings.apiKey) headers.Authorization = `Api-Key ${settings.apiKey}`;
  else if (bearer) headers.Authorization = `Bearer ${bearer}`;
  return headers;
}

async function getInfo() {
  const res = await fetch(apiBase() + "/", { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Instanz antwortet nicht (" + res.status + ")");
  return res.json();
}

function loadTurnstile(sitekey) {
  return new Promise((resolve, reject) => {
    const go = () => {
      $("turnstileBox").hidden = false;
      if (turnstileWidget != null) window.turnstile.remove(turnstileWidget);
      turnstileWidget = window.turnstile.render("turnstile", {
        sitekey,
        theme: "dark",
        callback: resolve,
        "error-callback": () => reject(new Error("Turnstile fehlgeschlagen")),
      });
    };
    if (window.turnstile) return go();
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = go;
    s.onerror = () => reject(new Error("Turnstile-Script blockiert"));
    document.head.appendChild(s);
  });
}

async function ensureSession(info) {
  bearer = null;
  const key = info && info.cobalt && info.cobalt.turnstileSitekey;
  if (!key || settings.apiKey) {
    $("turnstileBox").hidden = true;
    return;
  }
  setStatus("Kurz warten: Bot-Check der Instanz …");
  const token = await loadTurnstile(key);
  const res = await fetch(apiBase() + "/session", {
    method: "POST",
    headers: { Accept: "application/json", "cf-turnstile-response": token },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) throw new Error((data.error && data.error.code) || "Session fehlgeschlagen");
  bearer = data.token;
  $("turnstileBox").hidden = true;
}

function triggerDownload(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  if (filename) a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function addHistory(source, filename) {
  const list = JSON.parse(localStorage.getItem(HISTORY) || "[]");
  list.unshift({ source, filename, t: Date.now() });
  localStorage.setItem(HISTORY, JSON.stringify(list.slice(0, 20)));
  renderHistory();
}

function renderHistory() {
  const list = JSON.parse(localStorage.getItem(HISTORY) || "[]");
  $("history").innerHTML = list.map((item) => `<li><a href="${item.source}">${item.filename || item.source}</a></li>`).join("");
}

function showPicker(data) {
  pickerEl.hidden = false;
  const items = data.picker || [];
  const audio = data.audio
    ? `<a class="pick" href="${data.audio}" download="${data.audioFilename || "audio"}">Nur Audio speichern</a>`
    : "";
  pickerEl.innerHTML = audio + items.map((item, i) => {
    const thumb = item.thumb ? `<img src="${item.thumb}" alt="">` : "";
    return `<a class="pick" href="${item.url}" download>${thumb}<span>${item.type || "datei"} ${i + 1}</span></a>`;
  }).join("");
}

function humanError(code) {
  const map = {
    "error.api.auth.api-key.missing": "Diese Instanz will einen API-Key.",
    "error.api.auth.turnstile.missing": "Bot-Check fehlt – Instanz wechseln oder nochmal versuchen.",
    "error.api.fetch.empty": "Quelle leer oder blockiert.",
    "error.api.fetch.fail": "Quelle nicht erreichbar.",
    "error.api.link.invalid": "Kein gültiger Link.",
    "error.api.link.unsupported": "Diese Seite unterstützt die Instanz nicht.",
    "error.api.youtube.disabled_main_instance": "YouTube auf dieser Instanz aus. Andere Instanz nehmen.",
    "error.api.rate_exceeded": "Zu viele Anfragen. Kurz warten oder Instanz wechseln.",
  };
  return map[code] || code || "Unbekannter Fehler";
}

async function processUrl(url) {
  pickerEl.hidden = true;
  setStatus("Instanz prüfen …");
  const info = await getInfo();
  await ensureSession(info);
  setStatus("Datei vorbereiten …");
  const body = {
    url,
    videoQuality: $("quality").value,
    downloadMode: $("mode").value,
    audioFormat: $("audioFormat").value,
    audioBitrate: $("audioBitrate").value,
    filenameStyle: "pretty",
    localProcessing: "disabled",
    alwaysProxy: true,
    youtubeVideoCodec: "h264",
  };
  const res = await fetch(apiBase() + "/", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (data.status === "error") throw new Error(humanError(data.error && data.error.code));
  if (data.status === "picker") {
    setStatus("Mehrere Dateien – such dir eine aus.");
    showPicker(data);
    addHistory(url, "Auswahl");
    return;
  }
  if (data.status === "tunnel" || data.status === "redirect") {
    setStatus("Download startet: " + (data.filename || "Datei"));
    triggerDownload(data.url, data.filename);
    addHistory(url, data.filename);
    return;
  }
  if (data.status === "local-processing") {
    throw new Error("Diese Instanz will lokal verarbeiten. Andere Instanz wählen.");
  }
  throw new Error("Unerwartete Antwort: " + (data.status || res.status));
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = $("url").value.trim();
  $("go").disabled = true;
  try {
    await processUrl(url);
  } catch (err) {
    const msg = String(err.message || err);
    const cors = /Failed to fetch|NetworkError|CORS/i.test(msg);
    setStatus(cors
      ? "CORS/Netzwerk: Diese Instanz lässt fremde Frontends nicht zu. Andere Instanz wählen oder später selbst hosten."
      : msg, true);
  } finally {
    $("go").disabled = false;
  }
});

$("settingsBtn").onclick = () => {
  $("apiUrl").value = settings.apiUrl;
  $("apiKey").value = settings.apiKey;
  sheet.hidden = false;
};
sheet.addEventListener("click", (e) => { if (e.target === sheet) sheet.hidden = true; });
document.querySelectorAll("[data-api]").forEach((btn) => {
  btn.onclick = () => { $("apiUrl").value = btn.dataset.api; };
});
$("saveApi").onclick = () => {
  settings.apiUrl = $("apiUrl").value.trim();
  settings.apiKey = $("apiKey").value.trim();
  saveSettings();
  bearer = null;
  sheet.hidden = true;
  setStatus("Instanz gespeichert: " + apiBase());
};
$("testApi").onclick = async () => {
  settings.apiUrl = $("apiUrl").value.trim();
  try {
    const info = await getInfo();
    const services = ((info.cobalt && info.cobalt.services) || []).slice(0, 8).join(", ");
    const ts = info.cobalt && info.cobalt.turnstileSitekey ? " · Turnstile an" : "";
    $("instanceInfo").textContent = "OK · v" + ((info.cobalt && info.cobalt.version) || "?") + " · " + services + ts;
  } catch (err) {
    $("instanceInfo").textContent = "Fehler: " + err.message;
  }
};

renderHistory();
$("url").addEventListener("focus", async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text && /^https?:\/\//i.test(text) && !$("url").value) $("url").value = text.trim();
  } catch {}
});
