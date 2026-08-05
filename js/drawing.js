// ===== Stroke drawing exercise (hanzi-writer wrapper with fading help) =====
(function () {
  const LENIENCY = { easy: 1.4, normal: 1.0, hard: 0.75 };

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

  // stage → help configuration
  function stageConfig(stage) {
    if (stage <= 0) return { demo: true, outline: true, hintAfter: 1, autoPass: 3 };
    if (stage === 1) return { demo: false, outline: true, hintAfter: 2, autoPass: 4 };
    if (stage === 2) return { demo: false, outline: false, hintAfter: 2, autoPass: 5 };
    if (stage === 3) return { demo: false, outline: false, hintAfter: 3, autoPass: 6 };
    return { demo: false, outline: false, hintAfter: 3, autoPass: 8 };
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
        <div id="writer-target"></div>
      </div>`;
    const target = container.querySelector("#writer-target");

    const strict = (window.Engine && Engine.state.settings.strict) || "normal";
    const conf = opts.examMode
      ? { demo: false, outline: false, hintAfter: false, autoPass: false }
      : stageConfig(stage);

    let hintUsed = false;
    let destroyed = false;

    const writer = HanziWriter.create(target, ch, {
      width: size, height: size, padding: Math.round(size * 0.09),
      showCharacter: false,
      showOutline: conf.outline,
      strokeColor: "#2b2620",
      outlineColor: "#d8cfc0",
      drawingColor: "#b7392b",
      drawingWidth: Math.max(8, size * 0.045),
      highlightColor: "#c9a227",
      highlightCompleteColor: "#3d8b5f",
      leniency: LENIENCY[strict] || 1.0,
      showHintAfterMisses: conf.hintAfter === false ? false : conf.hintAfter,
      markStrokeCorrectAfterMisses: conf.autoPass === false ? false : conf.autoPass,
      acceptBackwardsStrokes: false,
      charDataLoader: (c, done) => done(window.STROKES[c])
    });

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
      writer.animateCharacter({ onComplete: () => setTimeout(() => { writer.hideCharacter(); startQuiz(); }, 350) });
    } else {
      startQuiz();
    }

    return {
      writer,
      giveHint() {
        hintUsed = true;
        // flash the outline briefly
        writer.showOutline({ duration: 300 });
        setTimeout(() => { if (!conf.outline && !destroyed) writer.hideOutline({ duration: 300 }); }, 1600);
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

  window.Drawing = { mount, animateIn, stageConfig };
})();
