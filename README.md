# Holen

Schlanke, installierbare PWA: Link einfügen, Datei speichern.
Die Oberfläche ist uns. Die Verarbeitung macht eine [Cobalt](https://github.com/imputnet/cobalt)-Instanz.

## Nutzen

1. Seite öffnen (GitHub Pages oder lokal).
2. Unter **Instanz** eine API eintragen und testen.
3. Auf Android: Browser-Menü → Zum Startbildschirm hinzufügen.

Standard-API: `https://nuko-c.meowing.de`  
Öffentliche Instanzen können Turnstile, Rate-Limits oder CORS-Beschränkungen haben. Dann Instanz wechseln.

## Lokal

```bash
python3 -m http.server 8080
```

## Hinweis

Nur öffentlich erreichbare Inhalte. Cobalt speichert nichts dauerhaft und ist kein Piraterie-Tool.
Der User ist für das verantwortlich, was er lädt.

Lizenz der PWA: MIT. Cobalt selbst steht unter AGPL-3.0.
