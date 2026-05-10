import React, { useState, useCallback } from 'react';
import { BlurTool } from './BlurTool';
import { TextDetectionPanel } from './TextDetectionPanel';
import { ShopeeAppState } from '../types/shopee';
import type { ShopeeListing, VisionAnalysisResult, SeoTitle, BlurRegion } from '../types/shopee';

// ============================================================================
// Copy Button
// ============================================================================

const CopyButton: React.FC<{ text: string; label?: string }> = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback
    }
  }, [text]);
  return (
    <button
      onClick={handleCopy}
      className={`text-[10px] px-2 py-0.5 rounded border transition-all flex-shrink-0 ${
        copied
          ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border-green-300 dark:border-green-500/30'
          : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 border-gray-300 dark:border-white/10'
      }`}
      title={label || '複製'}
    >
      {copied ? '已複製!' : '複製'}
    </button>
  );
};

// ============================================================================
// Props
// ============================================================================

interface Phase2SectionProps {
  listing: ShopeeListing;
  visionResult: VisionAnalysisResult | null;
  productName: string;
  imagePreview: string | null;
  processedImageBase64: string | null;
  blurRegions: BlurRegion[];
  baseImageBase64: string | null;
  baseImageGenerating: boolean;
  appState: ShopeeAppState;
  onImageProcessed: (base64: string, regions: BlurRegion[]) => void;
  onGenerateBaseImage: () => void;
  onDownloadReport: () => void;
  onProceedToPhase3: () => void;
}

// ============================================================================
// Sub-components
// ============================================================================

const CollapsibleSection: React.FC<{
  title: string; count: number; defaultOpen?: boolean; children: React.ReactNode;
}> = ({ title, count, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-[#1a1a1f] hover:bg-gray-200 dark:hover:bg-[#1e1e24] transition-colors text-left"
      >
        <span className="text-sm font-bold text-gray-900 dark:text-white">{title} <span className="text-gray-400 dark:text-gray-500 font-normal ml-2">({count})</span></span>
        <svg className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="p-4 bg-gray-50 dark:bg-[#15151a]">{children}</div>}
    </div>
  );
};

