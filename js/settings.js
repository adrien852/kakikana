// ===== Settings =====
(function () {
  function t(k) { return App.t(k); }

  // "il y a 2 min" rather than a full timestamp, which wraps on a phone
  function ago(ms) {
    if (!ms) return null;
    const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 60) return t("ago_now");
    const m = Math.round(s / 60);
    if (m < 60) return t("ago_min").replace("{n}", m);
    const h = Math.round(m / 60);
    if (h < 24) return t("ago_hour").replace("{n}", h);
    return t("ago_day").replace("{n}", Math.round(h / 24));
  }
  function relayLine() {
    const st = Sync.status();
    if (!st.url) return t("relay_none");
    if (st.lastErr) return "⚠ " + t("relay_failed") + " — " + st.lastErr;
    const bits = [];
    if (st.lastPush) bits.push(t("relay_sent") + " " + ago(st.lastPush));
    if (st.lastPull) bits.push(t("relay_got") + " " + ago(st.lastPull));
    return bits.length ? bits.join(" · ") : t("relay_waiting");
  }

  function render() {
    const S = Engine.state;
    const st = S.settings;
    const v = document.getElementById("view");
    v.innerHTML = `<h1>${t("tab_settings")}</h1>

      <div class="card">
        <div class="set-row">
          <div class="set-lbl">${t("settings_lang")}</div>
          <select id="set-lang">
            <option value="fr" ${S.lang === "fr" ? "selected" : ""}>Français</option>
            <option value="en" ${S.lang === "en" ? "selected" : ""}>English</option>
          </select>
        </div>
      </div>

      <h2>${t("settings_pace")}</h2>
      <div class="card">
        <div class="set-row">
          <div class="set-lbl">${t("set_active_kanji")}</div>
          <select id="set-active">${[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<option ${st.activeKanji === n ? "selected" : ""}>${n}</option>`).join("")}</select>
        </div>
        <div class="set-row">
          <div class="set-lbl">${t("set_mastery_reps")}</div>
          <select id="set-reps">${[3, 4, 5, 6, 8].map(n => `<option ${st.masteryReps === n ? "selected" : ""}>${n}</option>`).join("")}</select>
        </div>
        <div class="set-row">
          <div class="set-lbl">${t("set_min_days")}</div>
          <select id="set-days">${[1, 2, 3, 4, 5].map(n => `<option ${st.minDays === n ? "selected" : ""}>${n}</option>`).join("")}</select>
        </div>
        <div class="set-row">
          <div class="set-lbl">${t("set_strict")}</div>
          <select id="set-strict">
            <option value="easy" ${st.strict === "easy" ? "selected" : ""}>${t("strict_easy")}</option>
            <option value="normal" ${st.strict === "normal" ? "selected" : ""}>${t("strict_normal")}</option>
            <option value="hard" ${st.strict === "hard" ? "selected" : ""}>${t("strict_hard")}</option>
          </select>
        </div>
      </div>

      <h2>${t("settings_tts")}</h2>
      <div class="card">
        ${Voice.hasTTS() ? "" : `<div class="hint-banner">${t("tts_missing")}</div>`}
        <div class="set-row">
          <div class="set-lbl">${t("tts_slow")}</div>
          <label class="switch"><input type="checkbox" id="set-slow" ${st.ttsSlow ? "checked" : ""}><span></span></label>
        </div>
        <div class="set-row">
          <div class="set-lbl">${t("tts_test")}</div>
          <button class="btn secondary small" id="tts-test">🔊 こんにちは</button>
        </div>
      </div>

      <h2>${t("settings_sound")}</h2>
      <div class="card">
        <div class="set-row">
          <div class="set-lbl">${t("set_sfx")}
            <div class="set-sub">${t("set_sfx_sub")}</div>
          </div>
          <label class="switch"><input type="checkbox" id="set-sfx" ${st.sfx !== false ? "checked" : ""}><span></span></label>
        </div>
        <div class="set-row">
          <div class="set-lbl">${t("set_sfx_volume")}
            <div class="set-sub"><span id="sfx-vol-val">${st.sfxVolume === undefined ? 50 : st.sfxVolume}</span>%</div>
          </div>
          <input type="range" id="set-sfx-vol" min="0" max="100" step="5"
                 value="${st.sfxVolume === undefined ? 50 : st.sfxVolume}"
                 ${st.sfx === false ? "disabled" : ""}>
        </div>
      </div>

      <h2>${t("settings_voice")}</h2>
      <div class="card">
        <div class="set-row">
          <div class="set-lbl">${t("set_voice_on")}</div>
          <label class="switch"><input type="checkbox" id="set-voice" ${st.voiceOn ? "checked" : ""}><span></span></label>
        </div>
        <div class="set-row">
          <div class="set-lbl">${t("set_whisper")}
            <div class="set-sub" id="whisper-status">${st.whisper ? t("whisper_ready") : ""}</div>
          </div>
          ${st.whisper
            ? `<span class="pill mastered">✓</span>`
            : `<button class="btn secondary small" id="whisper-dl">${t("whisper_dl")}</button>`}
        </div>
      </div>

      <h2>${t("settings_relay")}</h2>
      <div class="card">
        <p class="muted" style="margin-top:0;font-size:12.5px">${t("relay_desc")}</p>
        <input type="url" id="relay-url" class="text-in" placeholder="https://…/s/mon-secret"
               value="${(Sync.status().url || "").replace(/"/g, "&quot;")}" autocomplete="off"
               autocapitalize="off" spellcheck="false">
        <div class="relay-actions">
          <button class="btn secondary small" id="relay-save">${t("relay_save")}</button>
          <button class="btn secondary small" id="relay-now">${t("relay_now")}</button>
        </div>
        <div class="set-row"><div class="set-lbl">${t("relay_auto")}
          <div class="set-sub">${t("relay_auto_sub")}</div></div>
          <label class="switch"><input type="checkbox" id="relay-auto" ${Sync.status().auto ? "checked" : ""}><span></span></label>
        </div>
        <div class="muted" id="relay-status" style="font-size:12.5px">${relayLine()}</div>
      </div>

      <h2>${t("settings_data")}</h2>
      <div class="card">
        <div class="set-row"><div class="set-lbl">${t("export_progress")}</div>
          <button class="btn secondary small" id="btn-export">⬇︎</button></div>
        <div class="set-row"><div class="set-lbl">${t("import_progress")}</div>
          <button class="btn secondary small" id="btn-import">⬆︎</button>
          <input type="file" id="import-file" accept=".json,application/json" style="display:none"></div>
        <div class="set-row"><div class="set-lbl">${t("export_bridge")}
          <div class="set-sub">${t("export_bridge_sub")}</div></div>
          <button class="btn secondary small" id="btn-bridge">⬇︎</button></div>
        <div class="set-row"><div class="set-lbl">${t("mined_import")}
          <div class="set-sub">${t("mined_import_sub")}</div></div>
          <button class="btn secondary small" id="btn-mined">⬆︎</button>
          <input type="file" id="mined-file-set" accept=".json,application/json" style="display:none"></div>
        <div class="set-row"><div class="set-lbl" style="color:var(--red)">${t("reset_progress")}</div>
          <button class="btn secondary small" id="btn-reset" style="color:var(--red)">🗑</button></div>
      </div>
      <p class="muted center">KakiKana v${window.APP_VERSION} · ${t("offline_ready")} ✓</p>`;

    document.getElementById("set-lang").onchange = e => { Engine.state.lang = e.target.value; Engine.save(); App.applyLang(); render(); };
    document.getElementById("set-active").onchange = e => { st.activeKanji = +e.target.value; Engine.save(); Engine.refillActiveKanji(); };
    document.getElementById("set-reps").onchange = e => { st.masteryReps = +e.target.value; Engine.save(); };
    document.getElementById("set-days").onchange = e => { st.minDays = +e.target.value; Engine.save(); };
    document.getElementById("set-strict").onchange = e => { st.strict = e.target.value; Engine.save(); };
    document.getElementById("set-slow").onchange = e => { st.ttsSlow = e.target.checked; Engine.save(); };
    document.getElementById("set-voice").onchange = e => { st.voiceOn = e.target.checked; Engine.save(); };
    document.getElementById("set-sfx").onchange = e => {
      st.sfx = e.target.checked; Engine.save();
      document.getElementById("set-sfx-vol").disabled = !e.target.checked;
      if (e.target.checked) sfx("good");
    };
    const vol = document.getElementById("set-sfx-vol");
    let volTimer = null;
    vol.oninput = e => {
      st.sfxVolume = +e.target.value;
      document.getElementById("sfx-vol-val").textContent = st.sfxVolume;
      Engine.save();
      clearTimeout(volTimer);
      volTimer = setTimeout(() => sfx("sample"), 180);   // preview once the slider settles
    };
    document.getElementById("tts-test").onclick = () => Voice.speak("こんにちは。日本語を勉強しましょう。");

    const dl = document.getElementById("whisper-dl");
    if (dl) dl.onclick = async () => {
      dl.disabled = true;
      const status = document.getElementById("whisper-status");
      try {
        await Voice.loadWhisper((p, file) => { status.textContent = t("whisper_dling").replace("{p}", p); });
        st.whisper = true; Engine.save(); render();
      } catch (e) {
        status.textContent = "Erreur : " + (e.message || e);
        dl.disabled = false;
      }
    };

    // ---- relay ----
    const rUrl = document.getElementById("relay-url");
    const rStat = document.getElementById("relay-status");
    const refreshLine = () => { if (rStat) rStat.textContent = relayLine(); };
    document.getElementById("relay-save").onclick = () => {
      const r = Sync.setUrl(rUrl.value);
      if (!r.ok) { alert(t(r.why)); return; }
      sfx("tap");
      rUrl.value = r.url;
      refreshLine();
      if (r.url) Sync.syncNow().then(refreshLine);
    };
    document.getElementById("relay-now").onclick = async () => {
      if (!Sync.configured()) { alert(t("relay_none")); return; }
      const btn = document.getElementById("relay-now");
      btn.disabled = true; rStat.textContent = t("relay_working");
      const res = await Sync.syncNow();
      btn.disabled = false;
      refreshLine();
      if (res.err) alert(t("relay_failed") + "\n" + res.err);
      else if (res.mined) App.go("library");
    };
    document.getElementById("relay-auto").onchange = e => { Sync.setAuto(e.target.checked); refreshLine(); };

    document.getElementById("btn-export").onclick = () => {
      const blob = new Blob([Engine.exportState()], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "kakikana-progression-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    };
    // the same file Kakibun picks up from localStorage, for moving it by hand
    // between browsers or devices
    document.getElementById("btn-bridge").onclick = () => {
      const blob = new Blob([Engine.exportForBridge()], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "kakikana-export.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    };
    document.getElementById("btn-import").onclick = () => document.getElementById("import-file").click();
    document.getElementById("import-file").onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try { Engine.importState(r.result); App.applyLang(); App.go("home"); }
        catch (err) { alert("Fichier invalide / invalid file"); }
      };
      r.readAsText(f);
    };
    // KakiBridge's mined-word export → the "Jeux" tab in the library
    document.getElementById("btn-mined").onclick = () => document.getElementById("mined-file-set").click();
    document.getElementById("mined-file-set").onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const res = Mined.importText(r.result);
          alert(t("mined_imported").replace("{k}", res.kanji).replace("{w}", res.words)
            .replace("{g}", res.games.length ? res.games.join(", ") : "—"));
          App.go("library");
        } catch (err) { alert(t("mined_bad_file")); }
      };
      r.readAsText(f);
    };
    document.getElementById("btn-reset").onclick = () => {
      if (confirm(t("reset_confirm"))) { Engine.resetAll(); App.applyLang(); App.go("home"); }
    };
  }

  window.Settings = { render };
})();
