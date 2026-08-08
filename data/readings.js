// ===== Spoken readings =====
// What the pronunciation exercise asks for: the kanji's OWN reading, never a
// compound. Asking for 一月 (いちがつ) to practise 一, then 二つ (ふたつ) to practise
// 二, teaches the compound rather than the character — and makes the two sound
// unrelated. Here every exercise is the character read on its own.
//
// A reading is listed only when it is
//   · a word on its own — a noun, a number, or a verb/adjective in plain form
//     (お母さん is a compound; 母 read はは is the reading), and
//   · at least two syllables — "め", "て", "き", "ほん", "じゅう" are one syllable
//     and no recogniser identifies them reliably, and
//   · in everyday use. 男's ON reading だん and 社's KUN reading やしろ are real but
//     almost never said alone, so they get no exercise and no progress tracking.
//
// Fields:
//   r   the reading, in kana — this is what is spoken and what is asked for
//   ro  romaji, shown on success
//   t   "on" | "kun" — shown as a badge, because 一 is both いち and ひとつ
//   k   the standard written form (what a recogniser normally returns)
//   alt other spellings a recogniser may return for the same sound — homophones
//       count as correct here: the exercise grades pronunciation, not spelling
//   fr / en  the meaning, revealed once the word is said correctly
window.READINGS = {
  // ---- people & self ----
  "人": [{ r: "ひと", ro: "hito", t: "kun", k: "人", fr: "personne", en: "person" }],
  "私": [{ r: "わたし", ro: "watashi", t: "kun", k: "私", alt: ["渡し"], fr: "je, moi", en: "I, me" }],
  "男": [{ r: "おとこ", ro: "otoko", t: "kun", k: "男", fr: "homme", en: "man" }],
  "女": [{ r: "おんな", ro: "onna", t: "kun", k: "女", fr: "femme", en: "woman" }],
  "父": [{ r: "ちち", ro: "chichi", t: "kun", k: "父", alt: ["乳"], fr: "mon père", en: "my father" }],
  "母": [{ r: "はは", ro: "haha", t: "kun", k: "母", fr: "ma mère", en: "my mother" }],

  // ---- numbers (both readings are everyday words) ----
  "一": [{ r: "いち", ro: "ichi", t: "on", k: "一", alt: ["1", "市", "位置"], fr: "un (nombre)", en: "one (number)" },
        { r: "ひとつ", ro: "hitotsu", t: "kun", k: "一つ", fr: "un (objet)", en: "one (thing)" }],
  "二": [{ r: "ふたつ", ro: "futatsu", t: "kun", k: "二つ", fr: "deux (objets)", en: "two (things)" }],
  "三": [{ r: "みっつ", ro: "mittsu", t: "kun", k: "三つ", fr: "trois (objets)", en: "three (things)" }],
  "四": [{ r: "よっつ", ro: "yottsu", t: "kun", k: "四つ", fr: "quatre (objets)", en: "four (things)" }],
  "五": [{ r: "いつつ", ro: "itsutsu", t: "kun", k: "五つ", fr: "cinq (objets)", en: "five (things)" }],
  "六": [{ r: "ろく", ro: "roku", t: "on", k: "六", alt: ["6"], fr: "six (nombre)", en: "six (number)" },
        { r: "むっつ", ro: "muttsu", t: "kun", k: "六つ", fr: "six (objets)", en: "six (things)" }],
  "七": [{ r: "しち", ro: "shichi", t: "on", k: "七", alt: ["7"], fr: "sept (nombre)", en: "seven (number)" },
        { r: "ななつ", ro: "nanatsu", t: "kun", k: "七つ", fr: "sept (objets)", en: "seven (things)" }],
  "八": [{ r: "はち", ro: "hachi", t: "on", k: "八", alt: ["8", "鉢", "蜂"], fr: "huit (nombre)", en: "eight (number)" },
        { r: "やっつ", ro: "yattsu", t: "kun", k: "八つ", fr: "huit (objets)", en: "eight (things)" }],
  "九": [{ r: "ここのつ", ro: "kokonotsu", t: "kun", k: "九つ", fr: "neuf (objets)", en: "nine (things)" }],
  "百": [{ r: "ひゃく", ro: "hyaku", t: "on", k: "百", alt: ["100"], fr: "cent", en: "hundred" }],
  // 十 (とお / じゅう), 千 (せん), 万 (まん) are one syllable — no spoken exercise.

  // ---- nature ----
  "山": [{ r: "やま", ro: "yama", t: "kun", k: "山", fr: "montagne", en: "mountain" }],
  "川": [{ r: "かわ", ro: "kawa", t: "kun", k: "川", alt: ["河", "皮", "革"], fr: "rivière", en: "river" }],
  "水": [{ r: "みず", ro: "mizu", t: "kun", k: "水", fr: "eau", en: "water" }],
  "空": [{ r: "そら", ro: "sora", t: "kun", k: "空", fr: "ciel", en: "sky" }],
  "花": [{ r: "はな", ro: "hana", t: "kun", k: "花", alt: ["鼻", "華"], fr: "fleur", en: "flower" }],
  "魚": [{ r: "さかな", ro: "sakana", t: "kun", k: "魚", alt: ["肴"], fr: "poisson", en: "fish" }],
  "雨": [{ r: "あめ", ro: "ame", t: "kun", k: "雨", alt: ["飴"], fr: "pluie", en: "rain" }],
  "土": [{ r: "つち", ro: "tsuchi", t: "kun", k: "土", alt: ["槌"], fr: "terre, sol", en: "soil, ground" }],
  "金": [{ r: "かね", ro: "kane", t: "kun", k: "金", alt: ["お金", "おかね", "鐘"], fr: "argent (monnaie)", en: "money" }],
  "月": [{ r: "つき", ro: "tsuki", t: "kun", k: "月", alt: ["付き", "突き"], fr: "lune", en: "moon" }],
  // 日 (ひ), 火 (ひ), 木 (き), 天 (てん), 気 (き) are one syllable — no spoken exercise.

  // ---- body ----
  "口": [{ r: "くち", ro: "kuchi", t: "kun", k: "口", alt: ["朽ち"], fr: "bouche", en: "mouth" }],
  "耳": [{ r: "みみ", ro: "mimi", t: "kun", k: "耳", fr: "oreille", en: "ear" }],
  "足": [{ r: "あし", ro: "ashi", t: "kun", k: "足", alt: ["脚", "葦"], fr: "pied, jambe", en: "foot, leg" }],
  // 目 (め), 手 (て) are one syllable — no spoken exercise.

  // ---- time ----
  "時": [{ r: "とき", ro: "toki", t: "kun", k: "時", alt: ["解き", "説き"], fr: "moment, temps", en: "time, moment" }],
  "年": [{ r: "とし", ro: "toshi", t: "kun", k: "年", alt: ["都市", "歳"], fr: "année, âge", en: "year, age" }],
  "間": [{ r: "あいだ", ro: "aida", t: "kun", k: "間", fr: "intervalle, entre", en: "interval, between" }],
  "今": [{ r: "いま", ro: "ima", t: "kun", k: "今", alt: ["居間"], fr: "maintenant", en: "now" }],

  // ---- positions ----
  "上": [{ r: "うえ", ro: "ue", t: "kun", k: "上", alt: ["植え"], fr: "dessus", en: "above" }],
  "下": [{ r: "した", ro: "shita", t: "kun", k: "下", alt: ["舌"], fr: "dessous", en: "below" }],
  "中": [{ r: "なか", ro: "naka", t: "kun", k: "中", alt: ["仲"], fr: "dedans, milieu", en: "inside, middle" }],
  "外": [{ r: "そと", ro: "soto", t: "kun", k: "外", fr: "dehors", en: "outside" }],
  "前": [{ r: "まえ", ro: "mae", t: "kun", k: "前", fr: "devant, avant", en: "front, before" }],
  "後": [{ r: "うしろ", ro: "ushiro", t: "kun", k: "後ろ", alt: ["後"], fr: "derrière", en: "behind" }],
  "左": [{ r: "ひだり", ro: "hidari", t: "kun", k: "左", fr: "gauche", en: "left" }],
  "右": [{ r: "みぎ", ro: "migi", t: "kun", k: "右", fr: "droite", en: "right" }],
  "東": [{ r: "ひがし", ro: "higashi", t: "kun", k: "東", fr: "est", en: "east" }],
  "西": [{ r: "にし", ro: "nishi", t: "kun", k: "西", fr: "ouest", en: "west" }],
  "南": [{ r: "みなみ", ro: "minami", t: "kun", k: "南", fr: "sud", en: "south" }],
  "北": [{ r: "きた", ro: "kita", t: "kun", k: "北", alt: ["来た", "着た"], fr: "nord", en: "north" }],

  // ---- places & things ----
  "国": [{ r: "くに", ro: "kuni", t: "kun", k: "国", fr: "pays", en: "country" }],
  "道": [{ r: "みち", ro: "michi", t: "kun", k: "道", alt: ["未知"], fr: "chemin", en: "road" }],
  "店": [{ r: "みせ", ro: "mise", t: "kun", k: "店", alt: ["見せ"], fr: "magasin", en: "shop" }],
  "駅": [{ r: "えき", ro: "eki", t: "on", k: "駅", alt: ["液"], fr: "gare", en: "station" }],
  "車": [{ r: "くるま", ro: "kuruma", t: "kun", k: "車", fr: "voiture", en: "car" }],
  "先": [{ r: "さき", ro: "saki", t: "kun", k: "先", alt: ["咲き"], fr: "devant, plus loin", en: "ahead, tip" }],
  "何": [{ r: "なに", ro: "nani", t: "kun", k: "何", fr: "quoi", en: "what" }],
  // 本 (ほん), 円 (えん), 語 (ご), 校 (こう), 社 (しゃ), 電, 学 (がく): one syllable,
  // or a reading that only ever appears inside a compound.

  // ---- descriptions (plain form) ----
  "大": [{ r: "おおきい", ro: "ōkii", t: "kun", k: "大きい", fr: "grand", en: "big" }],
  "小": [{ r: "ちいさい", ro: "chiisai", t: "kun", k: "小さい", fr: "petit", en: "small" }],
  "高": [{ r: "たかい", ro: "takai", t: "kun", k: "高い", fr: "haut, cher", en: "tall, expensive" }],
  "安": [{ r: "やすい", ro: "yasui", t: "kun", k: "安い", alt: ["易い"], fr: "bon marché", en: "cheap" }],
  "新": [{ r: "あたらしい", ro: "atarashii", t: "kun", k: "新しい", fr: "nouveau", en: "new" }],
  "古": [{ r: "ふるい", ro: "furui", t: "kun", k: "古い", fr: "vieux", en: "old" }],
  "長": [{ r: "ながい", ro: "nagai", t: "kun", k: "長い", alt: ["永い"], fr: "long", en: "long" }],
  "多": [{ r: "おおい", ro: "ōi", t: "kun", k: "多い", alt: ["覆い"], fr: "nombreux", en: "many" }],
  "少": [{ r: "すこし", ro: "sukoshi", t: "kun", k: "少し", fr: "un peu", en: "a little" }],
  "白": [{ r: "しろい", ro: "shiroi", t: "kun", k: "白い", fr: "blanc", en: "white" }],

  // ---- actions (plain form) ----
  "見": [{ r: "みる", ro: "miru", t: "kun", k: "見る", alt: ["観る", "診る"], fr: "voir, regarder", en: "to see, to watch" }],
  "言": [{ r: "いう", ro: "iu", t: "kun", k: "言う", alt: ["結う"], fr: "dire", en: "to say" }],
  "話": [{ r: "はなす", ro: "hanasu", t: "kun", k: "話す", alt: ["離す", "放す"], fr: "parler", en: "to speak" }],
  "聞": [{ r: "きく", ro: "kiku", t: "kun", k: "聞く", alt: ["聴く", "効く", "菊"], fr: "écouter, demander", en: "to listen, to ask" }],
  "読": [{ r: "よむ", ro: "yomu", t: "kun", k: "読む", alt: ["詠む"], fr: "lire", en: "to read" }],
  "書": [{ r: "かく", ro: "kaku", t: "kun", k: "書く", alt: ["描く", "欠く"], fr: "écrire", en: "to write" }],
  "行": [{ r: "いく", ro: "iku", t: "kun", k: "行く", alt: ["逝く"], fr: "aller", en: "to go" }],
  "来": [{ r: "くる", ro: "kuru", t: "kun", k: "来る", alt: ["繰る"], fr: "venir", en: "to come" }],
  "出": [{ r: "でる", ro: "deru", t: "kun", k: "出る", fr: "sortir", en: "to go out" }],
  "入": [{ r: "はいる", ro: "hairu", t: "kun", k: "入る", fr: "entrer", en: "to enter" }],
  "会": [{ r: "あう", ro: "au", t: "kun", k: "会う", alt: ["合う", "遭う"], fr: "rencontrer", en: "to meet" }],
  "休": [{ r: "やすむ", ro: "yasumu", t: "kun", k: "休む", fr: "se reposer", en: "to rest" }],
  "食": [{ r: "たべる", ro: "taberu", t: "kun", k: "食べる", fr: "manger", en: "to eat" }],
  "飲": [{ r: "のむ", ro: "nomu", t: "kun", k: "飲む", alt: ["呑む"], fr: "boire", en: "to drink" }],
  "買": [{ r: "かう", ro: "kau", t: "kun", k: "買う", alt: ["飼う"], fr: "acheter", en: "to buy" }],
  "立": [{ r: "たつ", ro: "tatsu", t: "kun", k: "立つ", alt: ["建つ", "経つ"], fr: "se tenir debout", en: "to stand" }],
  "学": [{ r: "まなぶ", ro: "manabu", t: "kun", k: "学ぶ", fr: "apprendre", en: "to learn" }],
  "分": [{ r: "わかる", ro: "wakaru", t: "kun", k: "分かる", alt: ["解る", "判る"], fr: "comprendre", en: "to understand" }],
  "生": [{ r: "いきる", ro: "ikiru", t: "kun", k: "生きる", fr: "vivre", en: "to live" }]
  // 子, 名, 友, 半, 毎, 週, 午, 電, 木, 気, 天, 十, 千, 万, 本, 円, 語, 校, 社, 目,
  // 手, 日, 火: no reading that is both a word on its own and long enough to be
  // recognised — these kanji are practised by writing and dictation only.
};
