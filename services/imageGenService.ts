/**
 * Image-2 API Service (via 中传 proxy)
 * Wraps POST https://api.xi-ai.cn/v1/images/generations
 *
 * Reference: proxy.md
 */

import { AppError, ErrorType } from '../utils/errorHandler';
import type {
  ImageGenerationParams,
  ImageUrlResponse,
  ImageB64Response,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '../types/shopee';

// ============================================================================
// Constants
// ============================================================================

const IMAGE_ENDPOINT = 'https://api.xi-ai.cn/v1/images/generations';
const CHAT_ENDPOINT = 'https://api.xi-ai.cn/v1/chat/completions';
const DEFAULT_TIMEOUT_MS = 180_000; // 180 seconds (image gen takes 30-90s)
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 5000;

// ============================================================================
// API Key Management
// ============================================================================

const HARDCODED_API_KEY = 'sk-sfLfU1ZDLTVC8vYt8e22A188A34a4dEf911e4eB336E932D5';

export const getApiKey = (): string => {
  const storedKey = localStorage.getItem('openai_api_key');
  if (storedKey) return storedKey;
  return HARDCODED_API_KEY;
};

// ============================================================================
// Helpers
// ============================================================================

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry with exponential backoff for image generation.
 * Retries on rate-limit (429), server-busy (503), timeout, and network errors.
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES,
  initialDelay: number = INITIAL_RETRY_DELAY,
  factor: number = 2,
): Promise<T> {
  let currentDelay = initialDelay;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      if (attempt > retries) throw error;

      const errorStr = error instanceof Error ? error.message : String(error);
      const isRetryable =
        errorStr.includes('429') ||
        errorStr.includes('503') ||
        errorStr.includes('Overloaded') ||
        errorStr.includes('timeout') ||
        errorStr.includes('fetch') ||
        errorStr.includes('network') ||
        errorStr.includes('RESOURCE_EXHAUSTED') ||
        errorStr.includes('Too Many Requests');

      if (isRetryable) {
        console.warn(`[ImageGen Retry] Attempt ${attempt}/${retries}. Retrying in ${currentDelay}ms...`);
        await wait(currentDelay);
        currentDelay *= factor;
      } else {
        throw error;
      }
    }
  }

  throw new Error('Unexpected retry loop exit');
}

// ============================================================================
// Image Generation
// ============================================================================

interface GenerateImageOptions {
  params: ImageGenerationParams;
  signal?: AbortSignal;
}

/**
 * Generate an image via image-2 API.
 *
 * Return format:
 *   - Without `image` param → data[0].url (URL string to download)
 *   - With `image` param    → data[0].b64_json (base64 string, decode to get image bytes)
 */
export async function generateImage(options: GenerateImageOptions): Promise<{ url?: string; b64Json?: string }> {
  const { params, signal } = options;

  return retryWithBackoff(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    // Merge external signal with timeout
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(IMAGE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`[ImageGen] HTTP ${response.status}: ${errorText}`);

        throw new AppError({
          type: response.status === 401 || response.status === 403 ? ErrorType.AUTH : ErrorType.API,
          message: `Image generation failed: HTTP ${response.status}`,
          userMessage: `圖片生成失敗 (HTTP ${response.status})，請稍候再試。`,
        });
      }

      const data: ImageUrlResponse | ImageB64Response = await response.json();

      if (params.image) {
        // With reference image → b64_json
        const b64Data = data as ImageB64Response;
        if (!b64Data.data?.[0]?.b64_json) {
          throw new AppError({
            type: ErrorType.API,
            message: 'No b64_json in image response',
            userMessage: '圖片生成失敗，回應格式異常。',
          });
        }
        return { b64Json: b64Data.data[0].b64_json };
      } else {
        // Without reference image → url
        const urlData = data as ImageUrlResponse;
        if (!urlData.data?.[0]?.url) {
          throw new AppError({
            type: ErrorType.API,
            message: 'No url in image response',
            userMessage: '圖片生成失敗，回應格式異常。',
          });
        }
        return { url: urlData.data[0].url };
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof AppError) throw error;

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AppError({
          type: ErrorType.API,
          message: 'Image generation timed out',
          userMessage: '圖片生成超時（超過 180 秒），請重試。',
        });
      }

      throw error;
    }
  });
}

/**
 * Generate multiple images concurrently (respecting sequence for reference-image chains).
 * For parallel independent images, use Promise.all instead.
 */
export async function generateImagesSequentially(
  paramsList: ImageGenerationParams[],
): Promise<Array<{ url?: string; b64Json?: string }>> {
  const results: Array<{ url?: string; b64Json?: string }> = [];

  for (const params of paramsList) {
    const result = await generateImage({ params });
    results.push(result);
  }

  return results;
}

// ============================================================================
// Text Generation (GPT-5.5 via Chat Completions)
// ============================================================================

interface GenerateTextOptions {
  request: ChatCompletionRequest;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Send a chat completion request to GPT-5.5 (via 中传 proxy).
 * Used for: visual strategy, listing generation, image text recognition.
 */
export async function generateText(options: GenerateTextOptions): Promise<ChatCompletionResponse> {
  const { request, signal, timeoutMs = 120_000 } = options;

  return retryWithBackoff(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`[TextGen] HTTP ${response.status}: ${errorText}`);

        throw new AppError({
          type: response.status === 401 || response.status === 403 ? ErrorType.AUTH : ErrorType.API,
          message: `Text generation failed: HTTP ${response.status}`,
          userMessage: `文字生成失敗 (HTTP ${response.status})，請稍候再試。`,
        });
      }

      const data: ChatCompletionResponse = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof AppError) throw error;

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AppError({
          type: ErrorType.API,
          message: 'Text generation timed out',
          userMessage: '文字生成超時，請重試。',
        });
      }

      throw error;
    }
  });
}

// ============================================================================
// Utility: Clean JSON from AI response
// ============================================================================

export function cleanJsonResponse(text: string): string {
  let clean = text.trim();
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }
  return clean.trim();
}

// ============================================================================
// Utility: Base64 helpers for reference images
// ============================================================================

export function fileToDataUri(base64Image: string, mimeType: string = 'image/png'): string {
  // If already a Data URI, return as-is
  if (base64Image.startsWith('data:')) return base64Image;
  return `data:${mimeType};base64,${base64Image}`;
}

export function b64JsonToDataUri(b64Json: string, mimeType: string = 'image/png'): string {
  return `data:${mimeType};base64,${b64Json}`;
}

/**
 * Convert a File object to base64 Data URI
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) resolve(reader.result as string);
      else reject(new Error('無法讀取檔案'));
    };
    reader.onerror = () => reject(new Error('檔案讀取失敗'));
    reader.readAsDataURL(file);
  });
}
