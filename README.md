# Holen

Schlanke, installierbare PWA: Link einfügen, Datei speichern.
Die Oberfläche ist uns. Die Verarbeitung macht eine [Cobalt](https://github.com/imputnet/cobalt)-Instanz.

## Nutzen

1. `build/holen.html` öffnen **oder** den `build/`-Ordner hosten (GitHub Pages, beliebiger Webserver).
2. Link einfügen, Qualität/Modus wählen, **Holen**.
3. Unter **Instanz** eine API eintragen und **Testen**.
4. Auf Android: Browser-Menü → *Zum Startbildschirm hinzufügen*.

Standard-API: `https://nuko-c.meowing.de`

Öffentliche Instanzen können Turnstile (Bot-Check), Rate-Limits oder CORS-Beschränkungen haben. Dann Instanz wechseln. Langfristig eigene Instanz hosten.

`api.cobalt.tools` ist absichtlich nicht verdrahtet.

## Instanz wechseln

1. **Instanz** antippen.
2. Preset wählen oder eigene HTTPS-URL eintragen.
3. Optional API-Key, falls die Instanz einen verlangt.
4. **Testen** → sollte Version + Dienste zeigen.
5. **Speichern**.

Wenn der Bot-Check (Turnstile) in der PWA scheitert, ist die Sitekey oft auf die Domain der Instanz beschränkt. Dann andere Instanz oder API-Key.

## Build

```bash
python3 scripts/build.py
```

| Datei | Zweck |
| --- | --- |
| `build/holen.html` | Alles in einer Datei (CSS, JS, Icons). Öffnen oder irgendwo hochladen. |
| `build/index.html` + Rest | Klassische PWA-Struktur zum Hosten. |

## Hinweis

Nur öffentlich erreichbare Inhalte. Cobalt speichert nichts dauerhaft und ist kein Piraterie-Tool.
Der User ist für das verantwortlich, was er lädt.

Lizenz der PWA: MIT. Cobalt selbst steht unter AGPL-3.0.
