# CLAUDE.md — AI-PM-Designer-Pro

## Project Summary

**Current state (v0.8):** AI visual marketing tool using Google Gemini (4 Phase workflow), generating ad posters and 8 social-media story slides.

**Target state:** Taiwan Shopee product listing image generator using OpenAI-compatible API via 中传 proxy. Outputs: 6 main images (1:1), 4-6 detail images (2:3), optional SKU images, 5 SEO titles, product description + CTA, compliance report.

Full transformation spec: `TRANSFORMATION.md`.

---

## Tech Stack

| Layer | Current | Target |
|-------|---------|--------|
| Framework | React 18 + TypeScript 5.5 | Same |
| Build | Vite 5 | Same |
| Styling | Tailwind CSS (utility classes) | Same |
| AI Text | `@google/genai` → Gemini 2.5 Flash | `fetch` → `POST https://api.xi-ai.cn/v1/chat/completions` (model: `gpt-5.5`) |
| AI Image | `@google/genai` → Gemini 3 Pro Image | `fetch` → `POST https://api.xi-ai.cn/v1/images/generations` (model: `gpt-image-2`) |
| Package mgr | npm | Same |
| State | React `useState` / `useEffect` | Same (consider adding `useReducer` for complex state) |
| Storage | `localStorage` | Same (key renamed: `gemini_api_key` → `openai_api_key`) |

---

## API Configuration (中传 Proxy)

All API details in `proxy.md`. Key points:

```
Endpoint:  https://api.xi-ai.cn/v1/
Image:     POST /images/generations  (model: gpt-image-2)
Text:      POST /chat/completions    (model: gpt-5.5)
API Key:   sk-sfLfU1ZDLTVC8vYt8e22A188A34a4dEf911e4eB336E932D5
```

### Image generation params (`gpt-image-2`)

| Param | Type | Notes |
|-------|------|-------|
| `model` | string | Fixed: `"gpt-image-2"` (NOT `image-2`) |
| `prompt` | string | Max 32000 chars |
| `n` | integer | Default 1 |
| `size` | string | `1024x1024` (main/SKU), `1024x1536` (detail), also `1536x1024`, `2048x2048` |
| `quality` | string | `low` / `medium` (default) / `high` |
| `image` | string | Reference image as `data:image/png;base64,...` |
| `background` | string | `auto` (default) / `transparent` / `opaque` |
| `output_format` | string | `png` (default) / `jpeg` |

### Critical rules

- **Timeout ≥ 180 seconds** for image generation (takes 30–90s avg).
- **Return format differs:** without `image` param → `data[0].url`; with `image` param → `data[0].b64_json`.
- **Do NOT pass** `response_format`, `aspect_ratio`, `watermark`, or `size: "2K"` — they will error.
- Reference images MUST be full Data URIs: `data:image/png;base64,{base64_string}`.

---

## Project Structure

```
AI-PM-Designer-Pro/
├── App.tsx                          # Main app (4-phase state machine)
├── index.tsx                        # Entry point
├── types.ts                         # Current Gemini-era types
├── prompts.ts                       # System prompts (Gemini-era, to be replaced)
├── components/
│   ├── ApiKeyModal.tsx              # Gemini API key modal → rename to OpenAI key
│   ├── InputForm.tsx                # Product input form
│   ├── Phase2Section.tsx            # Content suite (to become Listing review)
│   ├── Phase3Section.tsx            # Market analysis (to be REMOVED)
│   ├── Phase4Section.tsx            # Content strategy (to be REMOVED)
│   ├── Phase5Section.tsx            # Ultra entry (to be REMOVED)
│   ├── MarketAnalysis.tsx           # To be REMOVED
│   ├── ContentStrategy.tsx          # To be REMOVED
│   ├── ContentSuite.tsx             # Keep/modify for image grid
│   ├── ProductCard.tsx              # Keep
│   ├── PromptCard.tsx               # Keep/modify
│   ├── GuideModal.tsx               # Keep (simplify)
│   ├── ImageModal.tsx               # Keep
│   ├── DebugPromptModal.tsx         # Keep
│   ├── LoadingOverlay.tsx           # Keep
│   ├── ErrorBanner.tsx              # Keep
│   └── Spinner.tsx                  # Keep
├── services/
│   ├── geminiClient.ts              # → DELETE (replace with xi-ai client)
│   └── geminiService.ts             # → DELETE (replace with new services)
├── hooks/
│   ├── useImageGeneration.ts        # → REWRITE for image-2 API
│   └── useImageUpload.ts            # Keep
├── utils/
│   ├── constants.ts                 # → UPDATE (remove Gemini config, add Shopee config)
│   ├── errorHandler.ts              # → UPDATE (remove Gemini-specific errors)
│   ├── validators.ts                # → REWRITE for Shopee types
│   ├── downloadHelper.ts            # Keep
│   ├── imageCache.ts                # Keep
│   ├── imageColorExtractor.ts       # → UPDATE for image-2
│   ├── imageDownloader.ts           # Keep
│   ├── imageMapping.ts              # → UPDATE
│   ├── imageNaming.ts               # → UPDATE per Shopee naming
│   ├── languageMode.ts              # Keep (TW-focused)
│   └── reportGenerator.ts           # → REWRITE for Shopee listing reports
├── prompts/                         # NEW: prompt templates directory
│   ├── directorPrompt.ts            # NEW: visual strategy director
│   ├── listingPrompt.ts             # NEW: listing generation
│   └── visionPrompt.ts              # NEW: image text recognition
├── types/
│   └── shopee.ts                    # NEW: Shopee-specific types
├── references/                      # Reference docs
│   ├── taiwan-localization.md       # TW terminology mapping
│   ├── taiwan-genz-phrase-bank.md   # Gen Z copy phrases
│   ├── compliance.md                # Compliance rules
│   └── image-specs.md               # Image specifications
├── proxy.md                         # API proxy guide (中传)
├── TRANSFORMATION.md                # Full transformation spec
├── AGENTS.md                        # Short memory context
├── CHANGELOG.md                     # Version history
└── README.md                        # Project README
```

