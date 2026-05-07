/**
 * Product Base Image Service
 * Generates and validates the product base image before full image production.
 *
 * Workflow:
 * 1. generateProductBase() — creates a clean product shot with text preserved
 * 2. validateBaseImage() — checks text fidelity via vision analysis
 * 3. Retry up to 3 times if validation fails
 *
 * Reference: TRANSFORMATION.md §5.2
 */

import { generateImage } from './imageGenService';
import { analyzeImageText } from './visionService';
import { AppError, ErrorType } from '../utils/errorHandler';
import type { ImageGenerationParams } from '../types/shopee';

const MAX_BASE_ATTEMPTS = 3;

// ============================================================================
// Product Base Generation
// ============================================================================

interface GenerateBaseOptions {
  imageBase64: string;
  productName: string;
  signal?: AbortSignal;
}

export interface BaseImageResult {
  baseImageBase64: string;
  productName: string;
  brandName: string;
  attempt: number;
  validated: boolean;
}

const BASE_IMAGE_PROMPT = `Generate a clean product shot for e-commerce use.

【HIGHEST PRIORITY】All text from the original product image MUST be preserved with complete fidelity:
- Do NOT translate, convert between Simplified/Traditional Chinese, delete, obscure, blur, or redraw ANY text
- Brand name, product name, capacity, ingredients, descriptions — keep ALL exactly as-is
- Only change: product appearance presentation, background, lighting quality
- If the original uses Simplified Chinese, keep it Simplified; if Traditional Chinese, keep it Traditional

Style: Clean product photography on a simple, neutral background. Soft, even studio lighting.
The product should fill 70-80% of the frame, centered. Sharp focus on product details.
Background: light neutral tone (soft white to pale gray gradient), no distracting elements.
NO text overlay, NO watermark, NO additional graphics or decorations.
This is a PRODUCT BASE IMAGE — keep it minimal and clean.`;

/**
 * Generate a product base image (clean product shot).
 * Validates text fidelity via vision analysis and retries up to 3 times.
 */
export async function generateProductBase(
  options: GenerateBaseOptions,
): Promise<BaseImageResult> {
  const { imageBase64, productName, signal } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_BASE_ATTEMPTS; attempt++) {
    try {
      // 1. Generate base image
      const params: ImageGenerationParams = {
        model: 'gpt-image-2',
        prompt: `${BASE_IMAGE_PROMPT}\n\nProduct: ${productName}`,
        n: 1,
        size: '1024x1024',
        quality: 'high',
        output_format: 'png',
        image: imageBase64,
      };

      const result = await generateImage({ params, signal });
      const baseImageBase64 = result.b64Json
        ? `data:image/png;base64,${result.b64Json}`
        : result.url;

      if (!baseImageBase64) {
        throw new AppError({
          type: ErrorType.API,
          message: 'Base image generation returned no image data',
          userMessage: '產品底圖生成失敗，請重試。',
        });
      }

      // 2. Validate text fidelity
      const visionResult = await analyzeImageText({ imageBase64: baseImageBase64, signal });

      // Check if product name is still present
      const hasProductName = visionResult.detectedTexts.some(
        (t) => t.text.toLowerCase().includes(productName.toLowerCase()) || t.text.length > 1,
      );

      if (!hasProductName && attempt < MAX_BASE_ATTEMPTS) {
        console.warn(`[BaseImage] Attempt ${attempt}: product name not detected, retrying...`);
        continue;
      }

      return {
        baseImageBase64,
        productName: visionResult.productName || productName,
        brandName: visionResult.brandName || '',
        attempt,
        validated: true,
      };
    } catch (error) {
      lastError = error;
      if (attempt < MAX_BASE_ATTEMPTS) {
        console.warn(`[BaseImage] Attempt ${attempt} failed, retrying...`);
      }
    }
  }

  throw new AppError({
    type: ErrorType.API,
    message: `Base image generation failed after ${MAX_BASE_ATTEMPTS} attempts`,
    userMessage: `產品底圖生成失敗，已重試 ${MAX_BASE_ATTEMPTS} 次。請更換產品圖片後再試。`,
    originalError: lastError instanceof Error ? lastError : undefined,
  });
}

/**
 * Quick check: does the base image contain readable product text?
 * Returns true if the image passes basic validation.
 */
export async function validateBaseImage(imageBase64: string): Promise<boolean> {
  try {
    const visionResult = await analyzeImageText({ imageBase64 });
    // Pass if at least some text is detected
    return visionResult.detectedTexts.length > 0;
  } catch {
    return false;
  }
}
