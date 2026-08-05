// ===== Learning session flow =====
(function () {
  let items = [], idx = 0, score = { ok: 0, total: 0 };
  let current = null; // mounted drawing
  let advancing = false;

  function t(key) { return window.App.t(key); }

  function start() {
    items = Engine.buildSession();
    idx = 0; score = { ok: 0, total: 0 };
    Engine.bumpStreak();
    next();
  }

  function next() {
    advancing = false;
    if (current) { current.destroy(); current = null; }
    if (idx >= items.length) return finish();
    const it = items[idx];
    if (it.type === "voice") renderVoice(it);
    else renderDraw(it);
  }

  function header(extra) {
    const pct = Math.round(100 * idx / items.length);
    return `<div class="session-top">
      <button class="xbtn" id="sess-quit">✕</button>
      <div class="pbar"><div style="width:${pct}%"></div></div>
      <span class="muted">${idx + 1}/${items.length}</span>
    </div>${extra || ""}`;
  }

  function tagLabel(tag) {
    if (tag === "new") return `<span class="pill learning">${t("new_char")}</span>`;
    if (tag === "mastered") return `<span class="pill mastered">${t("mastered_review")}</span>`;
    return `<span class="pill known">${t("review")}</span>`;
  }

  // ---------- drawing item ----------
  function renderDraw(it) {
    const ch = it.ch;
    const p = Engine.P(ch);
    const stage = it.tag === "reinforce" ? Math.max(p.stage, 1) : p.stage;
    const type = Engine.charType(ch);
    const conf = Drawing.stageConfig(stage);
    const kana = Engine.KANA_MAP[ch];
    const kanji = Engine.KANJI_MAP[ch];

    let promptMain, promptSub = "", speakText = null;
    if (type === "kanji") {
      const lang = Engine.state.lang;
      promptMain = `${t("draw_meaning_hint")} <b>« ${lang === "fr" ? kanji.fr : kanji.en} »</b>`;
      const rd = (kanji.kun[0] || kanji.on[0]);
      speakText = rd ? rd[0].replace(/[()（）]/g, "") : ch;
      if (stage <= 1) promptSub = rd ? `${rd[0]} — ${rd[1]}` : "";
    } else {
      const r = kana ? kana.r : "";
      promptMain = `<span class="p-big">${r}</span>`;
      speakText = ch;
      promptSub = stage <= 0 ? t("draw_prompt_trace") : (stage <= 2 ? t("draw_prompt_guided") : t("draw_prompt_free"));
    }

    const v = document.getElementById("view");
    v.innerHTML = header(`
      <div class="prompt">
        <div>${tagLabel(it.tag)}</div>
        <div class="p-main mt8">${promptMain}</div>
        <div class="p-sub">${promptSub}</div>
      </div>
      <div class="char-stage">
        <button class="btn secondary small" id="sess-speak" style="margin-bottom:10px">🔊 ${t("listen")}</button>
        <div id="draw-container"></div>
        <div class="stroke-count" id="stroke-count">${window.STROKES[ch] ? window.STROKES[ch].strokes.length : "?"} ${t("strokes_n")}</div>
        <div class="feedback" id="feedback"></div>
        <div class="session-actions">
          <button class="btn secondary small" id="sess-hint">${t("show_hint")}</button>
          <button class="btn secondary small" id="sess-skip">${t("skip")}</button>
        </div>
      </div>`);

    document.getElementById("sess-quit").onclick = quit;
    document.getElementById("sess-speak").onclick = () => Voice.speak(speakText);
    document.getElementById("sess-skip").onclick = () => {
      Engine.recordDraw(ch, false, false);
      score.total++;
      idx++; next();
    };

    let mistakes = 0;
    const box = document.getElementById("draw-container");
    current = Drawing.mount(box, ch, stage, {
      onStroke: (n, total) => {
        const el = document.getElementById("stroke-count");
        if (el) el.textContent = `${t("stroke_of")} ${n} ${t("of")} ${total}`;
      },
      onMistake: m => {
        mistakes = m;
        flash(t("incorrect"), "bad");
      },
      onHint: () => {},
      onComplete: res => {
        const strokes = window.STROKES[ch] ? window.STROKES[ch].strokes.length : 1;
        const ok = res.totalMistakes <= Math.max(2, strokes);            // overall success
        const unaided = stage >= 3 && !res.hintUsed && res.totalMistakes <= 2;
        Engine.recordDraw(ch, ok, unaided);
        score.total++; if (ok) score.ok++;
        flash(ok ? t("correct") : t("almost"), ok ? "good" : "bad");
        if (type !== "kanji") Voice.speak(speakText);
        advancing = true;
        setTimeout(() => { if (advancing) { idx++; next(); } }, 1300);
      }
    });
    document.getElementById("sess-hint").onclick = () => { if (current) current.giveHint(); };

    // auto TTS on new characters
    if (it.tag === "new" || stage <= 0) setTimeout(() => Voice.speak(speakText), 400);
  }

  function flash(msg, cls) {
    const f = document.getElementById("feedback");
    if (!f) return;
    f.textContent = msg; f.className = "feedback " + cls;
  }

  // ---------- voice item ----------
  function renderVoice(it) {
    const ch = it.ch;
    const type = Engine.charType(ch);
    const kana = Engine.KANA_MAP[ch];
    const kanji = Engine.KANJI_MAP[ch];

    // for kanji: pronounce its first example word; for kana: syllable or its example word
    let target, display, accepts;
    if (type === "kanji") {
      const w = kanji.w[0];
      target = w[1]; display = w[0];
      accepts = [w[0], w[1], w[2]];
    } else if (kana && kana.ex && kana.ex.jp.length > 1 && Math.random() < 0.5) {
      target = kana.ex.jp; display = kana.ex.jp;
      accepts = [kana.ex.jp, kana.ex.r];
    } else {
      target = ch; display = ch;
      accepts = [ch, kana ? kana.r : ""];
    }

    let attempts = 0;
    const v = document.getElementById("view");
    v.innerHTML = header(`
      <div class="voice-panel">
        <div class="p-main mt16">${t("say_prompt")}</div>
        <div class="voice-char jp">${display}</div>
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
    document.getElementById("v-listen").onclick = () => Voice.speak(target);
    document.getElementById("sess-skip").onclick = () => { idx++; next(); };

    const mic = document.getElementById("v-mic");
    const status = document.getElementById("v-status");

    if (!Voice.engineNow()) {
      status.textContent = t("voice_unavailable");
      mic.disabled = true; mic.style.opacity = .4;
      return;
    }

    mic.onclick = async () => {
      mic.classList.add("rec");
      status.textContent = t("mic_listening");
      document.getElementById("v-heard").textContent = "";
      try {
        const alts = await Voice.listen(st => {
          status.textContent = st === "proc" ? t("mic_check") : t("mic_listening");
          if (st === "proc") mic.classList.remove("rec");
        });
        mic.classList.remove("rec");
        status.textContent = t("mic_start");
        const heard = alts.filter(Boolean).join(" / ");
        document.getElementById("v-heard").textContent = heard ? `${t("heard")} ${heard}` : "";
        const ok = alts.some(a => Voice.matches(a, accepts));
        attempts++;
        if (ok) {
          flash(t("voice_correct"), "good");
          Engine.recordVoice(ch, true);
          score.total++; score.ok++;
          setTimeout(() => { idx++; next(); }, 1200);
        } else if (attempts >= 3) {
          flash(t("voice_close"), "bad");
          Engine.recordVoice(ch, false);
          score.total++;
          Voice.speak(target);
          setTimeout(() => { idx++; next(); }, 1800);
        } else {
          flash(t("voice_retry"), "bad");
          Voice.speak(target);
        }
      } catch (e) {
        mic.classList.remove("rec");
        status.textContent = t("voice_unavailable");
      }
    };
  }

  function finish() {
    const v = document.getElementById("view");
    const pct = score.total ? Math.round(100 * score.ok / score.total) : 100;
    v.innerHTML = `<div class="done-panel">
      <div class="big">${pct >= 80 ? "🎉" : pct >= 50 ? "💪" : "🌱"}</div>
      <h1>${t("session_done")}</h1>
      <p class="muted">${t("session_score")} : ${score.ok}/${score.total} (${pct}%)</p>
      <button class="btn mt16" id="sess-again">${t("start_session")}</button>
      <button class="btn ghost mt8" id="sess-home">${t("back")}</button>
    </div>`;
    document.getElementById("sess-again").onclick = start;
    document.getElementById("sess-home").onclick = () => App.go("home");
  }

  function quit() {
    if (current) { current.destroy(); current = null; }
    App.go("home");
  }

  window.Session = { start };
})();
