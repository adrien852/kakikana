// ===== Dictation set =====
// Kanji that can be dictated safely: the audio is a complete, standalone word
// written with EXACTLY this one kanji — no okurigana, no compound — and no other
// kanji in the app is that word.
//
// Deliberately excluded:
//  · one-mora readings (ひ, き, め, て, こ, な, に, ご…) — too short to hear reliably,
//    and several collide (ひ = 日 and 火, き = 木 and 気).
//  · anything needing okurigana (見る, 大きい, 後ろ) or a compound (名前, 日本語).
//  · きた (北) — indistinguishable from 来た by ear.
//  · readings that only exist inside compounds (半, 分, 週, 午, 電, 学, 校…).
// r = the spoken word, ro = romaji shown on reveal.
window.DICTATION = {
  // numbers
  "一": { r: "いち", ro: "ichi" },
  "三": { r: "さん", ro: "san" },
  "四": { r: "よん", ro: "yon" },
  "六": { r: "ろく", ro: "roku" },
  "七": { r: "なな", ro: "nana" },
  "八": { r: "はち", ro: "hachi" },
  "九": { r: "きゅう", ro: "kyū" },
  "十": { r: "じゅう", ro: "jū" },
  "百": { r: "ひゃく", ro: "hyaku" },
  "千": { r: "せん", ro: "sen" },
  "円": { r: "えん", ro: "en" },
  // nature
  "山": { r: "やま", ro: "yama" },
  "川": { r: "かわ", ro: "kawa" },
  "水": { r: "みず", ro: "mizu" },
  "空": { r: "そら", ro: "sora" },
  "花": { r: "はな", ro: "hana" },
  "魚": { r: "さかな", ro: "sakana" },
  "雨": { r: "あめ", ro: "ame" },
  "土": { r: "つち", ro: "tsuchi" },
  "金": { r: "かね", ro: "kane" },
  "月": { r: "つき", ro: "tsuki" },
  // people & body
  "人": { r: "ひと", ro: "hito" },
  "男": { r: "おとこ", ro: "otoko" },
  "女": { r: "おんな", ro: "onna" },
  "父": { r: "ちち", ro: "chichi" },
  "母": { r: "はは", ro: "haha" },
  "私": { r: "わたし", ro: "watashi" },
  "口": { r: "くち", ro: "kuchi" },
  "耳": { r: "みみ", ro: "mimi" },
  "足": { r: "あし", ro: "ashi" },
  // things & places
  "本": { r: "ほん", ro: "hon" },
  "車": { r: "くるま", ro: "kuruma" },
  "道": { r: "みち", ro: "michi" },
  "店": { r: "みせ", ro: "mise" },
  "駅": { r: "えき", ro: "eki" },
  "国": { r: "くに", ro: "kuni" },
  "白": { r: "しろ", ro: "shiro" },
  "何": { r: "なに", ro: "nani" },
  // time
  "時": { r: "とき", ro: "toki" },
  "年": { r: "とし", ro: "toshi" },
  "間": { r: "あいだ", ro: "aida" },
  "今": { r: "いま", ro: "ima" },
  // positions
  "上": { r: "うえ", ro: "ue" },
  "下": { r: "した", ro: "shita" },
  "中": { r: "なか", ro: "naka" },
  "外": { r: "そと", ro: "soto" },
  "前": { r: "まえ", ro: "mae" },
  "左": { r: "ひだり", ro: "hidari" },
  "右": { r: "みぎ", ro: "migi" },
  "東": { r: "ひがし", ro: "higashi" },
  "西": { r: "にし", ro: "nishi" },
  "南": { r: "みなみ", ro: "minami" }
};
