# SPEC – Cupulator

Ziel: Rezeptangaben in Sekunden umrechnen. Standard ist **g/ml → Cups**, umschaltbar auf **Cups → g/ml**.
Kein Login, kein Supabase, keine Datenbank. Regeln und Design-Tokens: `CLAUDE.md`.

## 1. Datenmodell (`data.js`, global, keine Module)

```js
const CUPS = {                       // Cup-Standard, Auswahl in localStorage 'cupulator-cup', Standard 'us'
  us:     { label: 'US-Cup (236,6 ml)', cup: 236.588, tbsp: 14.787, tsp: 4.929 },
  metric: { label: 'Metrisch (250 ml)', cup: 250,     tbsp: 15,     tsp: 5 }
};
const MASS   = { g: 1, oz: 28.3495, lb: 453.592, stick: 113.4 };   // stick = 1 Stick Butter (nur bei Butter/Margarine)
const VOLUME = { ml: 1, floz: 29.5735 };                           // fl oz immer US
const INGREDIENTS = [ { id, name, group, gPerCup }, … ];           // gPerCup bezogen auf US-Cup
```
Dichte je Zutat: `density = gPerCup / 236.588` (g/ml). Damit gelten die Werte für beide Cup-Standards.
Gruppen (Reihenfolge = Anzeige): `mehl`, `zucker`, `fett`, `fluessig`, `milch`, `nuss`, `sonst`.

### Zutatentabelle (g pro US-Cup)
| Gruppe | Zutat (id: name · g) |
| --- | --- |
| 🌾 Mehl & Stärke | weizen: Weizenmehl (405/550) · 125 · dinkel: Dinkelmehl (630) · 120 · vollkorn: Vollkornmehl · 120 · roggen: Roggenmehl · 105 · staerke: Speisestärke · 112 · broesel: Semmelbrösel · 112 |
| 🍬 Zucker & Süßes | zucker: Zucker · 200 · braun: Brauner Zucker (gedrückt) · 213 · puder: Puderzucker · 115 · honig: Honig · 340 · ahorn: Ahornsirup · 312 · kakao: Kakaopulver · 85 · schoko: Schokotropfen · 170 · nougat: Nuss-Nougat-Creme · 285 |
| 🧈 Fette | butter: Butter · 227 · margarine: Margarine · 227 · oel: Pflanzenöl · 218 · olivenoel: Olivenöl · 216 · kokosfett: Kokosöl · 218 · erdnuss: Erdnussbutter · 270 |
| 💧 Flüssigkeiten | wasser: Wasser · 237 · saft: Saft · 245 · bruehe: Brühe · 240 |
| 🥛 Milchprodukte | milch: Milch · 245 · sahne: Sahne · 240 · buttermilch: Buttermilch · 245 · joghurt: Joghurt · 245 · quark: Quark · 250 · schmand: Schmand/Saure Sahne · 230 · frischkaese: Frischkäse · 232 · kaese: Käse gerieben · 113 · parmesan: Parmesan gerieben · 100 |
| 🥜 Nüsse & Getreide | hafer: Haferflocken · 90 · reis: Reis (roh) · 195 · mandel_gem: Mandeln gemahlen · 96 · mandel: Mandeln ganz · 142 · hasel_gem: Haselnüsse gemahlen · 96 · walnuss: Walnüsse gehackt · 115 · kokos: Kokosraspeln · 85 · rosinen: Rosinen · 150 · sesam: Sesam · 142 · chia: Chiasamen · 160 |
| 🧂 Sonstiges | salz: Salz · 288 · backpulver: Backpulver · 192 · natron: Natron · 288 · hefe: Trockenhefe · 142 · gelatine: Gelatinepulver · 150 |

Flüssigkeiten ohne Zutat: Eingabe in ml braucht keine Zutat (Volumen → Volumen). Zutat ist nur Pflicht,
wenn zwischen Masse (g, oz, lb, stick) und Volumen (Cup, EL, TL, ml, fl oz) gewechselt wird.

## 2. Rechenlogik (`app.js`)
1. Eingabe in Basis umrechnen: Masse → g, Volumen → ml. Masse ↔ Volumen über `density` der Zutat.
2. **Brüche (Ausgabe Cups):** ml → Cups. Ganzzahl + Bruch aus `{0, ¼, ⅓, ½, ⅔, ¾}` + Rest in ganzen EL und
   TL (`½ TL` als kleinster Schritt). Alle Kombinationen durchprobieren und die mit kleinstem Fehler wählen
   (Fehler-Gleichstand: weniger Teile gewinnt); Bruch darf höchstens ½ TL über dem Wert liegen. Unter ¼ Cup nur EL/TL zeigen. Max. 3 Teile (z. B. „1 ½ Cups + 2 EL“).
   Bei Rest < ½ TL weglassen und `≈` voranstellen.
3. Darunter klein der genaue Wert: „0,53 Cups · 125 g · 126 ml“ (zwei Nachkommastellen, deutsches Komma).
4. **Cups → g/ml:** Eingabe Cups (Dezimal oder Bruchtasten ¼ ⅓ ½ ⅔ ¾, kombinierbar mit Ganzzahl), EL, TL.
   Ergebnis groß in g (mit Zutat) bzw. ml (ohne Zutat), auf ganze Gramm/ml gerundet, ab 1000 als kg/l mit Komma.
5. Ungültige oder leere Eingabe: Ergebnis zeigt „–“, kein Fehlerdialog.
6. °F ↔ °C: `C = (F − 32) × 5/9`, auf 5 °C runden und zusätzlich exakt zeigen; Umluft-Hinweis (−20 °C) als Textzeile.

