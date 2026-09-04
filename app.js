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
      if (turnstileWidget != null && window.turnstile) {
        try { window.turnstile.remove(turnstileWidget); } catch {}
      }
      turnstileWidget = window.turnstile.render("turnstile", {
        sitekey,
        theme: "dark",
        callback: resolve,
        "error-callback": () => reject(new Error("Turnstile fehlgeschlagen")),
        "expired-callback": () => reject(new Error("Turnstile abgelaufen – nochmal versuchen")),
      });
    };
    if (window.turnstile) return go();
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = go;
    s.onerror = () => reject(new Error("Turnstile-Script blockiert (Adblocker?)"));
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
  if (!res.ok || !data.token) {
    const code = (data.error && data.error.code) || data.error || "Session fehlgeschlagen";
    throw new Error(humanError(code));
  }
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
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY) || "[]");
    list.unshift({ source, filename, t: Date.now() });
    localStorage.setItem(HISTORY, JSON.stringify(list.slice(0, 20)));
  } catch {}
  renderHistory();
}

function renderHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY) || "[]");
    $("history").innerHTML = list
      .map((item) => `<li><a href="${item.source}" target="_blank" rel="noopener">${escapeHtml(item.filename || item.source)}</a></li>`)
      .join("");
  } catch {
    $("history").innerHTML = "";
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showPicker(data) {
  pickerEl.hidden = false;
  const items = data.picker || [];
  let html = "";
  if (data.audio) {
    const name = data.audioFilename || "audio";
    html += `<button type="button" class="pick" data-url="${escapeAttr(data.audio)}" data-name="${escapeAttr(name)}">Nur Audio speichern</button>`;
  }
  html += items
    .map((item, i) => {
      const thumb = item.thumb ? `<img src="${escapeAttr(item.thumb)}" alt="" loading="lazy">` : "";
      const label = `${item.type || "Datei"} ${i + 1}`;
      return `<button type="button" class="pick" data-url="${escapeAttr(item.url)}" data-name="">${thumb}<span>${escapeHtml(label)}</span></button>`;
    })
    .join("");
  pickerEl.innerHTML = html || "<p class='hint'>Keine auswählbaren Dateien.</p>";
  pickerEl.querySelectorAll("button.pick").forEach((btn) => {
    btn.addEventListener("click", () => {
      triggerDownload(btn.dataset.url, btn.dataset.name || undefined);
      setStatus("Download gestartet.");
    });
  });
}

function escapeAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function humanError(code) {
  const map = {
    "error.api.auth.api-key.missing": "Diese Instanz will einen API-Key.",
    "error.api.auth.api-key.invalid": "API-Key ungültig.",
    "error.api.auth.jwt.missing": "Sitzung fehlt – Bot-Check nochmal versuchen.",
    "error.api.auth.jwt.invalid": "Sitzung abgelaufen – nochmal versuchen.",
    "error.api.auth.turnstile.missing": "Bot-Check fehlt – Instanz wechseln oder nochmal versuchen.",
    "error.api.auth.turnstile.invalid": "Bot-Check ungültig – Seite neu laden.",
    "error.api.fetch.empty": "Quelle leer oder blockiert.",
    "error.api.fetch.fail": "Quelle nicht erreichbar.",
    "error.api.fetch.critical": "Quelle blockiert den Abruf hart.",
    "error.api.link.invalid": "Kein gültiger Link.",
    "error.api.link.unsupported": "Diese Seite unterstützt die Instanz nicht.",
    "error.api.content.too_long": "Inhalt zu lang für diese Instanz.",
    "error.api.content.video.unavailable": "Video nicht verfügbar.",
    "error.api.content.video.live": "Live-Streams werden nicht unterstützt.",
    "error.api.content.video.age": "Altersbeschränkung – Instanz kommt nicht dran.",
    "error.api.content.video.region": "Regional gesperrt.",
    "error.api.youtube.disabled_main_instance": "YouTube auf dieser Instanz aus. Andere Instanz nehmen.",
    "error.api.youtube.login": "YouTube verlangt Login – andere Instanz versuchen.",
    "error.api.rate_exceeded": "Zu viele Anfragen. Kurz warten oder Instanz wechseln.",
    "error.api.queue.full": "Warteschlange voll – später oder andere Instanz.",
    "error.api.service.unsupported": "Dienst von dieser Instanz nicht unterstützt.",
    "error.api.invalid_body": "Anfrage abgelehnt (Body ungültig).",
    "error.api.generic": "Allgemeiner API-Fehler.",
  };
  if (!code) return "Unbekannter Fehler";
  if (typeof code === "string" && map[code]) return map[code];
  if (typeof code === "string" && code.startsWith("error.")) return code;
  return String(code);
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
  if (data.status === "error") {
    throw new Error(humanError(data.error && (data.error.code || data.error)));
  }
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
  if (!url) return;
  $("go").disabled = true;
  try {
    await processUrl(url);
  } catch (err) {
    const msg = String(err.message || err);
    const cors = /Failed to fetch|NetworkError|CORS|Load failed|fetch/i.test(msg);
    setStatus(
      cors
        ? "CORS/Netzwerk: Diese Instanz lässt fremde Frontends nicht zu (oder ist offline). Andere Instanz wählen oder später selbst hosten."
        : msg,
      true
    );
  } finally {
    $("go").disabled = false;
  }
});

$("settingsBtn").onclick = () => {
  $("apiUrl").value = settings.apiUrl;
  $("apiKey").value = settings.apiKey;
  $("instanceInfo").textContent = "";
  sheet.hidden = false;
};
sheet.addEventListener("click", (e) => {
  if (e.target === sheet) sheet.hidden = true;
});
document.querySelectorAll("[data-api]").forEach((btn) => {
  btn.onclick = () => {
    $("apiUrl").value = btn.dataset.api;
  };
});
$("saveApi").onclick = () => {
  settings.apiUrl = $("apiUrl").value.trim() || DEFAULT_API;
  settings.apiKey = $("apiKey").value.trim();
  saveSettings();
  bearer = null;
  sheet.hidden = true;
  setStatus("Instanz gespeichert: " + apiBase());
};
$("testApi").onclick = async () => {
  const prev = settings.apiUrl;
  settings.apiUrl = $("apiUrl").value.trim() || DEFAULT_API;
  try {
    const info = await getInfo();
    const services = ((info.cobalt && info.cobalt.services) || []).slice(0, 10).join(", ");
    const ts = info.cobalt && info.cobalt.turnstileSitekey ? " · Turnstile an" : "";
    $("instanceInfo").textContent =
      "OK · v" + ((info.cobalt && info.cobalt.version) || "?") + " · " + (services || "keine Services?") + ts;
  } catch (err) {
    $("instanceInfo").textContent = "Fehler: " + err.message;
  } finally {
    settings.apiUrl = prev;
  }
};

renderHistory();
$("url").addEventListener("focus", async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text && /^https?:\/\//i.test(text) && !$("url").value) $("url").value = text.trim();
  } catch {}
});
