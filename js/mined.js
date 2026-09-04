// ===== Kanji mined in games, via KakiBridge =====
// KakiBridge sits between Yomitan and these apps: every word he looks up while
// playing is logged there, and every mined word is exported. This module brings
// that list in and keeps it as a per-kanji record.
//
// Two ways in, both optional:
//   · localStorage["kakibridge.focus.v1"] — the small shared key Kakibun writes
//     after its own import. Same origin, so it is read here at boot, for free.
//   · a KakiBridge export file, imported from Réglages → Données.
// KakiKana never writes the shared key: Kakibun owns it, and two apps writing
// one key is how you lose data.
//
// Nothing here feeds the SRS. These kanji are a record of what he has met in
// the wild, not a syllabus — most are far outside the 104 the course teaches.
(function () {
  const STORE_KEY = "kakikana.mined.v1";
  const FOCUS_KEY = "kakibridge.focus.v1";
  const MAX_WORDS_PER_KANJI = 40;     // a long tail helps nobody

  // The exact export shape lives in the KakiBridge project, so read it loosely:
  // take the first key that is present rather than insisting on one spelling.
  const K_WORD  = ["w", "word", "expression", "term", "Word", "Expression", "surface", "headword"];
  const K_READ  = ["r", "reading", "furigana", "Reading", "kana", "yomi", "reading_kana"];
  const K_GLOSS = ["g", "gloss", "meaning", "definition", "Meaning", "glossary", "sense", "translation", "def"];
  const K_GAME  = ["game", "Game", "source", "Source", "title", "media", "context_game"];
  const K_COUNT = ["n", "count", "hits", "seen", "sightings", "freq", "frequency", "score", "views"];
  const K_FIRST = ["first", "firstSeen", "first_seen", "added", "created", "createdAt"];
  const K_LAST  = ["last", "lastSeen", "last_seen", "updated", "updatedAt", "seenAt", "date"];
  const K_SENT  = ["sentence", "Sentence", "context", "example", "Context"];

  const CJK = /[㐀-䶿一-鿿豈-﫿]/;
  const isKanji = c => CJK.test(c);

  function pick(o, keys) {
    if (!o || typeof o !== "object") return undefined;
    for (const k of keys) if (o[k] !== undefined && o[k] !== null && o[k] !== "") return o[k];
    return undefined;
  }
  function num(v, d) {
    const n = typeof v === "string" ? parseFloat(v) : v;
    return typeof n === "number" && isFinite(n) ? n : (d === undefined ? 0 : d);
  }
  function str(v) {
    if (v === undefined || v === null) return "";
    if (Array.isArray(v)) return v.filter(x => typeof x === "string").join(", ");
    if (typeof v === "object") return "";
    return String(v).trim();
  }
  // Yomitan fields can arrive as ruby HTML; keep the base text, drop the ruby
  const clean = s => str(s).replace(/<rt>.*?<\/rt>/g, "").replace(/<[^>]*>/g, "").trim();

  // ---------- finding the interesting parts of an unknown file ----------
  function findWordList(root) {
    if (Array.isArray(root)) return root;
    if (!root || typeof root !== "object") return [];
    for (const k of ["words", "mined", "entries", "items", "notes", "list", "data", "vocab"]) {
      if (Array.isArray(root[k])) return root[k];
      if (root[k] && typeof root[k] === "object" && !Array.isArray(root[k])) {
        // an object keyed by the word itself
        const vals = Object.keys(root[k]).map(w => {
          const v = root[k][w];
          return (v && typeof v === "object") ? Object.assign({ w }, v) : { w, n: num(v, 1) };
        });
        if (vals.length && vals.some(x => x.w)) return vals;
      }
    }
    return [];
  }
  function findKanjiBlock(root) {
    if (!root || typeof root !== "object" || Array.isArray(root)) return null;
    for (const k of ["kanji", "chars", "characters", "focus", "kanjiFocus"]) {
      if (root[k] && typeof root[k] === "object") return root[k];
    }
    // the focus key may itself be a bare { "森": 12 } map
    const keys = Object.keys(root);
    if (keys.length && keys.every(k => [...k].length === 1 && isKanji(k))) return root;
    return null;
  }

  // ---------- normalising ----------
  function normWord(raw, fallbackGame) {
    if (typeof raw === "string") return { w: raw, r: "", g: "", game: fallbackGame || "", n: 1 };
    const w = clean(pick(raw, K_WORD));
    if (!w) return null;
    return {
      w,
      r: clean(pick(raw, K_READ)),
      g: str(pick(raw, K_GLOSS)).slice(0, 160),
      s: clean(pick(raw, K_SENT)).slice(0, 200),
      game: str(pick(raw, K_GAME)) || fallbackGame || "",
      n: Math.max(1, Math.round(num(pick(raw, K_COUNT), 1))),
      first: str(pick(raw, K_FIRST)),
      last: str(pick(raw, K_LAST))
    };
  }

  // Build the per-kanji record from a word list: a kanji's count is the sum of
  // the counts of every mined word it appears in, which is the same figure
  // Kakibun calls its focus score.
  function foldWords(words) {
    const out = {};
    words.forEach(word => {
      const seen = {};
      [...word.w].forEach(ch => {
        if (!isKanji(ch) || seen[ch]) return;    // 人人 counts once per word
        seen[ch] = true;
        const e = out[ch] || (out[ch] = { ch, n: 0, games: {}, words: [], first: "", last: "" });
        e.n += word.n;
        const g = word.game || "";
        e.games[g] = (e.games[g] || 0) + word.n;
        e.words.push(word);
        if (word.first && (!e.first || word.first < e.first)) e.first = word.first;
        if (word.last && (!e.last || word.last > e.last)) e.last = word.last;
      });
    });
    Object.keys(out).forEach(ch => {
      const e = out[ch];
      e.words.sort((a, b) => b.n - a.n);
      if (e.words.length > MAX_WORDS_PER_KANJI) e.words = e.words.slice(0, MAX_WORDS_PER_KANJI);
    });
    return out;
  }

  // Anything the file says about the kanji themselves, merged over the derived
  // counts. A bare number is a score; an object may carry readings and a meaning.
  function foldKanjiBlock(block, into, fallbackGame) {
    if (!block) return into;
    Object.keys(block).forEach(ch => {
      if (![...ch].every(isKanji) || [...ch].length !== 1) return;
      const raw = block[ch];
      const e = into[ch] || (into[ch] = { ch, n: 0, games: {}, words: [], first: "", last: "" });
      if (typeof raw === "number" || typeof raw === "string") {
        const n = Math.round(num(raw, 0));
        if (n > e.n) { e.n = n; if (fallbackGame) e.games[fallbackGame] = n; }
        return;
      }
      if (!raw || typeof raw !== "object") return;
      const n = Math.round(num(pick(raw, K_COUNT), 0));
      if (n > e.n) e.n = n;
      const on = pick(raw, ["on", "onyomi", "ON"]), kun = pick(raw, ["kun", "kunyomi", "KUN"]);
      const meaning = pick(raw, K_GLOSS);
      if (on || kun || meaning) {
        e.info = e.info || {};
        if (on) e.info.on = str(on);
        if (kun) e.info.kun = str(kun);
        if (meaning) e.info.meaning = str(meaning).slice(0, 160);
      }
      const games = pick(raw, ["games", "byGame", "sources"]);
      if (games && typeof games === "object" && !Array.isArray(games)) {
        Object.keys(games).forEach(g => { e.games[g] = Math.max(e.games[g] || 0, Math.round(num(games[g], 0))); });
      }
      const first = str(pick(raw, K_FIRST)), last = str(pick(raw, K_LAST));
      if (first && (!e.first || first < e.first)) e.first = first;
      if (last && (!e.last || last > e.last)) e.last = last;
    });
    return into;
  }

  // Turn any KakiBridge-ish payload into { at, games, kanji }.
  function parse(root) {
    if (typeof root === "string") root = JSON.parse(root);
    if (!root || typeof root !== "object") throw new Error("not an object");
    const fallbackGame = str(pick(root, K_GAME));
    const rawWords = findWordList(root);
    const words = rawWords.map(w => normWord(w, fallbackGame)).filter(Boolean);
    const kanji = foldKanjiBlock(findKanjiBlock(root), foldWords(words), fallbackGame);
    const games = {};
    Object.keys(kanji).forEach(ch =>
      Object.keys(kanji[ch].games).forEach(g => { games[g] = (games[g] || 0) + kanji[ch].games[g]; }));
    if (!Object.keys(kanji).length) throw new Error("no kanji found");
    return {
      at: str(pick(root, K_LAST)) || new Date().toISOString(),
      games: Object.keys(games).filter(Boolean).sort(),
      words: words.length,
      kanji
    };
  }

  // ---------- the store ----------
  // The two sources are kept apart on purpose. A KakiBridge export is a whole
  // snapshot, so re-importing it must replace rather than add — summing would
  // double every count. The shared key is merged as a separate layer.
  let S = { v: 1, file: null, focus: null, relay: null };
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { const s = JSON.parse(raw); if (s && s.v === 1) S = s; }
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {}
  }

  // Read the key Kakibun writes after its own import, if it has changed.
  function readShared() {
    let raw = null;
    try { raw = localStorage.getItem(FOCUS_KEY); } catch (e) { return false; }
    if (!raw) return false;
    if (S.focus && S.focus.raw === raw) return false;      // unchanged
    try {
      const parsed = parse(JSON.parse(raw));
      parsed.raw = raw;
      S.focus = parsed;
      save();
      return true;
    } catch (e) { return false; }
  }

  // The relay hands back a bare array of mined words. Like a file import this is
  // a whole snapshot, so it replaces its layer rather than adding to it.
  // Returns the number of kanji it now knows about, or 0 for an empty box.
  function ingestRelay(data, at) {
    const words = Array.isArray(data) ? data : (data && findWordList(data)) || [];
    if (!words.length) { S.relay = null; save(); return 0; }
    let parsed;
    try { parsed = parse({ words }); } catch (e) { return 0; }
    if (at) parsed.at = new Date(at).toISOString();
    S.relay = parsed;
    save();
    return Object.keys(parsed.kanji).length;
  }

  function importText(text) {
    const parsed = parse(typeof text === "string" ? JSON.parse(text) : text);
    S.file = parsed;
    save();
    return { kanji: Object.keys(parsed.kanji).length, words: parsed.words, games: parsed.games };
  }
  function clear() { S = { v: 1, file: null, focus: null, relay: null }; save(); }

  // ---------- reading it back ----------
  // The file layer wins where both know a kanji: it carries the words, and the
  // shared key only ever carries a score.
  function merged() {
    const out = {};
    const add = src => {
      if (!src) return;
      Object.keys(src.kanji).forEach(ch => {
        const e = src.kanji[ch];
        if (!out[ch]) { out[ch] = JSON.parse(JSON.stringify(e)); return; }
        const o = out[ch];
        o.n = Math.max(o.n, e.n);
        Object.keys(e.games).forEach(g => { o.games[g] = Math.max(o.games[g] || 0, e.games[g]); });
        if (!o.words.length && e.words.length) o.words = e.words;
        if (!o.info && e.info) o.info = e.info;
        if (e.first && (!o.first || e.first < o.first)) o.first = e.first;
        if (e.last && (!o.last || e.last > o.last)) o.last = e.last;
      });
    };
    add(S.focus);     // a bare score map, if Kakibun ever writes the key again
    add(S.relay);     // full word records, straight off the relay
    add(S.file);      // a hand-picked file wins over everything
    return out;
  }

  function games() {
    const all = merged(), tally = {};
    Object.keys(all).forEach(ch =>
      Object.keys(all[ch].games).forEach(g => {
        if (!g) return;
        tally[g] = tally[g] || { name: g, kanji: 0, n: 0 };
        tally[g].kanji++; tally[g].n += all[ch].games[g];
      }));
    return Object.keys(tally).map(g => tally[g]).sort((a, b) => b.n - a.n);
  }

  // game: a name, or undefined for everything. sort: "n" | "recent"
  function list(game, sort) {
    const all = merged();
    let out = Object.keys(all).map(ch => all[ch]);
    if (game) out = out.filter(e => e.games[game]);
    const key = e => game ? (e.games[game] || 0) : e.n;
    if (sort === "recent") out.sort((a, b) => String(b.last).localeCompare(String(a.last)) || key(b) - key(a));
    else out.sort((a, b) => key(b) - key(a) || a.ch.localeCompare(b.ch));
    return out;
  }
  function get(ch) { return merged()[ch] || null; }
  function count() { return Object.keys(merged()).length; }
  function lastUpdate() {
    return [S.file, S.relay, S.focus].map(x => x && x.at).filter(Boolean)
      .sort().pop() || "";
  }
  function hasData() { return count() > 0; }
  // does the relay layer specifically still hold something? (the sync client
  // uses this to decide whether an unchanged box is worth re-ingesting)
  function hasRelay() { return !!(S.relay && Object.keys(S.relay.kanji).length); }

  load();
  readShared();

  window.Mined = {
    importText, ingestRelay, clear, readShared, list, games, get, count, hasData, hasRelay, lastUpdate,
    isKanji, parse, STORE_KEY, FOCUS_KEY
  };
})();
