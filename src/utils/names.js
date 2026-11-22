// 食材名の照合。サーバー側の server/suggestMenus.js にも同じ処理がある（変えるときは両方そろえる）

// カタカナはひらがなにそろえる（「サバ」と「さば」を同じとみなす）
function normalizeText(value) {
  return value
    .replace(/[\s　（）()「」・]/g, '')
    .replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
    .toLowerCase()
}

// 食材名は、かっこの中（「（国産）」「（冷凍・むき）」など）も外してから比べる
function normalizeName(value) {
  return normalizeText(value.replace(/[（(][^）)]*[）)]/g, ''))
}

// 片方にだけ付いていたら別の食材とみなす言葉（「えび」と「干し小えび」、「鶏」と「鶏がらすーぷの素」など）
const PROCESSED_WORDS = ['干し', 'ほし', '乾燥', '粉', 'ぱうだー', '素', 'だし', 'えきす', 'そーす', 'ふれーく', '風味']

function hasProcessedDifference(x, y) {
  return PROCESSED_WORDS.some((word) => x.includes(word) !== y.includes(word))
}

// 同じ食材とみなす条件：短いほうが長いほうの最後に付いている（「冷凍えび」と「えび」）、
// または後ろに1文字足しただけ（「鶏もも」と「鶏もも肉」）。「えび天かす」と「えび」は別
export function namesMatch(a, b) {
  const x = normalizeName(a)
  const y = normalizeName(b)
  if (x === '' || y === '') return false
  const [short, long] = x.length <= y.length ? [x, y] : [y, x]
  const isSameFood = long.endsWith(short) || (long.startsWith(short) && long.length - short.length <= 1)
  return isSameFood && !hasProcessedDifference(x, y)
}

// 候補の中から、target と同じ食材で一番近い名前（余分な文字が少ないもの）を返す。なければ undefined
export function findBestMatch(names, target) {
  const length = normalizeName(target).length
  return names
    .filter((name) => namesMatch(name, target))
    .sort((a, b) => Math.abs(normalizeName(a).length - length) - Math.abs(normalizeName(b).length - length))[0]
}
