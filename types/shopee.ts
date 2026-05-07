/**
 * Shopee-specific TypeScript types for AI-PM-Designer-Pro (Taiwan Shopee edition)
 * Replaces Gemini-era types in types.ts
 */

// ============================================================================
// 1. API Types (xi-ai.cn / image-2)
// ============================================================================

export interface ImageGenerationParams {
  model: 'gpt-image-2';
  prompt: string;
  n?: number;
  size?: '1024x1024' | '1024x1536' | '1536x1024' | '2048x2048' | '2048x1152' | '3840x2160' | '2160x3840';
  quality?: 'low' | 'medium' | 'high';
  image?: string; // base64 Data URI
  background?: 'auto' | 'transparent' | 'opaque';
  output_format?: 'png' | 'jpeg';
}

export interface ImageUrlResponse {
  data: Array<{ url: string }>;
  created?: number;
  usage?: { input_tokens: number; output_tokens: number; total_tokens: number };
}

export interface ImageB64Response {
  data: Array<{ b64_json: string }>;
  created?: number;
  background?: string;
}

export type ImageGenerationResponse = ImageUrlResponse | ImageB64Response;

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
}

export interface ChatCompletionRequest {
  model: 'gpt-5.5';
  messages: ChatCompletionMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

export interface ChatCompletionResponse {
  id: string;
  choices: Array<{ message: { content: string }; finish_reason: string }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

// ============================================================================
// 2. Shopee Output Types (Listing)
// ============================================================================

export interface SeoTitle {
  seq: number;           // 1–5
  title: string;         // Full title string (≥50 Chinese chars)
  charCount: number;     // Chinese character count (excl. emoji, spaces, punctuation)
  keywords: string;      // Space-separated keywords
}

export interface SkuBundle {
  sku: string;           // SKU identifier
  emojiName: string;     // Emoji + SKU name
  contents: string;      // What's in the bundle
  targetBuyer: string;   // Target buyer profile
  guidance: string;      // Purchase guidance
  complianceNote: string; // Compliance notes
}

export interface ImagePrompt {
  id: string;            // Unique ID
  role: 'main' | 'detail' | 'sku';
  seq: number;           // Sequence number
  size: '1024x1024' | '1024x1536';
  displaySize: string;   // Human-readable: "1:1" or "2:3"
  title: string;         // Chinese title for display
  purpose: string;       // What this image is for
  promptText: string;    // Full image generation prompt
}

export interface ComplianceItem {
  originalWord: string;   // The flagged word
  riskReason: string;     // Why it's risky
  replacement: string;    // Safe replacement
}

export interface ShopeeListing {
  // Text content
  seoTitles: SeoTitle[];
  productDescription: string;
  skuBundles: SkuBundle[];

  // Image prompts
  mainImages: ImagePrompt[];
  detailImages: ImagePrompt[];
  skuImages: ImagePrompt[];

