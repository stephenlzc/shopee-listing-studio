/**
 * Shopee 圖片用途描述映射工具
 */

import type { ImagePrompt } from '../types/shopee';

/**
 * Get the purpose/description of an image prompt.
 */
export function getImageDescription(prompt: ImagePrompt): string {
  return prompt.purpose || prompt.title || `${prompt.role} 圖片`;
}

/**
 * Generate an image description map from ImagePrompt array.
 * Returns Map<filename, description>
 */
export function generateImageDescriptionMap(prompts: ImagePrompt[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of prompts) {
    map.set(`${p.id}.png`, getImageDescription(p));
  }
  return map;
}
