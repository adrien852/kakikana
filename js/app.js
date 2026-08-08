// ===== App shell: navigation, i18n, home =====
(function () {
  window.APP_VERSION = "1.8.0";

  function t(key) {
    const lang = Engine.state.lang || "fr";
    return (window.I18N[lang] && window.I18N[lang][key]) || window.I18N.fr[key] || key;
  }

  function applyLang() {
    document.querySelectorAll("[data-i18n]").forEach(el => el.textContent = t(el.dataset.i18n));
    document.documentElement.lang = Engine.state.lang || "fr";
  }

  // ---------- modal ----------
  function modal(html, onClose) {
    const root = document.getElementById("modal-root");
    root.innerHTML = `<div class="modal-back"><div class="modal"><div class="grab"></div>${html}</div></div>`;
    const back = root.querySelector(".modal-back");
    back.onclick = e => { if (e.target === back) closeModal(onClose); };
    root._onClose = onClose;
  }
  function closeModal(cb) {
    if (window.Voice) Voice.cancel();
    const root = document.getElementById("modal-root");
    const f = cb || root._onClose;
    root.innerHTML = ""; root._onClose = null;
    if (f) f();
  }

  // ---------- home ----------
  function renderHome() {
    const v = document.getElementById("view");
    const hs = Engine.trackStats("hiragana");
    const ks = Engine.trackStats("katakana");
    const js = Engine.trackStats("kanji");
    const due = Engine.totalDue();
    const streak = Engine.state.streak.count;
    const active = Engine.state.kanjiActive;

    function trackCard(track, cls, ico, title, stats) {
      const pct = Math.round(100 * (stats.known || 0) / stats.total);
      return `<div class="card track-start" data-track="${track}" style="cursor:pointer">
        <div class="track-row">
          <div class="track-badge ${cls}">${ico}</div>
          <div class="track-info">
            <div class="track-title">${title}</div>
            <div class="track-sub">${stats.seen}/${stats.total} ${t("stats_seen")} · ${stats.mastered} ${t("stats_mastered")}</div>
            <div class="pbar"><div style="width:${pct}%"></div></div>
          </div>
          <div style="color:var(--ink-soft);font-size:20px">▶</div>
        </div>
      </div>`;
    }

    v.innerHTML = `
      <h1>${t("appName")} <span style="font-size:14px;font-weight:400" class="muted">${streak > 1 ? "🔥 " + streak + " " + t("streak") : ""}</span></h1>
      <div class="card" style="background:linear-gradient(135deg,#b7392b,#8f2b20);color:#fff">
        <div style="font-size:15px;font-weight:600;margin-bottom:4px">${due > 0 ? due + " " + t("due_reviews") : t("no_due")}</div>
        ${active.length ? `<div style="font-size:26px;margin-bottom:10px" class="jp">${active.join("　")}</div>` : ""}
        <button class="btn" style="background:#fff;color:#b7392b" id="btn-session">▶ ${t("start_session")}</button>
      </div>
      <p class="muted" style="font-size:12.5px;margin:2px 2px 10px">${t("tap_track")}</p>
      ${trackCard("hiragana", "h", "あ", t("hiragana"), hs)}
      ${trackCard("katakana", "k", "ア", t("katakana"), ks)}
      ${trackCard("kanji", "j", "字", t("kanji"), js)}
      <p class="muted center" style="font-size:12.5px">${t("install_hint")}</p>`;
    document.getElementById("btn-session").onclick = () => { setTab(null); Session.start(); };
    v.querySelectorAll(".track-start").forEach(c =>
      c.onclick = () => { setTab(null); Session.start(c.dataset.track); });
  }

  // ---------- navigation ----------
  const tabs = { home: renderHome, library: () => Library.render(), exam: () => Exam.render(), settings: () => Settings.render() };
  function go(name) {
    // stop anything that might render itself over the new screen
    if (window.Voice) Voice.cancel();
    if (window.Session && Session.stop) Session.stop();
    if (window.Exam && Exam.stop) Exam.stop();
    closeModal();
    setTab(name);
    (tabs[name] || renderHome)();
  }
  function setTab(name) {
    document.querySelectorAll("#tabbar .tab").forEach(b =>
      b.classList.toggle("active", b.dataset.tab === name));
  }
  document.querySelectorAll("#tabbar .tab").forEach(b => b.onclick = () => { sfx("nav"); go(b.dataset.tab); });

  // ---------- onboarding ----------
  function onboard() {
    modal(`<h2 style="margin-top:0">${t("first_time_title")} 👋</h2>
      <p style="font-size:15px;line-height:1.5">${t("first_time_body")}</p>
      <button class="btn" id="ob-go">${t("lets_go")}</button>`);
    document.getElementById("ob-go").onclick = () => {
      Engine.state.onboarded = true; Engine.save();
      closeModal();
    };
  }

  // ---------- service worker ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  window.App = { t, applyLang, go, modal, closeModal };

  // boot
  applyLang();
  go("home");
  if (!Engine.state.onboarded) onboard();
})();
