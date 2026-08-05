// ===== Exams (mastered kanji only) =====
(function () {
  const MIN_MASTERED = 5;
  let qs = [], qi = 0, right = 0, detail = [];
  let current = null;

  function t(k) { return App.t(k); }

  function render() {
    const v = document.getElementById("view");
    const mastered = Engine.masteredKanji();
    const hist = Engine.state.exams.slice().reverse().slice(0, 12);
    const histHtml = hist.length ? `<h2>${t("exam_history")}</h2><div class="card exam-hist">` +
      hist.map(e => {
        const pct = Math.round(100 * e.score / e.total);
        return `<div class="row"><span>${new Date(e.date).toLocaleDateString()}</span>
          <span><b>${e.score}/${e.total}</b> · ${pct}% ${pct >= 70 ? "✅" : "❌"}</span></div>`;
      }).join("") + `</div>` : "";

    v.innerHTML = `<h1>${t("exam_title")}</h1>
      <div class="card">
        <p class="muted" style="margin-top:0">${t("exam_desc")}</p>
        <div class="stat-row" style="margin-bottom:12px">
          <div class="stat"><div class="n">${mastered.length}</div><div class="l">${t("status_mastered")}</div></div>
        </div>
        ${mastered.length >= MIN_MASTERED
          ? `<button class="btn" id="exam-start">${t("exam_start")}</button>`
          : `<p class="muted center">${t("exam_need").replace("{n}", MIN_MASTERED)}</p>`}
      </div>${histHtml}`;
    const b = document.getElementById("exam-start");
    if (b) b.onclick = startExam;
  }

  function startExam() {
    const mastered = shuffle(Engine.masteredKanji());
    qs = []; qi = 0; right = 0; detail = [];
    const nDraw = Math.min(6, mastered.length);
    const nMean = Math.min(5, mastered.length);
    const nRead = Math.min(4, mastered.length);
    mastered.slice(0, nDraw).forEach(ch => qs.push({ kind: "draw", ch }));
    shuffle(mastered).slice(0, nMean).forEach(ch => qs.push({ kind: "meaning", ch }));
    shuffle(mastered).slice(0, nRead).forEach(ch => qs.push({ kind: "reading", ch }));
    qs = shuffle(qs);
    nextQ();
  }

  function head() {
    const pct = Math.round(100 * qi / qs.length);
    return `<div class="session-top">
      <button class="xbtn" id="ex-quit">✕</button>
      <div class="pbar"><div style="width:${pct}%"></div></div>
      <span class="muted">${qi + 1}/${qs.length}</span></div>`;
  }

  function nextQ() {
    if (current) { current.destroy(); current = null; }
    if (qi >= qs.length) return finish();
    const q = qs[qi];
    if (q.kind === "draw") renderDrawQ(q);
    else if (q.kind === "meaning") renderMeaningQ(q);
    else renderReadingQ(q);
  }

  function renderDrawQ(q) {
    const k = Engine.KANJI_MAP[q.ch];
    const lang = Engine.state.lang;
    const v = document.getElementById("view");
    v.innerHTML = head() + `
      <div class="prompt">
        <div><span class="pill known">${t("exam_writing")}</span></div>
        <div class="p-main mt8">${t("exam_q_draw")} <b>« ${lang === "fr" ? k.fr : k.en} »</b></div>
      </div>
      <div class="char-stage">
        <div id="draw-container"></div>
        <div class="feedback" id="feedback"></div>
        <div class="session-actions">
          <button class="btn secondary small" id="ex-giveup">${t("skip")}</button>
        </div>
      </div>`;
    document.getElementById("ex-quit").onclick = () => App.go("exam");
    let failed = false;
    let mistakes = 0;
    current = Drawing.mount(document.getElementById("draw-container"), q.ch, 5, {
      onMistake: m => {
        mistakes = m;
        const strokes = window.STROKES[q.ch].strokes.length;
        if (m > strokes * 2) failed = true;
      },
      onComplete: res => {
        const strokes = window.STROKES[q.ch].strokes.length;
        const ok = !failed && res.totalMistakes <= Math.max(2, Math.floor(strokes * 0.6));
        answer(ok, q);
      }
    }, { examMode: true });
    document.getElementById("ex-giveup").onclick = () => answer(false, q);
  }

  function renderMeaningQ(q) {
    const k = Engine.KANJI_MAP[q.ch];
    const lang = Engine.state.lang;
    const key = lang === "fr" ? "fr" : "en";
    const wrong = shuffle(Engine.KANJI.filter(x => x.k !== q.ch)).slice(0, 3).map(x => x[key]);
    const choices = shuffle([k[key]].concat(wrong));
    const v = document.getElementById("view");
    v.innerHTML = head() + `
      <div class="prompt">
        <div><span class="pill known">${t("exam_meaning")}</span></div>
        <div class="p-main mt8">${t("exam_q_meaning")}</div>
        <div class="p-big jp" style="font-size:72px">${q.ch}</div>
      </div>
      <div class="choices">${choices.map(c => `<button class="choice" data-c="${encodeURIComponent(c)}">${c}</button>`).join("")}</div>`;
    document.getElementById("ex-quit").onclick = () => App.go("exam");
    v.querySelectorAll(".choice").forEach(b => b.onclick = () => {
      const ok = decodeURIComponent(b.dataset.c) === k[key];
      b.classList.add(ok ? "sel-good" : "sel-bad");
      if (!ok) v.querySelectorAll(".choice").forEach(x => { if (decodeURIComponent(x.dataset.c) === k[key]) x.classList.add("sel-good"); });
      v.querySelectorAll(".choice").forEach(x => x.style.pointerEvents = "none");
      setTimeout(() => answer(ok, q), 900);
    });
  }

  function renderReadingQ(q) {
    const k = Engine.KANJI_MAP[q.ch];
    const w = k.w[Math.floor(Math.random() * k.w.length)];
    // wrong readings from other kanji words
    const wrong = shuffle(Engine.KANJI.filter(x => x.k !== q.ch))
      .slice(0, 3).map(x => x.w[0][1]);
    const choices = shuffle([w[1]].concat(wrong));
    const v = document.getElementById("view");
    v.innerHTML = head() + `
      <div class="prompt">
        <div><span class="pill known">${t("exam_reading")}</span></div>
        <div class="p-main mt8">${t("exam_q_reading")}</div>
        <div class="p-big jp" style="font-size:52px">${w[0]}</div>
      </div>
      <div class="choices">${choices.map(c => `<button class="choice jp" data-c="${encodeURIComponent(c)}">${c}</button>`).join("")}</div>`;
    document.getElementById("ex-quit").onclick = () => App.go("exam");
    v.querySelectorAll(".choice").forEach(b => b.onclick = () => {
      const ok = decodeURIComponent(b.dataset.c) === w[1];
      b.classList.add(ok ? "sel-good" : "sel-bad");
      if (!ok) v.querySelectorAll(".choice").forEach(x => { if (decodeURIComponent(x.dataset.c) === w[1]) x.classList.add("sel-good"); });
      v.querySelectorAll(".choice").forEach(x => x.style.pointerEvents = "none");
      Voice.speak(w[1]);
      setTimeout(() => answer(ok, q), 1100);
    });
  }

  function answer(ok, q) {
    if (current) { current.destroy(); current = null; }
    if (ok) right++;
    detail.push({ ch: q.ch, kind: q.kind, ok });
    qi++;
    nextQ();
  }

  function finish() {
    Engine.state.exams.push({ date: Date.now(), score: right, total: qs.length });
    Engine.save();
    const pct = Math.round(100 * right / qs.length);
    const v = document.getElementById("view");
    v.innerHTML = `<div class="done-panel">
      <div class="big">${pct >= 70 ? "🎓" : "📚"}</div>
      <h1>${t("exam_result")}</h1>
      <p style="font-size:28px;font-weight:800">${right}/${qs.length} <span class="muted">(${pct}%)</span></p>
      <p><span class="pill ${pct >= 70 ? "mastered" : "learning"}">${pct >= 70 ? t("exam_pass") : t("exam_fail")}</span></p>
      <div class="card" style="text-align:left;margin-top:16px">${detail.map(d =>
        `<div style="display:flex;justify-content:space-between;padding:4px 0">
          <span class="jp">${d.ch} <span class="muted" style="font-size:12px">${t("exam_" + (d.kind === "draw" ? "writing" : d.kind))}</span></span>
          <span>${d.ok ? "✅" : "❌"}</span></div>`).join("")}</div>
      <button class="btn mt16" id="ex-back">${t("continue")}</button>
    </div>`;
    document.getElementById("ex-back").onclick = () => App.go("exam");
  }

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  window.Exam = { render };
})();
