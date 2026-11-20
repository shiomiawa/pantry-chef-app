// カタカナはひらがなにそろえる（「サバ」と「さば」を同じとみなす）
function normalizeName(value) {
  return value
    .replace(/[\s　（）()「」・]/g, '')
    .replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
    .toLowerCase()
}

// 「鶏もも肉」と「鶏もも肉（国産）」のように、片方がもう片方を含めば同じ食材とみなす
export function namesMatch(a, b) {
  const x = normalizeName(a)
  const y = normalizeName(b)
  return x !== '' && y !== '' && (x.includes(y) || y.includes(x))
}
