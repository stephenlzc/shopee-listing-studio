# 中传代理 (xi-ai.cn) API 使用指南

## 基本信息

| 项目     | 值                                                      |
| -------- | ------------------------------------------------------- |
| Endpoint | `https://api.xi-ai.cn/v1/images/generations`          |
| API Key  | `sk-sfLfU1ZDLTVC8vYt8e22A188A34a4dEf911e4eB336E932D5` |
| 图像模型 | `gpt-image-2`                                         |
| 语言模型 | `gpt-5.5`（文本对话，本文档不展开）                   |

> ⚠️ 必须使用 `gpt-image-2`，`image-2` 不可用。

---

## 支持的参数

| 参数              | 类型    | 必填 | 说明                                                                                                            |
| ----------------- | ------- | ---- | --------------------------------------------------------------------------------------------------------------- |
| `model`         | string  | ✅   | 固定填 `gpt-image-2`                                                                                          |
| `prompt`        | string  | ✅   | 提示词，最大 32000 字符                                                                                         |
| `n`             | integer | ❌   | 生成数量，默认 1                                                                                                |
| `size`          | string  | ❌   | `1024x1024`（默认）、`1024x1536`、`1536x1024`、`2048x2048`、`2048x1152`、`3840x2160`、`2160x3840` |
| `quality`       | string  | ❌   | `low` / `medium`（默认） / `high`                                                                         |
| `image`         | string  | ❌   | 参考图，base64 Data URI 格式，如 `data:image/png;base64,iVBORw0KGgo...`                                       |
| `background`    | string  | ❌   | `auto`（默认） / `transparent` / `opaque`                                                                 |
| `output_format` | string  | ❌   | `png`（默认） / `jpeg`                                                                                      |

---

## 可用方案

### 方案一：文生图（纯文本生成）

```bash
curl -X POST "https://api.xi-ai.cn/v1/images/generations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-sfLfU1ZDLTVC8vYt8e22A188A34a4dEf911e4eB336E932D5" \
  -d '{
    "model": "gpt-image-2",
    "prompt": "一位气质美女在泰国布吉岛的海滩上，穿着时尚泳装，IG网红风格照片，色调明亮清新，热带棕榈树背景，高品质摄影",
    "n": 1,
    "size": "1024x1024",
    "quality": "medium"
  }'
```

**返回体**：

```json
{
  "data": [
    {
      "url": "https://imagefil.scdn.app/assets/codex/xxx.png"
    }
  ],
  "created": 1777823948,
  "usage": {
    "input_tokens": 76,
    "output_tokens": 3122,
    "total_tokens": 3198
  }
}
```

取 `data[0].url` 下载图片。

---

### 方案二：参考图生成 — 台湾虾皮 1:1 主图

```python
import base64
import requests

API_KEY = "sk-sfLfU1ZDLTVC8vYt8e22A188A34a4dEf911e4eB336E932D5"
ENDPOINT = "https://api.xi-ai.cn/v1/images/generations"

with open("Picture1.png", "rb") as f:
    b64 = base64.b64encode(f.read()).decode()

payload = {
    "model": "gpt-image-2",
    "prompt": "参考这个产品，生成一张台湾虾皮电商风格的1:1正方形主图，背景干净简约，突出产品卖点，专业电商摄影风格",
    "n": 1,
    "size": "1024x1024",
    "image": f"data:image/png;base64,{b64}",
    "quality": "medium"
}

resp = requests.post(
    ENDPOINT,
    headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
    json=payload,
    timeout=180
)
resp.raise_for_status()
result = resp.json()
img_bytes = base64.b64decode(result["data"][0]["b64_json"])

with open("shopee_main.png", "wb") as f:
    f.write(img_bytes)
```

**返回体**：

```json
{
  "data": [
    {
      "b64_json": "iVBORw0KGgoAAAANSUhEUg..."
    }
  ],
  "created": 1777824543,
  "background": "opaque"
}
```

取 `data[0].b64_json` base64 解码为图片。

---

### 方案三：参考图生成 — 竖版详情页（1024×1536）

```python
import base64
import requests

API_KEY = "sk-sfLfU1ZDLTVC8vYt8e22A188A34a4dEf911e4eB336E932D5"
ENDPOINT = "https://api.xi-ai.cn/v1/images/generations"

with open("Picture1.png", "rb") as f:
    b64 = base64.b64encode(f.read()).decode()

payload = {
    "model": "gpt-image-2",
    "prompt": "参考这个产品，生成一张台湾虾皮电商风格的产品详情页长图，竖版布局，展示产品特点、功能介绍和使用场景，专业电商设计，白色背景为主",
    "n": 1,
    "size": "1024x1536",
    "image": f"data:image/png;base64,{b64}",
    "quality": "medium"
}

resp = requests.post(
    ENDPOINT,
    headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
    json=payload,
    timeout=180
)
resp.raise_for_status()
result = resp.json()
img_bytes = base64.b64decode(result["data"][0]["b64_json"])

with open("shopee_detail.png", "wb") as f:
    f.write(img_bytes)
```

**返回体**与方案二相同：取 `data[0].b64_json` base64 解码。

---

## 重要注意

| 注意点       | 说明                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------- |
| 超时         | 必须设 `timeout ≥ 120` 秒，建议 **180 秒**。图像生成平均耗时 30~90 秒。                |
| 返回格式差异 | 不带 `image` 参数 → 返回 `url`；带 `image` 参数 → 返回 `b64_json`。                   |
| 禁用参数     | **不要传** `response_format`、`aspect_ratio`、`watermark`、`size: "2K"`，会报错。 |
| 参考图格式   | `image` 字段必须是完整 Data URI：`data:image/png;base64,{base64字符串}`                     |

---

## 相关文档

- 测试问题记录：[bug_found.md](bug_found.md)
- 排障与代码模板：[bug_fix_methods.md](bug_fix_methods.md)
