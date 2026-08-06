// ===== Library: hiragana / katakana / kanji =====
(function () {
  let tab = "hiragana";
  let kanjiSort = "diff";
  let animWriter = null;

  function t(k) { return App.t(k); }

  function render() {
    const v = document.getElementById("view");
    v.innerHTML = `<h1>${t("tab_library")}</h1>
      <div class="lib-tabs">
        <button class="lib-tab ${tab === "hiragana" ? "active" : ""}" data-t="hiragana">${t("hiragana")}</button>
        <button class="lib-tab ${tab === "katakana" ? "active" : ""}" data-t="katakana">${t("katakana")}</button>
        <button class="lib-tab ${tab === "kanji" ? "active" : ""}" data-t="kanji">${t("kanji")}</button>
      </div>
      <div id="lib-body"></div>`;
    v.querySelectorAll(".lib-tab").forEach(b => b.onclick = () => { sfx("tap"); tab = b.dataset.t; render(); });
    if (tab === "kanji") renderKanji(); else renderKana(tab);
  }

  // ---------- kana tabs ----------
  function renderKana(sy) {
    const body = document.getElementById("lib-body");
    const src = window.KANA[sy];
    let html = `<div class="muted" style="margin-bottom:10px">${t("tap_to_hear")}</div><div class="kana-grid">`;
    src.base.forEach(row => {
      html += `<div class="row-label">${row.row}</div>`;
      row.kana.forEach(k => html += cellKana(k));
      // pad rows of 3 (ya/wa rows)
    });
    html += `</div><div class="section-label">${t("variants")}</div><div class="kana-grid">`;
    src.dakuten.forEach(row => {
      html += `<div class="row-label">${row.row}</div>`;
      row.kana.forEach(k => html += cellKana(k));
    });
    html += `</div><div class="section-label">${t("small_kana")}</div><div class="kana-grid">`;
    src.small.forEach(k => html += cellKana(k));
    html += `</div>`;
    body.innerHTML = html;
    body.querySelectorAll(".cell").forEach(c => c.onclick = () => { sfx("pop"); openKana(c.dataset.k, sy); });
  }

  function cellKana(k) {
    const st = Engine.status(k.k);
    return `<div class="cell ${st}" data-k="${k.k}"><span class="dot"></span><span class="g jp">${k.k}</span><span class="r">${k.r}</span></div>`;
  }

  function openKana(ch, sy) {
    const k = Engine.KANA_MAP[ch];
    if (!k) return;
    Voice.speak(ch === "ー" ? "ちょうおん" : ch);
    const st = Engine.status(ch);
    const p = Engine.state.chars[ch];
    const canDraw = !!window.STROKES[ch];
    const lang = Engine.state.lang;
    const exHtml = k.ex ? `
      <div class="kv"><div class="k">${t("ex_word")}</div>
        <div class="word-row"><div class="word-jp jp">${k.ex.jp}</div>
          <div class="word-info"><div class="word-sub">${k.ex.r} — ${lang === "fr" ? k.ex.fr : k.ex.en}</div></div>
          <button class="speak-btn" style="width:40px;height:40px;font-size:18px" data-say="${k.ex.jp}">🔊</button>
        </div></div>` : "";
    const originHtml = k.origin ? `<div class="kv"><div class="k">${t("origin_kana")}</div><div class="v jp">${k.origin}</div></div>` : "";
    App.modal(`
      <div class="detail-head">
        ${canDraw ? `<div class="detail-anim" id="detail-anim"></div>` : `<div class="detail-char jp">${ch}</div>`}
        <div class="detail-meta">
          <div class="detail-romaji">${k.r}</div>
          <div class="detail-fr"><span class="pill ${st}">${t("status_" + st)}</span></div>
          <button class="btn secondary small mt8" data-say="${ch}">🔊 ${t("listen")}</button>
        </div>
      </div>
      ${originHtml}${exHtml}
      ${p ? `<div class="kv"><div class="k">${t("progress")}</div><div class="v">${p.succ || 0} ✓ · ${p.fail || 0} ✗ · ${p.unaided || 0} ${t("stats_mastered")}</div></div>` : ""}
      ${st !== "mastered" ? `<button class="btn secondary mt8" id="d-known">${t("mark_known")}</button>`
        : (p && p.known ? `<button class="btn ghost mt8" id="d-known-un">${t("unmark_known")}</button>` : "")}
    `, () => { if (animWriter) animWriter = null; });
    document.querySelectorAll("[data-say]").forEach(b => b.onclick = () => Voice.speak(b.dataset.say));
    const kn = document.getElementById("d-known");
    if (kn) kn.onclick = () => { Engine.markKnown(ch, true); App.closeModal(); render(); };
    const knu = document.getElementById("d-known-un");
    if (knu) knu.onclick = () => { Engine.markKnown(ch, false); App.closeModal(); render(); };
    if (canDraw) animWriter = Drawing.animateIn(document.getElementById("detail-anim"), ch, 110);
  }

  // ---------- kanji tab ----------
  const THEME_ORDER = ["num", "time", "people", "body", "nature", "pos", "adj", "verb", "study", "place", "life"];

  function renderKanji() {
    const body = document.getElementById("lib-body");
    const chips = [["diff", "lib_sort_diff"], ["theme", "lib_sort_theme"], ["new", "lib_sort_new"], ["old", "lib_sort_old"]];
    let html = `<div class="sort-row">` + chips.map(c =>
      `<button class="sort-chip ${kanjiSort === c[0] ? "active" : ""}" data-s="${c[0]}">${t(c[1])}</button>`).join("") + `</div>`;

    const learned = Engine.state.kanjiOrder;
    let groups = [];
    if (kanjiSort === "diff") {
      groups = [{ label: null, list: Engine.KANJI.slice() }];
    } else if (kanjiSort === "theme") {
      THEME_ORDER.forEach(th => {
        const list = Engine.KANJI.filter(k => k.t === th);
        if (list.length) groups.push({ label: t("theme_" + th), list });
      });
    } else {
      const seen = Engine.KANJI.filter(k => learned.includes(k.k))
        .sort((a, b) => learned.indexOf(a.k) - learned.indexOf(b.k));
      if (kanjiSort === "new") seen.reverse();
      const unseen = Engine.KANJI.filter(k => !learned.includes(k.k));
      groups = [{ label: null, list: seen.concat(unseen) }];
    }

    groups.forEach(g => {
      if (g.label) html += `<div class="section-label">${g.label}</div>`;
      html += `<div class="kanji-grid">` + g.list.map(k => {
        const st = Engine.status(k.k);
        const active = Engine.state.kanjiActive.includes(k.k);
        return `<div class="cell ${st}" data-k="${k.k}">
          <span class="dot"></span>
          ${active ? `<span style="position:absolute;top:4px;left:6px;font-size:10px">✏️</span>` : ""}
          <span class="g jp" style="font-size:30px">${k.k}</span>
          <span class="r">${Engine.state.lang === "fr" ? k.fr.split(";")[0] : k.en.split(";")[0]}</span>
        </div>`;
      }).join("") + `</div>`;
    });
    body.innerHTML = html;
    body.querySelectorAll(".sort-chip").forEach(b => b.onclick = () => { sfx("tap"); kanjiSort = b.dataset.s; renderKanji(); });
    body.querySelectorAll(".cell").forEach(c => c.onclick = () => { sfx("pop"); openKanji(c.dataset.k); });
  }

  function openKanji(ch) {
    const k = Engine.KANJI_MAP[ch];
    const lang = Engine.state.lang;
    const st = Engine.status(ch);
    const p = Engine.state.chars[ch];
    const active = Engine.state.kanjiActive.includes(ch);

    const onH = k.on.length ? `<div class="kv"><div class="k">${t("onyomi")}</div><div class="v jp">${k.on.map(r => `${r[0]} <span class="muted">(${r[1]})</span>`).join("、 ")}</div></div>` : "";
    const kunH = k.kun.length ? `<div class="kv"><div class="k">${t("kunyomi")}</div><div class="v jp">${k.kun.map(r => `${r[0]} <span class="muted">(${r[1]})</span>`).join("、 ")}</div></div>` : "";
    const words = k.w.map(w => `
      <div class="word-row">
        <div class="word-jp jp">${w[0]}</div>
        <div class="word-info">
          <div class="word-sub jp">${w[1]} · ${w[2]}</div>
          <div class="word-sub"><b>${lang === "fr" ? w[3] : w[4]}</b></div>
        </div>
        <button class="speak-btn" style="width:40px;height:40px;font-size:18px" data-say="${w[1]}">🔊</button>
      </div>`).join("");
    const s = k.s;
    const sentence = `
      <div class="word-row">
        <div class="word-info">
          <div class="word-jp jp" style="font-size:17px">${s[0]}</div>
          <div class="word-sub jp">${s[2]}</div>
          <div class="word-sub"><b>${lang === "fr" ? s[3] : s[4]}</b></div>
        </div>
        <button class="speak-btn" style="width:40px;height:40px;font-size:18px" data-say="${s[1]}">🔊</button>
      </div>`;
    const learnedOn = p && p.learnedAt ? new Date(p.learnedAt).toLocaleDateString() : t("never");

    App.modal(`
      <div class="detail-head">
        <div class="detail-anim" id="detail-anim"></div>
        <div class="detail-meta">
          <div class="detail-romaji">${lang === "fr" ? k.fr : k.en}</div>
          <div class="detail-fr">${t("theme_" + k.t)} · ${window.STROKES[ch].strokes.length} ${t("strokes_n")}</div>
          <div class="mt8"><span class="pill ${st}">${t("status_" + st)}</span>
          ${active ? `<span class="pill learning">✏️ ${t("in_practice")}</span>` : ""}</div>
        </div>
      </div>
      ${onH}${kunH}
      <div class="kv"><div class="k">${t("etym")}</div>
        <div class="v"><span class="etype-tag">${t("etype_" + k.etype)}</span><br>${lang === "fr" ? k.etf : k.ete}</div></div>
      <div class="kv"><div class="k">${t("examples")}</div>${words}</div>
      <div class="kv"><div class="k">${t("sentence")}</div>${sentence}</div>
      <div class="kv"><div class="k">${t("learned_on")}</div><div class="v">${learnedOn}</div></div>
      ${st !== "mastered" ? `<button class="btn secondary mt8" id="d-known">${t("mark_known")}</button>` :
        (p && p.known ? `<button class="btn ghost mt8" id="d-known-un">${t("unmark_known")}</button>` : "")}
    `);
    document.querySelectorAll("[data-say]").forEach(b => b.onclick = () => Voice.speak(b.dataset.say));
    const kn = document.getElementById("d-known");
    if (kn) kn.onclick = () => { Engine.markKnown(ch, true); App.closeModal(); render(); };
    const knu = document.getElementById("d-known-un");
    if (knu) knu.onclick = () => { Engine.markKnown(ch, false); App.closeModal(); render(); };
    Drawing.animateIn(document.getElementById("detail-anim"), ch, 110);
  }

  window.Library = { render };
})();
