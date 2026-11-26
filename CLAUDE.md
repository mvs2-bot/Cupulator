# CLAUDE.md – Cupulator

Rezeptangaben schnell umrechnen: Gramm/Milliliter ↔ Cups (dazu EL, TL, oz, lb, fl oz, Stick Butter, °F ↔ °C).
Live unter `https://mvs2-bot.github.io/Cupulator/`, Kachel im Dashboard (Repo `mvs2-bot.github.io`).
Fachliche Details, Datentabelle und Umsetzungsreihenfolge: **`SPEC.md`**. Sprache in UI, Kommentaren, Commits: Deutsch.

## Tech-Stack
- Reines HTML/CSS/JS, kein Build, kein npm, kein Framework, keine externen Skripte/Fonts/CDNs.
- **Kein Login, kein Supabase, kein Backend.** Alles läuft im Browser und offline (PWA).
- Referenz für Design und Muster: Repo `mvs2-bot/ErsteHilfe` (nur gezielt per `grep -n` nachsehen, nicht komplett einlesen).

## Dateistruktur
| Datei | Inhalt |
| --- | --- |
| `index.html` | Markup + CSS + Bootstrap-Skript für das Theme (vor dem ersten Rendern) |
| `app.js` | App-Logik: Rechner, Brüche, Rezept-Liste, Tabs, Theme, SW-Registrierung |
| `data.js` | Konstanten: Einheiten (`UNITS`), Cup-Standards (`CUPS`), Zutaten (`INGREDIENTS`) |
| `sw.js` | Service Worker (Muster aus ErsteHilfe: Seite network-first, Rest stale-while-revalidate) |
| `shared/ios-nav.js` | **Kopie** aus `mvs2-bot.github.io/shared/ios-nav.js`, nie hier ändern |
| `manifest.json` | PWA-Manifest (`lang: de`, `display: standalone`, `start_url`/`scope` `./`) |
| `icon.svg`, `icons/` | App-Icon: Messbecher mit Henkel und Skalenstrichen, Linien-Symbol, Akzent Orange |
| `README.md` | Kurzbeschreibung wie bei ErsteHilfe |

`icons/`: `favicon-32.png`, `icon-192.png`, `icon-512.png` (abgerundet), `apple-touch-icon.png` (180, randlos),
`icon-maskable-512.png` (randlos). PNGs aus `icon.svg` erzeugen (z. B. Playwright-Screenshot), nicht von Hand zeichnen.

## Design-Tokens (`:root` in `index.html`, Werte wie ErsteHilfe, Akzent getauscht)
Hell:
- Flächen: `--bg #f5f5f7`, `--surface #ffffff`, `--surface-2 #f2f2f7`, `--border rgba(0,0,0,.08)`
- Text: `--text #1d1d1f`, `--text-secondary #48484d`
- Akzent Orange: `--accent #ff9500`, `--accent-soft rgba(255,149,0,.14)`, Text auf Akzent `#fff`
- Status: `--green #34c759`, `--green-soft rgba(52,199,89,.12)`
- `--glass rgba(255,255,255,.85)`, `--shadow 0 2px 10px rgba(0,0,0,.04)`, `--radius 14px`
- Aliasse für `ios-nav.js`: `--card: var(--surface)`, `--card-hover: var(--surface-2)`

Dunkel (`[data-theme="dark"]`):
- `--bg #000`, `--surface #1c1c1e`, `--surface-2 #2c2c2e`, `--border rgba(255,255,255,.1)`
- `--text #f5f5f7`, `--text-secondary #b4b4b9`
- `--accent #ff9f0a`, `--accent-soft rgba(255,159,10,.16)`, `--green #30d158`
- `--glass rgba(28,28,30,.85)`, `--shadow 0 4px 16px rgba(0,0,0,.4)`

Typografie & Maße:
- Schrift: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- `html { font-size: 16.5px }`, `line-height 1.45`, `-webkit-font-smoothing: antialiased`
- Titel im Header 22px/700, `letter-spacing -0.02em`; Logo 36×36, Radius 9px
- Tabbar-Beschriftung 11px, Segment-Buttons 12px; Ergebnis groß (ca. 34px/700, `font-variant-numeric: tabular-nums`)
- Inhalt `max-width 720px`, Padding `14px 16px`; Pillen/Chips Radius `999px`; Eingaben Radius 11–12px
- Neue Farben nur als Variable in `:root` **und** Dark-Theme, nie hart im Markup.

