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
    lastIntroDay: null,   // new characters are introduced once a day
    lastSessionDay: null, // …and the day's session is only owed once
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

  // ---- spoken readings ------------------------------------------------------
  // A kanji is pronounced with its own reading, never with one of its example
  // compounds: 一月 and 二つ sound nothing alike and teach the compound instead of
  // the character. data/readings.js holds the readings that are worth saying —
  // a word on its own, at least two syllables, in everyday use. Kanji with no
  // such reading simply have no pronunciation exercise.
  const VOICE_REPS = 3;              // successes before a reading stops being pushed

  function kanjiReadings(ch) {
    const r = window.READINGS && window.READINGS[ch];
    return r && r.length ? r : [];
  }
  // every spelling accepted for a reading — the exercise grades the sound, so
  // homophones written differently are correct too
  function readingAccepts(rd) {
    if (!rd) return [];
    return [rd.r, rd.k, rd.ro].concat(rd.alt || []).filter(Boolean);
  }
  // Which reading to ask for. Both readings of a kanji are used equally until each
  // has been said right a few times, then either may come up.
  function pickReading(ch, excludeR) {
    const all = kanjiReadings(ch).filter(r => r.r !== excludeR);
    if (!all.length) return null;
    if (all.length === 1) return all[0];
    const rd = (S.chars[ch] && S.chars[ch].rd) || {};
    const st = r => rd[r.r] || { t: 0, o: 0 };
    const open = all.filter(r => st(r).o < VOICE_REPS);
    const pool = open.length ? open : all;
    let low = pool[0];
    pool.forEach(r => {
      if (st(r).o < st(low).o || (st(r).o === st(low).o && st(r).t < st(low).t)) low = r;
    });
    const tied = pool.filter(r => st(r).o === st(low).o && st(r).t === st(low).t);
    return tied.length > 1 ? tied[Math.floor(Math.random() * tied.length)] : low;
  }
  const kata2hira = s => (s || "").replace(/[ァ-ヶ]/g,
    c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  // is this reading of this kanji the ON or the KUN one? (used to label dictation)
  function readingType(ch, r) {
    const k = KANJI_MAP[ch];
    if (!k || !r) return null;
    const clean = s => kata2hira(s).replace(/[()（）]/g, "");
    const inList = list => (list || []).some(x => clean(x[0]) === r);
    if (inList(k.on)) return "on";
    if (inList(k.kun)) return "kun";
    return null;
  }
  // the two readings offered as text-to-speech on the writing prompt
  function ttsReadings(ch) {
    const k = KANJI_MAP[ch];
    if (!k) return [];
    const out = [];
    const push = (list, type) => {
      if (!list || !list.length) return;
      const r = kata2hira(list[0][0]).replace(/[()（）]/g, "");
      const ro = (list[0][1] || "").replace(/[()（）]/g, "");
      if (r) out.push({ r, ro, t: type });
    };
    push(k.on, "on");
    push(k.kun, "kun");
    return out;
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
  // dates or mastery; only a tally is kept. The per-reading tally decides which of
  // a kanji's two readings comes up next, nothing more.
  function recordVoice(ch, ok, reading) {
    const p = P(ch);
    p.voiceTry = (p.voiceTry || 0) + 1;
    if (ok) p.voiceOk = (p.voiceOk || 0) + 1;
    if (reading) {
      if (!p.rd) p.rd = {};
      if (!p.rd[reading]) p.rd[reading] = { t: 0, o: 0 };
      p.rd[reading].t++;
      if (ok) p.rd[reading].o++;
    }
    save();
  }

  // ---- how far a character is from being mastered -------------------------
  // Mastery has two conditions and both must be met: enough unaided successes,
  // spread over enough distinct days. Reporting one number would hide the fact
  // that the second one cannot be rushed — a day only ever counts once.
  function masteryProgress(ch) {
    const p = S.chars[ch];
    const st = S.settings;
    const reps = p ? (p.unaided || 0) : 0;
    const days = p ? (p.days || []).length : 0;
    const repsNeed = st.masteryReps, daysNeed = st.minDays;
    return {
      reps, repsNeed, days, daysNeed,
      started: !!(p && p.enc > 0),
      done: !!(p && (p.mastered || p.known)),
      // both conditions have to land, so overall progress is the weaker of the two
      pct: Math.round(100 * Math.min(1, Math.min(reps / repsNeed, days / daysNeed))),
      // a day is only credited by an unaided success, and only once
      creditedToday: !!(p && (p.days || []).includes(today()))
    };
  }

  // ---- the day's ceiling --------------------------------------------------
  // Since a character can earn at most one day of credit per calendar day,
  // practising everything currently being learned once is the most progress the
  // day can hold. This reports how much of that ceiling is left.
  function studying(pool) {
    return pool.filter(ch => {
      const p = S.chars[ch];
      return p && p.enc > 0 && !p.mastered && !p.known;
    });
  }
  function dailyProgress(which) {
    let list;
    if (which === "hiragana") list = HIRA_ALL.map(k => k.k);
    else if (which === "katakana") list = KATA_ALL.map(k => k.k);
    else if (which === "kanji") list = KANJI.map(k => k.k);
    else list = HIRA_ALL.concat(KATA_ALL).map(k => k.k).concat(KANJI.map(k => k.k));
    const inProgress = studying(list);
    const d = today();
    const seen = inProgress.filter(ch => {
      const p = S.chars[ch];
      return p.lastSeen && new Date(p.lastSeen).toISOString().slice(0, 10) === d;
    });
    return { studying: inProgress.length, seenToday: seen.length,
             left: inProgress.length - seen.length };
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

  // A session is a fixed daily portion, not "everything that happens to qualify":
  //   · every kanji currently being learned, exactly once
  //   · a fixed handful of kana (due reviews first, then new ones)
  //   · a fixed handful of consolidations
  // Whatever does not fit rolls over to the next day, which is what spaced
  // repetition expects anyway.
  const KANA_SLOTS = 5;              // in the mixed daily session
  const KANA_SLOTS_FOCUSED = 8;      // when practising one syllabary on its own
  const CONSOLIDATION_SLOTS = 3;
  const CONSOLIDATION_SLOTS_KANJI = 4;

  // New characters are introduced once a day: extra sessions are practice, not
  // a way to race ahead through the syllabary.
  function introductionsAllowed() { return S.lastIntroDay !== today(); }

  // track: "hiragana" | "katakana" | "kanji" | undefined (mixed)
  function buildSession(track) {
    const items = [];
    const seen = {};
    const add = (ch, tag) => {
      if (seen[ch]) return false;
      seen[ch] = true;
      items.push({ type: "draw", ch, tag });
      return true;
    };

    const hira = HIRA_ALL.map(k => k.k).filter(c => window.STROKES[c]);
    const kata = KATA_ALL.map(k => k.k).filter(c => window.STROKES[c]);
    const allKanji = KANJI.map(k => k.k);
    const kanaPool =
      track === "hiragana" ? hira :
      track === "katakana" ? kata :
      track === "kanji" ? [] : hira.concat(kata);
    const pool = track === "kanji" ? allKanji : kanaPool.concat(track ? [] : allKanji);

    // ---- 1. the kanji being learned: exactly one encounter each ----
    let kanjiSlots = 0;
    if (!track || track === "kanji") {
      refillActiveKanji();
      S.kanjiActive.forEach(ch => { if (add(ch, P(ch).enc === 0 ? "new" : "review")) kanjiSlots++; });
    }

    // ---- 2. kana: due reviews first, then new characters, then a revisit ----
    const kanaSlots = track === "kanji" ? 0 : (track ? KANA_SLOTS_FOCUSED : KANA_SLOTS);
    if (kanaSlots) {
      const dueKana = shuffle(dueChars(kanaPool)).sort((a, b) => S.chars[a].due - S.chars[b].due);
      dueKana.forEach(ch => { if (countTag(items, "kana") < kanaSlots) add(ch, "review"); });

      // introductions: only while few characters are still shaky, once a day
      const inFlight = kanaPool.filter(ch => {
        const p = S.chars[ch];
        return p && p.enc > 0 && !p.mastered && !p.known && p.stage < 3;
      }).length;
      if (inFlight < MAX_IN_FLIGHT && introductionsAllowed()) {
        // a new character costs two slots: it is introduced, then met again
        while (countTag(items, "kana") + 1 < kanaSlots) {
          const from = track || (currentTrack() === "katakana" ? "katakana" : "hiragana");
          const next = nextNewKana(from, 1).concat(nextNewKana(from === "hiragana" ? "katakana" : "hiragana", 1));
          const pick = next.find(c => !seen[c]);
          if (!pick || !add(pick, "new")) break;
        }
      }
      // still room: circle back to kana already learned, least recently practised
      warmChars(kanaPool, kanaSlots).forEach(ch => { if (countTag(items, "kana") < kanaSlots) add(ch, "review"); });
    }

    // ---- 3. consolidation: due elsewhere, then mastered, then least recent ----
    const CONSOLIDATION = track === "kanji" ? CONSOLIDATION_SLOTS_KANJI : CONSOLIDATION_SLOTS;
    const before = items.length;
    const slots = () => items.length - before;
    shuffle(dueChars(pool)).sort((a, b) => S.chars[a].due - S.chars[b].due)
      .forEach(ch => { if (slots() < CONSOLIDATION) add(ch, "review"); });
    dueMastered(pool, CONSOLIDATION)
      .forEach(ch => { if (slots() < CONSOLIDATION) add(ch, "mastered"); });
    warmChars(pool, CONSOLIDATION)
      .forEach(ch => { if (slots() < CONSOLIDATION) add(ch, "review"); });
    if (slots() < CONSOLIDATION) {
      const learned = shuffle(pool.filter(ch => S.chars[ch] && S.chars[ch].enc > 0));
      learned.forEach(ch => {
        if (slots() < CONSOLIDATION) add(ch, S.chars[ch].mastered || S.chars[ch].known ? "mastered" : "review");
      });
    }

    // a brand-new learner with nothing at all yet
    if (!items.length && track !== "kanji") {
      nextNewKana(track || "hiragana", 3).forEach(ch => add(ch, "new"));
    }

    // ---- 4. one pronunciation item, on a kana word that is worth attempting ----
    if (S.settings.voiceOn && window.Voice && window.Voice.anyEngineMaybe()) {
      const cands = items
        .filter(i => i.type === "draw" && charType(i.ch) !== "kanji" && P(i.ch).stage >= 2 &&
                     kanaVoiceWord(i.ch, MIN_VOICE_MORAE))
        .map(i => i.ch);
      shuffle(cands).slice(0, 1).forEach(ch => items.push({ type: "voice", ch }));
    }

    // decide which encounters arrive as dictation (audio-first)
    items.forEach(it => {
      if (it.type === "draw" && it.tag !== "new" && dictationMode(it.ch)) it.mode = "dictation";
    });
    return arrange(items);
  }

  // how many kana items the session holds so far (new characters count double,
  // because each is met again later in the same session)
  function countTag(items, kind) {
    let n = 0;
    items.forEach(i => {
      if (i.type !== "draw" || charType(i.ch) === "kanji") return;
      n += i.tag === "new" ? 2 : 1;
    });
    return n;
  }

  // the first session of the day is the one that introduces new characters;
  // any further session that day is practice on what is already started
  function noteSessionStarted() {
    if (S.lastIntroDay !== today()) { S.lastIntroDay = today(); save(); }
  }

  // The day's portion has been done. Whatever is still "due" rolls over to
  // tomorrow, which is how spaced repetition is meant to work — so the home
  // screen stops asking for more today instead of showing a backlog.
  function noteSessionDone() {
    if (S.lastSessionDay !== today()) { S.lastSessionDay = today(); save(); }
  }
  function sessionDoneToday() { return S.lastSessionDay === today(); }

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

    // a newly introduced kana is met a second time later in the session; a kanji
    // is not — one encounter per kanji being learned, writing plus pronunciation
    fresh.filter(n => charType(n.ch) !== "kanji")
      .forEach(n => insertAfter(n.ch, { type: "draw", ch: n.ch, tag: "reinforce" }, 3));
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
  // every mastered (or self-declared known) character of a track, in library order
  function masteredChars(which) {
    let list;
    if (which === "hiragana") list = HIRA_ALL;
    else if (which === "katakana") list = KATA_ALL;
    else if (which === "kanji") list = KANJI;
    else list = HIRA_ALL.concat(KATA_ALL).concat(KANJI);
    return list.map(k => k.k).filter(ch => {
      const p = S.chars[ch];
      return p && (p.mastered || p.known);
    });
  }
  function masteredKanji() { return masteredChars("kanji"); }
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
    dictationInfo, dictationMode, kanaVoiceWord,
    kanjiReadings, readingAccepts, pickReading, readingType, ttsReadings,
    katakanaUnlocked, kanjiUnlocked, refillActiveKanji, currentTrack,
    buildSession, noteSessionStarted, noteSessionDone, sessionDoneToday,
    trackStats, masteryProgress, dailyProgress, masteredChars, masteredKanji, totalDue, bumpStreak,
    exportState, importState, resetAll
  };
})();
