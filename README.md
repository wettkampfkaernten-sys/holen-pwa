# Holen

Schlanke, installierbare PWA: Link einfügen, Datei speichern.
Die Oberfläche ist uns. Die Verarbeitung macht eine [Cobalt](https://github.com/imputnet/cobalt)-Instanz.

## Build (alles in einem)

Fertige Version liegt in `build/`:

| Datei | Zweck |
| --- | --- |
| `build/holen.html` | **Alles in einer Datei** (CSS, JS, Icons). Einfach öffnen oder irgendwo hochladen. |
| `build/index.html` + Rest | Klassische PWA-Struktur zum Hosten (GitHub Pages, Webserver). |

Neu bauen:

```bash
python3 scripts/build.py
```

## Nutzen

1. `build/holen.html` öffnen oder den `build/`-Ordner hosten.
2. Unter **Instanz** eine API eintragen und testen.
3. Auf Android: Browser-Menü → Zum Startbildschirm hinzufügen.

Standard-API: `https://nuko-c.meowing.de`  
Öffentliche Instanzen können Turnstile, Rate-Limits oder CORS-Beschränkungen haben. Dann Instanz wechseln.

## Lokal

```bash
python3 -m http.server 8080 --directory build
```

## Hinweis

Nur öffentlich erreichbare Inhalte. Cobalt speichert nichts dauerhaft und ist kein Piraterie-Tool.
Der User ist für das verantwortlich, was er lädt.

Lizenz der PWA: MIT. Cobalt selbst steht unter AGPL-3.0.
