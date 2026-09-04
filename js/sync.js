// ===== The relay: progress out, mined words in =====
// Migrated from Kakibun, which no longer has any use for it — it never read the
// mined box, and the progress it pushed was a flat list of characters seen.
// KakiKana is the app that actually owns the mastered/known/learning split, so
// it is the right writer for the progress box, and the only reader for mined.
//
// Why a relay at all: this app is served over HTTPS and an HTTPS page cannot
// fetch http://192.168.1.x — mixed content, no flag changes it. Only localhost
// is exempt, and the PC is not the phone's localhost. Phone and PC need a
// meeting point that speaks HTTPS.
//
// Wire contract (base = https://…/s/<secret>, no trailing slash):
//   GET  <base>/progress → {"at":<ms>,"data":{…}}   404 = empty, NOT an error
//   POST <base>/progress   body {"data":{…}}  text/plain, to stay CORS-simple
//   GET  <base>/mined    → {"at":<ms>,"data":[…words…]}
//   GET  <base>/status   → {"progress":{at,bytes}|null,"mined":…}
(function () {
  const KEY = "kakikana.sync.v1";
  const PUSH_DEBOUNCE = 4000;
  const BOOT_DELAY = 1500;
  const PULL_MIN_GAP = 60000;      // don't re-poll mined on every tab focus

  let C = load();
  let pushTimer = null, lastPullAt = 0, busy = false;

  function load() {
    const d = { url: "", auto: true, lastPush: 0, lastPull: 0, lastErr: "",
                pushedHash: "", minedAt: 0 };
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(d, JSON.parse(raw) || {});
    } catch (e) {}
    return d;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(C)); } catch (e) {} }

  // ---------- the address ----------
  // https anywhere, or http on localhost. A LAN http:// address is refused with
  // the reason, because it would otherwise fail silently forever from the phone.
  function checkUrl(u) {
    u = String(u || "").trim().replace(/\/+$/, "");
    if (!u) return { ok: true, url: "" };
    let p;
    try { p = new URL(u); } catch (e) { return { ok: false, why: "sync_bad_url" }; }
    const local = ["localhost", "127.0.0.1", "[::1]", "::1"].indexOf(p.hostname) >= 0;
    if (p.protocol === "https:") return { ok: true, url: u };
    if (p.protocol === "http:" && local) return { ok: true, url: u };
    if (p.protocol === "http:") return { ok: false, why: "sync_bad_lan" };
    return { ok: false, why: "sync_bad_url" };
  }
  function setUrl(u) {
    const r = checkUrl(u);
    if (!r.ok) return r;
    C.url = r.url; C.pushedHash = ""; C.minedAt = 0; C.lastErr = "";
    save();
    return r;
  }
  function setAuto(v) { C.auto = !!v; save(); }
  function configured() { return !!C.url; }
  function auto() { return !!C.url && C.auto !== false; }

  // ---------- what we send ----------
  // Engine stamps a fresh `date` on every build, so hashing the whole payload
  // would make every save look new and re-upload on every trigger. Hash the
  // content only. (Kakibun learned this one the hard way.)
  function payload() {
    try { return JSON.parse(Engine.exportForBridge()); } catch (e) { return null; }
  }
  function contentHash(p) {
    if (!p) return "";
    const body = JSON.stringify([p.kanji, p.hiragana, p.katakana]);
    let h = 0;
    for (let i = 0; i < body.length; i++) { h = (h * 31 + body.charCodeAt(i)) | 0; }
    return body.length + ":" + h;
  }

  // ---------- transport ----------
  function url(box) { return C.url.replace(/\/+$/, "") + "/" + box; }

  async function get(box) {
    const res = await fetch(url(box), { method: "GET", cache: "no-store" });
    if (res.status === 404) return null;             // empty box, not a failure
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  }
  async function post(box, data) {
    const res = await fetch(url(box), {
      method: "POST",
      // text/plain keeps the request CORS-simple, so browsers skip the preflight
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({ data })
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return true;
  }

  // ---------- push ----------
  async function push(force) {
    if (!configured() || busy) return false;
    const p = payload();
    if (!p) return false;
    const h = contentHash(p);
    if (!force && h === C.pushedHash) return false;   // nothing changed
    busy = true;
    try {
      await post("progress", p);
      // only on success — a failed push must stay dirty so it retries
      C.pushedHash = h; C.lastPush = Date.now(); C.lastErr = "";
      save();
      return true;
    } catch (e) {
      C.lastErr = String(e && e.message || e);
      save();
      return false;
    } finally { busy = false; }
  }

  function pushSoon() {
    if (!auto()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => push(false), PUSH_DEBOUNCE);
  }

  // A fetch in flight dies with the page when a phone kills the app, so the
  // last word goes out through sendBeacon instead.
  function beacon() {
    if (!auto() || !navigator.sendBeacon) return;
    const p = payload();
    if (!p || contentHash(p) === C.pushedHash) return;
    try {
      const blob = new Blob([JSON.stringify({ data: p })], { type: "text/plain;charset=UTF-8" });
      navigator.sendBeacon(url("progress"), blob);
    } catch (e) {}
  }

  // ---------- pull ----------
  // `force` (the Synchroniser button) bypasses the polling interval, not the
  // freshness check: an unchanged box is still worth skipping, since ingesting
  // it would only overwrite the same records with themselves. If the local copy
  // has gone, though, an unchanged box is exactly what we want back.
  async function pullMined(force) {
    if (!configured() || busy) return 0;
    if (!force && Date.now() - lastPullAt < PULL_MIN_GAP) return 0;
    lastPullAt = Date.now();
    busy = true;
    try {
      const box = await get("mined");
      C.lastPull = Date.now(); C.lastErr = "";
      if (!box) { save(); return 0; }                        // 404: nothing yet
      const at = +box.at || 0;
      const haveIt = window.Mined && Mined.hasRelay();
      if (at && at === C.minedAt && haveIt) { save(); return 0; }   // unchanged
      const n = window.Mined ? Mined.ingestRelay(box.data, at) : 0;
      C.minedAt = at;
      save();
      return n;
    } catch (e) {
      C.lastErr = String(e && e.message || e);
      save();
      return 0;
    } finally { busy = false; }
  }

  // both directions, for the button
  async function syncNow() {
    const ok = await push(true);
    const n = await pullMined(true);
    return { pushed: ok, mined: n, err: C.lastErr };
  }

  // ---------- triggers ----------
  // Listeners are registered unconditionally and every handler re-checks auto(),
  // so typing the address in never needs a restart.
  let started = false;
  function start() {
    if (started) return;
    started = true;
    setTimeout(() => { if (auto()) { push(false); pullMined(true); } }, BOOT_DELAY);
    window.addEventListener("pagehide", beacon);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && auto()) { pullMined(false); push(false); }
    });
    window.addEventListener("focus", () => { if (auto()) pullMined(false); });
  }

  function status() {
    return { url: C.url, auto: C.auto !== false, lastPush: C.lastPush,
             lastPull: C.lastPull, lastErr: C.lastErr, minedAt: C.minedAt };
  }

  window.Sync = { start, push, pushSoon, pullMined, syncNow, beacon,
                  setUrl, setAuto, checkUrl, configured, auto, status };
})();
