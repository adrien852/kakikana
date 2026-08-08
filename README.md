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

## What's new in v1.8.0

- **Every practice is dealt in a fresh order.** Sessions used to follow the library order (gojūon for kana, frequency for kanji), so the same run always started the same way. The order is now shuffled each time you start, including the tie-break when several characters fall due at the same moment. What stays fixed is the curriculum itself: which characters get introduced is unchanged, only when they appear within the session varies.
- Three rules are still guaranteed: a character never appears twice in a row, a newly introduced character is always met again later in the same session, and a pronunciation item always comes after you have written that character.

To update your installed app: upload these files over the old ones in your GitHub repository (Add file → Upload files → Commit), then open the app twice.

## What's new in v1.7.0

- **The stroke guide now fades away gradually** instead of switching off. Each time a character advances a stage, the outline recedes from the end: all strokes, then all but the last, then fewer still, then none — so you always recall the ending first and work backwards.
- **Compounds fade by component.** For longer kanji the app finds where the character splits (語 → 言 | 吾, 時 → 日 | 寺, 休 → 亻 | 木) and uses that as one of the steps, so a middle stage shows exactly the left or top half and asks you to recall the rest. Characters of five strokes or fewer simply lose one stroke per stage. There are never more than four levels of help before it disappears — enough to be gradual, not enough to be a slog.
- **Mastery now means what it says**: a drawing only counts as unaided when no guide is left on screen and you asked for no hint. Dictations and exams never show the guide at all.

To update your installed app: upload these files over the old ones in your GitHub repository (Add file → Upload files → Commit), then open the app twice.

## What's new in v1.6.0

- **Pronunciation never affects your progress.** A missed or skipped pronunciation is now completely inert: it cannot move a character's stage, review date or mastery — only your writing does that. It no longer counts in the end-of-session score either, and the exercise says so on screen.
- **No more unrecognisably short words.** The pronunciation exercise now always asks for the longest example word of at least three morae, so 十 asks for 十月 (じゅうがつ) instead of とお, 目 for 目ぐすり instead of め, 手 for 手がみ instead of て. Two kanji (今, 下) have no word long enough and simply skip pronunciation. The same three-mora rule applies to kana words in sessions; the library still lets you try any word on demand.
- **Stroke exercises say which alphabet.** Hiragana and katakana prompts now carry a colour-coded 「あ Hiragana」/「ア Katakana」badge, so a mixed session never leaves you guessing which one "i" means.

To update your installed app: upload these files over the old ones in your GitHub repository (Add file → Upload files → Commit), then open the app twice.

## What's new in v1.5.1

- **No more pronunciation checks on a single kana.** One mora ("お", "え") is too short for any recogniser to identify, so those attempts failed even when they were perfect. Kana pronunciation is now only ever practised through a real example word (あさ, いぬ, アイス…) — in sessions and in the library. The 🔊 listen button on a character is unchanged, and kana dictation (hearing a character and writing it) is unaffected.

## What's new in v1.5.0

- **Dictation exercise.** From time to time a character arrives as sound only: you hear it, nothing is shown, and you write it. It replaces the usual prompt for that encounter rather than adding a step, and only appears once a character is solid (SRS stage 3+), alternating with the visual prompt so both directions keep being practised. Works for hiragana, katakana (the prompt says which script) and kanji.
- **Only safe dictations.** A kanji is dictated only when the audio is a complete standalone word written with exactly that one kanji — 52 of the 104 qualify. Excluded on purpose: one-mora readings that collide (ひ is both 日 and 火, き is both 木 and 気), anything needing okurigana or a compound, and きた (北), which sounds exactly like 来た. For kana, the identical-sounding pairs じ/ぢ and ず/づ, the particle を, small kana and ー are left out.
- **Kana practice now circles back.** Instead of marching through a syllabary once, sessions hold back new characters while too many are still shaky and regularly bring back ones you already know, least recently practised first.
- **Slightly longer daily sessions** (about 11–18 exercises) so the dictations fit without displacing your reviews.

To update your installed app: upload these files over the old ones in your GitHub repository (Add file → Upload files → Commit), then open the app twice.

## What's new in v1.4.0

- **Kanji are now taught in order of real-world frequency** instead of stroke difficulty, so the everyday verbs come early: 出, 行, 見, 会, 入, 来, 言, 話, 立, 聞, 食 are all in the first two thirds now instead of dead last. The order blends four Japanese corpora (social media, news, Wikipedia, literature). Numbers are taught as one block near the front, because corpora undercount them — modern text writes "3", not 三.
- **"Je veux apprendre ce kanji"** replaces "I already know this kanji". Tap it on any kanji and it jumps the queue, arriving right after the kanji you have already mastered — useful for anything the frequency order puts late (飲, 友, 右, 左…). Requested kanji are marked ★ in the library.
- **Writing and pronunciation are now one exercise for kanji.** Every kanji encounter asks you to draw it, then say it. As before, after three attempts the app plays the model and moves on, so shaky recognition never blocks you. (If no speech recognition is available — offline without the voice pack — the drawing alone still counts.)
- **Fixed:** after the third failed pronunciation attempt, the microphone stayed tappable and could open during the hand-over, accidentally validating the next exercise. The controls now lock as soon as an answer is graded.
- **Volume slider** for the sound effects, next to the on/off switch.

To update your installed app: upload these files over the old ones in your GitHub repository (Add file → Upload files → Commit), then open the app twice.

## What's new in v1.3.0

- **Practise pronunciation anywhere in the library.** Open any kana or kanji and tap 🎤 next to a character or example word to say it out loud — the app tells you straight away whether it came out right, and what it heard if not.
- **Fixed:** tapping the microphone a second time wrongly reported "speech recognition unavailable (offline)". A second tap now simply pauses the attempt, so you can take your time thinking, then tap again to record.
- **Fixed:** the 🔊 model pronunciation could be played while the microphone was open, which passed the exercise for you. The listen button is now locked while recording (and everywhere in the library too).

To update your installed app: upload these files over the old ones in your GitHub repository (Add file → Upload files → Commit), then open the app twice.

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
