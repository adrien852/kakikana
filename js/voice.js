// ===== TTS + speech recognition (hybrid: Web Speech online / Whisper offline pack) =====
(function () {
  // ---------- Text-to-speech ----------
  let jaVoice = null;
  function pickVoice() {
    const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    const ja = vs.filter(v => v.lang && v.lang.toLowerCase().startsWith("ja"));
    // prefer local voices (offline capable)
    jaVoice = ja.find(v => v.localService) || ja[0] || null;
    return jaVoice;
  }
  if (window.speechSynthesis) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  function speak(text, opts) {
    return new Promise(resolve => {
      if (!window.speechSynthesis) return resolve(false);
      try { speechSynthesis.cancel(); } catch (e) {}
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      if (!jaVoice) pickVoice();
      if (jaVoice) u.voice = jaVoice;
      const slow = (opts && opts.slow) || (window.Engine && Engine.state.settings.ttsSlow);
      u.rate = slow ? 0.65 : 0.9;
      u.onend = () => resolve(true);
      u.onerror = () => resolve(false);
      speechSynthesis.speak(u);
      // safety timeout
      setTimeout(() => resolve(true), 8000);
    });
  }
  function hasTTS() { return !!(window.speechSynthesis && (jaVoice || pickVoice())); }

  // ---------- kana normalization / matching ----------
  const K2H = (() => {
    const map = {};
    for (let i = 0x30a1; i <= 0x30f6; i++) map[String.fromCharCode(i)] = String.fromCharCode(i - 0x60);
    return map;
  })();

  // --- numbers ---------------------------------------------------------------
  // Speech recognition writes numbers as digits ("2つ") while the app stores them
  // as kanji ("二つ"). Both sides are reduced to the same digit form before matching.
  const NUM_DIGIT = { "〇": 0, "零": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9 };
  const NUM_MULT = { "十": 10, "百": 100, "千": 1000 };
  const NUM_RUN = /[0-9〇零一二三四五六七八九十百千万]+/g;

  function parseJaNumber(str) {
    let total = 0, section = 0, current = 0, seen = false, i = 0;
    while (i < str.length) {
      const c = str[i];
      if (c >= "0" && c <= "9") {
        let j = i;
        while (j < str.length && str[j] >= "0" && str[j] <= "9") j++;
        current = parseInt(str.slice(i, j), 10); seen = true; i = j; continue;
      }
      if (c in NUM_DIGIT) { current = NUM_DIGIT[c]; seen = true; i++; continue; }
      if (c in NUM_MULT) { section += (current || 1) * NUM_MULT[c]; current = 0; seen = true; i++; continue; }
      if (c === "万") { total += ((section + current) || 1) * 10000; section = 0; current = 0; seen = true; i++; continue; }
      i++;
    }
    return seen ? total + section + current : null;
  }

  // spoken number + counter → digits, so 「ふたつ」「二つ」「2つ」 are one and the same,
  // and neighbouring numbers (四月 / 七月) stay clearly different.
  const NUM_WORDS = [
    ["ひとつ", "1つ"], ["ふたつ", "2つ"], ["みっつ", "3つ"], ["よっつ", "4つ"], ["いつつ", "5つ"],
    ["むっつ", "6つ"], ["ななつ", "7つ"], ["やっつ", "8つ"], ["ここのつ", "9つ"],
    ["いちがつ", "1がつ"], ["にがつ", "2がつ"], ["さんがつ", "3がつ"], ["しがつ", "4がつ"], ["ごがつ", "5がつ"],
    ["ろくがつ", "6がつ"], ["しちがつ", "7がつ"], ["はちがつ", "8がつ"], ["くがつ", "9がつ"],
    ["じゅうがつ", "10がつ"], ["じゅういちがつ", "11がつ"], ["じゅうにがつ", "12がつ"],
    ["いちじかん", "1じかん"], ["にじかん", "2じかん"],
    ["いちじ", "1じ"], ["にじ", "2じ"], ["さんじ", "3じ"], ["よじ", "4じ"], ["ごじ", "5じ"],
    ["ろくじ", "6じ"], ["しちじ", "7じ"], ["はちじ", "8じ"], ["くじ", "9じ"], ["じゅうじ", "10じ"],
    ["いっぷん", "1ふん"], ["にふん", "2ふん"], ["さんぷん", "3ふん"], ["よんぷん", "4ふん"], ["ごふん", "5ふん"],
    ["ろっぷん", "6ふん"], ["ななふん", "7ふん"], ["はっぷん", "8ふん"], ["きゅうふん", "9ふん"],
    ["じゅっぷん", "10ふん"], ["じっぷん", "10ふん"],
    ["ひとり", "1にん"], ["ふたり", "2にん"], ["さんにん", "3にん"], ["よにん", "4にん"], ["ごにん", "5にん"],
    ["ひゃくえん", "100えん"], ["にひゃくえん", "200えん"], ["ごひゃくえん", "500えん"],
    ["せんえん", "1000えん"], ["いちまんえん", "10000えん"],
    ["いっしゅうかん", "1しゅうかん"], ["にしゅうかん", "2しゅうかん"]
  ].sort((a, b) => b[0].length - a[0].length);
  // whole-word only (these fragments appear inside ordinary words like せんせい)
  const NUM_EXACT = {
    "とお": "10", "じゅう": "10", "ひゃく": "100", "さんびゃく": "300",
    "せん": "1000", "さんぜん": "3000", "いちまん": "10000", "ぜろ": "0", "れい": "0"
  };

  function normJa(s) {
    if (!s) return "";
    // full-width digits → ASCII
    s = s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
    s = s.replace(/[\s。、．，,.!?！？「」・'’\-~〜ー]/g, m => m === "ー" ? "ー" : "");
    // katakana → hiragana first, so spoken numbers are found whatever the script
    let k = "";
    for (const c of s) k += K2H[c] || c;
    s = k;
    // unify every way of saying / writing a number
    if (NUM_EXACT[s]) s = NUM_EXACT[s];
    for (const [word, digits] of NUM_WORDS) {
      if (s.indexOf(word) >= 0) s = s.split(word).join(digits);
    }
    s = s.replace(NUM_RUN, m => { const v = parseJaNumber(m); return v === null ? m : String(v); });
    return s.toLowerCase();
  }

  // every accepted written form of an expected string (standard orthography, etc.)
  function variants(s) {
    if (!s) return [];
    const out = [s];
    const alt = window.SPELLINGS && window.SPELLINGS[s];
    if (alt) for (const a of alt) if (out.indexOf(a) < 0) out.push(a);
    return out;
  }
  // characters recognizers add or drop without changing the pronunciation heard
  const loose = s => s.replace(/[っゃゅょぁぃぅぇぉー]/g, "");
  const isKana = c => { const n = c.codePointAt(0); return n >= 0x3040 && n <= 0x30ff; };

  // expected: array of acceptable strings (kana, kanji spelling, romaji)
  function matches(heardRaw, expected) {
    const heard = normJa(heardRaw);
    if (!heard) return false;
    const expanded = [];
    for (const e of expected) for (const v of variants(e)) expanded.push(v);
    const digitsOf = s => (s.match(/\d+/g) || []).join(",");
    // recognizers often append politeness the learner didn't say
    const bare = heard.replace(/(です(ね|よ)?|でした|だ(ね|よ)?)$/, "");
    const heardNums = digitsOf(heard);
    for (const eRaw of expanded) {
      const e = normJa(eRaw);
      if (!e) continue;
      if (heard === e || bare === e) return true;
      // a different number is a different word — never fuzzy-match across numbers
      if (digitsOf(e) !== heardNums) continue;
      // one trailing particle the learner may have added ("ふたつの", "ほんを")
      const extra = bare.length - e.length;
      if (e.length >= 3 && extra === 1 && bare.lastIndexOf(e, 0) === 0 &&
          "のねよわさかなもがをにでっー".indexOf(bare[bare.length - 1]) >= 0) return true;
      // forgive long-vowel / small-kana notation slips in longer words ("コーヒ" for
      // コーヒー), never in short ones where they carry the meaning (ちず ≠ チーズ).
      if (e.length >= 4 && loose(bare) === loose(e)) return true;
      // one-mora kana targets: accept the syllable held or doubled ("あー", "ああ"),
      // since recognizers seldom return a bare mora — but not another word.
      if (e.length === 1 && isKana(e) && bare.length === 2 && bare[0] === e &&
          "あいうえおー".indexOf(bare[1]) >= 0) return true;
    }
    return false;
  }

  // ---------- Web Speech recognition (online) ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let activeRec = null;        // recognition in progress
  let activeRecorder = null;   // MediaRecorder in progress (offline pack)
  let cancelled = false;
  let listening = false;
  function webSpeechAvailable() { return !!SR && navigator.onLine; }

  function recognizeWebSpeech() {
    return new Promise((resolve, reject) => {
      const rec = new SR();
      rec.lang = "ja-JP";
      rec.interimResults = false;
      rec.maxAlternatives = 5;
      let settled = false;
      const finish = v => { if (settled) return; settled = true; activeRec = null; resolve(v); };
      rec.onresult = ev => {
        const alts = [];
        const res = ev.results[0];
        for (let i = 0; i < res.length; i++) alts.push(res[i].transcript);
        finish(cancelled ? null : alts);
      };
      rec.onerror = ev => {
        // a cancelled or empty attempt is not an error the user should see
        if (cancelled || ev.error === "aborted" || ev.error === "no-speech") return finish(cancelled ? null : []);
        if (settled) return;
        settled = true; activeRec = null;
        reject(new Error(ev.error || "sr-error"));
      };
      rec.onend = () => finish(cancelled ? null : []);
      activeRec = rec;
      try { rec.start(); } catch (e) { activeRec = null; settled = true; reject(e); }
      // hard stop after 6s
      setTimeout(() => { try { rec.stop(); } catch (e) {} }, 6000);
    });
  }

  // ---------- Whisper offline pack (transformers.js) ----------
  let whisperPipe = null;
  let whisperLoading = null;
  const TJS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3";
  const WHISPER_MODEL = "onnx-community/whisper-tiny";

  function whisperEnabled() { return !!(window.Engine && Engine.state.settings.whisper); }

  async function loadWhisper(onProgress) {
    if (whisperPipe) return whisperPipe;
    if (whisperLoading) return whisperLoading;
    whisperLoading = (async () => {
      const tjs = await import(TJS_URL);
      const pipe = await tjs.pipeline("automatic-speech-recognition", WHISPER_MODEL, {
        dtype: "q8",
        progress_callback: p => {
          if (onProgress && p.status === "progress" && p.total) {
            onProgress(Math.round(100 * p.loaded / p.total), p.file);
          }
        }
      });
      whisperPipe = pipe;
      return pipe;
    })();
    try { return await whisperLoading; } finally { whisperLoading = null; }
  }

  function recordAudio(ms) {
    return new Promise(async (resolve, reject) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        activeRecorder = mr;
        const chunks = [];
        mr.ondataavailable = e => chunks.push(e.data);
        mr.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          activeRecorder = null;
          resolve(new Blob(chunks, { type: mr.mimeType }));
        };
        mr.start();
        setTimeout(() => { try { mr.stop(); } catch (e) {} }, ms);
      } catch (e) { reject(e); }
    });
  }

  async function blobToPCM(blob) {
    const buf = await blob.arrayBuffer();
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    const audio = await ctx.decodeAudioData(buf);
    let data = audio.getChannelData(0);
    if (audio.sampleRate !== 16000) {
      // simple linear resample
      const ratio = audio.sampleRate / 16000;
      const out = new Float32Array(Math.floor(data.length / ratio));
      for (let i = 0; i < out.length; i++) out[i] = data[Math.floor(i * ratio)];
      data = out;
    }
    try { ctx.close(); } catch (e) {}
    return data;
  }

  async function recognizeWhisper(statusCb) {
    const pipe = await loadWhisper();
    if (cancelled) return null;
    if (statusCb) statusCb("rec");
    const blob = await recordAudio(3000);
    if (cancelled) return null;
    if (statusCb) statusCb("proc");
    const pcm = await blobToPCM(blob);
    if (cancelled) return null;
    const out = await pipe(pcm, { language: "japanese", task: "transcribe" });
    return [out.text || ""];
  }

  function anyEngineMaybe() {
    return !!SR || whisperEnabled();
  }
  function engineNow() {
    if (webSpeechAvailable()) return "webspeech";
    if (whisperEnabled()) return "whisper";
    return null;
  }

  // High-level: listen once. Resolves with a list of transcripts, [] if nothing
  // was heard, or null if the attempt was cancelled (a second tap on the mic).
  // statusCb("rec"|"proc")
  async function listen(statusCb) {
    if (listening) return null;              // already running — cancel() instead
    const eng = engineNow();
    if (!eng) throw new Error("no-engine");
    cancelled = false; listening = true;
    try {
      if (eng === "webspeech") {
        if (statusCb) statusCb("rec");
        return await recognizeWebSpeech();
      }
      return await recognizeWhisper(statusCb);
    } finally {
      listening = false;
    }
  }

  // Stop an attempt in progress without grading it (user tapped the mic again,
  // left the screen, or started playing the model pronunciation).
  function cancel() {
    if (!listening && !activeRec && !activeRecorder) return false;
    cancelled = true;
    if (activeRec) { try { activeRec.abort(); } catch (e) {} activeRec = null; }
    if (activeRecorder) { try { activeRecorder.stop(); } catch (e) {} activeRecorder = null; }
    listening = false;
    return true;
  }
  function isListening() { return listening; }

  window.Voice = { speak, hasTTS, matches, normJa, variants, anyEngineMaybe, engineNow,
                   listen, cancel, isListening, loadWhisper, whisperEnabled };
})();
