/**
 * Listing Service — Shopee Listing 生成邏輯
 *
 * Phase 1: 產品分析 + 視覺策略（使用 DIRECTOR_SYSTEM_PROMPT）
 * Phase 2: Listing 生成（使用 LISTING_SYSTEM_PROMPT）
 *
 * Uses: generateText() and cleanJsonResponse() from imageGenService.ts
 */

import { generateText, cleanJsonResponse } from './imageGenService';
import { DIRECTOR_SYSTEM_PROMPT } from '../prompts/directorPrompt';
import { LISTING_SYSTEM_PROMPT } from '../prompts/listingPrompt';
import { filterBannedWords } from '../utils/compliance';
import { AppError, ErrorType } from '../utils/errorHandler';
import type {
  DirectorOutput,
  ShopeeListing,
  SeoTitle,
  ImagePrompt,
  ComplianceItem,
  SkuBundle,
} from '../types/shopee';

// ============================================================================
// Phase 1: Product Analysis + Visual Strategy
// ============================================================================

interface AnalyzeProductOptions {
  imageBase64: string; // Data URI
  productName: string;
  brandContext: string;
  productType?: string;
  features?: string[];
  signal?: AbortSignal;
}

/**
 * Analyze a product image and generate 3 differentiated visual marketing routes.
 * Phase 1 of the Shopee workflow.
 */
