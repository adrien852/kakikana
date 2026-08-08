// ===== Progress / SRS engine =====
(function () {
  const LS_KEY = "kakikana_state_v1";
  const DAY = 86400000;
  const BOX_DAYS = [0, 1, 2, 4, 8, 16, 32];
  const MAX_ITEMS = 18;        // exercises per session
  const MIN_ITEMS = 11;        // …and a session should not feel thin either
  const MAX_IN_FLIGHT = 8;     // characters allowed to be "still shaky" at once

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

  // Speech recognition needs something to work with: one or two morae ("め",
  // "とお") come back as anything at all. Pronunciation exercises therefore only
  // ever use a word of at least three morae, and always the longest one available.
  const MIN_VOICE_MORAE = 3;
  function morae(s) {
    return [...(s || "")].filter(c => "ゃゅょぁぃぅぇぉャュョァィゥェォ".indexOf(c) < 0).length;
  }
  // min defaults to 2: the library lets you try any example word, sessions ask for 3+
  function kanaVoiceWord(ch, min) {
    const k = KANA_MAP[ch];
    if (!k || !k.ex || !k.ex.jp) return null;
    return morae(k.ex.jp) >= (min === undefined ? 2 : min) ? k.ex : null;
  }
  // the longest of a kanji's example words, or null when none is long enough
  function kanjiVoiceWord(k) {
    if (!k || !k.w || !k.w.length) return null;
    const best = k.w.slice().sort((a, b) => morae(b[1]) - morae(a[1]))[0];
    return best && morae(best[1]) >= MIN_VOICE_MORAE ? best : null;
  }

  // ---- dictation ----------------------------------------------------------
  // Kana that cannot be dictated safely: identical-sounding pairs and characters
  // with no sound of their own.
  const NO_DICT_KANA = "をヲじヂぢジずヅづズゃゅょっャュョッー";
  const DICT_MIN_STAGE = 3;          // audio-first only once the character is solid

  // Returns { r: text to speak, ro: romaji, script } or null when unsafe.
  function dictationInfo(ch) {
    const d = window.DICTATION && window.DICTATION[ch];
    if (d) return { r: d.r, ro: d.ro, script: "kanji" };
    const k = KANA_MAP[ch];
    if (!k || NO_DICT_KANA.indexOf(ch) >= 0) return null;
    if (!window.STROKES[ch]) return null;
    return { r: ch, ro: k.r, script: charType(ch) };
  }

  // An encounter arrives audio-first once the character is solid, alternating
  // with the visual prompt so both directions keep being practised.
  function dictationMode(ch) {
    const p = S.chars[ch];
    if (!p || p.stage < DICT_MIN_STAGE) return false;
    if (!window.Voice || !window.Voice.ttsMaybe()) return false;
    if (!dictationInfo(ch)) return false;
    return p.enc % 2 === 1;
  }

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

  // Pronunciation is practice, never assessment: recognition is too unreliable for
  // a miss — or a skip — to cost anything. Nothing here touches stage, box, due
  // dates or mastery; only a tally is kept.
  function recordVoice(ch, ok) {
    const p = P(ch);
    p.voiceTry = (p.voiceTry || 0) + 1;
    if (ok) p.voiceOk = (p.voiceOk || 0) + 1;
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
  // characters that are getting solid (stage ≥ 2) but are not due yet —
  // least recently seen first, so the whole learned set keeps rotating
  function warmChars(pool, n) {
    const now = Date.now();
    const w = pool.filter(ch => {
      const p = S.chars[ch];
      return p && p.enc > 0 && !p.mastered && !p.known && p.stage >= 2 && p.due > now;
    });
    shuffle(w).sort((a, b) => (S.chars[a].lastSeen || 0) - (S.chars[b].lastSeen || 0));
    return w.slice(0, n);
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
    // shuffled first, so characters that fall due together are not always taken
    // in library order
    let due = shuffle(dueChars(pool));
    due.sort((a, b) => (S.chars[a].due - S.chars[b].due));
    due.slice(0, 9).forEach(ch => items.push({ type: "draw", ch, tag: "review" }));

    // 2) active kanji practice (kanji or mixed session)
    if (!track || track === "kanji") {
      refillActiveKanji();
      S.kanjiActive.forEach(ch => {
        if (!items.find(i => i.ch === ch)) items.push({ type: "draw", ch, tag: P(ch).enc === 0 ? "new" : "review" });
      });
    }

    // 3) new character intros — but only while few characters are still shaky,
    // so a track is not "covered once" in a single sweep and then forgotten.
    const inFlight = (track === "hiragana" ? hira : track === "katakana" ? kata : hira.concat(kata))
      .filter(ch => { const p = S.chars[ch]; return p && p.enc > 0 && !p.mastered && !p.known && p.stage < 3; }).length;
    const roomForNew = inFlight < MAX_IN_FLIGHT;

    if (track === "hiragana" || track === "katakana") {
      const room = Math.max(0, 10 - items.length);
      const n = roomForNew ? Math.min(3, Math.max(1, room)) : 0;
      if (n) nextNewKana(track, n).forEach(ch => items.push({ type: "draw", ch, tag: "new" }));
    } else if (!track) {
      // mixed: follow the suggested focus, interleaving syllabaries so neither stalls
      const focus = currentTrack();
      if (focus !== "kanji" && roomForNew) {
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

    // 4b) come back to characters already at a higher stage, even if not due yet:
    // a track should keep circling back instead of being seen once and left.
    warmChars(pool, 3).forEach(ch => {
      if (!items.find(i => i.ch === ch)) items.push({ type: "draw", ch, tag: "review" });
    });

    // 5) voice items on well-known chars
    if (S.settings.voiceOn && window.Voice && window.Voice.anyEngineMaybe()) {
      const cands = items
        .filter(i => i.type === "draw" && charType(i.ch) !== "kanji" && P(i.ch).stage >= 2 &&
                     kanaVoiceWord(i.ch, MIN_VOICE_MORAE))
        .map(i => i.ch);
      shuffle(cands).slice(0, 2).forEach(ch => items.push({ type: "voice", ch }));
    }

    // cap the session length, keep at least something
    let list = items.slice(0, MAX_ITEMS);
    if (!list.length) {
      // nothing due: consolidate random learned chars from the pool
      const learned = pool.filter(ch => S.chars[ch] && S.chars[ch].enc > 0);
      shuffle(learned).slice(0, 8).forEach(ch => list.push({ type: "draw", ch, tag: "review" }));
      if (!list.length && track !== "kanji") {
        nextNewKana(track || "hiragana", 3).forEach(ch => list.push({ type: "draw", ch, tag: "new" }));
      }
    }
    // 6) top the session up with characters already learned, least recently seen
    // first — this is what keeps the whole set circulating instead of each
    // character being met once and left behind.
    if (list.length < MIN_ITEMS) {
      const have = {}; list.forEach(i => have[i.ch] = true);
      const extras = pool.filter(ch => {
        const p = S.chars[ch];
        return p && p.enc > 0 && !have[ch];
      });
      shuffle(extras).sort((a, b) => {
        const pa = S.chars[a], pb = S.chars[b];
        // prefer the least recently practised, then the least solid
        return (pa.lastSeen || 0) - (pb.lastSeen || 0) || pa.stage - pb.stage;
      });
      for (const ch of extras) {
        if (list.length >= MIN_ITEMS) break;
        list.push({ type: "draw", ch, tag: S.chars[ch].mastered || S.chars[ch].known ? "mastered" : "review" });
        have[ch] = true;
      }
    }

    // decide which encounters arrive as dictation (audio-first)
    list.forEach(it => { if (it.type === "draw" && it.tag !== "new" && dictationMode(it.ch)) it.mode = "dictation"; });
    return arrange(list);
  }

  // Deal the session out in a fresh order every time. Constraints kept:
  //  · a character never appears twice in a row
  //  · a newly introduced character is met again later in the same session
  //  · a pronunciation item comes after the character has been written
  function arrange(items) {
    const fresh = shuffle(items.filter(i => i.type === "draw" && i.tag === "new"));
    const rest = shuffle(items.filter(i => i.type === "draw" && i.tag !== "new" && i.tag !== "reinforce"));
    const voice = items.filter(i => i.type === "voice");
    const out = rest.slice();

    // a new character goes in the earlier part of the session, so there is always
    // room to meet it again afterwards
    fresh.forEach(n => {
      const limit = Math.max(1, Math.floor(out.length * 0.7));
      out.splice(Math.floor(Math.random() * (limit + 1)), 0, n);
    });

    // place an item somewhere after its character's first appearance, but never
    // right beside another encounter of the same character
    const insertAfter = (ch, item, gap) => {
      const first = out.findIndex(x => x.ch === ch);
      const from = Math.min(out.length, first < 0 ? 0 : first + gap);
      const spots = [];
      for (let p = from; p <= out.length; p++) {
        if (p > 0 && out[p - 1].ch === ch) continue;
        if (p < out.length && out[p].ch === ch) continue;
        spots.push(p);
      }
      const pos = spots.length ? spots[Math.floor(Math.random() * spots.length)] : out.length;
      out.splice(pos, 0, item);
    };

    // every newly introduced character is met a second time later in the session
    fresh.forEach(n => insertAfter(n.ch, { type: "draw", ch: n.ch, tag: "reinforce" }, 3));
    // and a pronunciation item only after that character has been written — if
    // that character sits right at the end, pull it forward to make room
    voice.forEach(v => {
      const at = out.findIndex(x => x.ch === v.ch);
      if (at >= 0 && at >= out.length - 2) {
        const item = out.splice(at, 1)[0];
        out.splice(Math.floor(Math.random() * Math.max(1, out.length - 2)), 0, item);
      }
      insertAfter(v.ch, v, 2);
    });
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
    dictationInfo, dictationMode, kanaVoiceWord, kanjiVoiceWord,
    katakanaUnlocked, kanjiUnlocked, refillActiveKanji, currentTrack,
    buildSession, trackStats, masteredKanji, totalDue, bumpStreak,
    exportState, importState, resetAll
  };
})();
