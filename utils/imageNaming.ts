/**
 * Shopee 圖片命名規則工具
 *
 * 命名規範：
 * - 主圖：main-01 ~ main-06
 * - 詳情圖：detail-01 ~ detail-04
 * - SKU 圖：sku-01 ~ sku-N
 * - 產品底圖：product-base-01
 */

import type { ImagePrompt } from '../types/shopee';

/**
 * Generate a Shopee-standard image filename for an ImagePrompt.
 */
export function generateImageFileName(prompt: ImagePrompt): string {
  return `${prompt.id}.png`;
}

/**
 * Generate filename map from ImagePrompt array.
 * Returns Map<promptId, filename>
 */
export function generateFileNameMap(prompts: ImagePrompt[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of prompts) {
    map.set(p.id, generateImageFileName(p));
  }
  return map;
}
