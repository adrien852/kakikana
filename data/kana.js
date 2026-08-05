// Kana dataset — gojūon order. ex = example word {jp, r(omaji), fr, en}
// origin = kanji the kana derives from (shodō lineage)
window.KANA = {
  hiragana: {
    base: [
      { row: "a", kana: [
        { k: "あ", r: "a", origin: "安", ex: { jp: "あさ", r: "asa", fr: "matin", en: "morning" } },
        { k: "い", r: "i", origin: "以", ex: { jp: "いぬ", r: "inu", fr: "chien", en: "dog" } },
        { k: "う", r: "u", origin: "宇", ex: { jp: "うみ", r: "umi", fr: "mer", en: "sea" } },
        { k: "え", r: "e", origin: "衣", ex: { jp: "えき", r: "eki", fr: "gare", en: "station" } },
        { k: "お", r: "o", origin: "於", ex: { jp: "おちゃ", r: "ocha", fr: "thé", en: "tea" } } ] },
      { row: "ka", kana: [
        { k: "か", r: "ka", origin: "加", ex: { jp: "かさ", r: "kasa", fr: "parapluie", en: "umbrella" } },
        { k: "き", r: "ki", origin: "幾", ex: { jp: "きって", r: "kitte", fr: "timbre", en: "stamp" } },
        { k: "く", r: "ku", origin: "久", ex: { jp: "くつ", r: "kutsu", fr: "chaussures", en: "shoes" } },
        { k: "け", r: "ke", origin: "計", ex: { jp: "けさ", r: "kesa", fr: "ce matin", en: "this morning" } },
        { k: "こ", r: "ko", origin: "己", ex: { jp: "こども", r: "kodomo", fr: "enfant", en: "child" } } ] },
      { row: "sa", kana: [
        { k: "さ", r: "sa", origin: "左", ex: { jp: "さかな", r: "sakana", fr: "poisson", en: "fish" } },
        { k: "し", r: "shi", origin: "之", ex: { jp: "しお", r: "shio", fr: "sel", en: "salt" } },
        { k: "す", r: "su", origin: "寸", ex: { jp: "すし", r: "sushi", fr: "sushi", en: "sushi" } },
        { k: "せ", r: "se", origin: "世", ex: { jp: "せんせい", r: "sensei", fr: "professeur", en: "teacher" } },
        { k: "そ", r: "so", origin: "曽", ex: { jp: "そら", r: "sora", fr: "ciel", en: "sky" } } ] },
      { row: "ta", kana: [
        { k: "た", r: "ta", origin: "太", ex: { jp: "たまご", r: "tamago", fr: "œuf", en: "egg" } },
        { k: "ち", r: "chi", origin: "知", ex: { jp: "ちず", r: "chizu", fr: "carte (plan)", en: "map" } },
        { k: "つ", r: "tsu", origin: "川", ex: { jp: "つくえ", r: "tsukue", fr: "bureau (meuble)", en: "desk" } },
        { k: "て", r: "te", origin: "天", ex: { jp: "てがみ", r: "tegami", fr: "lettre", en: "letter" } },
        { k: "と", r: "to", origin: "止", ex: { jp: "とり", r: "tori", fr: "oiseau", en: "bird" } } ] },
      { row: "na", kana: [
        { k: "な", r: "na", origin: "奈", ex: { jp: "なつ", r: "natsu", fr: "été", en: "summer" } },
        { k: "に", r: "ni", origin: "仁", ex: { jp: "にく", r: "niku", fr: "viande", en: "meat" } },
        { k: "ぬ", r: "nu", origin: "奴", ex: { jp: "ぬの", r: "nuno", fr: "tissu", en: "cloth" } },
        { k: "ね", r: "ne", origin: "祢", ex: { jp: "ねこ", r: "neko", fr: "chat", en: "cat" } },
        { k: "の", r: "no", origin: "乃", ex: { jp: "のみもの", r: "nomimono", fr: "boisson", en: "drink" } } ] },
      { row: "ha", kana: [
        { k: "は", r: "ha", origin: "波", ex: { jp: "はな", r: "hana", fr: "fleur", en: "flower" } },
        { k: "ひ", r: "hi", origin: "比", ex: { jp: "ひと", r: "hito", fr: "personne", en: "person" } },
        { k: "ふ", r: "fu", origin: "不", ex: { jp: "ふゆ", r: "fuyu", fr: "hiver", en: "winter" } },
        { k: "へ", r: "he", origin: "部", ex: { jp: "へや", r: "heya", fr: "chambre", en: "room" } },
        { k: "ほ", r: "ho", origin: "保", ex: { jp: "ほし", r: "hoshi", fr: "étoile", en: "star" } } ] },
      { row: "ma", kana: [
        { k: "ま", r: "ma", origin: "末", ex: { jp: "まど", r: "mado", fr: "fenêtre", en: "window" } },
        { k: "み", r: "mi", origin: "美", ex: { jp: "みず", r: "mizu", fr: "eau", en: "water" } },
        { k: "む", r: "mu", origin: "武", ex: { jp: "むし", r: "mushi", fr: "insecte", en: "insect" } },
        { k: "め", r: "me", origin: "女", ex: { jp: "め", r: "me", fr: "œil", en: "eye" } },
        { k: "も", r: "mo", origin: "毛", ex: { jp: "もり", r: "mori", fr: "forêt", en: "forest" } } ] },
      { row: "ya", kana: [
        { k: "や", r: "ya", origin: "也", ex: { jp: "やま", r: "yama", fr: "montagne", en: "mountain" } },
        { k: "ゆ", r: "yu", origin: "由", ex: { jp: "ゆき", r: "yuki", fr: "neige", en: "snow" } },
        { k: "よ", r: "yo", origin: "与", ex: { jp: "よる", r: "yoru", fr: "nuit", en: "night" } } ] },
      { row: "ra", kana: [
        { k: "ら", r: "ra", origin: "良", ex: { jp: "らいねん", r: "rainen", fr: "l'année prochaine", en: "next year" } },
        { k: "り", r: "ri", origin: "利", ex: { jp: "りんご", r: "ringo", fr: "pomme", en: "apple" } },
        { k: "る", r: "ru", origin: "留", ex: { jp: "はる", r: "haru", fr: "printemps", en: "spring" } },
        { k: "れ", r: "re", origin: "礼", ex: { jp: "れい", r: "rei", fr: "zéro", en: "zero" } },
        { k: "ろ", r: "ro", origin: "呂", ex: { jp: "いろ", r: "iro", fr: "couleur", en: "color" } } ] },
      { row: "wa", kana: [
        { k: "わ", r: "wa", origin: "和", ex: { jp: "わたし", r: "watashi", fr: "je / moi", en: "I / me" } },
        { k: "を", r: "wo (o)", origin: "遠", ex: { jp: "ほんをよむ", r: "hon o yomu", fr: "lire un livre (particule を)", en: "to read a book (particle を)" } },
        { k: "ん", r: "n", origin: "无", ex: { jp: "パン", r: "pan", fr: "pain", en: "bread" } } ] }
    ],
    dakuten: [
      { row: "ga", kana: [
        { k: "が", r: "ga", base: "か" }, { k: "ぎ", r: "gi", base: "き" }, { k: "ぐ", r: "gu", base: "く" },
        { k: "げ", r: "ge", base: "け" }, { k: "ご", r: "go", base: "こ" } ] },
      { row: "za", kana: [
        { k: "ざ", r: "za", base: "さ" }, { k: "じ", r: "ji", base: "し" }, { k: "ず", r: "zu", base: "す" },
        { k: "ぜ", r: "ze", base: "せ" }, { k: "ぞ", r: "zo", base: "そ" } ] },
      { row: "da", kana: [
        { k: "だ", r: "da", base: "た" }, { k: "ぢ", r: "ji", base: "ち" }, { k: "づ", r: "zu", base: "つ" },
        { k: "で", r: "de", base: "て" }, { k: "ど", r: "do", base: "と" } ] },
      { row: "ba", kana: [
        { k: "ば", r: "ba", base: "は" }, { k: "び", r: "bi", base: "ひ" }, { k: "ぶ", r: "bu", base: "ふ" },
        { k: "べ", r: "be", base: "へ" }, { k: "ぼ", r: "bo", base: "ほ" } ] },
      { row: "pa", kana: [
        { k: "ぱ", r: "pa", base: "は" }, { k: "ぴ", r: "pi", base: "ひ" }, { k: "ぷ", r: "pu", base: "ふ" },
        { k: "ぺ", r: "pe", base: "へ" }, { k: "ぽ", r: "po", base: "ほ" } ] }
    ],
    small: [
      { k: "ゃ", r: "ya (petit)", base: "や" }, { k: "ゅ", r: "yu (petit)", base: "ゆ" },
      { k: "ょ", r: "yo (petit)", base: "よ" }, { k: "っ", r: "tsu (petit)", base: "つ" }
    ]
  },
  katakana: {
    base: [
      { row: "a", kana: [
        { k: "ア", r: "a", origin: "阿", ex: { jp: "アイス", r: "aisu", fr: "glace", en: "ice cream" } },
        { k: "イ", r: "i", origin: "伊", ex: { jp: "イギリス", r: "igirisu", fr: "Angleterre", en: "England" } },
        { k: "ウ", r: "u", origin: "宇", ex: { jp: "ウール", r: "ūru", fr: "laine", en: "wool" } },
        { k: "エ", r: "e", origin: "江", ex: { jp: "エレベーター", r: "erebētā", fr: "ascenseur", en: "elevator" } },
        { k: "オ", r: "o", origin: "於", ex: { jp: "オレンジ", r: "orenji", fr: "orange", en: "orange" } } ] },
      { row: "ka", kana: [
        { k: "カ", r: "ka", origin: "加", ex: { jp: "カメラ", r: "kamera", fr: "appareil photo", en: "camera" } },
        { k: "キ", r: "ki", origin: "幾", ex: { jp: "キロ", r: "kiro", fr: "kilo", en: "kilo" } },
        { k: "ク", r: "ku", origin: "久", ex: { jp: "クラス", r: "kurasu", fr: "classe", en: "class" } },
        { k: "ケ", r: "ke", origin: "介", ex: { jp: "ケーキ", r: "kēki", fr: "gâteau", en: "cake" } },
        { k: "コ", r: "ko", origin: "己", ex: { jp: "コーヒー", r: "kōhī", fr: "café", en: "coffee" } } ] },
      { row: "sa", kana: [
        { k: "サ", r: "sa", origin: "散", ex: { jp: "サッカー", r: "sakkā", fr: "football", en: "soccer" } },
        { k: "シ", r: "shi", origin: "之", ex: { jp: "シャツ", r: "shatsu", fr: "chemise", en: "shirt" } },
        { k: "ス", r: "su", origin: "須", ex: { jp: "スポーツ", r: "supōtsu", fr: "sport", en: "sports" } },
        { k: "セ", r: "se", origin: "世", ex: { jp: "セーター", r: "sētā", fr: "pull", en: "sweater" } },
        { k: "ソ", r: "so", origin: "曽", ex: { jp: "ソース", r: "sōsu", fr: "sauce", en: "sauce" } } ] },
      { row: "ta", kana: [
        { k: "タ", r: "ta", origin: "多", ex: { jp: "タクシー", r: "takushī", fr: "taxi", en: "taxi" } },
        { k: "チ", r: "chi", origin: "千", ex: { jp: "チーズ", r: "chīzu", fr: "fromage", en: "cheese" } },
        { k: "ツ", r: "tsu", origin: "川", ex: { jp: "ツアー", r: "tsuā", fr: "excursion", en: "tour" } },
        { k: "テ", r: "te", origin: "天", ex: { jp: "テレビ", r: "terebi", fr: "télévision", en: "TV" } },
        { k: "ト", r: "to", origin: "止", ex: { jp: "トマト", r: "tomato", fr: "tomate", en: "tomato" } } ] },
      { row: "na", kana: [
        { k: "ナ", r: "na", origin: "奈", ex: { jp: "ナイフ", r: "naifu", fr: "couteau", en: "knife" } },
        { k: "ニ", r: "ni", origin: "仁", ex: { jp: "ニュース", r: "nyūsu", fr: "informations", en: "news" } },
        { k: "ヌ", r: "nu", origin: "奴", ex: { jp: "ヌードル", r: "nūdoru", fr: "nouilles", en: "noodles" } },
        { k: "ネ", r: "ne", origin: "祢", ex: { jp: "ネクタイ", r: "nekutai", fr: "cravate", en: "necktie" } },
        { k: "ノ", r: "no", origin: "乃", ex: { jp: "ノート", r: "nōto", fr: "cahier", en: "notebook" } } ] },
      { row: "ha", kana: [
        { k: "ハ", r: "ha", origin: "八", ex: { jp: "ハム", r: "hamu", fr: "jambon", en: "ham" } },
        { k: "ヒ", r: "hi", origin: "比", ex: { jp: "ヒーター", r: "hītā", fr: "chauffage", en: "heater" } },
        { k: "フ", r: "fu", origin: "不", ex: { jp: "フォーク", r: "fōku", fr: "fourchette", en: "fork" } },
        { k: "ヘ", r: "he", origin: "部", ex: { jp: "ヘリコプター", r: "herikoputā", fr: "hélicoptère", en: "helicopter" } },
        { k: "ホ", r: "ho", origin: "保", ex: { jp: "ホテル", r: "hoteru", fr: "hôtel", en: "hotel" } } ] },
      { row: "ma", kana: [
        { k: "マ", r: "ma", origin: "万", ex: { jp: "マスク", r: "masuku", fr: "masque", en: "mask" } },
        { k: "ミ", r: "mi", origin: "三", ex: { jp: "ミルク", r: "miruku", fr: "lait", en: "milk" } },
        { k: "ム", r: "mu", origin: "牟", ex: { jp: "ゲーム", r: "gēmu", fr: "jeu vidéo", en: "game" } },
        { k: "メ", r: "me", origin: "女", ex: { jp: "メール", r: "mēru", fr: "e-mail", en: "e-mail" } },
        { k: "モ", r: "mo", origin: "毛", ex: { jp: "メモ", r: "memo", fr: "note (mémo)", en: "memo" } } ] },
      { row: "ya", kana: [
        { k: "ヤ", r: "ya", origin: "也", ex: { jp: "タイヤ", r: "taiya", fr: "pneu", en: "tire" } },
        { k: "ユ", r: "yu", origin: "由", ex: { jp: "ユーモア", r: "yūmoa", fr: "humour", en: "humor" } },
        { k: "ヨ", r: "yo", origin: "與", ex: { jp: "ヨーロッパ", r: "yōroppa", fr: "Europe", en: "Europe" } } ] },
      { row: "ra", kana: [
        { k: "ラ", r: "ra", origin: "良", ex: { jp: "ラジオ", r: "rajio", fr: "radio", en: "radio" } },
        { k: "リ", r: "ri", origin: "利", ex: { jp: "リスト", r: "risuto", fr: "liste", en: "list" } },
        { k: "ル", r: "ru", origin: "流", ex: { jp: "ルール", r: "rūru", fr: "règle", en: "rule" } },
        { k: "レ", r: "re", origin: "礼", ex: { jp: "レストラン", r: "resutoran", fr: "restaurant", en: "restaurant" } },
        { k: "ロ", r: "ro", origin: "呂", ex: { jp: "ロボット", r: "robotto", fr: "robot", en: "robot" } } ] },
      { row: "wa", kana: [
        { k: "ワ", r: "wa", origin: "和", ex: { jp: "ワイン", r: "wain", fr: "vin", en: "wine" } },
        { k: "ヲ", r: "wo (o)", origin: "乎", ex: { jp: "ヲ", r: "o", fr: "particule (rare en katakana)", en: "particle (rare in katakana)" } },
        { k: "ン", r: "n", origin: "尓", ex: { jp: "パン", r: "pan", fr: "pain", en: "bread" } } ] }
    ],
    dakuten: [
      { row: "ga", kana: [
        { k: "ガ", r: "ga", base: "カ" }, { k: "ギ", r: "gi", base: "キ" }, { k: "グ", r: "gu", base: "ク" },
        { k: "ゲ", r: "ge", base: "ケ" }, { k: "ゴ", r: "go", base: "コ" } ] },
      { row: "za", kana: [
        { k: "ザ", r: "za", base: "サ" }, { k: "ジ", r: "ji", base: "シ" }, { k: "ズ", r: "zu", base: "ス" },
        { k: "ゼ", r: "ze", base: "セ" }, { k: "ゾ", r: "zo", base: "ソ" } ] },
      { row: "da", kana: [
        { k: "ダ", r: "da", base: "タ" }, { k: "ヂ", r: "ji", base: "チ" }, { k: "ヅ", r: "zu", base: "ツ" },
        { k: "デ", r: "de", base: "テ" }, { k: "ド", r: "do", base: "ト" } ] },
      { row: "ba", kana: [
        { k: "バ", r: "ba", base: "ハ" }, { k: "ビ", r: "bi", base: "ヒ" }, { k: "ブ", r: "bu", base: "フ" },
        { k: "ベ", r: "be", base: "ヘ" }, { k: "ボ", r: "bo", base: "ホ" } ] },
      { row: "pa", kana: [
        { k: "パ", r: "pa", base: "ハ" }, { k: "ピ", r: "pi", base: "ヒ" }, { k: "プ", r: "pu", base: "フ" },
        { k: "ペ", r: "pe", base: "ヘ" }, { k: "ポ", r: "po", base: "ホ" } ] }
    ],
    small: [
      { k: "ャ", r: "ya (petit)", base: "ヤ" }, { k: "ュ", r: "yu (petit)", base: "ユ" },
      { k: "ョ", r: "yo (petit)", base: "ヨ" }, { k: "ッ", r: "tsu (petit)", base: "ツ" },
      { k: "ー", r: "chōonpu (allongement)", base: null }
    ]
  }
};
