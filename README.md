# 🥣 Cupulator

Rezeptangaben schnell umrechnen: Gramm/Milliliter ↔ Cups (dazu EL, TL, oz, lb, Stick Butter, °F ↔ °C), direkt im Browser und offline: [mvs2-bot.github.io/Cupulator](https://mvs2-bot.github.io/Cupulator/)

## Funktionen

- **Rechner:** g/ml → Cups (Standard) und Cups → g/ml, Bruchdarstellung („1 ½ Cups + 2 EL“), feste Zutatenliste mit Suche
- **Rezept-Liste:** Zeilen sammeln und kopieren (nur im Speicher, wird nicht gespeichert)
- **Spickzettel:** Gramm je Zutat für 1 Cup, ½ Cup, ¼ Cup und 1 EL, dazu Maße
- **Cup-Standard:** US-Cup (236,6 ml) oder metrisch (250 ml)
- **Hell/Dunkel:** gemeinsame Einstellung mit dem Dashboard (`overall-theme`)
- **PWA:** installierbar und offline nutzbar, kein Login, keine Datenbank

## Aufbau

- `index.html`: Markup und CSS
- `data.js`: Einheiten, Cup-Standards, Zutaten
- `app.js`: Rechenlogik und Oberfläche
- `sw.js`: Service Worker; bei neuen oder umbenannten Dateien die Cache-Version erhöhen
- `shared/ios-nav.js`: Kopie der Navigation aus `mvs2-bot.github.io`
- `icon.svg`, `icons/`: App-Icon (Akzent Orange)

Teil des Dashboards [mvs2-bot.github.io](https://mvs2-bot.github.io/).
