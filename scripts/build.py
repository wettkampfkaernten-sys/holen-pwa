#!/usr/bin/env python3
"""Baut die komplette Holen-Version nach build/ inklusive Einzeldatei holen.html."""
from pathlib import Path
import base64
import shutil

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT
OUT = ROOT / "build"


def main():
    OUT.mkdir(exist_ok=True)
    (OUT / "icons").mkdir(exist_ok=True)
    css = (SRC / "styles.css").read_text(encoding="utf-8")
    js = (SRC / "app.js").read_text(encoding="utf-8")
    svg = (SRC / "icons" / "icon.svg").read_text(encoding="utf-8")

    def b64(name):
        return base64.b64encode((SRC / "icons" / name).read_bytes()).decode()

    b192 = b64("icon-192.png")
    b512 = b64("icon-512.png")
    b180 = b64("apple-touch-icon.png")
    svg_uri = "data:image/svg+xml;charset=utf-8," + svg.replace("\n", " ").replace("#", "%23").replace('"', "'")

    for name in ["index.html", "styles.css", "app.js", "sw.js", "manifest.webmanifest"]:
        shutil.copy2(SRC / name, OUT / name)
    for name in ["icon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png"]:
        src_icon = SRC / "icons" / name
        if src_icon.exists():
            shutil.copy2(src_icon, OUT / "icons" / name)

    standalone = """<!DOCTYPE html>
<html lang=\"de\">
<head>
<meta charset=\"utf-8\">
<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">
<meta name=\"theme-color\" content=\"#12161c\">
<meta name=\"apple-mobile-web-app-capable\" content=\"yes\">
<title>Holen</title>
<link rel=\"icon\" href=\"__SVG__\">
<link rel=\"apple-touch-icon\" href=\"data:image/png;base64,__B180__\">
<style>__CSS__</style>
</head>
<body>
<header><div class=\"brand\"><span class=\"logo\" aria-hidden=\"true\"></span><div><h1>Holen</h1><p>Link rein. Datei raus. Build-Version.</p></div></div>
<button id=\"settingsBtn\" class=\"ghost\" type=\"button\">Instanz</button></header>
<main>
<form id=\"form\">
<label class=\"sr\" for=\"url\">Link</label>
<input id=\"url\" name=\"url\" type=\"url\" inputmode=\"url\" autocomplete=\"off\" spellcheck=\"false\" placeholder=\"https://…\" required>
<div class=\"row\"><label>Qualität<select id=\"quality\"><option value=\"max\">Maximum</option><option value=\"2160\">2160p</option><option value=\"1440\">1440p</option><option value=\"1080\" selected>1080p</option><option value=\"720\">720p</option><option value=\"480\">480p</option><option value=\"360\">360p</option></select></label>
<label>Modus<select id=\"mode\"><option value=\"auto\" selected>Video + Audio</option><option value=\"audio\">Nur Audio</option><option value=\"mute\">Stumm (Video)</option></select></label></div>
<div class=\"row\"><label>Audioformat<select id=\"audioFormat\"><option value=\"mp3\" selected>MP3</option><option value=\"best\">Best</option><option value=\"ogg\">OGG</option><option value=\"opus\">Opus</option><option value=\"wav\">WAV</option></select></label>
<label>Bitrate<select id=\"audioBitrate\"><option value=\"320\">320</option><option value=\"256\">256</option><option value=\"128\" selected>128</option><option value=\"96\">96</option><option value=\"64\">64</option></select></label></div>
<button id=\"go\" type=\"submit\">Holen</button></form>
<p id=\"status\" class=\"status\" hidden></p>
<div id=\"turnstileBox\" hidden><p class=\"hint\">Diese Instanz will kurz prüfen, dass du kein Bot bist.</p><div id=\"turnstile\"></div></div>
<div id=\"picker\" class=\"picker\" hidden></div>
<ul id=\"history\" class=\"history\"></ul>
</main>
<aside id=\"sheet\" class=\"sheet\" hidden><div class=\"sheet-card\">
<h2>Cobalt-Instanz</h2>
<p class=\"hint\">Alles in einer Datei. Die Verarbeitung macht weiter eine Cobalt-API.</p>
<label>API-URL<input id=\"apiUrl\" type=\"url\" placeholder=\"https://nuko-c.meowing.de\"></label>
<label>API-Key (optional)<input id=\"apiKey\" type=\"password\" autocomplete=\"off\"></label>
<div class=\"presets\">
<button type=\"button\" data-api=\"https://nuko-c.meowing.de\">meowing.de</button>
<button type=\"button\" data-api=\"https://api.cobalt.rpkiinval.id\">rpkiinval.id</button>
<button type=\"button\" data-api=\"https://cobalt-omega.wolfy.love\">canine omega</button>
<button type=\"button\" data-api=\"https://bergung-api.hoffnungfuerdiezukunft.net\">bergung</button>
</div>
<p id=\"instanceInfo\" class=\"hint\"></p>
<div class=\"sheet-actions\"><button type=\"button\" id=\"testApi\" class=\"ghost\">Testen</button><button type=\"button\" id=\"saveApi\">Speichern</button></div>
<p class=\"legal\">Nur öffentlich erreichbare Inhalte. Cobalt ist kein Piraterie-Tool.</p>
</div></aside>
<script>__JS__</script>
<script>
(function(){
  const manifest = {name:'Holen',short_name:'Holen',start_url:'.',display:'standalone',background_color:'#12161c',theme_color:'#12161c',icons:[{src:'data:image/png;base64,__B192__',sizes:'192x192',type:'image/png'},{src:'data:image/png;base64,__B512__',sizes:'512x512',type:'image/png',purpose:'any maskable'}]};
  const blob = new Blob([JSON.stringify(manifest)], {type:'application/manifest+json'});
  const link = document.createElement('link'); link.rel='manifest'; link.href=URL.createObjectURL(blob); document.head.appendChild(link);
})();
</script>
</body></html>
"""
    standalone = (
        standalone.replace("__CSS__", css)
        .replace("__JS__", js)
        .replace("__SVG__", svg_uri)
        .replace("__B180__", b180)
        .replace("__B192__", b192)
        .replace("__B512__", b512)
    )
    (OUT / "holen.html").write_text(standalone, encoding="utf-8")
    print("geschrieben:", OUT / "holen.html")


if __name__ == "__main__":
    main()
