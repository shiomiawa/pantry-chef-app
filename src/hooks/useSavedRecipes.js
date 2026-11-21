import { useEffect, useState } from 'react'
import { DATA_REPLACED_EVENT, saveSyncedJson } from '../sync/syncClient.js'
import { RECIPE_GENRES } from '../utils/cuisine.js'

const STORAGE_KEY = 'pantry-saved-recipes'
export const MAX_SAVED_RECIPES = 30

function loadRecipes() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

// crypto.randomUUID は http の LAN アドレス（スマホ実機確認など）では使えないため代替を用意する
function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// 保存したレシピ。1件は { id, title, genre, ingredients: [{ name, amount }], steps, reason, savedAt }
// 「使う在庫」と「足りない食材」は保存した時点の在庫による区別なので、材料（ingredients）にまとめる
export function useSavedRecipes() {
  const [recipes, setRecipes] = useState(loadRecipes)

  // 保存（保存できない環境でも画面は動かし続ける）。同期を使っている端末では、変更をサーバーへ送る
  useEffect(() => {
    saveSyncedJson(STORAGE_KEY, recipes)
  }, [recipes])

  // ほかの端末のデータが同期で届いたら読み直す
  useEffect(() => {
    function reload() {
      setRecipes(loadRecipes())
    }
    window.addEventListener(DATA_REPLACED_EVENT, reload)
    return () => window.removeEventListener(DATA_REPLACED_EVENT, reload)
  }, [])

  function isSaved(title) {
    return recipes.some((recipe) => recipe.title === title)
  }

  // 戻り値：{ ok: true } / { ok: false, reason: 'duplicate' | 'full' }
  function saveRecipe(menu) {
    if (isSaved(menu.title)) return { ok: false, reason: 'duplicate' }
    if (recipes.length >= MAX_SAVED_RECIPES) return { ok: false, reason: 'full' }
    const genre = RECIPE_GENRES.some((g) => g.key === menu.genre) ? menu.genre : 'other'
    const recipe = {
      id: createId(),
      title: menu.title,
      genre,
      ingredients: [...menu.uses, ...menu.missing].map(({ name, amount }) => ({ name, amount })),
      steps: menu.steps,
      reason: menu.reason ?? '',
      savedAt: new Date().toISOString(),
    }
    setRecipes((prev) => [recipe, ...prev])
    return { ok: true }
  }

  function removeRecipe(id) {
    setRecipes((prev) => prev.filter((recipe) => recipe.id !== id))
  }

  function updateGenre(id, genre) {
    setRecipes((prev) => prev.map((recipe) => (recipe.id === id ? { ...recipe, genre } : recipe)))
  }

  return { recipes, isSaved, saveRecipe, removeRecipe, updateGenre }
}