## Layout-Muster (aus ErsteHilfe übernehmen)
- Sticky Header `.top-header` (Glas mit `backdrop-filter: blur(18px)`, Höhe 56px, safe-area oben):
  Logo + „Cupulator“ links, Theme-Knopf (Sonne/Mond, 34px rund) rechts.
- Schwebende Tabbar `.tabbar` unten (Höhe 62px, Radius 22px, `max-width 540px`, safe-area unten),
  3 Reiter mit Linien-SVG (24px, stroke 1.8, aktiv 2.2), aktiv: `--accent` + `--accent-soft`-Pille, `aria-current="page"`.
- Ansichten als `<section class="view">`, nur eine `.active`. Keine Sub-Bar nötig → `body`-Abstand unten 92px + safe-area.
- iOS-Segmente (Umschalter) im Stil `.seg-btn` mit `--accent-soft`-Pille.
- `<script src="shared/ios-nav.js" data-bottom="92" defer></script>` am Ende von `<body>`.
- Offline-Hinweis „✓ Offline bereit“ (grüne Pille) im Info-Tab, sichtbar nach erfolgreicher SW-Registrierung.
- Mobile first, ab 320px Breite ohne horizontales Scrollen; Touch-Ziele ≥ 44px.

## Theme
- Gemeinsamer Schlüssel `localStorage['overall-theme']` (`'light'|'dark'`), Fallback `prefers-color-scheme`.
- Bootstrap-Skript im `<head>` wie ErsteHilfe (nur `overall-theme`, keine alten Schlüssel), `storage`-Event lauschen,
  `<meta name="theme-color">` beim Wechsel anpassen (`#f5f5f7` / `#000000`).

## Speicherung (bewusst minimal)
- `localStorage` **nur** für `overall-theme` und `cupulator-cup` (`'us'|'metric'`). Jeder Zugriff in `try/catch`.
- Rezept-Liste lebt nur im Speicher der Seite (geht beim Neuladen verloren, bewusst). Kein IndexedDB, keine Cookies.
- Richtung wird nicht gespeichert: beim Start immer „g/ml → Cups“.

## Feste Regeln
- Alle Zahlen und Zutaten nur aus `data.js`; keine Werte in `app.js` oder im Markup duplizieren.
- Deutsche Zahlenformate: Komma als Dezimaltrenner in Ein- und Ausgabe (`1,5` und `1.5` akzeptieren).
- `inputmode="decimal"` für Zahlenfelder, Ergebnis aktualisiert sich live bei jeder Eingabe (kein „Berechnen“-Knopf).
- Linien-Symbole (SVG) statt Emojis in Navigation und Knöpfen; Zutatengruppen dürfen ein Emoji haben.
- Barrierefreiheit: `<label>` für jedes Feld, `aria-live="polite"` am Ergebnis, Fokus sichtbar.
- `sw.js`: `CACHE = 'cupulator-vN'`. Bei neuer/umbenannter Datei in `ASSETS` aufnehmen und `N` hochzählen.
- Pfade relativ (`./…`), weil die App unter `/Cupulator/` läuft.

## Verbote
- Kein Supabase, kein Login, keine Analytics, keine Tracker, keine externen Requests.
- Keine eigenen Zutaten anlegen (bewusst nicht vorgesehen).
- Keine Frameworks, kein Tailwind, kein Build-Schritt, keine `?v=`-Parameter.
- `shared/ios-nav.js` nicht verändern (Original im Dashboard-Repo).
- Keine Secrets oder Schlüssel im Code.

## Dashboard-Anbindung (Repo `mvs2-bot.github.io`)
- Eintrag in `shared/projects.js` (ohne `badge`, `app`, `supabase`), Symbol `cup` in `ICONS` von `shared/dashboard.js`,
  `CACHE` in dessen `sw.js` hochzählen. Details in `SPEC.md` Abschnitt 6.

## Arbeitsweise
- Vor dem PR selbst prüfen: Syntax (`node --check app.js data.js sw.js`), keine Konsolenfehler,
  IDs/Referenzen konsistent, hell + dunkel, 320px / 390px / Desktop, offline nach erstem Laden.
- Bei Änderungen an Dateistruktur oder Regeln diese Datei im selben PR anpassen (max. 120 Zeilen).
