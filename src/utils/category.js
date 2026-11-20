// 食材のジャンル（5種類）。分類しにくいものは「その他」
export const CATEGORIES = [
  { key: 'meat', label: '肉', icon: '🍖' },
  { key: 'fish', label: '魚', icon: '🐟' },
  { key: 'vegetable', label: '野菜', icon: '🥕' },
  { key: 'seasoning', label: '調味料', icon: '🧂' },
  { key: 'other', label: 'その他', icon: '🍱' },
]

const CATEGORY_KEYS = CATEGORIES.map((category) => category.key)

// 名前に含まれる言葉で推測する。上から順に調べる（例：「ビーフカレー」は肉より先に「その他」、「鶏ガラスープの素」は肉より先に「調味料」）
const KEYWORD_RULES = [
  {
    key: 'other',
    words: [
      'レトルト', 'カレー', 'グラタン', 'インスタント', 'ピクルス', 'ふりかけ', '牛乳', 'ヨーグルト', 'チーズ',
      'バター', '卵', 'たまご', '玉子', '豆腐', '油揚げ', '厚揚げ', '納豆', '味付けのり', '酢豚',
    ],
  },
  {
    key: 'seasoning',
    words: [
      'の素', 'ソース', 'ルウ', 'ルー', 'だし', '出汁', 'コンソメ', 'ブイヨン', 'ドレッシング', 'ケチャップ',
      'マヨネーズ', 'しょうゆ', '醤油', 'みそ', '味噌', 'ポン酢', 'ぽん酢', 'めんつゆ', '酢', 'ビネガー', 'みりん',
      '料理酒', '油', 'オイル', 'スパイス', 'ペッパー', 'こしょう', '胡椒', '七味', '一味', 'わさび', 'からし',
      '砂糖', '片栗粉', 'ハーブ', 'はちみつ', 'ガラスープ', 'ナンプラー', 'オイスター', '豆板醤', 'コチュジャン',
    ],
  },
  {
    key: 'meat',
    words: [
      '肉', '牛', '豚', '鶏', 'ささみ', '手羽', 'ベーコン', 'ハム', 'ソーセージ', 'ウインナー', 'チキン', 'ポーク',
      'ビーフ', 'レバー', 'サラダチキン',
    ],
  },
  {
    key: 'fish',
    words: [
      '魚', '鮭', 'さけ', 'サーモン', 'まぐろ', 'マグロ', 'ツナ', 'さば', 'サバ', '鯖', 'あじ', 'アジ', 'いわし',
      'ぶり', 'たら', 'えび', 'エビ', '海老', 'いか', 'イカ', 'たこ', 'タコ', 'あさり', 'しじみ', 'しらす',
      'ちりめん', 'かに', 'カニ', 'ほたて', 'ホタテ', '刺身', '切り身', 'かつお', '明太', 'うなぎ', 'さんま',
      'かまぼこ', 'ちくわ', 'はんぺん',
    ],
  },
  {
    key: 'vegetable',
    words: [
      '野菜', 'にんじん', '人参', 'ニンジン', '玉ねぎ', 'たまねぎ', '玉葱', 'ねぎ', 'ネギ', '葱', 'キャベツ',
      'レタス', 'トマト', 'きゅうり', 'キュウリ', 'なす', 'ナス', 'ピーマン', 'パプリカ', 'ほうれん草', '小松菜',
      '白菜', '大根', 'じゃがいも', 'ジャガイモ', 'さつまいも', '里芋', '長芋', 'かぼちゃ', 'ブロッコリー',
      'もやし', 'ごぼう', 'れんこん', 'しめじ', 'えのき', 'しいたけ', '椎茸', 'まいたけ', 'エリンギ', 'きのこ',
      'アボカド', 'ズッキーニ', 'セロリ', '水菜', 'にら', 'ニラ', 'オクラ', 'いんげん', 'しょうが', '生姜',
      'にんにく', 'ニンニク', '大葉', '三つ葉', '豆苗', 'とうもろこし', 'コーン', '枝豆', 'アスパラ', 'かぶ',
      'チンゲン菜', 'ゴーヤ', 'みょうが', 'カリフラワー', 'ベビーリーフ',
    ],
  },
]

export function guessCategory(name) {
  const text = (name ?? '').trim()
  if (text === '塩' || text.endsWith('塩')) return 'seasoning' // 「塩鮭」は魚のまま
  for (const rule of KEYWORD_RULES) {
    if (rule.words.some((word) => text.includes(word))) return rule.key
  }
  return 'other'
}

export function isCategoryKey(value) {
  return CATEGORY_KEYS.includes(value)
}

// 保存されたジャンルがあればそれを、なければ名前から推測したジャンルを使う
export function getItemCategory(item) {
  return isCategoryKey(item.category) ? item.category : guessCategory(item.name)
}

export function getCategoryInfo(key) {
  return CATEGORIES.find((category) => category.key === key) ?? CATEGORIES[CATEGORIES.length - 1]
}

// CSVの「ジャンル」列の値（肉・魚・野菜・調味料・その他、または英語のキー）を読む。読めなければ null
export function normalizeCategory(raw) {
  const value = raw.trim()
  if (isCategoryKey(value)) return value
  const found = CATEGORIES.find((category) => category.label === value)
  return found ? found.key : null
}
