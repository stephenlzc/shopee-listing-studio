/**
 * Vision Service — GPT-5.5 Vision for image text recognition
 * Detects and risk-assesses text in product images for Shopee compliance.
 *
 * Uses: POST https://api.xi-ai.cn/v1/chat/completions (model: gpt-5.5)
 */

import { generateText, cleanJsonResponse } from './imageGenService';
import type { DetectedText, VisionAnalysisResult, RiskLevel } from '../types/shopee';
import { AppError, ErrorType } from '../utils/errorHandler';
import { VISION_SYSTEM_PROMPT } from '../prompts/visionPrompt';
import { COMPLIANCE_REPLACEMENTS } from '../utils/compliance';

// ============================================================================
// Risk Classification
// ============================================================================

/**
 * Classify a detected text's risk level based on compliance rules.
 */
function classifyRisk(text: string): { level: RiskLevel; reason: string } {
  // Check against high-risk words (efficacy claims, medical terms, exaggerated claims)
  for (const [word, replacement] of Object.entries(COMPLIANCE_REPLACEMENTS)) {
    if (text.includes(word)) {
      return {
        level: 'high',
        reason: `包含禁用詞「${word}」→ 建議替換為「${replacement}」`,
      };
    }
  }

  // Medium risk: words that may trigger platform review
  const mediumRiskPatterns = [
    { pattern: /改善|修護|淡化|撫平|提亮|均勻膚色/, reason: '可能涉及功效暗示' },
    { pattern: /醫師|醫生|藥師|臨床|實驗證實/, reason: '涉及醫療背書暗示' },
    { pattern: /專利|獨家|唯一|第一|首創/, reason: '可能涉及誇大宣稱' },
    { pattern: /敏感|過敏|刺激|紅腫|不適/, reason: '涉及敏感族群暗示' },
  ];

  for (const { pattern, reason } of mediumRiskPatterns) {
    if (pattern.test(text)) {
      return { level: 'medium', reason };
    }
  }

  // Low risk: brand name, product name, capacity, ingredients, barcode, etc.
  return { level: 'low', reason: '品牌/產品/規格資訊，低風險' };
}

// ============================================================================
// Main: Analyze Product Image Text
// ============================================================================

interface AnalyzeImageTextOptions {
  imageBase64: string; // Data URI: data:image/png;base64,...
  signal?: AbortSignal;
}

/**
 * Detect all visible text in a product image using GPT-5.5 Vision,
 * and classify each text's risk level for Shopee compliance.
 */
export async function analyzeImageText(options: AnalyzeImageTextOptions): Promise<VisionAnalysisResult> {
  const { imageBase64, signal } = options;

  const response = await generateText({
    request: {
      model: 'gpt-5.5',
      messages: [
        { role: 'system', content: VISION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageBase64 },
            },
            {
              type: 'text',
              text: '請識別這張產品圖片中的所有文字，並以 JSON 格式回傳。',
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    },
    signal,
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new AppError({
      type: ErrorType.API,
      message: 'Vision analysis returned no content',
      userMessage: '圖片文字識別失敗，請稍候再試。',
    });
  }

  try {
    const cleaned = cleanJsonResponse(content);
    const parsed = JSON.parse(cleaned);

    // Extract detected texts from AI response
    const rawTexts: Array<{ text: string; position?: string }> =
      parsed.detected_texts || parsed.texts || parsed.results || [];

    const detectedTexts: DetectedText[] = rawTexts.map((item) => {
      const { level, reason } = classifyRisk(item.text);
      const result: DetectedText = { text: item.text, riskLevel: level, reason };

      // Parse position if available (e.g., "top-left", "center", or coordinates)
      if (item.position) {
        result.boundingBox = parsePosition(item.position);
      }

      return result;
    });

    // Extract product/brand name
    const productName = parsed.product_name || '';
    const brandName = parsed.brand_name || '';

    return {
      detectedTexts,
      productName,
      brandName,
      rawResponse: content,
    };
  } catch (error) {
    console.error('Failed to parse vision analysis result:', error);
    throw new AppError({
      type: ErrorType.VALIDATION,
      message: 'Vision analysis result parsing failed',
      userMessage: '圖片文字識別結果格式異常，請重試。',
    });
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse a position string into a bounding box.
 * Supports formats: "top-left", "center", "x,y,w,h", or "x y w h"
 */
function parsePosition(position: string): { x: number; y: number; width: number; height: number } {
  // Try numeric format: "100,200,300,50"
  const numMatch = position.match(/(\d+)\s*[,，\s]\s*(\d+)\s*[,，\s]\s*(\d+)\s*[,，\s]\s*(\d+)/);
  if (numMatch) {
    return {
      x: parseInt(numMatch[1], 10),
      y: parseInt(numMatch[2], 10),
      width: parseInt(numMatch[3], 10),
      height: parseInt(numMatch[4], 10),
    };
  }

  // Fallback: approximate based on description
  const lower = position.toLowerCase();
  if (lower.includes('top') && lower.includes('left')) return { x: 50, y: 50, width: 200, height: 40 };
  if (lower.includes('top') && lower.includes('right')) return { x: 300, y: 50, width: 200, height: 40 };
  if (lower.includes('bottom') && lower.includes('left')) return { x: 50, y: 300, width: 200, height: 40 };
  if (lower.includes('bottom') && lower.includes('right')) return { x: 300, y: 300, width: 200, height: 40 };
  if (lower.includes('center') || lower.includes('middle')) return { x: 150, y: 150, width: 200, height: 40 };

  // Unknown: return a default safe box
  return { x: 100, y: 100, width: 200, height: 40 };
}