---

## New File Creation Plan

### Services (to create)
- `services/imageGenService.ts` — image-2 API wrapper
- `services/listingService.ts` — listing generation logic
- `services/visionService.ts` — GPT-5.5 Vision for text detection

### Utils (to create)
- `utils/compliance.ts` — banned word filter (50+ replacement rules)
- `utils/shopeeImageNaming.ts` — image file naming: `main-01`..`main-06`, `detail-01`..`detail-04`, `sku-01`..etc.

### Types (to create)
- `types/shopee.ts` — `ShopeeListing`, `SeoTitle`, `SkuBundle`, `ImagePrompt`, `ComplianceItem`, `ShopeeProject`, `ProjectStatus`, `ShopeeVisualStyle` (20 styles), etc.

### Prompts (to create)
- `prompts/directorPrompt.ts` — visual strategy director system prompt
- `prompts/listingPrompt.ts` — listing generation system prompt
- `prompts/visionPrompt.ts` — image text recognition system prompt

---

## Files to Delete
- `services/geminiClient.ts`
- `services/geminiService.ts`
- `components/MarketAnalysis.tsx`
- `components/ContentStrategy.tsx`
- `components/Phase5Section.tsx`
- `@google/genai` dependency from `package.json`

---

## Key Design Rules (from TRANSFORMATION.md)

### 1. Original Image Text MUST NOT Be Modified (Highest Priority)

All image prompts MUST include:
```
【最高優先級】原圖產品中的所有文字必須完全保真保留：
- 不得翻譯、繁簡轉換、刪除、遮蔽、模糊或重新繪製任何文字
- 品牌名、產品名、容量、成分表、說明文字等全部保持原樣
- 只能改變產品的：外觀變化、場景背景、整體排版
- 如果原圖使用簡體中文，保持簡體中文；如果是繁體中文，保持繁體中文
```

Blur/mosaic is ONLY allowed on regions the USER manually selects. AI must never decide to blur text on its own.

### 2. Product Base Image Workflow

Before any main/detail/SKU images: generate and validate a `product-base-{seq}` compliance base image. All subsequent images must reference this validated base image in their prompts.

### 3. Main Image Prompt Structure (6 images, 1024×1024)

Each prompt MUST declare:
1. Target asset: "目標資產：主圖 N / main-0N。只生成這一張獨立圖片"
2. Size: "1:1 正方形比例"
3. Text fidelity statement (see above)
4. Visual style: "視覺風格大膽，高飽和，撞色，排版像潮流美妝社群貼文。Gen Z 彩色光影與俐落排版"
5. Product reference: "使用已驗證的產品底圖或用戶處理過的圖片"

Main image content:
| # | Title | Direction |
|---|-------|-----------|
| 1 | 商品第一眼封面圖 | Brand + product name, safe subtitle, 3 feature tags |
| 2 | 商品亮點圖 A｜特色總覽 | 3 safe selling points |
| 3 | 使用情境圖 A｜人物/身體部位 | Real usage scene with person |
| 4 | 使用情境圖 B｜生活場景/第二角度 | Different angle or daily scene |
| 5 | 商品亮點圖 B｜質地膚感 | Texture, feel |
| 6 | 商品亮點圖 C｜成分概念/安心日常 | Ingredients, trust |

### 4. Detail Image Prompt Structure (4-6 images, 1024×1536)

Each starts with: "請生成一張 800×1500 台灣蝦皮商品詳情圖，適合手機直式瀏覽。"