## 3. Ansichten
Tabbar mit 3 Reitern (Linien-SVG): **Rechner**, **Spickzettel**, **Infos**.

### Rechner (`#view-calc`, Start)
- Segment oben: „g/ml → Cups“ (aktiv beim Start) | „Cups → g/ml“.
- Zahlenfeld groß + Einheiten-Segment: Richtung 1 = `g | ml | oz | lb` (`Stick` nur bei Butter/Margarine),
  Richtung 2 = `Cup | EL | TL`. Bei Richtung 2: Zeile mit Bruchtasten ¼ ⅓ ½ ⅔ ¾.
- Zutatenwahl: Knopf mit aktueller Zutat → Sheet (Bottom-Sheet) mit Suchfeld und gruppierter Liste.
  Zutat bleibt bei Richtungswechsel erhalten. Bei `ml` ohne Zutat ausblendbar („Flüssigkeit“).
- Ergebniskarte groß (`aria-live`), darunter genaue Werte.
- Knopf „Zum Rezept hinzufügen“ → Zeile in Rezept-Liste (Zutat, Eingabe, Ergebnis).
- Rezept-Liste als Karte darunter (nur sichtbar, wenn nicht leer): Zeilen löschen, „Alle löschen“,
  „Kopieren“ (Text in Zwischenablage, eine Zeile je Zutat). Nur im Speicher, Hinweis „wird nicht gespeichert“.
- Cup-Standard als kleine Zeile unter dem Ergebnis („US-Cup · ändern“) → springt in Infos.
- Unauffällig ganz unten: aufklappbare Karte „Backofen °F ↔ °C“ (`<details>`, standardmäßig zu).

### Spickzettel (`#view-table`)
- Suchfeld + Liste je Gruppe: Zutat | 1 Cup | ½ Cup | ¼ Cup | 1 EL in g, für den gewählten Cup-Standard.
- Darunter feste Tabelle Volumen: 1 Cup = 16 EL = 48 TL = x ml, 1 EL = 3 TL, 1 fl oz, 1 Stick Butter = ½ Cup = 113 g.
- Tippen auf eine Zutat übernimmt sie in den Rechner und wechselt den Reiter.

### Infos (`#view-info`)
- Cup-Standard wählen (Segment US | Metrisch), gespeichert in `cupulator-cup`.
- Hinweis: Werte sind Richtwerte, Mehl locker eingefüllt und abgestrichen; Dichten schwanken.
- Offline-Pille „✓ Offline bereit“, Link „Zum Dashboard“ (`/`), Version.

## 4. Theme & PWA
- Theme wie ErsteHilfe (`overall-theme`), Knopf im Header.
- `manifest.json`: `name "Cupulator – Cups umrechnen"`, `short_name "Cupulator"`, `background_color`/`theme_color #f5f5f7`.
- `index.html`: Meta wie ErsteHilfe (apple-mobile-web-app, og:* mit URL `https://mvs2-bot.github.io/Cupulator/`).
- `sw.js`: `CACHE 'cupulator-v1'`, `ASSETS` = `./`, `index.html`, `app.js`, `data.js`, `shared/ios-nav.js`,
  `manifest.json`, `icon.svg`, alle `icons/*.png`.

## 5. Datenbank / Supabase
Entfällt bewusst: keine Tabellen, kein RLS, keine RPCs, kein `overall_apps`-Eintrag.

## 6. Dashboard-Integration (Repo `mvs2-bot.github.io`, eigener PR)
1. `shared/projects.js`: nach „Erste Hilfe“ einfügen
   `{ name: 'Cupulator', desc: 'Rezepte schnell in Cups umrechnen', url: '/Cupulator/', img: '/Cupulator/icon.svg', icon: 'cup', color: '#e07b00' },`
   (ohne `badge`/`app` → Bereich ohne Login, für alle sichtbar).
2. `shared/dashboard.js`: in `ICONS` Schlüssel `cup` ergänzen (Messbecher, weißer Strich, Stil wie `firstAid`).
3. `sw.js` des Dashboards: `CACHE` (`mvs2-dashboard-vNN`) um 1 erhöhen.
4. Prüfen: Kachel erscheint, `konto.html` zeigt sie unter „Kacheln ein/aus“, Icon hell/dunkel ok.

## 7. Umsetzungsreihenfolge (ein Worker-Thread, je Repo ein PR)
1. **Grundgerüst & Tokens:** `index.html` (Header, Tabbar, 3 Views, Tokens hell/dunkel, Theme), `manifest.json`,
   `icon.svg` + `icons/`, `shared/ios-nav.js` (Kopie), `sw.js`, `README.md`.
2. **Datenlogik:** `data.js` (Tabelle oben), Umrechnung + Bruchlogik in `app.js`; Probe in der Konsole:
   125 g Weizenmehl → „1 Cup“; 100 g Zucker → „½ Cup“; 60 ml → „¼ Cup“; 30 g Butter → „2 EL“ (+ Rest);
   1 ½ Cups Milch → 368 g; metrisch 1 Cup Wasser → 250 ml.
3. **Views & Features:** Rechner, Zutaten-Sheet, Rezept-Liste, Spickzettel, Infos, °F ↔ °C.
4. **Dashboard:** Abschnitt 6.
5. **Selbst-Check:** `node --check`, Konsole fehlerfrei, Playwright-Screenshots 320/390/1280 px hell+dunkel,
   Offline-Test (zweiter Aufruf ohne Netz), Proben aus Schritt 2, Links/IDs konsistent.
