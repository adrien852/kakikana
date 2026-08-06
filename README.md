# KakiKana 筆 — Learn to write Japanese (JLPT N5)

A fully offline, installable web app (PWA) to learn **hiragana, katakana and the 104 JLPT N5 kanji** by drawing them stroke by stroke, with speech, spaced repetition, a progress library and exams.

Interface is in **French** by default — switch to English in *Réglages → Langue*.

---

## 1. Put it online (one time, ~5 minutes)

The app must be served from an HTTPS address to be installable and work offline. GitHub Pages does this for free:

1. Create a free account at **github.com** (if you don't have one).
2. Click **+** (top right) → **New repository**. Name it e.g. `kakikana`, keep it **Public**, click **Create repository**.
3. On the repository page, click **uploading an existing file** (or *Add file → Upload files*).
4. Drag **all the files and folders in this zip** (`index.html`, `sw.js`, `manifest.webmanifest`, `css/`, `js/`, `data/`, `icons/`, `vendor/`) into the upload area. **Important:** upload the *contents* of the folder, not the folder itself — `index.html` must end up at the top level of the repository.
5. Click **Commit changes** and wait for the upload to finish.
6. Go to **Settings → Pages** (left sidebar). Under *Branch*, select **main** and **/ (root)**, then **Save**.
7. After ~1 minute your app is live at:
   `https://YOUR-USERNAME.github.io/kakikana/`

## 2. Install it on your phone / tablet

1. Open that address in **Chrome** on your Android device.
2. Menu **⋮ → Add to Home screen** (Chrome may also show an "Install" banner).
3. Open it from the home screen icon — it runs fullscreen and **works with no internet**.

For the Japanese voice (text-to-speech), make sure Android has it:
*Settings → System → Languages → Text-to-speech* → Google engine → install **Japanese**. It then works offline too.

## 3. Updates

When you receive a new version:

1. Open your repository on github.com → **Add file → Upload files**.
2. Drag the new files in (they replace the old ones) → **Commit changes**.
3. Open the app twice: the first launch downloads the update in the background, the second uses it. (Your progress is stored on the device, never in the files — updates never erase it.)

Tip: before big updates, export your progress from *Réglages → Données → Exporter* as an extra backup.

## What's new in v1.2.0

- **Pronunciation is no longer marked wrong when it was right.** Speech recognition writes numbers as digits ("2つ") and words in kanji ("朝" for あさ), which the app then failed to recognise. Every way of saying or writing a number is now treated as one and the same, and standard spellings are accepted throughout the vocabulary — while a *different* number or a neighbouring word (四月 vs 七月, お父さん vs お母さん) is still correctly rejected.
- **Subtle sound effects** throughout: a brush touch per stroke, a soft chime when a character is validated, a distinct flourish when a character becomes mastered, and a short melody at the end of a session or exam. All synthesized in the app, so nothing extra to download and it still works offline. Turn them off any time in Réglages → Sons de l'application.
- **Fixed:** finishing a character and immediately switching page could make the exercise pop back over the screen you had just opened.

To update your installed app: upload these files over the old ones in your GitHub repository (Add file → Upload files → Commit), then open the app twice.

## What's new in v1.1.0

- **Stroke detection rewritten for loop characters** (ね, ぬ, む, め, あ, る, す, よ, ま, み, お, を…): the reference stroke paths contained hidden discontinuities that made correct loops nearly impossible to validate. They have been rebuilt and verified for all 151 kana.
- **More forgiving validation overall** at every strictness level (Indulgent / Normal / Strict all relaxed one notch; wrong characters and wrong stroke directions are still rejected).
- **Free choice of track**: tap the Hiragana, Katakana or Kanji card on the home screen to start a focused session in that category — no more unlock requirements. The main button still gives a mixed session.
- **Up to 10 kanji** can now be studied at the same time (Réglages → Rythme d'apprentissage).

To update your installed app: upload these files over the old ones in your GitHub repository (Add file → Upload files → Commit), then open the app twice.

## Features

- **Drawing practice** with real stroke validation (order, direction and shape), based on official stroke-order data. Help fades as you progress: model tracing → light guidance → drawing from memory. Hints appear only after a couple of failed attempts.
- **Guided path**: hiragana first, katakana unlocks as you progress, kanji once the kana are solid. Never more than a handful of kanji in practice at once (configurable).
- **Spaced repetition**: characters come back just before you'd forget them; mastered characters resurface periodically to stay solid.
- **Pronunciation exercise**: automatic validation of your speech (online uses the device's recognizer — free, unlimited; offline works after downloading the optional ≈40 MB voice pack in Settings).
- **Library**: kana in gojūon order with tap-to-hear; kanji sortable by difficulty, theme, or newest/oldest learned; each kanji has readings, meanings, character-origin explanations (pictograph, compound…), example words and sentences with audio. Mark kanji you already know.
- **Exams** on mastered kanji only: writing, meaning and reading, no help, with history.
- **French / English** interface. Translations are always from the Japanese.
- **100% offline** after the first load; progress export/import.

## Technical notes (for future development)

- Pure static PWA: no build step, no server, no accounts. All data bundled.
- Stroke data: kanji from [AnimCJK](https://github.com/parsimonhi/animCJK) via [hanzi-writer-data-jp](https://github.com/chanind/hanzi-writer-data-jp); kana from AnimCJK with loop-strokes merged using [KanjiVG](https://kanjivg.tagaini.net/) segmentation (see project notes). Rendering/quizzing by [Hanzi Writer](https://hanziwriter.org) (MIT), compiled from source into `vendor/hanzi-writer.min.js`.
- Licences: AnimCJK data Arphic Public License; KanjiVG CC BY-SA; Hanzi Writer MIT.
- Progress lives in `localStorage` under `kakikana_state_v1`.
- To ship an update: bump `VERSION` in `sw.js` (e.g. `kakikana-v1.0.1`) so installed apps refresh their cache, and `APP_VERSION` in `js/app.js`.