Content: intro, ingredients, buyer guide, product info + reminders, optional expansions.

Keep 4-6 info modules per detail image. Avoid text walls.

### 5. Visual Style: Taiwan Gen Z

- Colors: high saturation, contrasting colors, derived from packaging main color
- Layout: trendy beauty social media style, clean but not symmetrical
- Lighting: Gen Z color lighting, gradient effects, colored shadows
- Typography: short titles, bold keywords, large tags, one main message
- Avoid: childish elements, meme clutter, discount graphics, neon overload, emoji walls
- Friendly scenes: dorm vanity, commute bag, gym/shower shelf, office desk, weekend cafe, small apartment bathroom, makeup-before-going-out, shared-room backup, casual gifting
- BANNED forced props: herbs, ginseng, leaves, water drops, bathroom scenes (unless product-relevant), pink/gold backgrounds

### 6. SEO Titles (5 titles)

- Each ≥ 50 Chinese characters (excluding emoji, spaces, punctuation)
- Space-separated keywords, NOT pipe-separated
- 3-4 emoji naturally distributed
- 5 different angles: product type, usage scenario, SKU/gifting, texture/feel, buyer intent

### 7. Product Description

- Tone: friendly big-sister style, natural and practical
- 2-4 mobile-friendly paragraphs
- Avoid stiff language: 這款產品、本產品、該產品
- Open with: 如果你也喜歡...、日常保養想找...、我會把它放在...
- 4-8 natural emoji
- End with natural CTA

### 8. Compliance

Banned word filter (`utils/compliance.ts`):
- Efficacy claims: 美白→透亮感, 祛斑→日常保養, 抗皺→熟齡保養感, etc.
- Medical: 治療→日常使用, 藥用→日常使用
- Exaggerated: 100%有效→日常保養, 神器→好物, 黑科技→創新配方
- Sensitive groups: 敏感肌專用→初次使用建議先做局部測試

### 9. Taiwan Localization

Always use Taiwan terminology: 維生素→維他命, 氨基酸→胺基酸, 洗面奶→潔顏乳/洗面乳, 套装→套組, 透明質酸→玻尿酸, etc. Full table in `references/taiwan-localization.md`.

### 10. Image File Naming

| Type | Pattern |
|------|---------|
| Main images | `main-01` through `main-06` |
| Detail images | `detail-01` through `detail-04` |
| SKU images | `sku-01`, `sku-02`, ... |
| Product base | `product-base-01`, `product-base-02`, ... |

### 11. Workflow (3 Phase, replacing current 4 Phase)

```
IDLE → Phase 1 (Product Analysis + Visual Strategy) → Phase 2 (Material Prep + Listing) → Phase 3 (Image Production)
```

Removed: Phase 3 Market Analysis (Google Search Grounding not needed), Phase 4 Content Strategy (AI Studio/Gamma prompts not Shopee targets).

### 12. Visual Styles (20 options)

Basic: fresh-watery, creamy-soft, clean-refreshing, botanical-natural, premium-minimal
Emotional: girly-sweet, gentle-elegant, bold-playful, calm-serene, luxury-golden
Scene: lifestyle-home, office-professional, dorm-young, gym-active, spa-resort
Special: tech-transparent, gift-box, gen-z-impact, retro-vintage, tropical-island

Selection guide in TRANSFORMATION.md §9.3.

---

## Development Guidelines

### Before writing any code
1. Read `TRANSFORMATION.md` for the full target spec.
2. Read `proxy.md` for API configuration.
3. All new prompts must follow the rules in TRANSFORMATION.md §5.
4. All new types go in `types/shopee.ts`.
5. All new services follow the pattern: thin wrappers around `fetch` to xi-ai.cn.

### Code conventions
- TypeScript strict mode is NOT enabled; be careful with null checks.
- React functional components with hooks only. No class components.
- Tailwind utility classes for all styling. No separate CSS files.
- All user-facing text in Traditional Chinese (繁體中文).
- Image prompts in English (for image-2 compatibility).
- Keep `localStorage` keys prefixed and versioned (e.g., `shopee-projects-v1`).

### API call pattern
```typescript
const response = await fetch('https://api.xi-ai.cn/v1/images/generations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(180_000),
});
```

### Error handling
- Use `utils/errorHandler.ts` pattern (AppError class).
- Image gen failures after 3 retries → skip with ❌ indicator + retry button.
- Timeout is a normal error case; always show retry option.

### References
- Full transformation spec: `TRANSFORMATION.md`
- API details: `proxy.md`
- Bug records: `bug_found.md`
- Fix templates: `bug_fix_methods.md`
- Taiwan localization: `references/taiwan-localization.md`
- Gen Z phrase bank: `references/taiwan-genz-phrase-bank.md`
- Compliance rules: `references/compliance.md`
- Image specs: `references/image-specs.md`