export async function analyzeProductAndGenerateStrategy(
  options: AnalyzeProductOptions,
): Promise<DirectorOutput> {
  const { imageBase64, productName, brandContext, productType, features, signal } = options;

  const userPrompt = [
    `產品名稱：${productName || '未提供'}`,
    `品牌/背景資訊：${brandContext || '未提供'}`,
    productType ? `產品類型：${productType}` : '',
    features?.length ? `產品特色：${features.join('、')}` : '',
    '',
    '請根據以上資訊與圖片，執行視覺行銷總監的分析任務。',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await generateText({
    request: {
      model: 'gpt-5.5',
      messages: [
        { role: 'system', content: DIRECTOR_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageBase64 } },
            { type: 'text', text: userPrompt },
          ],
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    },
    signal,
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new AppError({
      type: ErrorType.API,
      message: 'Director analysis returned no content',
      userMessage: 'AI 總監分析失敗，請稍候再試。',
    });
  }

  try {
    const cleaned = cleanJsonResponse(content);
    const parsed = JSON.parse(cleaned);

    const output: DirectorOutput = {
      productAnalysis: {
        name: parsed.product_analysis?.name || productName,
        visualDescription: parsed.product_analysis?.visual_description || '',
        keyFeaturesZh: parsed.product_analysis?.key_features_zh || '',
        packagingColors: parsed.product_analysis?.packaging_colors || '',
        detectedStyle: parsed.product_analysis?.detected_style || 'fresh-watery',
      },
      visualStrategies: (parsed.visual_strategies || []).map((s: any, i: number) => ({
        strategyName: s.strategy_name || `路線 ${String.fromCharCode(65 + i)}`,
        headlineZh: s.headline_zh || '',
        subheadZh: s.subhead_zh || '',
        styleBriefZh: s.style_brief_zh || '',
        targetAudienceZh: s.target_audience_zh || '',
        visualElementsZh: s.visual_elements_zh || '',
        styleCategory: s.style_category || 'gen-z-impact',
      })),
      _debugPrompt: `=== SYSTEM ===\n${DIRECTOR_SYSTEM_PROMPT}\n\n=== USER ===\n${userPrompt}`,
    };

    return output;
  } catch (error) {
    console.error('Failed to parse director output:', error);
    throw new AppError({
      type: ErrorType.VALIDATION,
      message: 'Director output parsing failed',
      userMessage: 'AI 總監分析結果格式異常，請重試。',
    });
  }
}

// ============================================================================
// Phase 2: Generate Full Shopee Listing
// ============================================================================

interface GenerateListingOptions {
  productName: string;
  brand: string;
  productType: string;
  specs: string;
  capacity: string;
  features: string[];
  scenario: string;
  visualStyle: string;
  selectedStrategy: {
    strategyName: string;
    headlineZh: string;
    styleBriefZh: string;
    targetAudienceZh: string;
  };
  skuOptions?: Array<{ sku: string; emojiName: string; contents: string }>;
  signal?: AbortSignal;
}

/**
 * Generate a complete Shopee Listing: SEO titles, product description,
 * SKU suggestions, main/detail image prompts, and compliance check.
 * Phase 2 of the Shopee workflow.
 */
export async function generateShopeeListing(
  options: GenerateListingOptions,
): Promise<ShopeeListing> {
  const {
    productName,
    brand,
    productType,
    specs,
    capacity,
    features,
    scenario,
    visualStyle,
    selectedStrategy,
    skuOptions,
    signal,
  } = options;

  const userPrompt = [
    `產品名稱：${productName}`,
    `品牌：${brand || '未提供'}`,
    `產品類型：${productType}`,
    `規格：${specs || '未提供'}`,
    `容量：${capacity || '未提供'}`,
    `產品特色：${features.join('、')}`,
    `適合場景：${scenario || '日常使用'}`,
    `視覺風格：${visualStyle}`,
    '',
    '選定的行銷策略路線：',
    `- 路線名稱：${selectedStrategy.strategyName}`,
    `- 主標題：${selectedStrategy.headlineZh}`,
    `- 視覺風格：${selectedStrategy.styleBriefZh}`,
    `- 目標客群：${selectedStrategy.targetAudienceZh}`,
    '',
    skuOptions?.length
      ? `SKU 選項：\n${skuOptions.map((s) => `- ${s.emojiName}（${s.sku}）：${s.contents}`).join('\n')}`
      : '',
    '',
    '請生成完整的蝦皮 Listing（JSON）。',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await generateText({
    request: {
      model: 'gpt-5.5',
      messages: [
        { role: 'system', content: LISTING_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 8192,
      response_format: { type: 'json_object' },
    },
    signal,
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new AppError({
      type: ErrorType.API,
      message: 'Listing generation returned no content',
      userMessage: 'Listing 生成失敗，請稍候再試。',
    });
  }

  try {
    const cleaned = cleanJsonResponse(content);
    const parsed = JSON.parse(cleaned);

    // Parse and filter SEO titles
    const seoTitles: SeoTitle[] = (parsed.seo_titles || []).map((t: any, i: number) => {
      const rawTitle = t.title || '';
      // Apply compliance filter to each title
      const { filteredText, replacements } = filterBannedWords(rawTitle);
      return {
        seq: t.seq || i + 1,
        title: filteredText,
        charCount: t.charCount || countChineseChars(filteredText),
        keywords: t.keywords || '',
      };
    });

    // Parse and filter product description
    const rawDescription = parsed.product_description || '';
    const { filteredText: filteredDescription } = filterBannedWords(rawDescription);

    // Parse SKU bundles
    const skuBundles: SkuBundle[] = (parsed.sku_bundles || []).map((s: any) => ({
      sku: s.sku || '',
      emojiName: s.emojiName || s.emoji_name || '',
      contents: s.contents || '',
      targetBuyer: s.targetBuyer || s.target_buyer || '',
      guidance: s.guidance || '',
      complianceNote: s.complianceNote || s.compliance_note || '',
    }));

    // Parse image prompts
    const mainImages: ImagePrompt[] = (parsed.main_images || []).map((img: any, i: number) => ({
      id: img.id || `main-${String(i + 1).padStart(2, '0')}`,
      role: 'main' as const,
      seq: img.seq || i + 1,
      size: '1024x1024' as const,
      displaySize: '1:1',
      title: img.title || `主圖 ${i + 1}`,
      purpose: img.purpose || '',
      promptText: img.promptText || img.prompt_text || '',
    }));

    const detailImages: ImagePrompt[] = (parsed.detail_images || []).map((img: any, i: number) => ({
      id: img.id || `detail-${String(i + 1).padStart(2, '0')}`,
      role: 'detail' as const,
      seq: img.seq || i + 1,
      size: '1024x1536' as const,
      displaySize: '2:3',
      title: img.title || `詳情圖 ${i + 1}`,
      purpose: img.purpose || '',
      promptText: img.promptText || img.prompt_text || '',
    }));

    const skuImages: ImagePrompt[] = (parsed.sku_images || []).map((img: any, i: number) => ({
      id: img.id || `sku-${String(i + 1).padStart(2, '0')}`,
      role: 'sku' as const,
      seq: img.seq || i + 1,
      size: '1024x1024' as const,
      displaySize: '1:1',
      title: img.title || `SKU 圖 ${i + 1}`,
      purpose: img.purpose || '',
      promptText: img.promptText || img.prompt_text || '',
    }));

    // Parse compliance check
    const complianceCheck: ComplianceItem[] = (parsed.compliance_check || []).map((c: any) => ({
      originalWord: c.originalWord || c.original_word || '',
      riskReason: c.riskReason || c.risk_reason || '',
      replacement: c.replacement || '',
    }));

    return {
      seoTitles,
      productDescription: filteredDescription,
      skuBundles,
      mainImages,
      detailImages,
      skuImages,
      complianceCheck,
    };
  } catch (error) {
    console.error('Failed to parse listing output:', error);
    throw new AppError({
      type: ErrorType.VALIDATION,
      message: 'Listing output parsing failed',
      userMessage: 'Listing 生成結果格式異常，請重試。',
    });
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Count Chinese characters in a string (excluding emoji, spaces, punctuation).
 */
function countChineseChars(text: string): number {
  // Match CJK Unified Ideographs (U+4E00–U+9FFF), plus extensions
  const chineseRegex = /[一-鿿㐀-䶿]/g;
  const matches = text.match(chineseRegex);
  return matches ? matches.length : 0;
}