  // Compliance
  complianceCheck: ComplianceItem[];
}

// ============================================================================
// 3. Input / Project Types
// ============================================================================

/** 20 Taiwan Shopee visual styles */
export type ShopeeVisualStyle =
  // Basic (1-5)
  | 'fresh-watery'
  | 'creamy-soft'
  | 'clean-refreshing'
  | 'botanical-natural'
  | 'premium-minimal'
  // Emotional (6-10)
  | 'girly-sweet'
  | 'gentle-elegant'
  | 'bold-playful'
  | 'calm-serene'
  | 'luxury-golden'
  // Scene (11-15)
  | 'lifestyle-home'
  | 'office-professional'
  | 'dorm-young'
  | 'gym-active'
  | 'spa-resort'
  // Special (16-20)
  | 'tech-transparent'
  | 'gift-box'
  | 'gen-z-impact'
  | 'retro-vintage'
  | 'tropical-island';

export interface ShopeeProduct {
  id: string;
  imageBase64: string;        // Original uploaded image
  processedImageBase64?: string; // After blur processing
  name: string;
}

export interface SkuOption {
  sku: string;
  emojiName: string;
  contents: string;
}

export interface ShopeeInputForm {
  projectName: string;
  brand: string;
  productName: string;
  productType: string;      // 護膚/美妝/髮品/身體護理
  specs: string;
  capacity: string;
  features: string[];       // 3 selling points
  scenario: string;
  visualStyle: ShopeeVisualStyle;
  skuOptions: SkuOption[];
  customNotes: string;
  products: ShopeeProduct[];
}

/** Project workflow status */
export type ProjectStatus =
  | 'draft'
  | 'material_pending'
  | 'listing_ready'
  | 'generating'
  | 'completed'
  | 'partial';

export interface GenerationHistory {
  id: string;
  projectId: string;
  promptId: string;
  promptText: string;
  parameters: {
    size: string;
    quality: string;
    model: string;
  };
  result: {
    success: boolean;
    imageUrl?: string;
    error?: string;
  };
  createdAt: number;
  duration: number;
}

export interface BlurRegion {
  x: number;      // 0-1 normalized
  y: number;      // 0-1 normalized
  width: number;  // 0-1 normalized
  height: number; // 0-1 normalized
}

export interface PromptTemplate {
  id: string;
  name: string;
  category: 'main' | 'detail' | 'sku';
  description: string;
  prompt: string;
  createdAt: number;
  updatedAt: number;
}

export interface ShopeeProject {
  id: string;
  projectName: string;
  status: ProjectStatus;
  visualStyle: ShopeeVisualStyle;
  products: ShopeeProduct[];
  skuOptions: SkuOption[];
  listing: ShopeeListing | null;
  taskMap: Record<string, string>;   // promptId → taskId
  generationHistory: GenerationHistory[];
  processedImageUrl?: string;
  blurRegions?: BlurRegion[];
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// 4. Storage Schema
// ============================================================================

export interface UserPreferences {
  theme: 'dark' | 'light';
  defaultVisualStyle: ShopeeVisualStyle;
  autoSave: boolean;
  defaultBlurIntensity: 'light' | 'medium' | 'heavy';
}

export interface StorageSchema {
  'shopee-projects-v1': ShopeeProject[];
  'shopee-templates-v1': PromptTemplate[];
  'openai-api-key': string;
  'user-preferences': UserPreferences;
}

// ============================================================================
// 5. Vision Service Types
// ============================================================================

export type RiskLevel = 'high' | 'medium' | 'low';

export interface DetectedText {
  text: string;
  riskLevel: RiskLevel;
  reason: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface VisionAnalysisResult {
  detectedTexts: DetectedText[];
  productName: string;
  brandName: string;
  rawResponse: string;
}

// ============================================================================
// 6. Director / Strategy Types (Phase 1)
// ============================================================================

export interface VisualStrategy {
  strategyName: string;
  headlineZh: string;
  subheadZh: string;
  styleBriefZh: string;
  targetAudienceZh: string;
  visualElementsZh: string;
  styleCategory: ShopeeVisualStyle;
}

export interface ProductAnalysis {
  name: string;
  visualDescription: string;
  keyFeaturesZh: string;
  packagingColors: string;
  detectedStyle: ShopeeVisualStyle;
}

export interface DirectorOutput {
  productAnalysis: ProductAnalysis;
  visualStrategies: VisualStrategy[]; // 3 routes
  _debugPrompt?: string;
}

// ============================================================================
// 7. App Workflow State
// ============================================================================

export enum ShopeeAppState {
  IDLE = 'IDLE',
  PHASE1_ANALYZING = 'PHASE1_ANALYZING',
  PHASE1_READY = 'PHASE1_READY',
  PHASE2_PROCESSING = 'PHASE2_PROCESSING',
  PHASE2_READY = 'PHASE2_READY',
  PHASE3_GENERATING = 'PHASE3_GENERATING',
  PHASE3_COMPLETE = 'PHASE3_COMPLETE',
  ERROR = 'ERROR',
}
