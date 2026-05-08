/**
 * Image-2 + GPT-5.5 API Service (via APIMart)
 *
 * Image generation is ASYNCHRONOUS:
 *   POST /images/generations → task_id
 *   → wait 12s → poll GET /v1/tasks/{task_id} every 4s
 *   → completed → download image URL → convert to base64 Data URI
 *
 * Text generation is synchronous (standard chat completions).
 *
 * Reference: https://docs.apimart.ai/cn/api-reference/images/gpt-image-2/generation
 */

import { jsonrepair } from 'jsonrepair';
import { API_CONFIG } from '../utils/constants';
import { AppError, ErrorType } from '../utils/errorHandler';
import type {
  ImageGenerationParams,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '../types/shopee';

// ============================================================================
// Constants
// ============================================================================

const IMAGE_ENDPOINT = API_CONFIG.IMAGE_ENDPOINT;
const CHAT_ENDPOINT = API_CONFIG.CHAT_ENDPOINT;
const IMAGE_TIMEOUT_MS = API_CONFIG.IMAGE_TIMEOUT_MS;
const POLL_INTERVAL_MS = API_CONFIG.IMAGE_POLL_INTERVAL_MS;
const POLL_INITIAL_DELAY_MS = API_CONFIG.IMAGE_POLL_INITIAL_DELAY_MS;
const MAX_RETRIES = API_CONFIG.MAX_RETRIES;
const IMAGE_MAX_RETRIES = API_CONFIG.IMAGE_MAX_RETRIES;
const INITIAL_RETRY_DELAY = API_CONFIG.IMAGE_INITIAL_DELAY;

// Size mapping: pixel → aspect ratio
const SIZE_MAP: Record<string, { ratio: string; resolution: string }> = {
  '1024x1024': { ratio: '1:1', resolution: '1k' },
  '1024x1536': { ratio: '2:3', resolution: '1k' },
  '1536x1024': { ratio: '3:2', resolution: '1k' },
  '2048x2048': { ratio: '1:1', resolution: '2k' },
  '2048x1152': { ratio: '16:9', resolution: '2k' },
  '3840x2160': { ratio: '16:9', resolution: '4k' },
  '2160x3840': { ratio: '9:16', resolution: '4k' },
};

function mapSize(size: string): { ratio: string; resolution: string } {
  return SIZE_MAP[size] || { ratio: '1:1', resolution: '1k' };
}

// ============================================================================
// API Key Management
// ============================================================================

const HARDCODED_API_KEY = 'sk-9Ngi0kKF5aqdFzNzWVihFXDdAdFWyUUB2hYt1GcjoNInlDCC';

export const getApiKey = (): string => {
  const storedKey = localStorage.getItem('openai_api_key');
  if (storedKey) return storedKey;
  return HARDCODED_API_KEY;
};

// ============================================================================
// Helpers
// ============================================================================

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
        errorStr.includes('timeout') ||
        errorStr.includes('fetch') ||
        errorStr.includes('network');

      if (isRetryable) {
        console.warn(`[APIMart Retry] Attempt ${attempt}/${retries}. Retrying in ${currentDelay}ms...`);
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
// Async Image Polling
// ============================================================================

interface TaskResult {
  status: 'submitted' | 'processing' | 'completed' | 'failed';
  task_id: string;
  progress?: number;
  actual_time?: number;
  result?: {
    images: Array<{ url: string[] }>;
  };
  error?: { message: string };
}

async function pollTask(taskId: string, signal?: AbortSignal): Promise<string> {
  const startTime = Date.now();

  // Initial delay before first poll
  await wait(POLL_INITIAL_DELAY_MS);

  while (true) {
    if (signal?.aborted) {
      throw new AppError({ type: ErrorType.API, message: 'Polling aborted', userMessage: '圖片生成已取消。' });
    }

    if (Date.now() - startTime > IMAGE_TIMEOUT_MS) {
      throw new AppError({ type: ErrorType.API, message: 'Image polling timed out', userMessage: '圖片生成超時，請重試。' });
    }

    const response = await fetch(`https://api.apimart.ai/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${getApiKey()}` },
      signal,
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 503) {
        await wait(POLL_INTERVAL_MS);
        continue;
      }
      throw new AppError({
        type: ErrorType.API,
        message: `Task poll failed: HTTP ${response.status}`,
        userMessage: '查詢生成狀態失敗，請重試。',
      });
    }

    const body = await response.json();
    const task: TaskResult = body.data || body;

    if (task.status === 'completed') {
      const imageUrl = task.result?.images?.[0]?.url?.[0];
      if (!imageUrl) {
        throw new AppError({ type: ErrorType.API, message: 'No image URL in completed task', userMessage: '圖片生成失敗，未返回圖片。' });
      }
      return imageUrl;
    }

    if (task.status === 'failed') {
      throw new AppError({
        type: ErrorType.API,
        message: task.error?.message || 'Task failed',
        userMessage: '圖片生成失敗，請重試。',
      });
    }

    // Still submitted/processing → wait and poll again
    await wait(POLL_INTERVAL_MS);
  }
}

// ============================================================================
// Image Generation (Async via APIMart)
// ============================================================================

interface GenerateImageOptions {
  params: ImageGenerationParams;
  signal?: AbortSignal;
}

/**
 * Generate an image via APIMart image-2 API (asynchronous).
 *
 * Flow:
 *   1. POST /images/generations → task_id
 *   2. Poll GET /v1/tasks/{task_id} until completed
 *   3. Download image from URL → convert to base64 Data URI
 *
 * Returns { b64Json: "data:image/png;base64,..." }
 * (Always returns as base64 to maintain compatibility with upper layers)
 */
