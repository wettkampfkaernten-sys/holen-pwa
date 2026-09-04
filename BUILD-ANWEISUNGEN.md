# Anweisungen für den App-Builder — Holen PWA

Sprache der App und der Antwort: Deutsch, ehrlich, etwas Humor.

## Auftrag

Baue bzw. vervollständige die installierbare Android-PWA Holen.
Sie ist ein dünner Wrapper um öffentliche Cobalt-Instanzen.
Nicht die Extractor selbst nachbauen. Cobalt bleibt das Backend.

## Bereits vorhanden

- GitHub: https://github.com/wettkampfkaernten-sys/holen-pwa
- Account: wettkampfkaernten-sys
- Quellcode: index.html, app.js, styles.css, sw.js, manifest.webmanifest, icons/
- Komplettversion: build/holen.html
- Build-Skript: python3 scripts/build.py
- Standard-API: https://nuko-c.meowing.de

## Soll-Verhalten

1. URL einfügen, Qualität, Modus Video+Audio / nur Audio / stumm.
2. POST an Cobalt-API mit Accept und Content-Type application/json.
3. Body: url, videoQuality, downloadMode, audioFormat, audioBitrate, filenameStyle pretty, localProcessing disabled, alwaysProxy true, youtubeVideoCodec h264.
4. tunnel/redirect = Download, picker = Auswahl, error = deutsche Meldung.
5. Instanz wechselbar, Presets, optional API-Key.
6. Turnstile wenn turnstileSitekey, dann POST /session und Bearer.
7. Dark UI, installierbar, Service Worker nur für die Hülle.
8. Nur öffentliche Inhalte. Kein Piraterie-Tool.

## Nicht tun

- api.cobalt.tools hart verdrahten
- Inhalte cachen oder eigene Parser schreiben
- Accounts, Werbung, Tracker

## Lieferobjekt

Funktionierende PWA, build/holen.html, Repo aktuell, kurze Testanleitung.
