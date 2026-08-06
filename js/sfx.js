// ===== Sound effects — synthesized with Web Audio (no audio files to download) =====
// Subtle, short, tuned to a Japanese pentatonic (yo) scale so everything blends.
(function () {
  let ctx = null;
  let master = null;
  let unlocked = false;

  function enabled() {
    const s = window.Engine && Engine.state && Engine.state.settings;
    return !s || s.sfx !== false;   // default on
  }

  function ac() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.22;       // keep everything gentle
    master.connect(ctx.destination);
    return ctx;
  }

  // Browsers require a user gesture before audio can start.
  function unlock() {
    if (unlocked) return;
    const c = ac();
    if (!c) return;
    if (c.state === "suspended") c.resume().catch(() => {});
    unlocked = true;
  }
  ["pointerdown", "touchstart", "keydown"].forEach(ev =>
    window.addEventListener(ev, unlock, { passive: true }));

  // one soft voice: sine/triangle with a quick percussive envelope
  function tone(freq, opts) {
    const c = ac();
    if (!c || !enabled()) return;
    if (c.state === "suspended") c.resume().catch(() => {});
    const o = opts || {};
    const t0 = c.currentTime + (o.delay || 0);
    const dur = o.dur || 0.18;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (o.glide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, o.glide), t0 + dur);
    const peak = o.gain === undefined ? 0.5 : o.gain;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (o.attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  }

  // short filtered noise burst — used for the "ink" sound of a stroke
  function noise(opts) {
    const c = ac();
    if (!c || !enabled()) return;
    const o = opts || {};
    const dur = o.dur || 0.09;
    const frames = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, frames, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = c.createBufferSource(); src.buffer = buf;
    const filt = c.createBiquadFilter();
    filt.type = "bandpass"; filt.frequency.value = o.freq || 1800; filt.Q.value = o.q || 0.9;
    const g = c.createGain(); g.gain.value = o.gain === undefined ? 0.18 : o.gain;
    src.connect(filt); filt.connect(g); g.connect(master);
    src.start(c.currentTime + (o.delay || 0));
  }

  // yo scale (D E G A B) across two octaves
  const N = { D4: 293.7, E4: 329.6, G4: 392.0, A4: 440.0, B4: 493.9, D5: 587.3, E5: 659.3, G5: 784.0, A5: 880.0, B5: 987.8, D6: 1174.7 };

  const SFX = {
    // a single correct stroke — barely there, like a brush touching paper
    stroke() { noise({ freq: 1500, gain: 0.12, dur: 0.07 }); tone(N.A5, { dur: 0.07, gain: 0.10, type: "sine" }); },
    // wrong stroke — soft, non-punitive
    miss() { tone(196, { dur: 0.16, gain: 0.22, type: "triangle", glide: 150 }); },
    // character finished correctly
    good() {
      tone(N.D5, { dur: 0.16, gain: 0.34 });
      tone(N.G5, { dur: 0.20, gain: 0.30, delay: 0.075 });
      tone(N.B5, { dur: 0.30, gain: 0.22, delay: 0.15 });
    },
    // character finished, but with help/mistakes
    soso() { tone(N.E5, { dur: 0.14, gain: 0.26 }); tone(N.D5, { dur: 0.22, gain: 0.22, delay: 0.09 }); },
    // wrong answer in an exam / failed attempt
    bad() { tone(233, { dur: 0.13, gain: 0.26, type: "triangle" }); tone(174, { dur: 0.26, gain: 0.24, type: "triangle", delay: 0.1 }); },
    // exam MCQ correct
    right() { tone(N.G5, { dur: 0.13, gain: 0.30 }); tone(N.D6, { dur: 0.22, gain: 0.24, delay: 0.08 }); },
    // a character reached "mastered"
    master() {
      [N.D5, N.E5, N.G5, N.A5, N.D6].forEach((f, i) =>
        tone(f, { dur: 0.34, gain: 0.24, delay: i * 0.07 }));
    },
    // end of a session / exam
    fanfare() {
      [[N.D5, 0], [N.G5, 0.1], [N.A5, 0.2], [N.D6, 0.32]].forEach(([f, d]) =>
        tone(f, { dur: 0.42, gain: 0.26, delay: d }));
      tone(N.G4, { dur: 0.6, gain: 0.16, delay: 0.32, type: "triangle" });
    },
    // UI
    tap() { tone(N.A5, { dur: 0.05, gain: 0.10, type: "sine" }); },
    nav() { tone(N.E5, { dur: 0.07, gain: 0.12 }); },
    start() { tone(N.D5, { dur: 0.12, gain: 0.22 }); tone(N.A5, { dur: 0.18, gain: 0.18, delay: 0.07 }); },
    // library: character opened
    pop() { tone(N.B4, { dur: 0.08, gain: 0.14 }); },
    unlock
  };

  window.SFX = SFX;
  // convenience: sfx("good") — safe no-op if audio is unavailable
  window.sfx = name => { try { const f = SFX[name]; if (f) f(); } catch (e) {} };
})();
