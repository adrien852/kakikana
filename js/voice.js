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
  function normJa(s) {
    if (!s) return "";
    s = s.replace(/[\s。、．，,.!?！？「」・'’\-~〜ー]/g, m => m === "ー" ? "ー" : "");
    let out = "";
    for (const c of s) out += K2H[c] || c;
    return out.toLowerCase();
  }
  function lev(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }
  // expected: array of acceptable strings (kana, kanji spelling, romaji)
  function matches(heardRaw, expected) {
    const heard = normJa(heardRaw);
    if (!heard) return false;
    for (const eRaw of expected) {
      const e = normJa(eRaw);
      if (!e) continue;
      if (heard === e) return true;
      if (e.length >= 2 && (heard.includes(e) || e.includes(heard))) return true;
      if (e.length >= 3 && lev(heard, e) <= 1) return true;
      if (e.length === 1 && heard[0] === e) return true;
    }
    return false;
  }

  // ---------- Web Speech recognition (online) ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function webSpeechAvailable() { return !!SR && navigator.onLine; }

  function recognizeWebSpeech() {
    return new Promise((resolve, reject) => {
      const rec = new SR();
      rec.lang = "ja-JP";
      rec.interimResults = false;
      rec.maxAlternatives = 5;
      let done = false;
      rec.onresult = ev => {
        done = true;
        const alts = [];
        const res = ev.results[0];
        for (let i = 0; i < res.length; i++) alts.push(res[i].transcript);
        resolve(alts);
      };
      rec.onerror = ev => { if (!done) reject(new Error(ev.error || "sr-error")); };
      rec.onend = () => { if (!done) resolve([]); };
      try { rec.start(); } catch (e) { reject(e); }
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
        const chunks = [];
        mr.ondataavailable = e => chunks.push(e.data);
        mr.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
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
    if (statusCb) statusCb("rec");
    const blob = await recordAudio(3000);
    if (statusCb) statusCb("proc");
    const pcm = await blobToPCM(blob);
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

  // High-level: listen once, resolve list of transcripts.
  // statusCb("rec"|"proc")
  async function listen(statusCb) {
    const eng = engineNow();
    if (!eng) throw new Error("no-engine");
    if (eng === "webspeech") {
      if (statusCb) statusCb("rec");
      return await recognizeWebSpeech();
    }
    return await recognizeWhisper(statusCb);
  }

  window.Voice = { speak, hasTTS, matches, normJa, anyEngineMaybe, engineNow, listen, loadWhisper, whisperEnabled };
})();
