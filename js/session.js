// ===== Learning session flow =====
(function () {
  let items = [], idx = 0, score = { ok: 0, total: 0 };
  let current = null; // mounted drawing
  let advancing = false;
  let live = false;       // a session is on screen (guards queued timers)
  let screen = 0, totalScreens = 0;
  let curTrack = null; // null = mixed, or "hiragana"|"katakana"|"kanji"

  function t(key) { return window.App.t(key); }

  function start(track) {
    sfx("start");
    live = true;
    curTrack = track || null;
    items = Engine.buildSession(curTrack);
    Engine.noteSessionStarted();
    idx = 0; screen = 0; score = { ok: 0, total: 0 };
    // a kanji drawing is followed by its pronunciation, so it is two screens
    totalScreens = items.reduce((n, it) => n + 1 + (extraScreen(it) ? 1 : 0), 0);
    Engine.bumpStreak();
    next();
  }

  // does this item carry a pronunciation step after the drawing?
  // (a reading that was just played as the dictation prompt is not worth asking for)
  function voiceReading(it, live) {
    if (it.type !== "draw" || Engine.charType(it.ch) !== "kanji") return null;
    if (!Engine.state.settings.voiceOn) return null;
    if (!window.Voice) return null;
    if (!(live ? Voice.engineNow() : Voice.anyEngineMaybe())) return null;
    let skip = null;
    if (it.mode === "dictation") {
      const d = Engine.dictationInfo(it.ch);
      if (d) skip = d.r;
    }
    return live ? Engine.pickReading(it.ch, skip)
                : (Engine.kanjiReadings(it.ch).filter(r => r.r !== skip)[0] || null);
  }
  function extraScreen(it) { return !!voiceReading(it, false); }

  function next() {
    advancing = false;
    if (!live) return;
    if (current) { current.destroy(); current = null; }
    if (idx >= items.length) return finish();
    const it = items[idx];
    if (it.type === "voice") renderVoice(it);
    else renderDraw(it);
  }

  function header(extra) {
    const total = Math.max(totalScreens, screen);
    const pct = Math.round(100 * (screen - 1) / Math.max(1, total));
    return `<div class="session-top">
      <button class="xbtn" id="sess-quit">✕</button>
      <div class="pbar"><div style="width:${pct}%"></div></div>
      <span class="muted">${screen}/${total}</span>
    </div>${extra || ""}`;
  }

  function tagLabel(tag) {
    if (tag === "new") return `<span class="pill learning">${t("new_char")}</span>`;
    if (tag === "mastered") return `<span class="pill mastered">${t("mastered_review")}</span>`;
    return `<span class="pill known">${t("review")}</span>`;
  }

  // in a mixed session あ and ア look like the same request without this
  function scriptLabel(type) {
    if (type === "hiragana") return `<span class="pill hira">あ ${t("hiragana")}</span>`;
    if (type === "katakana") return `<span class="pill kata">ア ${t("katakana")}</span>`;
    return "";
  }

  // 三 is さん and みっつ: every reading on screen says which one it is
  function readingPill(kind) {
    if (kind !== "on" && kind !== "kun") return "";
    return `<span class="pill ${kind === "on" ? "onyomi" : "kunyomi"}">${t(kind === "on" ? "badge_on" : "badge_kun")}</span>`;
  }

  // ---------- drawing item ----------
  function renderDraw(it) {
    screen++;
    const ch = it.ch;
    const p = Engine.P(ch);
    const stage = it.tag === "reinforce" ? Math.max(p.stage, 1) : p.stage;
    const type = Engine.charType(ch);
    const kana = Engine.KANA_MAP[ch];
    const kanji = Engine.KANJI_MAP[ch];

    // audio-first encounter: nothing on screen but the sound
    const dict = it.mode === "dictation" ? Engine.dictationInfo(ch) : null;
    const dictation = dict && Voice.hasTTS() ? dict : null;
    // how much of the guide is still shown at this stage
    const plan = Drawing.hintPlan(ch, stage, { dictation: !!dictation });

    // a kanji has two readings and playing one of them unannounced is what made
    // 三 sound like さん here and みっつ there: offer both, each labelled
    const ttsList = (!dictation && type === "kanji") ? Engine.ttsReadings(ch) : [];

    let promptMain, promptSub = "", speakText = null;
    if (dictation) {
      promptMain = t("dictation_prompt");
      promptSub = type === "kanji" ? t("dictation_sub_kanji") : t("dictation_sub_kana");
      speakText = dictation.r;
    } else if (type === "kanji") {
      const lang = Engine.state.lang;
      promptMain = `${t("draw_meaning_hint")} <b>« ${lang === "fr" ? kanji.fr : kanji.en} »</b>`;
      const pref = ttsList.find(r => r.t === "kun") || ttsList[0];
      speakText = pref ? pref.r : ch;
      // the readings live on the two buttons below, romaji and all — no need to
      // repeat one of them here without saying which one it is
    } else {
      const r = kana ? kana.r : "";
      promptMain = `<span class="p-big">${r}</span>`;
      speakText = ch;
      // (visual prompt: the romaji above)
      promptSub = plan.shown >= plan.total ? t("draw_prompt_trace")
        : plan.shown > 0 ? t("draw_prompt_partial") : t("draw_prompt_free");
    }

    const v = document.getElementById("view");
    v.innerHTML = header(`
      <div class="prompt" id="prompt-box">
        <div>${tagLabel(it.tag)} ${scriptLabel(type)}${dictation ? ` <span class="pill dictation">🎧 ${t("dictation_pill")}</span>` : ""}</div>
        <div class="p-main mt8">${promptMain}</div>
        <div class="p-sub">${promptSub}</div>
      </div>
      <div class="char-stage">
        ${ttsList.length
          ? `<div class="listen-row">${ttsList.map(r =>
              `<button class="btn secondary small" data-speak="${r.r}">🔊 ${readingPill(r.t)}</button>`).join("")}</div>`
          : `<button class="btn ${dictation ? "" : "secondary"} small" id="sess-speak" style="margin-bottom:10px">
              🔊 ${dictation ? t("replay") : t("listen")}</button>`}
        <div id="draw-container"></div>
        <div class="stroke-count" id="stroke-count">${dictation ? "" :
          plan.total + " " + t("strokes_n") + (plan.shown > 0 && plan.shown < plan.total
            ? ` · ${(plan.shown === 1 ? t("hint_left_one") : t("hint_left").replace("{n}", plan.shown))}` : "")}</div>
        <div class="feedback" id="feedback"></div>
        <div class="session-actions">
          <button class="btn secondary small" id="sess-hint">${t("show_hint")}</button>
          <button class="btn secondary small" id="sess-skip">${t("skip")}</button>
        </div>
      </div>`);

    document.getElementById("sess-quit").onclick = quit;
    const speakBtn = document.getElementById("sess-speak");
    if (speakBtn) speakBtn.onclick = () => Voice.speak(speakText);
    v.querySelectorAll("[data-speak]").forEach(b =>
      b.onclick = () => Voice.speak(b.dataset.speak));
    document.getElementById("sess-skip").onclick = () => {
      sfx("tap");
      Engine.recordDraw(ch, false, false, true);   // skipped, not failed
      score.total++;
      if (dictation) { reveal(); Voice.speak(speakText); setTimeout(() => { if (live) { idx++; next(); } }, 1600); }
      else { idx++; next(); }
    };

    let mistakes = 0;
    const box = document.getElementById("draw-container");
    current = Drawing.mount(box, ch, stage, {
      onStroke: (n, total) => {
        sfx("stroke");
        const el = document.getElementById("stroke-count");
        if (el) el.textContent = `${t("stroke_of")} ${n} ${t("of")} ${total}`;
      },
      onMistake: m => {
        mistakes = m;
        sfx("miss");
        flash(t("incorrect"), "bad");
      },
      onHint: () => {},
      onComplete: res => {
        const strokes = window.STROKES[ch] ? window.STROKES[ch].strokes.length : 1;
        const ok = res.totalMistakes <= Math.max(2, strokes);            // overall success
        // "unaided" now means exactly that: no guide left on screen, no hint asked for
        const unaided = plan.shown === 0 && !res.hintUsed && res.totalMistakes <= 2;
        const wasMastered = Engine.P(ch).mastered || Engine.P(ch).known;
        Engine.recordDraw(ch, ok, unaided);
        const nowMastered = Engine.P(ch).mastered || Engine.P(ch).known;
        const justMastered = !wasMastered && nowMastered;
        const lostMastery = wasMastered && !nowMastered;
        score.total++; if (ok) score.ok++;
        sfx(justMastered ? "master" : ok ? "good" : "soso");
        if (dictation) reveal();
        // losing the badge is the more useful thing to say when it happens
        flash(lostMastery ? t("mastery_lost") : ok ? t("correct") : t("almost"),
              ok ? "good" : "bad");
        if (justMastered) masteryToast(ch);
        if (type !== "kanji") Voice.speak(speakText);
        advancing = true;
        // kanji: writing and pronunciation are two halves of the same encounter
        const reading = voiceReading(it, true);
        setTimeout(() => {
          if (!advancing || !live) return;
          if (reading) renderVoice({ ch, type: "voice", reading }, true);
          else { idx++; next(); }
        }, justMastered ? 2200 : lostMastery ? 2000 : 1300);
      }
    }, { hintPlan: plan, dictation: !!dictation });
    // what the dictation was, shown once the answer is in (or on demand)
    function reveal() {
      const box = document.getElementById("prompt-box");
      if (!box) return;
      // for kana the romaji is already shown, so only kanji add a meaning
      const meaning = type === "kanji" ? (Engine.state.lang === "fr" ? kanji.fr : kanji.en) : "";
      // which of the two readings was just dictated — 三 is さん here and みっつ elsewhere
      const kind = type === "kanji" ? Engine.readingType(ch, dictation.r) : null;
      box.innerHTML = `<div class="p-big jp">${ch}</div>
        <div class="p-sub">${readingPill(kind)} <b>${dictation.r}</b> · ${dictation.ro}${meaning ? " — " + meaning : ""}</div>`;
    }

    document.getElementById("sess-hint").onclick = () => {
      if (current) current.giveHint();
      // in a dictation, the useful hint is what the word means
      if (dictation && type === "kanji") {
        const sub = document.querySelector("#prompt-box .p-sub");
        if (sub) sub.innerHTML = `« ${Engine.state.lang === "fr" ? kanji.fr : kanji.en} »`;
      }
    };

    // play the dictation on arrival; otherwise only on brand-new characters
    if (dictation) setTimeout(() => { if (live) Voice.speak(speakText); }, 350);
    else if (it.tag === "new" || stage <= 0) setTimeout(() => { if (live) Voice.speak(speakText); }, 400);
  }

  // Mastery is rare — a character is only mastered once in the whole course —
  // so it gets its own moment rather than a slightly different chime.
  function masteryToast(ch) {
    const el = document.createElement("div");
    el.className = "toast-master";
    el.innerHTML = `<div class="tm-card">
      <div class="tm-char jp">${ch}</div>
      <div class="tm-txt">🏆 ${t("mastered_now")}</div>
      <div class="tm-sub">${t("mastered_now_sub")}</div></div>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add("out"), 1500);
    setTimeout(() => el.remove(), 1900);
  }

  function flash(msg, cls) {
    const f = document.getElementById("feedback");
    if (!f) return;
    f.textContent = msg; f.className = "feedback " + cls;
  }

  // ---------- voice item (also phase 2 of every kanji encounter) ----------
  function renderVoice(it, isSecondPhase) {
    screen++;
    const ch = it.ch;
    const type = Engine.charType(ch);
    const kana = Engine.KANA_MAP[ch];
    const kanji = Engine.KANJI_MAP[ch];

    // A kanji is asked for by its own reading, shown as the bare character plus a
    // badge saying which reading is wanted; a kana by one of its example words.
    let target, display, accepts, reading = null;
    if (type === "kanji") {
      reading = it.reading || Engine.pickReading(ch);
      if (!reading) { screen--; idx++; return next(); }
      target = reading.r; display = ch;
      accepts = Engine.readingAccepts(reading);
    } else {
      const ex = Engine.kanaVoiceWord(ch, 3);
      if (!ex) { screen--; idx++; return next(); }
      target = ex.jp; display = ex.jp;
      accepts = [ex.jp, ex.r];
    }

    let attempts = 0;
    let resolved = false;         // graded — the mic must not open again
    const v = document.getElementById("view");
    v.innerHTML = header(`
      <div class="voice-panel">
        ${isSecondPhase ? `<div class="phase-row">
            <span class="phase done">1. ${t("phase_write")} ✓</span>
            <span class="phase active">2. ${t("phase_say")}</span>
          </div>` : ""}
        <div class="p-main mt16">${reading ? t("say_reading_prompt") : t("say_prompt")}</div>
        <div class="muted" style="font-size:12.5px">${t("voice_no_penalty")}</div>
        ${reading ? `<div class="mt8">${readingPill(reading.t)}</div>` : ""}
        <div class="voice-char jp">${display}</div>
        <div class="p-sub" id="v-answer"></div>
        <button class="btn secondary small" id="v-listen">🔊 ${t("listen")}</button>
        <button class="mic-btn" id="v-mic">🎤</button>
        <div class="muted" id="v-status">${t("mic_start")}</div>
        <div class="heard-box mt8" id="v-heard"></div>
        <div class="feedback" id="feedback"></div>
        <div class="session-actions" style="margin:14px auto 0">
          <button class="btn secondary small" id="sess-skip">${t("skip")}</button>
        </div>
      </div>`);
    document.getElementById("sess-quit").onclick = quit;
    document.getElementById("sess-skip").onclick = e => {
      if (resolved) return;
      resolved = true; Voice.cancel();
      e.target.disabled = true;
      idx++; next();
    };

    const mic = document.getElementById("v-mic");
    const status = document.getElementById("v-status");
    const listenBtn = document.getElementById("v-listen");

    // playing the model out loud while the mic is open would validate the exercise
    // for the learner, so the two are mutually exclusive.
    function setRecording(on) {
      mic.classList.toggle("rec", on);
      listenBtn.disabled = on;
      listenBtn.classList.toggle("is-disabled", on);
      status.textContent = on ? t("mic_listening") : t("mic_start");
    }
    // once the answer is graded, freeze the controls: an open mic during the
    // hand-over would otherwise pick up speech and validate the next exercise.
    function lockPanel() {
      resolved = true;
      Voice.cancel();
      mic.disabled = true; mic.classList.add("is-disabled"); mic.classList.remove("rec");
      const sk = document.getElementById("sess-skip");
      if (sk) { sk.disabled = true; sk.classList.add("is-disabled"); }
      status.textContent = "";
    }
    listenBtn.onclick = () => { if (!Voice.isListening()) Voice.speak(target); };

    // what was being asked for, spelled out — only once it has been said right
    function revealAnswer() {
      const el = document.getElementById("v-answer");
      if (!el || !reading) return;
      const meaning = Engine.state.lang === "fr" ? reading.fr : reading.en;
      el.innerHTML = `<b class="jp">${reading.r}</b> · ${reading.ro}${meaning ? " — " + meaning : ""}`;
    }

    if (!Voice.engineNow()) {
      status.textContent = t("voice_unavailable");
      mic.disabled = true; mic.style.opacity = .4;
      return;
    }

    mic.onclick = async () => {
      if (resolved) return;
      // second tap = pause the attempt (time to think); nothing is graded
      if (Voice.isListening()) {
        Voice.cancel();
        setRecording(false);
        status.textContent = t("mic_paused");
        flash("", "");
        return;
      }
      setRecording(true);
      document.getElementById("v-heard").textContent = "";
      flash("", "");
      try {
        const alts = await Voice.listen(st => {
          if (st === "proc") { mic.classList.remove("rec"); status.textContent = t("mic_check"); }
        });
        setRecording(false);
        if (alts === null) { status.textContent = t("mic_paused"); return; }   // cancelled
        if (!alts.length) { status.textContent = t("voice_nothing"); return; } // silence: no penalty
        const heard = alts.filter(Boolean).join(" / ");
        document.getElementById("v-heard").textContent = heard ? `${t("heard")} ${heard}` : "";
        const ok = alts.some(a => Voice.matches(a, accepts));
        attempts++;
        if (ok) {
          lockPanel();
          sfx("right");
          flash(t("voice_correct"), "good");
          revealAnswer();
          Engine.recordVoice(ch, true, reading && reading.r);
          setTimeout(() => { if (live) { idx++; next(); } }, 2000);
        } else if (attempts >= 3) {
          lockPanel();
          sfx("bad");
          flash(t("voice_close"), "bad");
          revealAnswer();
          Engine.recordVoice(ch, false, reading && reading.r);
          Voice.speak(target);
          setTimeout(() => { if (live) { idx++; next(); } }, 2600);
        } else {
          sfx("miss");
          flash(t("voice_retry"), "bad");
          Voice.speak(target);
        }
      } catch (e) {
        setRecording(false);
        status.textContent = Voice.engineNow() ? t("voice_error") : t("voice_unavailable");
      }
    };
  }

  function finish() {
    live = false;
    Engine.noteSessionDone();
    sfx("fanfare");
    const v = document.getElementById("view");
    const pct = score.total ? Math.round(100 * score.ok / score.total) : 100;
    v.innerHTML = `<div class="done-panel">
      <div class="big">${pct >= 80 ? "🎉" : pct >= 50 ? "💪" : "🌱"}</div>
      <h1>${t("session_done")}</h1>
      <p class="muted">${t("session_score")} : ${score.ok}/${score.total} (${pct}%)</p>
      <button class="btn mt16" id="sess-again">${t("start_session")}</button>
      <button class="btn ghost mt8" id="sess-home">${t("back")}</button>
    </div>`;
    document.getElementById("sess-again").onclick = () => start(curTrack);
    document.getElementById("sess-home").onclick = () => App.go("home");
  }

  // leaving the session: kill pending timers so nothing renders over the next screen
  function stop() {
    live = false; advancing = false;
    document.querySelectorAll(".toast-master").forEach(el => el.remove());
    if (current) { current.destroy(); current = null; }
    if (window.Voice) Voice.cancel();
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
  }

  function quit() { stop(); App.go("home"); }

  window.Session = { start, stop };
})();
