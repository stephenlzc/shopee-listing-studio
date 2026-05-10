import React, { useState } from 'react';
import type { ShopeeVisualStyle, SkuOption } from '../types/shopee';

// ============================================================================
// Constants
// ============================================================================

const PRODUCT_TYPES = ['護膚', '美妝', '髮品', '身體護理', '其他'] as const;

const VISUAL_STYLE_OPTIONS: { value: ShopeeVisualStyle; label: string; group: string }[] = [
  { value: 'fresh-watery', label: '清新水感', group: '基礎' },
  { value: 'creamy-soft', label: '奶油柔潤', group: '基礎' },
  { value: 'clean-refreshing', label: '清爽潔淨', group: '基礎' },
  { value: 'botanical-natural', label: '植萃自然', group: '基礎' },
  { value: 'premium-minimal', label: '高級極簡', group: '基礎' },
  { value: 'girly-sweet', label: '少女甜感', group: '情感' },
  { value: 'gentle-elegant', label: '溫柔優雅', group: '情感' },
  { value: 'bold-playful', label: '大膽活潑', group: '情感' },
  { value: 'calm-serene', label: '沉靜舒緩', group: '情感' },
  { value: 'luxury-golden', label: '奢華金屬', group: '情感' },
  { value: 'lifestyle-home', label: '生活居家', group: '場景' },
  { value: 'office-professional', label: '都市職場', group: '場景' },
  { value: 'dorm-young', label: '宿舍青春', group: '場景' },
  { value: 'gym-active', label: '運動活力', group: '場景' },
  { value: 'spa-resort', label: '溫泉度假', group: '場景' },
  { value: 'tech-transparent', label: '科技透明', group: '特殊' },
  { value: 'gift-box', label: '禮盒質感', group: '特殊' },
  { value: 'gen-z-impact', label: 'Z世代衝擊', group: '特殊' },
  { value: 'retro-vintage', label: '文青復古', group: '特殊' },
  { value: 'tropical-island', label: '熱帶島嶼', group: '特殊' },
];

// ============================================================================
// Props
// ============================================================================