const SeoTitleRow: React.FC<{ title: SeoTitle; onChange: (seq: number, value: string) => void }> = ({ title, onChange }) => (
  <div className="mb-3 last:mb-0">
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs text-gray-400 dark:text-gray-500 font-bold">#{title.seq}</span>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold ${title.charCount >= 50 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
          {title.charCount} 字{title.charCount < 50 && ' (建議 ≥ 50)'}
        </span>
        <CopyButton text={title.title} />
      </div>
    </div>
    <textarea
      value={title.title}
      onChange={(e) => onChange(title.seq, e.target.value)}
      className="w-full bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-purple-500 focus:outline-none resize-none h-16"
    />
    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">關鍵詞：{title.keywords}</p>
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

type PreprocessTab = 'text_detect' | 'blur' | 'listing';

export const Phase2Section: React.FC<Phase2SectionProps> = ({
  listing,
  visionResult,
  productName,
  imagePreview,
  processedImageBase64,
  blurRegions,
  baseImageBase64,
  baseImageGenerating,
  appState,
  onImageProcessed,
  onGenerateBaseImage,
  onDownloadReport,
  onProceedToPhase3,
}) => {
  const [activeTab, setActiveTab] = useState<PreprocessTab>(
    visionResult && visionResult.detectedTexts.length > 0 ? 'text_detect' : 'listing',
  );
  const [editedDescription, setEditedDescription] = useState(listing.productDescription);
  const [editedSeoTitles, setEditedSeoTitles] = useState(listing.seoTitles);
  const [detectedRegions, setDetectedRegions] = useState<BlurRegion[]>(blurRegions);

  const handleSeoTitleChange = (seq: number, value: string) => {
    setEditedSeoTitles((prev) =>
      prev.map((t) => (t.seq === seq ? { ...t, title: value, charCount: countChinese(value) } : t)),
    );
  };

  const hasVisionData = visionResult && visionResult.detectedTexts.length > 0;
  const isPhase3 = appState === ShopeeAppState.PHASE3_GENERATING || appState === ShopeeAppState.PHASE3_COMPLETE;
  const hasProcessedImage = !!processedImageBase64;

  const tabs: { key: PreprocessTab; label: string; badge?: string }[] = [
    ...(hasVisionData ? [{ key: 'text_detect' as const, label: '文字識別', badge: `${visionResult!.detectedTexts.length}` }] : []),
    { key: 'blur' as const, label: '模糊處理', badge: hasProcessedImage ? '已處理' : undefined },
    { key: 'listing' as const, label: 'Listing 審閱' },
  ];

  return (
    <div className="border-t border-gray-200 dark:border-white/10 pt-12 mt-12">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">2</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex-1">Phase 2: 素材預處理 + Listing 審閱</h2>
        <button
          onClick={onDownloadReport}
          className="px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          下載 Listing 報告
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-[#1a1a1f] p-1 rounded-lg border border-gray-200 dark:border-white/10 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === tab.key ? 'bg-purple-600 text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
            {tab.badge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                tab.badge === '已處理' ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {/* Tab: Text Detection */}
        {activeTab === 'text_detect' && visionResult && (
          <TextDetectionPanel
            visionResult={visionResult}
            onSelectionChange={(regions) => setDetectedRegions(regions)}
          />
        )}

        {/* Tab: Blur Tool */}
        {activeTab === 'blur' && imagePreview && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              拖曳框選圖片中需要模糊的區域（如高風險文字）。處理後的圖片將用作所有後續生成的參考底圖。
            </p>
            <BlurTool
              imageBase64={imagePreview}
              initialRegions={detectedRegions.length > 0 ? detectedRegions : blurRegions}
              onProcessed={(base64, regions) => onImageProcessed(base64, regions)}
              intensity="medium"
            />
            {processedImageBase64 && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-500/10 border border-green-300 dark:border-green-500/30 rounded-lg flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-green-600 dark:text-green-400 flex-1">模糊處理完成 — 已儲存處理後底圖</span>
              </div>
            )}

            {processedImageBase64 && !baseImageBase64 && (
              <div className="mt-4 p-4 bg-gray-100 dark:bg-[#1a1a1f] border border-blue-300 dark:border-blue-500/20 rounded-xl">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  生成優化的產品底圖（AI 會將處理後的圖片轉換為乾淨的商品照，保留所有文字，適用於後續主圖與詳情圖生成）。
                </p>
                <button
                  onClick={onGenerateBaseImage}
                  disabled={baseImageGenerating}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {baseImageGenerating ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      生成中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                      生成產品底圖
                    </>
                  )}
                </button>
              </div>
            )}

            {baseImageBase64 && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-300 dark:border-blue-500/30 rounded-lg flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-blue-600 dark:text-blue-400">產品底圖已生成 — 後續圖片將以此為參考</span>
              </div>
            )}
          </div>
        )}

        {/* Tab: Listing Review */}
        {activeTab === 'listing' && (
          <>
            {/* SEO Titles */}
            <CollapsibleSection title="SEO 標題" count={editedSeoTitles.length} defaultOpen>
              {editedSeoTitles.map((t) => (
                <SeoTitleRow key={t.seq} title={t} onChange={handleSeoTitleChange} />
              ))}
            </CollapsibleSection>

            {/* Product Description */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-md font-bold text-gray-900 dark:text-white">產品描述</h3>
                <CopyButton text={editedDescription} label="複製全文" />
              </div>
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="w-full bg-white dark:bg-[#15151a] border border-gray-300 dark:border-white/10 rounded-xl p-4 text-sm text-gray-900 dark:text-white focus:border-purple-500 focus:outline-none resize-none h-32 leading-relaxed"
              />
            </div>

            {/* Main Image Prompts */}
            <CollapsibleSection title="主圖 Prompt" count={listing.mainImages.length} defaultOpen>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {listing.mainImages.map((img) => (
                  <div key={img.id} className="bg-gray-100 dark:bg-black/20 rounded-lg p-3 border border-gray-200 dark:border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{img.id} · {img.title}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">{img.displaySize}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{img.purpose}</p>
                    <div className="flex items-start justify-between gap-2"><p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono line-clamp-3 leading-relaxed flex-1">{img.promptText}</p><CopyButton text={img.promptText} /></div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* Detail Image Prompts */}
            {listing.detailImages.length > 0 && (
              <CollapsibleSection title="詳情圖 Prompt" count={listing.detailImages.length}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {listing.detailImages.map((img) => (
                    <div key={img.id} className="bg-gray-100 dark:bg-black/20 rounded-lg p-3 border border-gray-200 dark:border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">{img.id} · {img.title}</span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">{img.displaySize}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{img.purpose}</p>
                      <div className="flex items-start justify-between gap-2"><p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono line-clamp-3 leading-relaxed flex-1">{img.promptText}</p><CopyButton text={img.promptText} /></div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Compliance Check */}
            {listing.complianceCheck.length > 0 && (
              <div>
                <h3 className="text-md font-bold text-gray-900 dark:text-white mb-3">合規檢查</h3>
                <div className="bg-gray-50 dark:bg-[#15151a] border border-gray-200 dark:border-white/10 rounded-xl p-4">
                  <div className="space-y-2">
                    {listing.complianceCheck.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="text-red-600 dark:text-red-400 line-through">「{item.originalWord}」</span>
                        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                        <span className="text-green-600 dark:text-green-400">「{item.replacement}」</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{item.riskReason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SKU Bundles */}
            {listing.skuBundles.length > 0 && (
              <CollapsibleSection title="SKU 組合建議" count={listing.skuBundles.length}>
                <div className="space-y-3">
                  {listing.skuBundles.map((sku, i) => (
                    <div key={i} className="bg-gray-100 dark:bg-black/20 rounded-lg p-3 border border-gray-200 dark:border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{sku.emojiName}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{sku.sku}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{sku.contents}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">適合：{sku.targetBuyer} · {sku.guidance}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Proceed to Phase 3 */}
            {!isPhase3 && (
              <div className="text-center pt-4">
                <button
                  onClick={onProceedToPhase3}
                  className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-sm uppercase tracking-widest rounded-lg hover:opacity-90 transition-opacity shadow-lg shadow-green-900/30 flex items-center gap-2 mx-auto"
                >
                  <span>確認並進入圖片製作</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Helper
// ============================================================================

function countChinese(text: string): number {
  const matches = text.match(/[一-鿿㐀-䶿]/g);
  return matches ? matches.length : 0;
}
