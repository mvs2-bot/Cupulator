/* Cupulator – Konstanten (alle Zahlen und Zutaten leben nur hier). Globale Werte, keine Module. */

const APP_VERSION = '1.0';

// Cup-Standard (Auswahl in localStorage 'cupulator-cup', Standard 'us')
const CUPS = {
  us:     { label: 'US-Cup (236,6 ml)', short: 'US-Cup',    cup: 236.588, tbsp: 14.787, tsp: 4.929 },
  metric: { label: 'Metrisch (250 ml)', short: 'Metr. Cup', cup: 250,     tbsp: 15,     tsp: 5 }
};
const DEFAULT_CUP = 'us';

const MASS   = { g: 1, oz: 28.3495, lb: 453.592, stick: 113.4 };  // stick = 1 Stick Butter
const VOLUME = { ml: 1, floz: 29.5735 };                          // fl oz immer US

// Einheiten der Eingabe. kind: mass (Gramm-Basis), vol (ml-Basis), cup (Vielfaches von cup/tbsp/tsp des Standards)
const UNITS = {
  g:     { label: 'g',     kind: 'mass', base: MASS.g },
  oz:    { label: 'oz',    kind: 'mass', base: MASS.oz },
  lb:    { label: 'lb',    kind: 'mass', base: MASS.lb },
  stick: { label: 'Stick', kind: 'mass', base: MASS.stick, only: ['butter', 'margarine'] },
  ml:    { label: 'ml',    kind: 'vol',  base: VOLUME.ml },
  cup:   { label: 'Cup',   kind: 'cup',  mult: 'cup' },
  tbsp:  { label: 'EL',    kind: 'cup',  mult: 'tbsp' },
  tsp:   { label: 'TL',    kind: 'cup',  mult: 'tsp' }
};
const DIRS = {
  toCups:   { label: 'g/ml → Cups', units: ['g', 'ml', 'oz', 'lb', 'stick'], start: 'g' },
  fromCups: { label: 'Cups → g/ml', units: ['cup', 'tbsp', 'tsp'],          start: 'cup' }
};
const DEFAULT_DIR = 'toCups';
const DEFAULT_ING = 'weizen';

// Brüche für Cups (Ausgabe und Bruchtasten)
const FRACS = [
  { label: '¼', v: 1 / 4 }, { label: '⅓', v: 1 / 3 }, { label: '½', v: 1 / 2 },
  { label: '⅔', v: 2 / 3 }, { label: '¾', v: 3 / 4 }
];
const MIN_CUP_FRAC = 0.25;   // unter ¼ Cup nur EL/TL zeigen
const TSP_STEP = 0.5;        // kleinster Schritt: ½ TL
const MAX_VALUE = 1000000;   // größte erlaubte Eingabe
const APPROX_ML = 0.1;       // ab so viel Restfehler (ml) steht „≈“
const TIE_ML = 0.01;         // Fehler-Gleichstand (ml)

// Backofen °F ↔ °C
const TEMP = { round: 5, fan: 20 };

// Gruppen (Reihenfolge = Anzeige)
const GROUPS = [
  { id: 'mehl',     label: '🌾 Mehl & Stärke' },
  { id: 'zucker',   label: '🍬 Zucker & Süßes' },
  { id: 'fett',     label: '🧈 Fette' },
  { id: 'fluessig', label: '💧 Flüssigkeiten' },
  { id: 'milch',    label: '🥛 Milchprodukte' },
  { id: 'nuss',     label: '🥜 Nüsse & Getreide' },
  { id: 'sonst',    label: '🧂 Sonstiges' }
];

