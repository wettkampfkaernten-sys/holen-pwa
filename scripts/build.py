#!/usr/bin/env python3
"""Baut die komplette Holen-Version nach build/ inklusive Einzeldatei holen.html."""
from pathlib import Path
import base64
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "build"


def main():
    OUT.mkdir(exist_ok=True)
    (OUT / "icons").mkdir(exist_ok=True)
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    js = (ROOT / "app.js").read_text(encoding="utf-8")
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    svg = (ROOT / "icons" / "icon.svg").read_text(encoding="utf-8")

    def b64(name: str) -> str:
        return base64.b64encode((ROOT / "icons" / name).read_bytes()).decode()

    b192 = b64("icon-192.png")
    b512 = b64("icon-512.png")
    b180 = b64("apple-touch-icon.png")
    svg_uri = "data:image/svg+xml;charset=utf-8," + svg.replace("\n", " ").replace("#", "%23").replace('"', "'")

    for name in ["index.html", "styles.css", "app.js", "sw.js", "manifest.webmanifest"]:
        shutil.copy2(ROOT / name, OUT / name)
    for name in ["icon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png"]:
        src_icon = ROOT / "icons" / name
        if src_icon.exists():
            shutil.copy2(src_icon, OUT / "icons" / name)

    html = re.sub(r'<link rel="stylesheet" href="styles.css">', f"<style>\n{css}\n</style>", html)
    html = html.replace('href="icons/icon.svg"', f'href="{svg_uri}"')
    html = html.replace('href="icons/apple-touch-icon.png"', f'href="data:image/png;base64,{b180}"')
    html = html.replace('<link rel="manifest" href="manifest.webmanifest">\n  ', "")
    html = html.replace('<script src="app.js"></script>', f"<script>\n{js}\n</script>")
    html = html.replace(
        '<script>if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");</script>',
        f"""<script>
(function(){{
  const manifest = {{
    name:'Holen', short_name:'Holen', start_url:'.', display:'standalone',
    background_color:'#0e1218', theme_color:'#0e1218', lang:'de',
    icons:[
      {{src:'data:image/png;base64,{b192}', sizes:'192x192', type:'image/png'}},
      {{src:'data:image/png;base64,{b512}', sizes:'512x512', type:'image/png', purpose:'any maskable'}}
    ]
  }};
  const blob = new Blob([JSON.stringify(manifest)], {{type:'application/manifest+json'}});
  const link = document.createElement('link'); link.rel='manifest'; link.href=URL.createObjectURL(blob);
  document.head.appendChild(link);
}})();
</script>""",
    )
    (OUT / "holen.html").write_text(html, encoding="utf-8")
    (OUT / "README.md").write_text(
        "# Holen Build\n\n- `holen.html` – Komplettversion, eine Datei, alles drin.\n"
        "- `index.html` + CSS/JS/Icons – PWA zum Hosten.\n\nBauen: `python3 scripts/build.py`\n",
        encoding="utf-8",
    )
    print("geschrieben:", OUT / "holen.html", "bytes:", (OUT / "holen.html").stat().st_size)


if __name__ == "__main__":
    main()
