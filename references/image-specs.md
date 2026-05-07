# 蝦皮圖片規格

## 輸出規格

| 類型 | 尺寸 | 比例 | 數量 |
|------|------|------|------|
| 主圖 (Main) | 1024×1024 | 1:1 | 6 張 |
| 詳情圖 (Detail) | 1024×1536 | 2:3 | 4-6 張 |
| SKU 圖 (SKU) | 1024×1024 | 1:1 | 可選，N 張 |
| 產品底圖 (Base) | 1024×1024 | 1:1 | 1 張 |

## API 參數 (image-2 via xi-ai.cn)

| 參數 | 主圖/SKU | 詳情圖 |
|------|----------|--------|
| `model` | `gpt-image-2` | `gpt-image-2` |
| `size` | `1024x1024` | `1024x1536` |
| `quality` | `medium` | `medium` |
| `output_format` | `png` | `png` |
| `n` | `1` | `1` |

## 主圖內容結構 (6 張)

| # | 標題 | 用途 |
|---|------|------|
| 1 | 商品第一眼封面圖 | 品牌 + 產品名，安全副標，3 個特色標籤 |
| 2 | 商品亮點圖 A｜特色總覽 | 3 個安全賣點 |
| 3 | 使用情境圖 A｜人物/身體部位 | 真實使用場景 + 人物 |
| 4 | 使用情境圖 B｜生活場景/第二角度 | 不同角度或日常場景 |
| 5 | 商品亮點圖 B｜質地膚感 | 質地、觸感 |
| 6 | 商品亮點圖 C｜成分概念/安心日常 | 成分、信任感 |

## 詳情圖內容結構 (4-6 張)

| # | 標題 | 用途 |
|---|------|------|
| 1 | 產品整體介紹圖 | 社交電商第一印象 |
| 2 | 成分/配方看點圖 | 3 個模組 + 買家語言解釋 |
| 3 | 適合誰/怎麼選圖 | 買家適配、場景指南、送禮/自用選擇 |
| 4 | 商品資訊與溫馨提醒圖 | 產品資訊卡、提醒卡、底部總結 |
| 5-6 | (可選擴展) | SKU 組合或使用方式 |

## 圖片 Prompt 必要聲明

所有圖片 Prompt 必須包含：

1. **目標資產聲明**：`Target asset: Main Image N / main-0N. Generate only this single standalone image.`
2. **嚴格尺寸要求**：`This image MUST be 1:1 square aspect ratio.` (或 2:3 for detail)
3. **原圖文字保真**：禁止翻譯、繁簡轉換、刪除、遮蔽、模糊或重新繪製任何文字
4. **視覺風格**：`bold, high saturation, contrasting colors, layout like trendy beauty social media posts. Gen Z color lighting with clean typography.`
5. **產品參考**：使用已驗證的產品底圖
6. **內容與文案排版**

## 禁止事項

- 改動原圖中的任何文字
- 生成拼接大圖 / 總覽圖 / collage
- 使用 herbs, ginseng, leaves, water drops (非產品相關)
- 使用 pink/gold 背景色
- 傳統詳情頁風格或老式電視購物風格