interface InputFormProps {
  productName: string;
  brandContext: string;
  productType: string;
  specs: string;
  capacity: string;
  features: string[];
  scenario: string;
  visualStyle: ShopeeVisualStyle;
  skuOptions: SkuOption[];
  customNotes: string;
  selectedFile: File | null;
  imagePreview: string | null;
  inputErrors: Record<string, string>;
  hasFile: boolean;
  onProductNameChange: (v: string) => void;
  onBrandContextChange: (v: string) => void;
  onProductTypeChange: (v: string) => void;
  onSpecsChange: (v: string) => void;
  onCapacityChange: (v: string) => void;
  onFeaturesChange: (v: string[]) => void;
  onScenarioChange: (v: string) => void;
  onVisualStyleChange: (v: ShopeeVisualStyle) => void;
  onSkuOptionsChange: (v: SkuOption[]) => void;
  onCustomNotesChange: (v: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAnalyze: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const InputForm: React.FC<InputFormProps> = ({
  productName,
  brandContext,
  productType,
  specs,
  capacity,
  features,
  scenario,
  visualStyle,
  skuOptions,
  customNotes,
  selectedFile,
  imagePreview,
  inputErrors,
  hasFile,
  onProductNameChange,
  onBrandContextChange,
  onProductTypeChange,
  onSpecsChange,
  onCapacityChange,
  onFeaturesChange,
  onScenarioChange,
  onVisualStyleChange,
  onSkuOptionsChange,
  onCustomNotesChange,
  onFileChange,
  onAnalyze,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFeatureChange = (index: number, value: string) => {
    const updated = [...features];
    updated[index] = value;
    if (index === features.length - 1 && value.trim()) {
      updated.push('');
    }
    onFeaturesChange(updated.filter((f, i) => i < index + 2 || f.trim()));
  };

  const handleSkuAdd = () => {
    onSkuOptionsChange([...skuOptions, { sku: '', emojiName: '', contents: '' }]);
  };

  const handleSkuRemove = (index: number) => {
    onSkuOptionsChange(skuOptions.filter((_, i) => i !== index));
  };

  const handleSkuChange = (index: number, field: keyof SkuOption, value: string) => {
    const updated = [...skuOptions];
    updated[index] = { ...updated[index], [field]: value };
    onSkuOptionsChange(updated);
  };

  const inputClass = (field: string) =>
    `w-full bg-white dark:bg-[#15151a] border rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none transition-colors ${
      inputErrors[field] ? 'border-red-500' : 'border-gray-300 dark:border-white/10 focus:border-purple-500'
    }`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mx-auto mt-6">
      {/* Left: Image Upload */}
      <div className="order-2 md:order-1">
        <label
          className={`flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden ${
            selectedFile
              ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-[#15151a]'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a1f]'
          }`}
        >
          {imagePreview ? (
            <div className="w-full h-full relative group">
              <img src={imagePreview} alt="產品預覽" className="w-full h-full object-contain p-4" />
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white font-medium">更換圖片</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-10 h-10 mb-3 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">上傳產品圖片</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">支援 JPG, PNG, WebP</p>
            </div>
          )}
          <input type="file" className="hidden" onChange={onFileChange} accept="image/*" />
        </label>
      </div>

      {/* Right: Form Fields */}
      <div className="order-1 md:order-2 flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-1">
        {/* Product Name */}
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            1. 產品名稱 <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="text"
            value={productName}
            onChange={(e) => onProductNameChange(e.target.value)}
            placeholder="例如：玻尿酸保濕精華液、胺基酸潔顏乳..."
            className={inputClass('productName')}
          />
          {inputErrors.productName && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{inputErrors.productName}</p>}
        </div>

        {/* Brand Context */}
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">2. 品牌 / 背景資訊</label>
          <textarea
            value={brandContext}
            onChange={(e) => onBrandContextChange(e.target.value)}
            placeholder="品牌故事、官網連結、產品背景..."
            className={`${inputClass('brandContext')} h-20 resize-none text-sm`}
          />
          {inputErrors.brandContext && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{inputErrors.brandContext}</p>}
        </div>

        {/* Product Type + Specs + Capacity (inline) */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">產品類型</label>
            <select
              value={productType}
              onChange={(e) => onProductTypeChange(e.target.value)}
              className={inputClass('productType')}
            >
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">規格</label>
            <input
              type="text"
              value={specs}
              onChange={(e) => onSpecsChange(e.target.value)}
              placeholder="如：30ml"
              className={inputClass('specs')}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">容量</label>
            <input
              type="text"
              value={capacity}
              onChange={(e) => onCapacityChange(e.target.value)}
              placeholder="如：1入"
              className={inputClass('capacity')}
            />
          </div>
        </div>

        {/* Features (tag inputs) */}
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">3. 產品特色 (3 個賣點)</label>
          <div className="space-y-2">
            {features.slice(0, 5).map((f, i) => (
              <input
                key={i}
                type="text"
                value={f}
                onChange={(e) => handleFeatureChange(i, e.target.value)}
                placeholder={`特色 ${i + 1}：如 深層保濕、清爽不黏膩...`}
                className={inputClass('features')}
              />
            ))}
          </div>
        </div>

        {/* Scenario */}
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">4. 適用場景</label>
          <input
            type="text"
            value={scenario}
            onChange={(e) => onScenarioChange(e.target.value)}
            placeholder="例如：日常保養、妝前打底、睡前修護..."
            className={inputClass('scenario')}
          />
        </div>

        {/* Visual Style */}
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">5. 視覺風格</label>
          <select
            value={visualStyle}
            onChange={(e) => onVisualStyleChange(e.target.value as ShopeeVisualStyle)}
            className={inputClass('visualStyle')}
          >
            {VISUAL_STYLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                [{opt.group}] {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Toggle Advanced */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
        >
          <svg className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {showAdvanced ? '收起進階選項' : '展開進階選項（SKU、備註）'}
        </button>

        {/* Advanced: SKU Options + Custom Notes */}
        {showAdvanced && (
          <>
            {/* SKU Options */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                6. SKU 選項（可選）
              </label>
              <div className="space-y-3">
                {skuOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2 items-start bg-gray-50 dark:bg-[#15151a] border border-gray-200 dark:border-white/5 rounded-lg p-3">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={opt.sku}
                        onChange={(e) => handleSkuChange(i, 'sku', e.target.value)}
                        placeholder="SKU 代號"
                        className="w-full bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:border-purple-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={opt.emojiName}
                        onChange={(e) => handleSkuChange(i, 'emojiName', e.target.value)}
                        placeholder="emoji + 名稱"
                        className="w-full bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:border-purple-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={opt.contents}
                        onChange={(e) => handleSkuChange(i, 'contents', e.target.value)}
                        placeholder="組合內容"
                        className="w-full bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSkuRemove(i)}
                      className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 text-xs p-1 shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleSkuAdd}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors flex items-center gap-1"
                >
                  + 新增 SKU
                </button>
              </div>
            </div>

            {/* Custom Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">7. 自訂備註</label>
              <textarea
                value={customNotes}
                onChange={(e) => onCustomNotesChange(e.target.value)}
                placeholder="補充說明、特殊需求..."
                className={`${inputClass('customNotes')} h-20 resize-none text-sm`}
              />
            </div>
          </>
        )}

        {/* Submit */}
        {hasFile && (
          <button
            onClick={onAnalyze}
            className="mt-2 w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-sm uppercase tracking-widest rounded-lg hover:opacity-90 transition-opacity shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2"
          >
            <span>開始 AI 分析</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
