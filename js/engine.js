// ===== Progress / SRS engine =====
(function () {
  const LS_KEY = "kakikana_state_v1";
  const DAY = 86400000;
  const BOX_DAYS = [0, 1, 2, 4, 8, 16, 32];

  const DEFAULTS = {
    ver: 1,
    lang: "fr",
    onboarded: false,
    settings: { activeKanji: 3, masteryReps: 5, minDays: 3, strict: "normal", voiceOn: true, ttsSlow: false, whisper: false, sfx: true, sfxVolume: 50 },
    chars: {},        // per-char progress
    kanjiActive: [],  // kanji currently in practice
    kanjiWanted: [],  // kanji the user asked to learn next (jump the queue)
    kanjiOrder: [],   // chars in the order they entered practice/known
    exams: [],
    streak: { last: null, count: 0 }
  };

  let S = load();

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        s.settings = Object.assign({}, DEFAULTS.settings, s.settings || {});
        return Object.assign({}, DEFAULTS, s);
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {} }

  // ---- character lists ----
  const KANJI = window.KANJI_PARTS.slice().sort((a, b) => a.d - b.d);
  const KANJI_MAP = {}; KANJI.forEach(k => KANJI_MAP[k.k] = k);

  function kanaList(sy, includeDakuten) {
    const src = window.KANA[sy];
    let out = [];
    src.base.forEach(r => out = out.concat(r.kana));
    if (includeDakuten) src.dakuten.forEach(r => out = out.concat(r.kana));
    return out;
  }
  const HIRA_BASE = kanaList("hiragana", false);
  const HIRA_ALL = kanaList("hiragana", true);
  const KATA_BASE = kanaList("katakana", false);
  const KATA_ALL = kanaList("katakana", true);
  const KANA_MAP = {};
  HIRA_ALL.concat(KATA_ALL).forEach(k => KANA_MAP[k.k] = k);
  window.KANA.hiragana.small.concat(window.KANA.katakana.small).forEach(k => KANA_MAP[k.k] = k);

  function charType(ch) {
    if (KANJI_MAP[ch]) return "kanji";
    const c = ch.codePointAt(0);
    if (c >= 0x3040 && c <= 0x309f) return "hiragana";
    return "katakana";
  }

  // ---- per-char progress ----
  function P(ch) {
    if (!S.chars[ch]) {
      S.chars[ch] = { enc: 0, stage: 0, box: 0, due: 0, succ: 0, fail: 0, unaided: 0, days: [], mastered: false, known: false, learnedAt: null, lastSeen: 0 };
    }
    return S.chars[ch];
  }
  function status(ch) {
    const p = S.chars[ch];
    if (!p || p.enc === 0 && !p.known && !p.mastered) return "new";
    if (p.mastered || p.known) return "mastered";
    if (p.box >= 3) return "known";
    return "learning";
  }

  function today() { return new Date().toISOString().slice(0, 10); }

  // Record a drawing result. unaidedOk = clean completion with no help visible.
  function recordDraw(ch, ok, unaidedOk) {
    const p = P(ch);
    p.enc++; p.lastSeen = Date.now();
    if (p.learnedAt === null) p.learnedAt = Date.now();
    if (ok) {
      p.succ++;
      p.stage = Math.min(p.stage + 1, 5);
      p.box = Math.min(p.box + 1, BOX_DAYS.length - 1);
      if (unaidedOk) {
        p.unaided++;
        const d = today();
        if (!p.days.includes(d)) p.days.push(d);
        checkMastery(ch);
      }
    } else {
      p.fail++;
      p.stage = Math.max(p.stage - 1, 0);
      p.box = Math.max(p.box - 1, 0);
    }
    p.due = Date.now() + BOX_DAYS[p.box] * DAY;
    save();
  }

  function recordVoice(ch, ok) {
    const p = P(ch);
    p.lastSeen = Date.now();
    if (ok && p.box < BOX_DAYS.length - 1) { p.box++; p.due = Date.now() + BOX_DAYS[p.box] * DAY; }
    save();
  }

  function checkMastery(ch) {
    const p = P(ch);
    const st = S.settings;
    if (!p.mastered && p.unaided >= st.masteryReps && p.days.length >= st.minDays) {
      p.mastered = true;
      if (charType(ch) === "kanji") {
        S.kanjiActive = S.kanjiActive.filter(c => c !== ch);
        refillActiveKanji();
      }
    }
  }

  function markKnown(ch, val) {
    const p = P(ch);
    p.known = val;
    if (val) {
      p.mastered = true; p.stage = 5; p.box = BOX_DAYS.length - 1;
      p.due = Date.now() + BOX_DAYS[p.box] * DAY;
      if (p.learnedAt === null) p.learnedAt = Date.now();
      if (!S.kanjiOrder.includes(ch)) S.kanjiOrder.push(ch);
      S.kanjiActive = S.kanjiActive.filter(c => c !== ch);
      if (charType(ch) === "kanji") refillActiveKanji();
    } else {
      p.mastered = false; p.known = false; p.stage = 0; p.box = 0; p.unaided = 0; p.days = [];
    }
    save();
  }

  // ---- guided path / unlocks ----
  function countAtLeast(list, minBox) {
    return list.filter(k => { const p = S.chars[k.k]; return p && (p.box >= minBox || p.mastered || p.known); }).length;
  }
  // v1.1: all tracks are freely available — no unlock requirements.
  function katakanaUnlocked() { return true; }
  function kanjiUnlocked() { return true; }

  function isDone(ch) { const p = S.chars[ch]; return !!(p && (p.mastered || p.known)); }

  // Kanji the user asked for come first, in the order they asked, then the
  // standard frequency order.
  function learnQueue() {
    const q = S.kanjiWanted.filter(c => KANJI_MAP[c] && !isDone(c));
    for (const k of KANJI) if (!isDone(k.k) && q.indexOf(k.k) < 0) q.push(k.k);
    return q;
  }

  function refillActiveKanji(reprioritize) {
    const max = S.settings.activeKanji;
    if (reprioritize) {
      // make room for newly requested kanji by dropping ones not started yet
      const pending = S.kanjiWanted.filter(c => !isDone(c) && S.kanjiActive.indexOf(c) < 0).length;
      if (pending) {
        for (const c of S.kanjiActive.slice()) {
          if (S.kanjiActive.length + pending <= max) break;
          const p = S.chars[c];
          if (S.kanjiWanted.indexOf(c) < 0 && (!p || p.enc === 0)) {
            S.kanjiActive = S.kanjiActive.filter(x => x !== c);
          }
        }
      }
    }
    for (const ch of learnQueue()) {
      if (S.kanjiActive.length >= max) break;
      if (S.kanjiActive.indexOf(ch) < 0) {
        S.kanjiActive.push(ch);
        if (S.kanjiOrder.indexOf(ch) < 0) S.kanjiOrder.push(ch);
      }
    }
    save();
  }

  // "I want to learn this one next" — priority, not a claim of knowing it.
  function wantKanji(ch, val) {
    S.kanjiWanted = S.kanjiWanted.filter(c => c !== ch);
    if (val) {
      S.kanjiWanted.push(ch);
    } else {
      // never started yet → step back out of the active list, keep progress otherwise
      const p = S.chars[ch];
      if (!p || p.enc === 0) S.kanjiActive = S.kanjiActive.filter(c => c !== ch);
    }
    refillActiveKanji(true);
    save();
  }
  function isWanted(ch) { return S.kanjiWanted.indexOf(ch) >= 0; }

  // next new kana to introduce in a syllabary (path = base then dakuten)
  function nextNewKana(sy, n) {
    const list = sy === "hiragana" ? HIRA_ALL : KATA_ALL;
    const out = [];
    for (const k of list) {
      if (!window.STROKES[k.k]) continue;
      const p = S.chars[k.k];
      if (!p || (p.enc === 0 && !p.known)) { out.push(k.k); if (out.length >= n) break; }
    }
    return out;
  }

  function dueChars(pool) {
    const now = Date.now();
    return pool.filter(ch => {
      const p = S.chars[ch];
      return p && p.enc > 0 && !p.mastered && !p.known && p.due <= now;
    });
  }
  function dueMastered(pool, n) {
    const now = Date.now();
    const m = pool.filter(ch => { const p = S.chars[ch]; return p && (p.mastered || p.known) && p.due <= now; });
    m.sort((a, b) => S.chars[a].due - S.chars[b].due);
    return m.slice(0, n);
  }

  // ---- session builder ----
  // suggested focus for the mixed session: hiragana first, then katakana, then kanji
  function currentTrack() {
    if (nextNewKana("hiragana", 1).length && countAtLeast(HIRA_BASE, 2) < 28) return "hiragana";
    if (nextNewKana("katakana", 1).length) return "katakana";
    return "kanji";
  }

  // track: "hiragana" | "katakana" | "kanji" | undefined (mixed)
  function buildSession(track) {
    const items = [];
    const hira = HIRA_ALL.map(k => k.k).filter(c => window.STROKES[c]);
    const kata = KATA_ALL.map(k => k.k).filter(c => window.STROKES[c]);
    const allKanji = KANJI.map(k => k.k);
    const pool =
      track === "hiragana" ? hira :
      track === "katakana" ? kata :
      track === "kanji" ? allKanji :
      hira.concat(kata, allKanji);

    // 1) due reviews from the chosen pool
    let due = dueChars(pool);
    due.sort((a, b) => (S.chars[a].due - S.chars[b].due));
    due.slice(0, 7).forEach(ch => items.push({ type: "draw", ch, tag: "review" }));

    // 2) active kanji practice (kanji or mixed session)
    if (!track || track === "kanji") {
      refillActiveKanji();
      S.kanjiActive.forEach(ch => {
        if (!items.find(i => i.ch === ch)) items.push({ type: "draw", ch, tag: P(ch).enc === 0 ? "new" : "review" });
      });
    }

    // 3) new character intros
    if (track === "hiragana" || track === "katakana") {
      const room = Math.max(0, 10 - items.length);
      nextNewKana(track, Math.min(3, Math.max(1, room)))
        .forEach(ch => items.push({ type: "draw", ch, tag: "new" }));
    } else if (!track) {
      // mixed: follow the suggested focus, interleaving syllabaries so neither stalls
      const focus = currentTrack();
      if (focus !== "kanji") {
        const room = Math.max(0, 10 - items.length);
        const n = Math.min(3, Math.max(1, room));
        const other = focus === "hiragana" ? "katakana" : "hiragana";
        let picks = nextNewKana(focus, Math.max(1, n - 1));
        if (picks.length < n) {
          nextNewKana(other, n - picks.length).forEach(c => { if (!picks.includes(c)) picks.push(c); });
        }
        picks.forEach(ch => items.push({ type: "draw", ch, tag: "new" }));
      } else {
        const leftovers = nextNewKana("hiragana", 1).concat(nextNewKana("katakana", 1));
        leftovers.slice(0, 1).forEach(ch => items.push({ type: "draw", ch, tag: "new" }));
      }
    }

    // 4) mastered consolidation (1-2) from the chosen pool
    dueMastered(pool, 2).forEach(ch => {
      if (!items.find(i => i.ch === ch)) items.push({ type: "draw", ch, tag: "mastered" });
    });

    // 5) voice items on well-known chars
    if (S.settings.voiceOn && window.Voice && window.Voice.anyEngineMaybe()) {
      const cands = items
        .filter(i => i.type === "draw" && charType(i.ch) !== "kanji" && P(i.ch).stage >= 2)
        .map(i => i.ch);
      shuffle(cands).slice(0, 2).forEach(ch => items.push({ type: "voice", ch }));
    }

    // cap ~14, keep at least something
    let list = items.slice(0, 14);
    if (!list.length) {
      // nothing due: consolidate random learned chars from the pool
      const learned = pool.filter(ch => S.chars[ch] && S.chars[ch].enc > 0);
      shuffle(learned).slice(0, 8).forEach(ch => list.push({ type: "draw", ch, tag: "review" }));
      if (!list.length && track !== "kanji") {
        nextNewKana(track || "hiragana", 3).forEach(ch => list.push({ type: "draw", ch, tag: "new" }));
      }
    }
    // interleave: new items spread out
    return interleave(list);
  }

  function interleave(items) {
    const news = items.filter(i => i.tag === "new");
    const rest = items.filter(i => i.tag !== "new");
    const out = [];
    let ni = 0, ri = 0;
    const gap = Math.max(1, Math.floor(rest.length / (news.length + 1)));
    while (ri < rest.length || ni < news.length) {
      for (let g = 0; g < gap && ri < rest.length; g++) out.push(rest[ri++]);
      if (ni < news.length) out.push(news[ni++]);
    }
    // each new char: add one extra rep at the end of the session
    news.forEach(n => out.push({ type: "draw", ch: n.ch, tag: "reinforce" }));
    return out;
  }

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function bumpStreak() {
    const t = today();
    if (S.streak.last === t) return;
    const y = new Date(Date.now() - DAY).toISOString().slice(0, 10);
    S.streak.count = (S.streak.last === y) ? S.streak.count + 1 : 1;
    S.streak.last = t;
    save();
  }

  // ---- stats ----
  function trackStats(which) {
    let list;
    if (which === "hiragana") list = HIRA_ALL; else if (which === "katakana") list = KATA_ALL; else list = KANJI;
    const total = list.length;
    let seen = 0, mastered = 0, known = 0;
    list.forEach(k => {
      const p = S.chars[k.k];
      if (p && (p.enc > 0 || p.known)) seen++;
      if (p && (p.mastered || p.known)) mastered++;
      if (p && (p.box >= 3 || p.mastered || p.known)) known++;
    });
    return { total, seen, mastered, known };
  }
  function masteredKanji() {
    return KANJI.filter(k => { const p = S.chars[k.k]; return p && (p.mastered || p.known); }).map(k => k.k);
  }
  function totalDue() {
    const all = HIRA_ALL.concat(KATA_ALL).map(k => k.k).concat(KANJI.map(k => k.k));
    return dueChars(all).length;
  }

  // ---- import / export ----
  function exportState() { return JSON.stringify(S, null, 1); }
  function importState(json) {
    const s = JSON.parse(json);
    if (!s || typeof s !== "object" || !s.chars) throw new Error("bad file");
    s.settings = Object.assign({}, DEFAULTS.settings, s.settings || {});
    S = Object.assign({}, DEFAULTS, s);
    save();
  }
  function resetAll() { S = JSON.parse(JSON.stringify(DEFAULTS)); save(); }

  window.Engine = {
    get state() { return S; },
    save, P, status, charType,
    KANJI, KANJI_MAP, KANA_MAP, HIRA_BASE, HIRA_ALL, KATA_BASE, KATA_ALL,
    recordDraw, recordVoice, markKnown, wantKanji, isWanted, learnQueue,
    katakanaUnlocked, kanjiUnlocked, refillActiveKanji, currentTrack,
    buildSession, trackStats, masteredKanji, totalDue, bumpStreak,
    exportState, importState, resetAll
  };
})();
