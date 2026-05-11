# Shopee Listing Studio

**台灣蝦皮商品圖片生成器** — 一鍵生成蝦皮 Listing 所需的全部素材：6 張主圖 + 4-6 張詳情圖 + 5 組 SEO 標題 + 產品描述 + 合規檢查報告。

基於 APIMart API（GPT-5.5 + GPT-Image-2），專為台灣蝦皮賣家設計的 AI 視覺行銷工具。

---

## 快速開始

### 1. 下載專案

```bash
git clone https://github.com/stephenlzc/shopee-listing-studio.git
cd shopee-listing-studio
```

### 2. 安裝依賴

```bash
npm install
```

### 3. 設定 API Key

複製 `.env.example` 為 `.env`，填入你的 APIMart API Key：

```bash
cp .env.example .env
```

編輯 `.env`：

```
VITE_APIMART_API_KEY=你的_API_Key
```

> `.env` 已被 `.gitignore` 排除，不會上傳到 GitHub。

### 4. 啟動開發伺服器

```bash
npm run dev
```

瀏覽器打開 `http://localhost:11768` 即可使用。

---

## 取得 APIMart API Key

### Step 1: 註冊帳號

前往 [APIMart 官網](https://apimart.ai) 註冊帳號。

> 目前 APIMart 主要支援中國手機號碼註冊。如果沒有中國手機號，可使用其他 OpenAI 相容的 API 代理服務（如 OpenRouter、AI Proxy 等），修改 `utils/constants.ts` 中的 API endpoint 即可。

### Step 2: 獲取 API Key

1. 登入後前往 [API Keys 頁面](https://apimart.ai/keys)
2. 點擊「創建新的 API Key」
3. 複製生成的 API Key（格式：`sk-xxxxxxxx...`）

### Step 3: 儲值

1. 前往 [充值頁面](https://apimart.ai/billing)
2. 選擇適合的儲值方案
3. GPT-Image-2 圖片生成費用約為每張 NT$1-3（視尺寸與解析度而定）

### Step 4: 設定到本專案

將 API Key 寫入 `.env`：

```
VITE_APIMART_API_KEY=sk-xxxxxxxx...
```

---

## 功能總覽

### Phase 1 — 產品分析與視覺策略
- 上傳產品圖片，AI 自動分析產品屬性、包裝色彩、目標客群
- 生成 3 條視覺行銷路線（20 種風格可選）
- 每條路線包含完整視覺策略簡述與執行方案

### Phase 2 — Listing 生成
- 5 組 SEO 標題（每組 50+ 中文字，3-4 個 Emoji）
- 台灣用語在地化（維生素→維他命、玻尿酸、潔顏乳等）
- Z 世代社群文案風格（友善大姊姊語氣）
- 6 張主圖 Prompt + 4-6 張詳情圖 Prompt
- 合規檢查（禁用詞過濾：美白→透亮感、抗皺→熟齡保養感等 50+ 規則）
- 圖片文字偵測與模糊處理工具

### Phase 3 — 圖片生產
- 主圖 1024×1024 (1:1)，詳情圖 1024×1536 (2:3)
- 異步提交 + 輪詢模式，自動下載並轉換為 Base64
- 批量生成 + 進度條顯示
- 單張重繪、放大檢視、一鍵打包下載 ZIP

### 項目管理
- IndexedDB 持久化儲存（圖片不會因刷新丟失）
- 左側歷史項目列表，點擊即可切換並恢復所有圖片
- 自動保存每個 Phase 的進度
- 日夜主題切換（預設白天模式）

---

## 技術棧

| 層面 | 技術 |
|------|------|
| 前端框架 | React 18 + TypeScript 5 |
| 建置工具 | Vite 5 |
| 樣式 | Tailwind CSS 3 (PostCSS) |
| AI 文本 | GPT-5.5 (via APIMart Chat Completions API) |
| AI 圖片 | GPT-Image-2 (via APIMart Images API，異步提交/輪詢) |
| AI 視覺 | GPT-5.5 Vision (圖片文字識別) |
| 持久化 | IndexedDB (圖片) + localStorage (專案元數據) |
| 圖片處理 | Canvas API (色彩萃取、文字模糊遮蓋) |
| 打包下載 | JSZip |

---

## 專案結構

```
src/
├── App.tsx                    # 主狀態機（3-Phase 工作流）
├── components/
│   ├── InputForm.tsx          # 產品輸入表單
│   ├── ShopeeImageGrid.tsx    # 圖片網格 + 批量生成
│   ├── Phase2Section.tsx      # Listing 審閱
│   ├── ProjectHistory.tsx     # 歷史項目側邊欄
│   └── ...
├── services/
│   ├── imageGenService.ts     # 圖片生成 API（異步）
│   ├── listingService.ts      # Listing 生成邏輯
│   ├── storageService.ts      # IndexedDB 持久化
│   └── visionService.ts       # OCR 文字識別
├── types/shopee.ts            # 30+ 型別定義
├── utils/                     # 工具函數
├── prompts/                   # Prompt 模板
└── references/                # 台灣在地化參考
```

---

## 環境變數

| 變數 | 說明 | 必填 |
|------|------|------|
| `VITE_APIMART_API_KEY` | APIMart API Key | 是 |

---

## 致謝

本專案基於 [AI-PM-Designer-Pro](https://github.com/mkhsu2002/AI-PM-Designer-Pro) (v0.8) 重構而來，原始碼託管於 [stephenlzc/shopee-listing-studio](https://github.com/stephenlzc/shopee-listing-studio)。感謝原作者的創意與基礎架構，我們在此基礎上進行了以下重大改造：

- 從 Google Gemini 遷移至 APIMart API（GPT-5.5 + GPT-Image-2）
- 從 4-Phase 廣告行銷工作流轉變為 3-Phase 蝦皮 Listing 工作流
- 加入台灣用語在地化、合規檢查、SEO 標題生成
- 圖片持久化從 localStorage 遷移至 IndexedDB
- 新增日夜主題切換
- API Key 管理從硬編碼遷移至環境變數

詳細的程式碼差異分析報告請見：[Git Diff Report](./test-results/GIT-DIFF-REPORT.md)

## License

**[MIT License](./LICENSE)**
