// ===== Exams =====
// Two shapes, deliberately different:
//   · the mixed exam — a short sample of mastered kanji, unchanged since v1.0
//   · a full exam per script — every mastered character, every question type it
//     supports. Long by design: it is a sweep, not a sample.
(function () {
  const MIN_MASTERED = 5;      // to unlock the mixed exam
  const MIN_FULL = 3;          // to unlock a full exam
  let qs = [], qi = 0, right = 0, detail = [];
  let current = null;
  let live = false;       // an exam is on screen (guards queued timers)
  let mode = null;        // null = mixed, or "hiragana" | "katakana" | "kanji"

  function t(k) { return App.t(k); }

  // which question types a script can be examined on
  function formatsFor(track) {
    return track === "kanji" ? ["draw", "meaning", "reading"] : ["draw", "kread"];
  }
  function fullCount(track) {
    return Engine.masteredChars(track).length * formatsFor(track).length;
  }
  function modeLabel(m) {
    return m ? t(m) : t("exam_mixed");
  }

  // ---------- exam picker ----------
  function render() {
    const v = document.getElementById("view");
    const mastered = Engine.masteredKanji();
    const hist = Engine.state.exams.slice().reverse().slice(0, 12);
    const histHtml = hist.length ? `<h2>${t("exam_history")}</h2><div class="card exam-hist">` +
      hist.map(e => {
        const pct = Math.round(100 * e.score / e.total);
        return `<div class="row"><span>${new Date(e.date).toLocaleDateString()}
            <span class="muted" style="font-size:12px">${modeLabel(e.mode)}</span></span>
          <span><b>${e.score}/${e.total}</b> · ${pct}% ${pct >= 70 ? "✅" : "❌"}</span></div>`;
      }).join("") + `</div>` : "";

    function fullCard(track, ico, title) {
      const n = Engine.masteredChars(track).length;
      const q = fullCount(track);
      return `<div class="card">
        <div class="exam-head"><span class="exam-ico">${ico}</span>
          <div><div class="track-title">${title}</div>
            <div class="track-sub">${n} ${t("stats_mastered")}${n >= MIN_FULL ? ` · ${q} ${t("exam_questions")}` : ""}</div>
          </div></div>
        ${n >= MIN_FULL
          ? `<button class="btn secondary mt8" data-full="${track}">${t("exam_start_full")}</button>`
          : `<p class="muted center" style="font-size:13px;margin:8px 0 0">${t("exam_need_full").replace("{n}", MIN_FULL)}</p>`}
      </div>`;
    }

    v.innerHTML = `<h1>${t("exam_title")}</h1>
      <div class="card">
        <div class="track-title">${t("exam_mixed")}</div>
        <p class="muted" style="margin:4px 0 0;font-size:13px">${t("exam_desc")}</p>
        <div class="stat-row" style="margin:12px 0">
          <div class="stat"><div class="n">${mastered.length}</div><div class="l">${t("stats_mastered")}</div></div>
        </div>
        ${mastered.length >= MIN_MASTERED
          ? `<button class="btn" id="exam-start">${t("exam_start")}</button>`
          : `<p class="muted center">${t("exam_need").replace("{n}", MIN_MASTERED)}</p>`}
      </div>
      <h2>${t("exam_full")}</h2>
      <p class="muted" style="font-size:12.5px;margin:-4px 2px 10px">${t("exam_full_desc")}</p>
      ${fullCard("hiragana", "あ", t("hiragana"))}
      ${fullCard("katakana", "ア", t("katakana"))}
      ${fullCard("kanji", "字", t("kanji"))}
      ${histHtml}`;
    const b = document.getElementById("exam-start");
    if (b) b.onclick = () => startExam(null);
    v.querySelectorAll("[data-full]").forEach(x =>
      x.onclick = () => startExam(x.dataset.full));
  }

  // ---------- building the paper ----------
  function startExam(which) {
    sfx("start");
    live = true;
    mode = which || null;
    qs = []; qi = 0; right = 0; detail = [];
    if (mode) buildFull(mode); else buildMixed();
    nextQ();
  }

  // the original: a sample of mastered kanji, roughly 15 questions
  function buildMixed() {
    const mastered = shuffle(Engine.masteredKanji());
    const nDraw = Math.min(6, mastered.length);
    const nMean = Math.min(5, mastered.length);
    const nRead = Math.min(4, mastered.length);
    mastered.slice(0, nDraw).forEach(ch => qs.push({ kind: "draw", ch }));
    shuffle(mastered).slice(0, nMean).forEach(ch => qs.push({ kind: "meaning", ch }));
    shuffle(mastered).slice(0, nRead).forEach(ch => qs.push({ kind: "reading", ch }));
    qs = shuffle(qs);
  }

  // every mastered character of one script, once per question type
  function buildFull(track) {
    const chars = Engine.masteredChars(track);
    const kinds = formatsFor(track);
    chars.forEach(ch => kinds.forEach(kind => {
      // a character with no stroke data cannot be a writing question
      if (kind === "draw" && !window.STROKES[ch]) return;
      qs.push({ kind, ch });
    }));
    qs = spread(shuffle(qs));
  }

  // a full sweep asks about each character two or three times; keep those
  // questions apart so one never answers the next
  function spread(list) {
    const pool = list.slice(), out = [];
    while (pool.length) {
      let i = pool.findIndex(q => !out.length || q.ch !== out[out.length - 1].ch);
      if (i < 0) i = 0;                       // only repeats left — accept one
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }

  function head() {
    const pct = Math.round(100 * qi / qs.length);
    return `<div class="session-top">
      <button class="xbtn" id="ex-quit">✕</button>
      <div class="pbar"><div style="width:${pct}%"></div></div>
      <span class="muted">${qi + 1}/${qs.length}</span></div>`;
  }

  function nextQ() {
    if (!live) return;
    if (current) { current.destroy(); current = null; }
    if (qi >= qs.length) return finish();
    const q = qs[qi];
    if (q.kind === "draw") renderDrawQ(q);
    else if (q.kind === "meaning") renderMeaningQ(q);
    else if (q.kind === "kread") renderKanaReadQ(q);
    else renderReadingQ(q);
  }

  // じ and ぢ are both "ji", ず and づ both "zu": for those four the romaji alone
  // is not a question, so the prompt also names the character they are voiced
  // from. Every other dakuten kana has a romaji of its own and needs no help.
  function kanaDisambig(ch) {
    const kana = Engine.KANA_MAP[ch];
    if (!kana || !kana.base) return "";
    const pool = Engine.charType(ch) === "hiragana" ? Engine.HIRA_ALL : Engine.KATA_ALL;
    if (!pool.some(x => x.k !== ch && x.r === kana.r)) return "";
    const mark = String.fromCharCode(ch.charCodeAt(0) - kana.base.charCodeAt(0) === 2 ? 0x309C : 0x309B);
    return `<div class="p-sub jp">${kana.base} + ${mark}</div>`;
  }

  // ---------- writing (kana and kanji) ----------
  function renderDrawQ(q) {
    const lang = Engine.state.lang;
    const type = Engine.charType(q.ch);
    const kanji = Engine.KANJI_MAP[q.ch];
    const kana = Engine.KANA_MAP[q.ch];
    // a kanji is asked for by its meaning, a kana by its sound — and in a kana
    // exam the script has to be named, or あ and ア are the same question
    const prompt = kanji
      ? `${t("exam_q_draw")} <b>« ${lang === "fr" ? kanji.fr : kanji.en} »</b>`
      : `${t("exam_q_kana_draw")} <b>« ${kana ? kana.r : q.ch} »</b>`;
    const script = type === "hiragana" ? `<span class="pill hira">あ ${t("hiragana")}</span>`
      : type === "katakana" ? `<span class="pill kata">ア ${t("katakana")}</span>` : "";
    const v = document.getElementById("view");
    v.innerHTML = head() + `
      <div class="prompt">
        <div><span class="pill known">${t("exam_writing")}</span> ${script}</div>
        <div class="p-main mt8">${prompt}</div>
        ${kanji ? "" : kanaDisambig(q.ch)}
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
    current = Drawing.mount(document.getElementById("draw-container"), q.ch, 5, {
      onMistake: m => {
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

  // ---------- multiple choice plumbing ----------
  function askChoice(q, pillKey, question, big, bigClass, choices, correct, after) {
    const v = document.getElementById("view");
    v.innerHTML = head() + `
      <div class="prompt">
        <div><span class="pill known">${t(pillKey)}</span></div>
        <div class="p-main mt8">${question}</div>
        <div class="p-big jp" style="${bigClass}">${big}</div>
      </div>
      <div class="choices">${choices.map(c =>
        `<button class="choice jp" data-c="${encodeURIComponent(c)}">${c}</button>`).join("")}</div>`;
    document.getElementById("ex-quit").onclick = () => App.go("exam");
    v.querySelectorAll(".choice").forEach(b => b.onclick = () => {
      const ok = decodeURIComponent(b.dataset.c) === correct;
      b.classList.add(ok ? "sel-good" : "sel-bad");
      if (!ok) v.querySelectorAll(".choice").forEach(x => {
        if (decodeURIComponent(x.dataset.c) === correct) x.classList.add("sel-good");
      });
      v.querySelectorAll(".choice").forEach(x => x.style.pointerEvents = "none");
      const wait = after ? after() : 900;
      setTimeout(() => answer(ok, q), wait);
    });
  }

  // Three wrong answers, never equal to the right one and never to each other.
  // The pool is taken in the order given — callers that want plausible near
  // misses put them first — so this must not reshuffle it.
  function distractors(pool, correct, n) {
    const seen = { [correct]: true }, out = [];
    pool.forEach(x => {
      if (out.length >= n || !x || seen[x]) return;
      seen[x] = true; out.push(x);
    });
    return out;
  }

  function renderMeaningQ(q) {
    const key = Engine.state.lang === "fr" ? "fr" : "en";
    const correct = Engine.KANJI_MAP[q.ch][key];
    const wrong = distractors(shuffle(Engine.KANJI.filter(x => x.k !== q.ch)).map(x => x[key]), correct, 3);
    askChoice(q, "exam_meaning", t("exam_q_meaning"), q.ch, "font-size:72px",
      shuffle([correct].concat(wrong)), correct);
  }

  function renderReadingQ(q) {
    const k = Engine.KANJI_MAP[q.ch];
    const w = k.w[Math.floor(Math.random() * k.w.length)];
    const wrong = distractors(shuffle(Engine.KANJI.filter(x => x.k !== q.ch)).map(x => x.w[0][1]), w[1], 3);
    askChoice(q, "exam_reading", t("exam_q_reading"), w[0], "font-size:52px",
      shuffle([w[1]].concat(wrong)), w[1], () => { Voice.speak(w[1]); return 1100; });
  }

  // ---------- kana: which sound is this character? ----------
  function renderKanaReadQ(q) {
    const kana = Engine.KANA_MAP[q.ch];
    const correct = kana ? kana.r : q.ch;
    const type = Engine.charType(q.ch);
    const pool = (type === "hiragana" ? Engine.HIRA_ALL : Engine.KATA_ALL).filter(x => x.k !== q.ch);
    // near-misses first: same vowel or same consonant is a real question,
    // four unrelated syllables are not
    const near = pool.filter(x => x.r && correct &&
      (x.r.slice(-1) === correct.slice(-1) || x.r[0] === correct[0]));
    const wrong = distractors(shuffle(near).map(x => x.r).concat(shuffle(pool).map(x => x.r)), correct, 3);
    askChoice(q, "exam_reading", t("exam_q_kana_read"), q.ch, "font-size:72px",
      shuffle([correct].concat(wrong)), correct,
      () => { Voice.speak(q.ch); return 1000; });
  }

  function answer(ok, q) {
    sfx(ok ? "right" : "bad");
    if (current) { current.destroy(); current = null; }
    if (ok) right++;
    detail.push({ ch: q.ch, kind: q.kind, ok });
    qi++;
    nextQ();
  }

  function finish() {
    live = false;
    sfx("fanfare");
    Engine.state.exams.push({ date: Date.now(), score: right, total: qs.length, mode: mode });
    Engine.save();
    const pct = Math.round(100 * right / qs.length);
    const kindLabel = k => t("exam_" + (k === "draw" ? "writing" : k === "kread" ? "reading" : k));
    // a full sweep produces hundreds of lines; only the misses are worth listing
    const missed = detail.filter(d => !d.ok);
    const listed = mode ? missed : detail;
    const listHtml = listed.length
      ? `<div class="card" style="text-align:left;margin-top:16px">
          ${mode ? `<div class="track-sub" style="margin-bottom:6px">${t("exam_missed")}</div>` : ""}
          ${listed.map(d => `<div style="display:flex;justify-content:space-between;padding:4px 0">
            <span class="jp">${d.ch} <span class="muted" style="font-size:12px">${kindLabel(d.kind)}</span></span>
            <span>${d.ok ? "✅" : "❌"}</span></div>`).join("")}</div>`
      : `<p class="muted mt16">${t("exam_all_right")}</p>`;
    const v = document.getElementById("view");
    v.innerHTML = `<div class="done-panel">
      <div class="big">${pct >= 70 ? "🎓" : "📚"}</div>
      <h1>${t("exam_result")}</h1>
      <p class="muted" style="margin:-6px 0 0">${modeLabel(mode)}</p>
      <p style="font-size:28px;font-weight:800">${right}/${qs.length} <span class="muted">(${pct}%)</span></p>
      <p><span class="pill ${pct >= 70 ? "mastered" : "learning"}">${pct >= 70 ? t("exam_pass") : t("exam_fail")}</span></p>
      ${listHtml}
      <button class="btn mt16" id="ex-back">${t("continue")}</button>
    </div>`;
    document.getElementById("ex-back").onclick = () => App.go("exam");
  }

  function stop() {
    live = false;
    if (current) { current.destroy(); current = null; }
  }

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  window.Exam = { render, stop };
})();
