/**
 * 輸入驗證工具 — Shopee Edition
 */

import type { SkuOption } from '../types/shopee';

// ============================================================================
// Shopee Field Validators
// ============================================================================

const VALID_PRODUCT_TYPES = ['護膚', '美妝', '髮品', '身體護理', '其他'] as const;

const VALID_VISUAL_STYLES = [
  'fresh-watery', 'creamy-soft', 'clean-refreshing', 'botanical-natural', 'premium-minimal',
  'girly-sweet', 'gentle-elegant', 'bold-playful', 'calm-serene', 'luxury-golden',
  'lifestyle-home', 'office-professional', 'dorm-young', 'gym-active', 'spa-resort',
  'tech-transparent', 'gift-box', 'gen-z-impact', 'retro-vintage', 'tropical-island',
] as const;

export const validateProductName = (name: string): { valid: boolean; error?: string } => {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: '產品名稱不能為空' };
  }
  if (name.length > 100) {
    return { valid: false, error: '產品名稱不能超過 100 個字元' };
  }
  return { valid: true };
};

export const validateBrandContext = (context: string): { valid: boolean; error?: string } => {
  if (context.length > 5000) {
    return { valid: false, error: '品牌資訊不能超過 5000 個字元' };
  }
  return { valid: true };
};

export const validateProductType = (type: string): { valid: boolean; error?: string } => {
  if (!type || !VALID_PRODUCT_TYPES.includes(type as typeof VALID_PRODUCT_TYPES[number])) {
    return { valid: false, error: `請選擇有效的產品類型（${VALID_PRODUCT_TYPES.join('/')}）` };
  }
  return { valid: true };
};

export const validateFeatures = (features: string[]): { valid: boolean; error?: string } => {
  if (!features || features.length === 0) {
    return { valid: false, error: '請至少輸入一個產品特色' };
  }
  if (features.length > 5) {
    return { valid: false, error: '產品特色最多 5 個' };
  }
  for (const f of features) {
    if (f.trim().length === 0) {
      return { valid: false, error: '產品特色不能為空' };
    }
    if (f.length > 50) {
      return { valid: false, error: '每條產品特色不能超過 50 個字元' };
    }
  }
  return { valid: true };
};

export const validateVisualStyle = (style: string): { valid: boolean; error?: string } => {
  if (!style || !VALID_VISUAL_STYLES.includes(style as typeof VALID_VISUAL_STYLES[number])) {
    return { valid: false, error: '請選擇有效的視覺風格' };
  }
  return { valid: true };
};

export const validateSkuOptions = (opts: SkuOption[]): { valid: boolean; error?: string } => {
  if (!opts || opts.length === 0) return { valid: true };
  for (const opt of opts) {
    if (!opt.sku || opt.sku.trim().length === 0) {
      return { valid: false, error: 'SKU 代號不能為空' };
    }
    if (!opt.emojiName || opt.emojiName.trim().length === 0) {
      return { valid: false, error: 'SKU 名稱不能為空' };
    }
  }
  return { valid: true };
};
