// 献立の「料理の種類」。key はサーバー（server/suggestMenus.js の CUISINE_PROMPTS）と合わせる
export const CUISINES = [
  { key: 'otsumami', label: 'おつまみ', icon: '🍶' },
  { key: 'washoku', label: '和食', icon: '🍱' },
  { key: 'yoshoku', label: '洋食', icon: '🍝' },
  { key: 'chuka', label: '中華', icon: '🥟' },
  { key: 'korean', label: '韓国', icon: '🌶️' },
  { key: 'asian', label: 'アジアン', icon: '🍜' },
  { key: 'omakase', label: 'お任せ', icon: '✨' },
]

export const DEFAULT_CUISINE = 'omakase'
// 選んだ種類は、次に開いたときも残す（この端末だけ）
const CUISINE_KEY = 'pantry-cuisine'

export function getCuisineInfo(key) {
  return CUISINES.find((cuisine) => cuisine.key === key) ?? CUISINES.find((cuisine) => cuisine.key === DEFAULT_CUISINE)
}

export function loadCuisine() {
  try {
    const saved = localStorage.getItem(CUISINE_KEY)
    return CUISINES.some((cuisine) => cuisine.key === saved) ? saved : DEFAULT_CUISINE
  } catch {
    return DEFAULT_CUISINE
  }
}

export function saveCuisine(key) {
  try {
    localStorage.setItem(CUISINE_KEY, key)
  } catch {
    // 保存できなくても選択自体はできる
  }
}
