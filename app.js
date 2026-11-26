/* Cupulator – App-Logik. Alle Zahlen und Zutaten stehen in data.js. */
(function () {
  'use strict';

  // ===================================================================
  // Hilfen
  // ===================================================================
  const $ = (id) => document.getElementById(id);
  const ING = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* bewusst still */ } }

  // Deutsche Zahlenausgabe: Komma, bis zu dec Nachkommastellen, keine überflüssigen Nullen
  function fmt(x, dec) {
    return x.toLocaleString('de-DE', { maximumFractionDigits: dec, minimumFractionDigits: 0 });
  }
  // Masse: ab 10 ganze Gramm, darunter eine Nachkommastelle
  function fmtMass(g) { return fmt(g, g >= 10 ? 0 : 1); }
  // Große Werte als kg bzw. l
  function bigValue(v, small, big) {
    return v >= 1000 ? fmt(v / 1000, 2) + ' ' + big : fmt(v + 1e-9, v >= 10 ? 0 : 1) + ' ' + small;
  }
  function density(ing) { return ing.gPerCup / CUPS.us.cup; } // g pro ml

  // Eingabe lesen: Komma und Punkt erlaubt; null = ungültig, 0 = leer
  function parseNum(text, allowNeg) {
    const t = String(text).trim().replace(',', '.');
    if (t === '') return 0;
    const re = allowNeg ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
    if (!re.test(t) || t === '.' || t === '-' || t === '-.') return null;
    const n = parseFloat(t);
    return isFinite(n) && Math.abs(n) <= MAX_VALUE ? n : null;
  }

  // ===================================================================
  // Theme (gemeinsamer Schlüssel overall-theme)
  // ===================================================================
  const root = document.documentElement;
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  function applyTheme(theme, save) {
    root.setAttribute('data-theme', theme);
    if (save) lsSet('overall-theme', theme);
    const dark = theme === 'dark';
    $('iconSun').style.display = dark ? 'block' : 'none';
    $('iconMoon').style.display = dark ? 'none' : 'block';
    if (metaTheme) metaTheme.setAttribute('content', dark ? '#000000' : '#f5f5f7');
  }
  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light', false);
  $('themeToggle').addEventListener('click', () => {
    applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
  });
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!lsGet('overall-theme')) applyTheme(e.matches ? 'dark' : 'light', false);
  });
  window.addEventListener('storage', (e) => {
    if (e.key === 'overall-theme' && (e.newValue === 'dark' || e.newValue === 'light')) applyTheme(e.newValue, false);
  });

  // ===================================================================
  // Zustand
  // ===================================================================
  const saved = lsGet('cupulator-cup');
  const state = {
    dir: DEFAULT_DIR,                                   // wird nicht gespeichert
    unit: { toCups: DIRS.toCups.start, fromCups: DIRS.fromCups.start },
    frac: 0,                                            // gewählter Bruch (Wert), nur Richtung Cups → g/ml
    ing: DEFAULT_ING,                                   // id oder null (nur Volumen)
    cup: CUPS[saved] ? saved : DEFAULT_CUP,
    recipe: []                                          // nur im Speicher der Seite
  };

  // ===================================================================
  // Rechenlogik
  // ===================================================================
  // ml → Cups-Darstellung: ganze Cups + Bruch (eine Angabe), dazu ganze EL und halbe TL
  function breakdown(ml, std) {
    const cups = ml / std.cup;
    const n0 = Math.floor(cups);
    const fr = [{ label: '', v: 0 }].concat(FRACS);
    let best = null;
    for (let n = n0; n <= n0 + 1; n++) {
      for (const f of fr) {
        if (cups < MIN_CUP_FRAC && (n > 0 || f.v > 0)) continue;
        const rem = ml - (n + f.v) * std.cup;
        if (rem < -TSP_STEP * std.tsp - 1e-9) continue; // Bruch höchstens ½ TL über dem Wert
        // ab ¼ Cup höchstens 3 EL zusätzlich (4 EL wären ¼ Cup)
        const maxT = cups < MIN_CUP_FRAC ? Math.ceil(Math.max(rem, 0) / std.tbsp) + 1 : 3;
        for (let t = 0; t <= maxT; t++) {
          for (let s = 0; s <= 5; s++) {
            const err = Math.abs(rem - t * std.tbsp - s * TSP_STEP * std.tsp);
            const parts = (n > 0 || f.v > 0 ? 1 : 0) + (t > 0 ? 1 : 0) + (s > 0 ? 1 : 0);
            const better = !best || err < best.err - TIE_ML ||
              (Math.abs(err - best.err) <= TIE_ML && (parts < best.parts ||
                (parts === best.parts && n + f.v > best.n + best.f.v)));   // Gleichstand: größerer Cup-Anteil
            if (better) {
              best = { err, parts, n, f, t, s };
            }
          }
        }
      }
    }
    return best;
  }

  function halfText(s) { // s halbe TL → "½", "1", "1 ½" …
    const whole = Math.floor(s / 2);
    const half = s % 2 ? '½' : '';
    return [whole > 0 ? whole : '', half].filter(Boolean).join(' ');
  }

  function breakdownText(ml, std) {
    const b = breakdown(ml, std);
    if (!b || b.parts === 0) return 'weniger als ½ TL';
    const out = [];
    if (b.n > 0 || b.f.v > 0) {
      const plural = b.n > 1 || (b.n >= 1 && b.f.v > 0);
      out.push([b.n > 0 ? b.n : '', b.f.label].filter(Boolean).join(' ') + (plural ? ' Cups' : ' Cup'));
    }
    if (b.t > 0) out.push(b.t + ' EL');
    if (b.s > 0) out.push(halfText(b.s) + ' TL');
    return (b.err > APPROX_ML ? '≈ ' : '') + out.join(' + ');
  }

  // Richtung g/ml → Cups. Liefert { main, sub, add } oder { hint }
  function calcTo(v, unitId, ing, std) {
    const u = UNITS[unitId];
    let ml, g = null;
    if (u.kind === 'mass') {
      if (!ing) return { hint: 'Bitte eine Zutat wählen' };
      g = v * u.base;
      ml = g / density(ing);
    } else {
      ml = v * u.base;
      if (ing) g = ml * density(ing);
    }
    const cups = ml / std.cup;
    const main = breakdownText(ml, std);
    const sub = [fmt(cups, 2) + (Math.abs(cups - 1) < 0.005 ? ' Cup' : ' Cups')];
    if (g !== null) sub.push(fmtMass(g) + ' g');
    sub.push(fmt(ml, ml >= 10 ? 0 : 1) + ' ml');
    return { main, sub: sub.join(' · '), result: main };
  }

  // Richtung Cups → g/ml
  function calcFrom(qty, unitId, ing, std) {
    const ml = qty * std[UNITS[unitId].mult];
    const cupsEq = ml / std.cup;
    const sub = [];
    let main;
    if (ing) {
      const g = ml * density(ing);
      main = bigValue(g, 'g', 'kg');
      sub.push(fmt(ml, ml >= 10 ? 0 : 1) + ' ml');
    } else {
      main = bigValue(ml, 'ml', 'l');
    }
    if (unitId !== 'cup') sub.push(fmt(cupsEq, 2) + ' Cups');
    return { main, sub: sub.join(' · '), result: main };
  }

  function cupWord(q) { return q <= 1 ? 'Cup' : 'Cups'; }

  // ===================================================================
  // Rechner: Ein- und Ausgabe
  // ===================================================================
  const amount = $('amount');
  const unitSeg = $('unitSeg');
  const fracRow = $('fracRow');
  let current = null; // letztes gültiges Ergebnis für „Zum Rezept hinzufügen“

  function ingName() { return state.ing ? ING[state.ing].name : 'Flüssigkeit'; }

  function availableUnits() {
    return DIRS[state.dir].units.filter((id) => !UNITS[id].only || (state.ing && UNITS[id].only.includes(state.ing)));
  }

  function renderUnits() {
    const list = availableUnits();
    if (!list.includes(state.unit[state.dir])) state.unit[state.dir] = DIRS[state.dir].start;
    unitSeg.innerHTML = '';
    list.forEach((id) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg-btn';
      b.textContent = UNITS[id].label;
      b.setAttribute('aria-pressed', String(id === state.unit[state.dir]));
      b.addEventListener('click', () => { state.unit[state.dir] = id; renderUnits(); update(); });
      unitSeg.appendChild(b);
    });
  }

  function renderFracs() {
    fracRow.hidden = state.dir !== 'fromCups';
    fracRow.innerHTML = '';
    FRACS.forEach((f) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'frac-btn';
      b.textContent = f.label;
      b.setAttribute('aria-pressed', String(state.frac === f.v));
      b.addEventListener('click', () => { state.frac = state.frac === f.v ? 0 : f.v; renderFracs(); update(); });
      fracRow.appendChild(b);
    });
  }

  function renderDir() {
    document.querySelectorAll('#dirSeg .seg-btn').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.dir === state.dir));
    });
    $('amountLabel').textContent = state.dir === 'toCups' ? 'Menge (Rezeptangabe)' : 'Menge in Cups, EL oder TL';
    renderUnits();
    renderFracs();
  }

  function renderIng() {
    $('ingName').textContent = state.ing ? ING[state.ing].name : 'Ohne Zutat (nur Volumen)';
    renderUnits();
  }

  function update() {
    const std = CUPS[state.cup];
    const unitId = state.unit[state.dir];
    const num = parseNum(amount.value, false);
    const main = $('resMain'), sub = $('resSub');
    current = null;
    amount.setAttribute('aria-invalid', String(num === null));
    let res = null;
    if (num !== null) {
      const qty = state.dir === 'fromCups' ? num + state.frac : num;
      if (qty > 0) {
        res = state.dir === 'toCups'
          ? calcTo(qty, unitId, state.ing ? ING[state.ing] : null, std)
          : calcFrom(qty, unitId, state.ing ? ING[state.ing] : null, std);
        if (!res.hint) {
          let input;
          if (state.dir === 'toCups') input = fmt(qty, 2) + ' ' + UNITS[unitId].label;
          else {
            const f = FRACS.find((x) => x.v === state.frac);
            input = [num > 0 ? fmt(num, 2) : '', f ? f.label : ''].filter(Boolean).join(' ') + ' ' +
              (unitId === 'cup' ? cupWord(qty) : UNITS[unitId].label);
          }
          current = { name: ingName(), input, result: res.result };
        }
      }
    }
    if (!res) { main.textContent = '–'; sub.textContent = num === null ? 'Bitte eine Zahl eingeben' : ''; }
    else if (res.hint) { main.textContent = '–'; sub.textContent = res.hint; }
    else { main.textContent = res.main; sub.textContent = res.sub; }
    $('addBtn').disabled = !current;
    $('cupLink').textContent = std.short + ' · ändern';
  }

  amount.addEventListener('input', update);
  amount.addEventListener('keydown', (e) => { if (e.key === 'Enter') amount.blur(); });

  document.querySelectorAll('#dirSeg .seg-btn').forEach((b) => {
    b.addEventListener('click', () => { state.dir = b.dataset.dir; renderDir(); update(); });
  });

  // ===================================================================
  // Zutaten-Sheet
  // ===================================================================
  const sheet = $('sheet');
  const search = $('ingSearch');
  const list = $('ingList');
  let lastFocus = null;

  function norm(s) { return s.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss'); }

  function renderList() {
    const q = norm(search.value.trim());
    list.innerHTML = '';
    const add = (id, text, selected) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt';
      b.setAttribute('aria-pressed', String(selected));
      b.textContent = text;
      b.addEventListener('click', () => { pickIngredient(id); closeSheet(); });
      list.appendChild(b);
    };
    if (!q || norm('ohne zutat flüssigkeit volumen').includes(q)) {
      add(null, 'Ohne Zutat (nur Volumen)', state.ing === null);
    }
    GROUPS.forEach((g) => {
      const items = INGREDIENTS.filter((i) => i.group === g.id && (!q || norm(i.name).includes(q)));
      if (!items.length) return;
      const h = document.createElement('div');
      h.className = 'group-h';
      h.textContent = g.label;
      list.appendChild(h);
      items.forEach((i) => add(i.id, i.name, state.ing === i.id));
    });
    if (!list.children.length) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = 'Keine Zutat gefunden.';
      list.appendChild(p);
    }
  }

  function openSheet() {
    lastFocus = document.activeElement;
    search.value = '';
    renderList();
    sheet.hidden = false;
    document.body.classList.add('sheet-open');
    setTimeout(() => search.focus(), 30);
  }
  function closeSheet() {
    sheet.hidden = true;
    document.body.classList.remove('sheet-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function pickIngredient(id) {
    state.ing = id;
    renderIng();
    update();
  }

  $('ingBtn').addEventListener('click', openSheet);
  search.addEventListener('input', renderList);
  sheet.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeSheet));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });

  // ===================================================================
  // Rezept-Liste (nur im Speicher)
  // ===================================================================
  function renderRecipe() {
    const card = $('recipeCard');
    card.hidden = state.recipe.length === 0;
    const ul = $('recipeList');
    ul.innerHTML = '';
    state.recipe.forEach((r, idx) => {
      const li = document.createElement('li');
      li.className = 'r-row';
      const txt = document.createElement('div');
      txt.className = 'r-txt';
      const n = document.createElement('div');
      n.className = 'r-name';
      n.textContent = r.name;
      const v = document.createElement('div');
      v.className = 'r-val';
      v.textContent = r.input + ' = ' + r.result;
      txt.append(n, v);
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'icon-btn';
      del.setAttribute('aria-label', r.name + ' entfernen');
      del.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
      del.addEventListener('click', () => { state.recipe.splice(idx, 1); renderRecipe(); });
      li.append(txt, del);
      ul.appendChild(li);
    });
  }

  $('addBtn').addEventListener('click', () => {
    if (!current) return;
    state.recipe.push(current);
    renderRecipe();
  });
  $('clearBtn').addEventListener('click', () => { state.recipe = []; renderRecipe(); });
  $('copyBtn').addEventListener('click', () => {
    const text = state.recipe.map((r) => r.name + ': ' + r.input + ' = ' + r.result).join('\n');
    const done = () => {
      const b = $('copyBtn');
      b.textContent = 'Kopiert ✓';
      setTimeout(() => { b.textContent = 'Kopieren'; }, 1600);
    };
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* nicht möglich */ }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  });

  // ===================================================================
  // Backofen °F ↔ °C
  // ===================================================================
  const tempState = { dir: 'f2c' };
  function updateTemp() {
    const num = parseNum($('tempIn').value, true);
    const main = $('tempMain'), sub = $('tempSub');
    if (num === null || $('tempIn').value.trim() === '') { main.textContent = '–'; sub.textContent = ''; return; }
    const r = (x) => Math.round(x / TEMP.round) * TEMP.round;
    if (tempState.dir === 'f2c') {
      const c = (num - 32) * 5 / 9;
      main.textContent = '≈ ' + fmt(r(c), 0) + ' °C';
      sub.textContent = 'exakt ' + fmt(c, 1) + ' °C · Umluft ca. ' + fmt(r(c) - TEMP.fan, 0) + ' °C';
    } else {
      const f = num * 9 / 5 + 32;
      main.textContent = '≈ ' + fmt(r(f), 0) + ' °F';
      sub.textContent = 'exakt ' + fmt(f, 1) + ' °F · Umluft ca. ' + fmt(num - TEMP.fan, 0) + ' °C';
    }
  }
  $('tempIn').addEventListener('input', updateTemp);
  document.querySelectorAll('#tempSeg .seg-btn').forEach((b) => {
    b.addEventListener('click', () => {
      tempState.dir = b.dataset.t;
      document.querySelectorAll('#tempSeg .seg-btn').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      $('tempLabel').textContent = tempState.dir === 'f2c' ? 'Grad Fahrenheit' : 'Grad Celsius';
      updateTemp();
    });
  });

  // ===================================================================
  // Spickzettel
  // ===================================================================
  const tableSearch = $('tableSearch');
  function gramText(g) { return fmt(g, g >= 10 ? 0 : 1); }

  function renderTable() {
    const std = CUPS[state.cup];
    const q = norm(tableSearch.value.trim());
    const box = $('tableList');
    box.innerHTML = '';
    GROUPS.forEach((g) => {
      const items = INGREDIENTS.filter((i) => i.group === g.id && (!q || norm(i.name).includes(q)));
      if (!items.length) return;
      const h = document.createElement('div');
      h.className = 'group-h';
      h.textContent = g.label;
      box.appendChild(h);
      items.forEach((i) => {
        const d = density(i);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'trow';
        b.setAttribute('aria-label', i.name + ' im Rechner öffnen');
        const cells = [i.name, gramText(d * std.cup), gramText(d * std.cup / 2), gramText(d * std.cup / 4), gramText(d * std.tbsp)];
        cells.forEach((c, k) => {
          const s = document.createElement('span');
          s.className = k === 0 ? 'tn' : 'tv';
          s.textContent = c;
          b.appendChild(s);
        });
        b.addEventListener('click', () => { pickIngredient(i.id); setTab('view-calc'); });
        box.appendChild(b);
      });
    });
    if (!box.children.length) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = 'Keine Zutat gefunden.';
      box.appendChild(p);
    }
    renderFacts();
  }
  tableSearch.addEventListener('input', renderTable);

  function renderFacts() {
    const std = CUPS[state.cup];
    const butter = ING.butter;
    const rows = [
      '1 Cup = ' + fmt(std.cup / std.tbsp, 1) + ' EL = ' + fmt(std.cup / std.tsp, 1) + ' TL = ' + fmt(std.cup, 1) + ' ml',
      '1 EL = ' + fmt(std.tbsp / std.tsp, 1) + ' TL = ' + fmt(std.tbsp, 1) + ' ml',
      '1 TL = ' + fmt(std.tsp, 1) + ' ml',
      '1 fl oz = ' + fmt(VOLUME.floz, 1) + ' ml',
      '1 Stick Butter = ½ Cup = ' + fmt(MASS.stick, 0) + ' g (' + fmt(butter.gPerCup / 2, 0) + ' g laut Tabelle)'
    ];
    const ul = $('facts');
    ul.innerHTML = '';
    rows.forEach((t) => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
  }

  // ===================================================================
  // Infos: Cup-Standard
  // ===================================================================
  function renderCupSeg() {
    const seg = $('cupSeg');
    seg.innerHTML = '';
    Object.keys(CUPS).forEach((id) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg-btn';
      b.textContent = CUPS[id].label;
      b.setAttribute('aria-pressed', String(id === state.cup));
      b.addEventListener('click', () => {
        state.cup = id;
        lsSet('cupulator-cup', id);
        renderCupSeg();
        update();
        renderTable();
      });
      seg.appendChild(b);
    });
  }

  // ===================================================================
  // Tabs
  // ===================================================================
  const tabs = document.querySelectorAll('.tabbar button');
  function setTab(id) {
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === id));
    tabs.forEach((t) => {
      if (t.dataset.target === id) t.setAttribute('aria-current', 'page');
      else t.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
  }
  tabs.forEach((t) => t.addEventListener('click', () => setTab(t.dataset.target)));
  $('cupLink').addEventListener('click', () => { setTab('view-info'); });

  // ===================================================================
  // Start
  // ===================================================================
  $('version').textContent = 'Version ' + APP_VERSION;
  renderDir();
  renderIng();
  renderCupSeg();
  renderTable();
  renderRecipe();
  update();

  // Service Worker (Offline)
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(() => {
        const badge = $('offlineBadge');
        if (badge) badge.hidden = false;
      }).catch(() => {});
    });
  }
})();