export async function generateImage(options: GenerateImageOptions): Promise<{ url?: string; b64Json?: string }> {
  const { params, signal } = options;

  return retryWithBackoff(async () => {
    // Build APIMart-format request body
    const { ratio, resolution } = mapSize(params.size || '1024x1024');

    const body: Record<string, unknown> = {
      model: 'gpt-image-2',
      prompt: params.prompt,
      n: params.n || 1,
      size: ratio,
      resolution,
    };

    // Reference image → image_urls array (APIMart format)
    if (params.image) {
      body.image_urls = [params.image];
    }

    console.log(`[APIMart] Submitting image gen: "${params.prompt.substring(0, 80)}..." size=${ratio} res=${resolution} hasRef=${!!params.image}`);

    // Step 1: Submit
    const submitRes = await fetch(IMAGE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text().catch(() => 'Unknown');
      console.error(`[APIMart] Submit failed: HTTP ${submitRes.status} — ${errText}`);
      throw new AppError({
        type: submitRes.status === 401 || submitRes.status === 403 ? ErrorType.AUTH : ErrorType.API,
        message: `Image submit failed: HTTP ${submitRes.status}`,
        userMessage: `圖片提交失敗 (HTTP ${submitRes.status})，請稍候再試。`,
      });
    }

    const submitData = await submitRes.json();
    const taskId = submitData.data?.[0]?.task_id;

    if (!taskId) {
      console.error('[APIMart] No task_id in response:', JSON.stringify(submitData).substring(0, 200));
      throw new AppError({ type: ErrorType.API, message: 'No task_id in response', userMessage: '圖片提交失敗，回應格式異常。' });
    }

    console.log(`[APIMart] Task submitted: ${taskId}`);

    // Step 2: Poll until completed
    const imageUrl = await pollTask(taskId, signal);
    console.log(`[APIMart] Task completed: ${taskId}, downloading from ${imageUrl.substring(0, 60)}...`);

    // Step 3: Download image → base64 Data URI
    const imgRes = await fetch(imageUrl, { signal });
    if (!imgRes.ok) {
      throw new AppError({ type: ErrorType.API, message: `Image download failed: HTTP ${imgRes.status}`, userMessage: '圖片下載失敗，請重試。' });
    }

    const blob = await imgRes.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to convert image to base64'));
      reader.readAsDataURL(blob);
    });

    // Extract base64 part without "data:..." prefix
    const b64Part = base64.split(',')[1];
    console.log(`[APIMart] Image downloaded: ${(blob.size / 1024).toFixed(0)}KB`);

    return { b64Json: b64Part };
  }, IMAGE_MAX_RETRIES);
}

// ============================================================================
// Text Generation (GPT-5.5 via Chat Completions — synchronous)
// ============================================================================

interface GenerateTextOptions {
  request: ChatCompletionRequest;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function generateText(options: GenerateTextOptions): Promise<ChatCompletionResponse> {
  const { request, signal, timeoutMs = API_CONFIG.CHAT_TIMEOUT_MS } = options;

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
        body: JSON.stringify({ ...request, stream: false }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`[APIMart Chat] HTTP ${response.status}: ${errorText}`);
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

  // Remove markdown code blocks
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }

  // APIMart GPT-5.5 may wrap JSON in text or add extra content
  // Try to extract JSON object by finding outermost { }
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }

  return clean.trim();
}

/**
 * Repair common GPT-generated JSON syntax errors:
 * - Missing commas between array elements or object properties
 * - Trailing commas
 */
function repairJsonSyntax(json: string): string {
  // Remove trailing commas before ] or }
  let repaired = json.replace(/,\s*([}\]])/g, '$1');

  // Insert missing commas between consecutive values on separate lines
  // Pattern: end-of-value followed by newline+whitespace+start-of-next-value
  // Value ends: " } ] number true false null
  // Value starts: " { [ number true false null
  repaired = repaired.replace(
    /(["}\]\d]|true|false|null)\s*\n\s*(["{\[\d]|true|false|null)/g,
    (match, before, after, offset) => {
      // Don't insert comma if there's already one or a closing bracket
      const beforeMatch = match.trimEnd();
      if (/,\s*$/.test(beforeMatch)) return match; // Already has comma
      if (/[:\[]\s*$/.test(beforeMatch)) return match; // After : or [ — no comma needed
      return before + ',\n' + match.substring(match.indexOf('\n') + 1);
    }
  );

  return repaired;
}

/**
 * Safely parse JSON with repair fallback (uses jsonrepair library)
 */
export function safeJsonParse<T = unknown>(text: string): T {
  const cleaned = cleanJsonResponse(text);
  try {
    // First try clean parse
    return JSON.parse(cleaned);
  } catch {
    // Use jsonrepair library as fallback — handles missing commas, trailing commas, unquoted keys, etc.
    console.warn('[JSON] Clean parse failed, repairing with jsonrepair...');
    const repaired = jsonrepair(cleaned);
    return JSON.parse(repaired);
  }
}

// ============================================================================
// Utility: Base64 helpers
// ============================================================================

export function fileToDataUri(base64Image: string, mimeType: string = 'image/png'): string {
  if (base64Image.startsWith('data:')) return base64Image;
  return `data:${mimeType};base64,${base64Image}`;
}

export function b64JsonToDataUri(b64Json: string, mimeType: string = 'image/png'): string {
  return `data:${mimeType};base64,${b64Json}`;
}

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
