/**
 * 應用程式常數定義 — Taiwan Shopee Edition
 */

// 顏色系統
export const COLORS = {
  primary: '#9333ea',      // purple-600
  secondary: '#2563eb',     // blue-600
  background: '#15151a',
  backgroundSecondary: '#1a1a1f',
  backgroundTertiary: '#1e1e24',
  border: 'rgba(255, 255, 255, 0.1)',
  text: {
    primary: '#ffffff',
    secondary: '#e5e7eb',
    tertiary: '#9ca3af',
    muted: '#6b7280',
  },
  error: {
    background: 'rgba(127, 29, 29, 0.2)',
    border: 'rgba(239, 68, 68, 0.5)',
    text: '#fca5a5',
  },
} as const;

// API 配置 (APIMart — async API)
export const API_CONFIG = {
  // Image generation (image-2) — async: submit → poll → get
  IMAGE_ENDPOINT: 'https://api.apimart.ai/v1/images/generations',
  IMAGE_MODEL: 'gpt-image-2' as const,
  IMAGE_TIMEOUT_MS: 300_000, // 300 seconds (async takes longer)
  IMAGE_POLL_INTERVAL_MS: 4000, // 4s between polls
  IMAGE_POLL_INITIAL_DELAY_MS: 12000, // 12s before first poll

  // Text generation (gpt-5.5)
  CHAT_ENDPOINT: 'https://api.apimart.ai/v1/chat/completions',
  CHAT_MODEL: 'gpt-5.5' as const,
  CHAT_TIMEOUT_MS: 180_000,

  // Retry
  MAX_RETRIES: 3,
  IMAGE_MAX_RETRIES: 2,
  INITIAL_DELAY: 3000,
  IMAGE_INITIAL_DELAY: 6000,
  RETRY_FACTOR: 2,
} as const;

// 圖片大小 (APIMart: aspect ratio + resolution)
export const IMAGE_SIZES = {
  MAIN: '1:1' as const,     // 1:1 main/SKU images
  DETAIL: '2:3' as const,   // 2:3 detail images
} as const;

// 檔案限制
export const FILE_LIMITS = {
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE_MB: 10,
  ACCEPTED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
} as const;

// 輸入限制
export const INPUT_LIMITS = {
  PRODUCT_NAME_MAX: 100,
  BRAND_CONTEXT_MAX: 5000,
  REF_COPY_MAX: 10000,
} as const;

// 快取配置
export const CACHE_CONFIG = {
  IMAGE_CACHE_PREFIX: 'shopee_image_',
  IMAGE_CACHE_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
} as const;

// 圖片比例
export const ASPECT_RATIOS = {
  SQUARE: '1:1' as const,
  DETAIL: '2:3' as const,
  PORTRAIT: '9:16' as const,
  LANDSCAPE: '16:9' as const,
} as const;

// Shopee 輸出數量限制
export const SHOPEE_LIMITS = {
  MAIN_IMAGES: 6,
  MIN_DETAIL_IMAGES: 4,
  MAX_DETAIL_IMAGES: 6,
  SEO_TITLES: 5,
  SEO_TITLE_MIN_CHARS: 50, // Chinese characters
} as const;

// localStorage keys
export const STORAGE_KEYS = {
  API_KEY: 'openai_api_key',
  PROJECTS: 'shopee-projects-v1',
  TEMPLATES: 'shopee-templates-v1',
  PREFERENCES: 'user-preferences',
} as const;
