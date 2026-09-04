const STORAGE = "holen-settings-v2";
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

const ERROR_MAP = {
  "error.api.auth.api-key.missing": "Diese Instanz will einen API-Key. Unter Instanz eintragen.",
  "error.api.auth.api-key.invalid": "API-Key ungültig. Nochmal prüfen oder Instanz wechseln.",
  "error.api.auth.jwt.missing": "Session fehlt. Bot-Check lösen oder API-Key nutzen.",
  "error.api.auth.jwt.invalid": "Session abgelaufen. Nochmal holen, der Bot-Check kommt wieder.",
  "error.api.auth.turnstile.missing": "Bot-Check fehlt. Instanz wechseln oder nochmal versuchen.",
  "error.api.auth.turnstile.invalid": "Bot-Check nicht akzeptiert. Andere Instanz oder API-Key.",
  "error.api.fetch.empty": "Quelle leer oder blockiert.",
  "error.api.fetch.fail": "Quelle nicht erreichbar.",
  "error.api.fetch.critical": "Die Instanz ist gerade überfordert. Kurz warten oder wechseln.",
  "error.api.link.invalid": "Das ist kein gültiger Link.",
  "error.api.link.unsupported": "Diese Seite kennt die Instanz nicht.",
  "error.api.content.video.unavailable": "Video nicht verfügbar (privat, gelöscht, regiongesperrt).",
  "error.api.content.post.unavailable": "Beitrag nicht verfügbar.",
  "error.api.content.too_long": "Zu lang für diese Instanz. Kürzeres Stück oder andere Instanz.",
  "error.api.youtube.login": "YouTube will Login-Cookies. Andere Instanz oder eigene hosten.",
  "error.api.youtube.token.invalid": "YouTube-Token der Instanz ist tot. Andere Instanz nehmen.",
  "error.api.youtube.disabled_main_instance": "YouTube auf dieser Instanz aus. Andere nehmen.",
  "error.api.rate_exceeded": "Zu viele Anfragen. Kurz warten oder Instanz wechseln.",
  "error.api.service.unsupported": "Diesen Dienst kann die Instanz nicht.",
  "error.api.service.disabled": "Dienst auf dieser Instanz abgeschaltet.",
};

function loadSettings() {
  try {
    return {
      apiUrl: DEFAULT_API,
      apiKey: "",
      quality: "1080",
      mode: "auto",
      audioFormat: "mp3",
      audioBitrate: "128",
      ...JSON.parse(localStorage.getItem(STORAGE) || "{}"),
    };
  } catch {
    return { apiUrl: DEFAULT_API, apiKey: "", quality: "1080", mode: "auto", audioFormat: "mp3", audioBitrate: "128" };
  }
}

function apiBase() {
  return (settings.apiUrl || DEFAULT_API).replace(/\/+$/, "");
}

function hostLabel(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function saveSettings() {
  settings.apiUrl = apiBase();
  settings.apiKey = (settings.apiKey || "").trim();
  localStorage.setItem(STORAGE, JSON.stringify(settings));
  $("hostLabel").textContent = hostLabel(apiBase());
}

function setStatus(text, err = false) {
  statusEl.hidden = !text;
  statusEl.textContent = text;
  statusEl.classList.toggle("err", err);
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
        "error-callback": () =>
          reject(new Error("Bot-Check der Instanz geht hier nicht (Domain oder iframe). Andere Instanz oder API-Key.")),
      });
    };
    if (window.turnstile) return go();
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = go;
    s.onerror = () => reject(new Error("Turnstile-Script blockiert."));
    document.head.appendChild(s);
  });
}

function humanError(code) {
  return ERROR_MAP[code] || code || "Unbekannter Fehler. Andere Instanz versuchen.";
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
  if (!res.ok || !data.token) throw new Error(humanError(data.error && data.error.code) || "Session fehlgeschlagen");
  bearer = data.token;
  $("turnstileBox").hidden = true;
}

function triggerDownload(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  if (filename) a.download = filename;
  a.rel = "noopener";
  a.target = "_blank";
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
  const ul = $("history");
  ul.replaceChildren();
  $("clearHistory").hidden = list.length === 0;
  list.forEach((item) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = item.filename || item.source;
    btn.title = item.source;
    btn.onclick = () => { $("url").value = item.source; };
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

function showPicker(data) {
  pickerEl.hidden = false;
  pickerEl.replaceChildren();
  if (data.audio) {
    const a = document.createElement("button");
    a.type = "button";
    a.className = "pick";
    a.textContent = "Nur Audio speichern";
    a.onclick = () => triggerDownload(data.audio, data.audioFilename);
    pickerEl.appendChild(a);
  }
  (data.picker || []).forEach((item, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pick";
    if (item.thumb) {
      const img = document.createElement("img");
      img.src = item.thumb;
      img.alt = "";
      btn.appendChild(img);
    }
    const span = document.createElement("span");
    span.textContent = (item.type || "Datei") + " " + (i + 1);
    btn.appendChild(span);
    btn.onclick = () => triggerDownload(item.url);
    pickerEl.appendChild(btn);
  });
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
  document.querySelectorAll("[data-api]").forEach((btn) => {
    btn.classList.toggle("on", btn.dataset.api === apiBase());
  });
  sheet.hidden = false;
};
sheet.addEventListener("click", (e) => { if (e.target === sheet) sheet.hidden = true; });
document.querySelectorAll("[data-api]").forEach((btn) => {
  btn.onclick = () => {
    $("apiUrl").value = btn.dataset.api;
    document.querySelectorAll("[data-api]").forEach((b) => b.classList.toggle("on", b === btn));
  };
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
    $("instanceInfo").textContent = "OK · v" + ((info.cobalt && info.cobalt.version) || "?") + (services ? " · " + services : "") + ts;
  } catch (err) {
    $("instanceInfo").textContent = "Fehler: " + err.message;
  }
};

document.querySelectorAll(".mode").forEach((btn) => {
  btn.onclick = () => {
    $("mode").value = btn.dataset.mode;
    settings.mode = btn.dataset.mode;
    saveSettings();
    document.querySelectorAll(".mode").forEach((b) => b.classList.toggle("on", b === btn));
  };
});
["quality", "audioFormat", "audioBitrate"].forEach((id) => {
  $(id).addEventListener("change", () => {
    settings[id] = $(id).value;
    saveSettings();
  });
});

$("paste").onclick = async () => {
  try {
    const text = (await navigator.clipboard.readText()).trim();
    const match = text.match(/https?:\/\/[^\s]+/i);
    if (match) $("url").value = match[0];
    else setStatus("In der Zwischenablage steckt kein Link.", true);
  } catch {
    setStatus("Zwischenablage blockiert. Link selbst reinkopieren.", true);
  }
};

$("clearHistory").onclick = () => {
  localStorage.removeItem(HISTORY);
  renderHistory();
};

function applySharedUrl() {
  const params = new URLSearchParams(location.search);
  for (const key of ["url", "text", "link"]) {
    const value = (params.get(key) || "").trim();
    const match = value.match(/https?:\/\/[^\s]+/i);
    if (match) { $("url").value = match[0]; break; }
  }
}

$("quality").value = settings.quality || "1080";
$("audioFormat").value = settings.audioFormat || "mp3";
$("audioBitrate").value = settings.audioBitrate || "128";
$("mode").value = settings.mode || "auto";
document.querySelectorAll(".mode").forEach((b) => b.classList.toggle("on", b.dataset.mode === $("mode").value));
$("hostLabel").textContent = hostLabel(apiBase());
renderHistory();
applySharedUrl();
