/**
 * Compliance Utility — Shopee 禁用詞過濾與替換
 *
 * 用於：Listing 生成階段自動過濾禁用詞、圖片文案合規檢查
 * 參考：TRANSFORMATION.md §6.1, §8 合規檢查系統
 */

// ============================================================================
// Banned Word Replacement Map (50+ rules)
// ============================================================================

export const COMPLIANCE_REPLACEMENTS: Record<string, string> = {
  // --- 功效承諾詞 (Efficacy Claims) ---
  '美白': '透亮感',
  '祛斑': '日常保養',
  '淡斑': '日常保養',
  '祛痘': '清爽保養',
  '去痘': '清爽保養',
  '消炎': '日常呵護',
  '抗皺': '熟齡保養感',
  '抗老': '熟齡保養',
  '緊緻': '彈潤感',
  '拉提': '彈潤感',
  '除皺': '熟齡保養',
  '除斑': '透亮感',
  '去角質': '溫和清潔',
  '縮毛孔': '細緻肌膚',
  '控油': '清爽調理',
  '止汗': '體感清爽',

  // --- 醫療相關 (Medical) ---
  '治療': '日常使用',
  '藥用': '日常使用',
  '療效': '日常保養',
  '治癒': '日常呵護',
  '處方': '配方',
  '藥品': '產品',
  '藥膏': '保養品',
  '痊癒': '日常保養',

  // --- 誇大宣稱 (Exaggerated Claims) ---
  '100%有效': '日常保養',
  '立即見效': '日常保養',
  '一夜變白': '日常保養',
  '瞬間': '快速',
  '全網爆款': '熱門保養',
  '秒殺': '熱門推薦',
  '神器': '好物',
  '黑科技': '創新配方',
  '神級': '優質',
  '零瑕疵': '日常保養',
  '完美': '理想',
  '永久': '長效',
  '終極': '全面',
  '奇蹟': '有感',

  // --- 敏感肌/特殊人群 (Sensitive Groups) ---
  '敏感肌專用': '初次使用建議先做局部測試',
  '孕婦可用': '初次使用建議先做局部測試',
  '嬰幼兒可用': '初次使用建議先做局部測試',
  '醫美術後': '初次使用建議先做局部測試',
  '過敏性肌膚': '肌膚類型因人而異，建議先做局部測試',

  // --- 絕對化用語 (Absolute Terms) ---
  '最高': '優質',
  '最低': '合理',
  '第一': '熱門',
  '唯一': '推薦',
  '最好': '優質',
  '最佳': '理想',
  '最強': '有感',
  '全球': '市售',

  // --- 比較性宣稱 (Comparative Claims) ---
  '比專櫃好': '日常好選擇',
  '超越醫美': '日常保養',
  '勝過雷射': '日常保養',
  '取代手術': '日常保養',

  // --- 保證性用語 (Guarantee Terms) ---
  '保證有效': '有感保養',
  '保證見效': '有感保養',
  '無效退費': '安心選購',
  '保證滿意': '安心選購',
};

// ============================================================================
// Filter Functions
// ============================================================================

/**
 * Replace all banned words in a text string with safe alternatives.
 * Replaces the LONGEST matches first to avoid partial-word conflicts.
 */
export function filterBannedWords(text: string): {
  filteredText: string;
  replacements: Array<{ original: string; replacement: string }>;
} {
  const replacements: Array<{ original: string; replacement: string }> = [];

  // Sort by key length descending to prioritize longer matches
  const sortedKeys = Object.keys(COMPLIANCE_REPLACEMENTS).sort(
    (a, b) => b.length - a.length,
  );

  let result = text;
  for (const word of sortedKeys) {
    if (result.includes(word)) {
      const replacement = COMPLIANCE_REPLACEMENTS[word];
      result = result.replaceAll(word, replacement);
      replacements.push({ original: word, replacement });
    }
  }

  return { filteredText: result, replacements };
}

/**
 * Check if a text contains any banned words.
 * Returns the list of banned words found.
 */
export function findBannedWords(text: string): string[] {
  const found: string[] = [];
  for (const word of Object.keys(COMPLIANCE_REPLACEMENTS)) {
    if (text.includes(word)) {
      found.push(word);
    }
  }
  return found;
}

/**
 * Generate a compliance report string for a text.
 */
export function generateComplianceReport(
  text: string,
  context: string = 'Listing',
): string {
  const { replacements } = filterBannedWords(text);

  if (replacements.length === 0) {
    return `[${context}] 合規檢查通過：未發現禁用詞。`;
  }

  let report = `[${context}] 合規檢查 — 發現 ${replacements.length} 個禁用詞：\n`;
  for (const { original, replacement } of replacements) {
    report += `  ❌ 「${original}」→ ✅ 「${replacement}」\n`;
  }
  return report;
}
