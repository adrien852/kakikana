// ===== Stroke drawing exercise (hanzi-writer wrapper with fading help) =====
(function () {
  const LENIENCY = { easy: 2.2, normal: 1.5, hard: 1.0 };

  function gridSVG(size) {
    const s = size, h = s / 2;
    return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
      <rect x="1" y="1" width="${s - 2}" height="${s - 2}" fill="none" stroke="#e8e0d4" stroke-width="2" rx="18"/>
      <line x1="${h}" y1="8" x2="${h}" y2="${s - 8}" stroke="#efe8dc" stroke-width="1.5" stroke-dasharray="7 7"/>
      <line x1="8" y1="${h}" x2="${s - 8}" y2="${h}" stroke="#efe8dc" stroke-width="1.5" stroke-dasharray="7 7"/>
      <line x1="8" y1="8" x2="${s - 8}" y2="${s - 8}" stroke="#f5efe6" stroke-width="1" stroke-dasharray="5 9"/>
      <line x1="${s - 8}" y1="8" x2="8" y2="${s - 8}" stroke="#f5efe6" stroke-width="1" stroke-dasharray="5 9"/>
    </svg>`;
  }

  // stage → mistake-driven help (the outline itself fades separately, below)
  function stageConfig(stage) {
    if (stage <= 0) return { demo: true, hintAfter: 1, autoPass: 3 };
    if (stage === 1) return { demo: false, hintAfter: 2, autoPass: 4 };
    if (stage === 2) return { demo: false, hintAfter: 2, autoPass: 5 };
    if (stage === 3) return { demo: false, hintAfter: 3, autoPass: 6 };
    return { demo: false, hintAfter: 3, autoPass: 8 };
  }

  // ===== progressive outline =================================================
  // The guide does not switch off all at once: it recedes from the end of the
  // character, so the last strokes must be recalled first, then more and more.

  // Where a character splits into components, in stroke order. Strokes of a
  // component are written consecutively, so the split is the point where the
  // centre of gravity jumps left→right or top→bottom (語 → 言 | 吾 at 7).
  const boundaryCache = {};
  function componentBoundary(ch, medians) {
    if (ch in boundaryCache) return boundaryCache[ch];
    let out = null;
    const n = medians.length;
    if (n >= 6) {
      const c = medians.map(m => {
        let sx = 0, sy = 0;
        for (const p of m) { sx += p[0]; sy += p[1]; }
        return [sx / m.length, sy / m.length];
      });
      const spread = i => {
        const v = c.map(p => p[i]);
        return Math.max.apply(null, v) - Math.min.apply(null, v);
      };
      const W = spread(0), H = spread(1);
      const mean = (i, a, b) => { let s = 0; for (let j = a; j < b; j++) s += c[j][i]; return s / (b - a); };
      let best = null;
      for (let k = 2; k <= n - 2; k++) {
        const dx = mean(0, k, n) - mean(0, 0, k);      // left component first
        const dy = mean(1, 0, k) - mean(1, k, n);      // top component first (y is up)
        const horiz = dx >= dy;
        const sep = Math.max(dx, dy), ref = horiz ? W : H;
        if (sep < 200 || sep < 0.45 * ref) continue;
        const balance = 1 - Math.abs(k - n / 2) / (n / 2);
        const score = sep + balance * 150;
        if (!best || score > best.score) best = { k, score };
      }
      out = best ? best.k : null;
    }
    boundaryCache[ch] = out;
    return out;
  }

  // How many leading strokes stay outlined, per stage. At most four visible
  // levels before the guide disappears — more than that would be a slog.
  function hintLevels(n, boundary) {
    const set = [n];
    const minGap = Math.max(1, Math.round(n * 0.15));   // no two levels one stroke apart
    const add = v => {
      if (v <= 0 || v >= n) return;
      if (set.some(x => Math.abs(x - v) < minGap)) return;
      set.push(v);
    };
    add(boundary);                                   // a natural chunk, when there is one
    [0.75, 0.5, 0.25].forEach(f => { if (set.length < 4) add(Math.round(n * f)); });
    const levels = set.sort((a, b) => b - a).slice(0, 4);
    while (levels.length < 4) levels.push(0);
    return levels.concat([0, 0]);                    // stages 4 and 5: nothing
  }

  function hintPlan(ch, stage, opts) {
    const data = window.STROKES[ch];
    if (!data) return { shown: 0, total: 0 };
    const total = data.strokes.length;
    // an outline would give the answer away in a dictation, and an exam is unaided
    if (opts && (opts.examMode || opts.dictation)) return { shown: 0, total };
    const levels = hintLevels(total, componentBoundary(ch, data.medians));
    const s = Math.max(0, Math.min(stage | 0, levels.length - 1));
    return { shown: levels[s], total, levels };
  }

  // Mount a quiz. cb receives events:
  //  onStroke(n, total), onMistake(totalMistakes), onHint(), onComplete({totalMistakes, hintUsed})
  function mount(container, ch, stage, cb, opts) {
    opts = opts || {};
    const data = window.STROKES[ch];
    if (!data) { console.error("no stroke data for", ch); cb.onComplete({ totalMistakes: 0, hintUsed: false, noData: true }); return { destroy() {} }; }

    const size = opts.size || Math.min(window.innerWidth - 56, 320);
    container.innerHTML = `<div id="writer-box" style="width:${size}px;height:${size}px">
        <div id="writer-grid">${gridSVG(size)}</div>
        <div id="writer-hint"></div>
        <div id="writer-target"></div>
      </div>`;
    const target = container.querySelector("#writer-target");
    const hintLayer = container.querySelector("#writer-hint");

    const strict = (window.Engine && Engine.state.settings.strict) || "normal";
    const conf = opts.examMode
      ? { demo: false, outline: false, hintAfter: false, autoPass: false }
      : stageConfig(stage);

    let hintUsed = false;
    let destroyed = false;

    const writer = HanziWriter.create(target, ch, {
      width: size, height: size, padding: Math.round(size * 0.09),
      showCharacter: false,
      showOutline: false,          // replaced by the progressive outline below
      strokeColor: "#2b2620",
      outlineColor: "#d8cfc0",
      drawingColor: "#b7392b",
      drawingWidth: Math.max(8, size * 0.045),
      highlightColor: "#c9a227",
      highlightCompleteColor: "#3d8b5f",
      leniency: LENIENCY[strict] || 1.5,
      averageDistanceThreshold: 420,
      showHintAfterMisses: conf.hintAfter === false ? false : conf.hintAfter,
      markStrokeCorrectAfterMisses: conf.autoPass === false ? false : conf.autoPass,
      acceptBackwardsStrokes: false,
      charDataLoader: (c, done) => done(window.STROKES[c])
    });

    // the guide: the first `plan.shown` strokes, drawn under the writing surface
    const plan = opts.hintPlan || hintPlan(ch, stage, opts);
    function paintHint(count) {
      if (!hintLayer) return;
      if (!count) { hintLayer.innerHTML = ""; return; }
      const g = target.querySelector("svg g");
      // reuse hanzi-writer's own transform so the guide lines up exactly
      const tr = g && g.getAttribute("transform");
      const pad = Math.round(size * 0.09);
      const sc = (size - 2 * pad) / 1024;
      const transform = tr || `translate(${pad}, ${size - pad - 124 * sc}) scale(${sc}, ${-sc})`;
      const paths = data.strokes.slice(0, count)
        .map(d => `<path d="${d}" fill="#d8cfc0"/>`).join("");
      hintLayer.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <g transform="${transform}">${paths}</g></svg>`;
    }

    function startQuiz() {
      if (destroyed) return;
      writer.quiz({
        onCorrectStroke: s => { if (cb.onStroke) cb.onStroke(s.strokesRemaining === 0 ? s.strokeNum + 1 : s.strokeNum + 1, data.strokes.length); },
        onMistake: s => {
          if (cb.onMistake) cb.onMistake(s.totalMistakes);
          if (conf.hintAfter !== false && s.mistakesOnStroke >= conf.hintAfter) { hintUsed = true; if (cb.onHint) cb.onHint(); }
          if (conf.autoPass !== false && s.mistakesOnStroke >= conf.autoPass) hintUsed = true;
        },
        onComplete: sum => {
          if (cb.onComplete) cb.onComplete({ totalMistakes: sum.totalMistakes, hintUsed });
        }
      });
    }

    if (conf.demo) {
      writer.animateCharacter({ onComplete: () => setTimeout(() => {
        writer.hideCharacter(); paintHint(plan.shown); startQuiz();
      }, 350) });
    } else {
      paintHint(plan.shown);
      startQuiz();
    }

    return {
      writer,
      plan,
      giveHint() {
        hintUsed = true;
        // the whole character, briefly, then back to the level of the moment
        writer.showOutline({ duration: 300 });
        setTimeout(() => { if (!destroyed) writer.hideOutline({ duration: 300 }); }, 1600);
      },
      destroy() {
        destroyed = true;
        try { writer.cancelQuiz(); } catch (e) {}
        container.innerHTML = "";
      }
    };
  }

  // Small looping animation for library detail views
  function animateIn(el, ch, size) {
    const data = window.STROKES[ch];
    if (!data) { el.textContent = ch; return null; }
    el.innerHTML = "";
    const writer = HanziWriter.create(el, ch, {
      width: size, height: size, padding: Math.round(size * 0.1),
      strokeColor: "#2b2620", radicalColor: "#b7392b",
      delayBetweenStrokes: 260, strokeAnimationSpeed: 1.1,
      charDataLoader: (c, done) => done(window.STROKES[c])
    });
    const loop = () => writer.animateCharacter({ onComplete: () => setTimeout(loop, 1800) });
    loop();
    return writer;
  }

  window.Drawing = { mount, animateIn, stageConfig, hintPlan, componentBoundary };
})();