// gPerCup bezogen auf US-Cup (236,588 ml): Dichte = gPerCup / CUPS.us.cup
const INGREDIENTS = [
  { id: 'weizen',     name: 'Weizenmehl (405/550)',      group: 'mehl',     gPerCup: 125 },
  { id: 'dinkel',     name: 'Dinkelmehl (630)',          group: 'mehl',     gPerCup: 120 },
  { id: 'vollkorn',   name: 'Vollkornmehl',              group: 'mehl',     gPerCup: 120 },
  { id: 'roggen',     name: 'Roggenmehl',                group: 'mehl',     gPerCup: 105 },
  { id: 'staerke',    name: 'Speisestärke',              group: 'mehl',     gPerCup: 112 },
  { id: 'broesel',    name: 'Semmelbrösel',              group: 'mehl',     gPerCup: 112 },

  { id: 'zucker',     name: 'Zucker',                    group: 'zucker',   gPerCup: 200 },
  { id: 'braun',      name: 'Brauner Zucker (gedrückt)', group: 'zucker',   gPerCup: 213 },
  { id: 'puder',      name: 'Puderzucker',               group: 'zucker',   gPerCup: 115 },
  { id: 'honig',      name: 'Honig',                     group: 'zucker',   gPerCup: 340 },
  { id: 'ahorn',      name: 'Ahornsirup',                group: 'zucker',   gPerCup: 312 },
  { id: 'kakao',      name: 'Kakaopulver',               group: 'zucker',   gPerCup: 85 },
  { id: 'schoko',     name: 'Schokotropfen',             group: 'zucker',   gPerCup: 170 },
  { id: 'nougat',     name: 'Nuss-Nougat-Creme',         group: 'zucker',   gPerCup: 285 },

  { id: 'butter',     name: 'Butter',                    group: 'fett',     gPerCup: 227 },
  { id: 'margarine',  name: 'Margarine',                 group: 'fett',     gPerCup: 227 },
  { id: 'oel',        name: 'Pflanzenöl',                group: 'fett',     gPerCup: 218 },
  { id: 'olivenoel',  name: 'Olivenöl',                  group: 'fett',     gPerCup: 216 },
  { id: 'kokosfett',  name: 'Kokosöl',                   group: 'fett',     gPerCup: 218 },
  { id: 'erdnuss',    name: 'Erdnussbutter',             group: 'fett',     gPerCup: 270 },

  { id: 'wasser',     name: 'Wasser',                    group: 'fluessig', gPerCup: 237 },
  { id: 'saft',       name: 'Saft',                      group: 'fluessig', gPerCup: 245 },
  { id: 'bruehe',     name: 'Brühe',                     group: 'fluessig', gPerCup: 240 },

  { id: 'milch',      name: 'Milch',                     group: 'milch',    gPerCup: 245 },
  { id: 'sahne',      name: 'Sahne',                     group: 'milch',    gPerCup: 240 },
  { id: 'buttermilch', name: 'Buttermilch',              group: 'milch',    gPerCup: 245 },
  { id: 'joghurt',    name: 'Joghurt',                   group: 'milch',    gPerCup: 245 },
  { id: 'quark',      name: 'Quark',                     group: 'milch',    gPerCup: 250 },
  { id: 'schmand',    name: 'Schmand / Saure Sahne',     group: 'milch',    gPerCup: 230 },
  { id: 'frischkaese', name: 'Frischkäse',               group: 'milch',    gPerCup: 232 },
  { id: 'kaese',      name: 'Käse gerieben',             group: 'milch',    gPerCup: 113 },
  { id: 'parmesan',   name: 'Parmesan gerieben',         group: 'milch',    gPerCup: 100 },

  { id: 'hafer',      name: 'Haferflocken',              group: 'nuss',     gPerCup: 90 },
  { id: 'reis',       name: 'Reis (roh)',                group: 'nuss',     gPerCup: 195 },
  { id: 'mandel_gem', name: 'Mandeln gemahlen',          group: 'nuss',     gPerCup: 96 },
  { id: 'mandel',     name: 'Mandeln ganz',              group: 'nuss',     gPerCup: 142 },
  { id: 'hasel_gem',  name: 'Haselnüsse gemahlen',       group: 'nuss',     gPerCup: 96 },
  { id: 'walnuss',    name: 'Walnüsse gehackt',          group: 'nuss',     gPerCup: 115 },
  { id: 'kokos',      name: 'Kokosraspeln',              group: 'nuss',     gPerCup: 85 },
  { id: 'rosinen',    name: 'Rosinen',                   group: 'nuss',     gPerCup: 150 },
  { id: 'sesam',      name: 'Sesam',                     group: 'nuss',     gPerCup: 142 },
  { id: 'chia',       name: 'Chiasamen',                 group: 'nuss',     gPerCup: 160 },

  { id: 'salz',       name: 'Salz',                      group: 'sonst',    gPerCup: 288 },
  { id: 'backpulver', name: 'Backpulver',                group: 'sonst',    gPerCup: 192 },
  { id: 'natron',     name: 'Natron',                    group: 'sonst',    gPerCup: 288 },
  { id: 'hefe',       name: 'Trockenhefe',               group: 'sonst',    gPerCup: 142 },
  { id: 'gelatine',   name: 'Gelatinepulver',            group: 'sonst',    gPerCup: 150 }
];
