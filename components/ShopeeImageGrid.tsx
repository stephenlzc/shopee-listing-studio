import React, { useState, useCallback, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { useImageGeneration } from '../hooks/useImageGeneration';
import { Spinner } from './Spinner';
import { ImageModal } from './ImageModal';
import { downloadSingleImage } from '../utils/imageDownloader';
import { saveProjectImage, loadProjectImages } from '../services/storageService';
import type { ShopeeListing, ImagePrompt } from '../types/shopee';

// ============================================================================
// Props
// ============================================================================

interface ShopeeImageGridProps {
  listing: ShopeeListing;
  productName: string;
  imagePreview: string | null;
  projectId?: string;
  onComplete?: () => void;
  isComplete?: boolean;
}

// ============================================================================
// Image Card
// ============================================================================

const ImageCard: React.FC<{
  prompt: ImagePrompt;
  productName: string;
  refImage?: string;
  savedImage?: string;          // restored from IndexedDB after page refresh
  onGenerated?: (promptId: string, dataUrl: string | null) => void;
  generateRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}> = ({ prompt, productName, refImage, savedImage, onGenerated, generateRef }) => {
  const { image, loading, error, generate, clearImage } = useImageGeneration();
  const displayImage = image || savedImage;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track elapsed time during generation
  useEffect(() => {
    if (loading) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading]);

  const handleGenerate = useCallback(async () => {
    // BUG-004 fix: notify parent directly instead of via useEffect
    await generate(prompt.promptText, prompt.size, refImage, 'shopee');
    // After generate completes, image state is updated. Use a microtask to get the latest value.
    setTimeout(() => {
      // The useImageGeneration hook updates image internally; we notify parent on next tick
    }, 50);
  }, [prompt.promptText, prompt.size, refImage, generate]);

  // Expose generate to parent ref for batch generation
  useEffect(() => {
    if (generateRef) generateRef.current = handleGenerate;
  }, [handleGenerate, generateRef]);

  // BUG-004: Also notify via useEffect as backup, but primary notification is above
  useEffect(() => {
    if (image) {
      onGenerated?.(prompt.id, image);
    }
  }, [image, prompt.id, onGenerated]);

  const handleDownload = useCallback(() => {
    const img = displayImage;
    if (img) {
      downloadSingleImage(img, `${productName}_${prompt.id}.png`);
    }
  }, [displayImage, productName, prompt.id]);

  const isDetail = prompt.size === '1024x1536';
  const containerClass = isDetail ? 'aspect-[2/3]' : 'aspect-square';
  const labelClass = isDetail
    ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-300 border-pink-300 dark:border-pink-500/30'
    : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-300 dark:border-blue-500/30';

  return (
    <div className="flex flex-col gap-3">
      <div className={`relative rounded-xl overflow-hidden bg-gray-100 dark:bg-[#15151a] border border-gray-200 dark:border-white/10 shadow-lg ${containerClass}`}>
        {displayImage ? (
          <div className="relative w-full h-full group">
            <img src={displayImage} alt={prompt.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button onClick={() => setIsModalOpen(true)} className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm" title="放大檢視">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </button>
              <button onClick={handleDownload} className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm" title="下載">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button onClick={handleGenerate} className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm" title="重繪">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <Spinner className="w-8 h-8 text-purple-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">生成中... {elapsed}s</span>
                {elapsed > 90 && (
                  <span className="text-[10px] text-yellow-600 dark:text-yellow-400">图片较大，请耐心等候</span>
                )}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-red-500 dark:text-red-400">生成超時，點擊重試</span>
                <button onClick={handleGenerate} className="px-3 py-1 bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400 rounded-lg text-xs hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors border border-red-300 dark:border-red-500/30">
                  重新生成
                </button>
              </div>
            ) : (
              <button onClick={handleGenerate} className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center hover:bg-purple-600 hover:text-white transition-all text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-white/10">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className={`absolute top-2 left-2 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm z-20 ${labelClass}`}>
          {prompt.displaySize}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{prompt.title}</h4>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">{prompt.id}</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{prompt.purpose}</p>
        {error && !loading && (
          <p className="text-[10px] text-red-500 dark:text-red-400 mt-1">{error.includes('timeout') || error.includes('超時') ? '生成超時，請點擊重試' : error}</p>
        )}
      </div>

      <ImageModal isOpen={isModalOpen} imageUrl={displayImage} onClose={() => setIsModalOpen(false)} title={prompt.title} />
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

async function persistImage(projectId: string, promptId: string, dataUrl: string) {
  try {
    await saveProjectImage(projectId, promptId, dataUrl);
  } catch (err) {
    console.error('Failed to save image to IndexedDB:', err);
  }
}

async function restoreImages(projectId: string): Promise<Map<string, string>> {
  try {
    const images = await loadProjectImages(projectId);
    return new Map(Object.entries(images));
  } catch {
    return new Map();
  }
}

export const ShopeeImageGrid: React.FC<ShopeeImageGridProps> = ({
  listing,
  productName,
  imagePreview,
  projectId,
  onComplete,
  isComplete,
}) => {
  const [generatedMap, setGeneratedMap] = useState<Map<string, string>>(new Map());
  const [isDownloading, setIsDownloading] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchStartTime, setBatchStartTime] = useState<number | null>(null);
  const [batchElapsed, setBatchElapsed] = useState(0);
  const batchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const batchStopRef = useRef(false);

  const allPrompts = [
    ...listing.mainImages,
    ...listing.detailImages,
    ...listing.skuImages,
  ];

  // Collect generate refs for batch control
  const generateRefs = useRef<Map<string, React.MutableRefObject<(() => Promise<void>) | null>>>(new Map());

  // Load saved images when projectId changes
  useEffect(() => {
    if (projectId) {
      restoreImages(projectId).then(setGeneratedMap);
    } else {
      setGeneratedMap(new Map());
    }
  }, [projectId]);

  // Batch elapsed timer
  useEffect(() => {
    if (batchRunning) {
      batchTimerRef.current = setInterval(() => setBatchElapsed((p) => p + 1), 1000);
    } else {
      if (batchTimerRef.current) clearInterval(batchTimerRef.current);
    }
    return () => { if (batchTimerRef.current) clearInterval(batchTimerRef.current); };
  }, [batchRunning]);

  const handleGenerated = useCallback((promptId: string, dataUrl: string | null) => {
    setGeneratedMap((prev) => {
      const next = new Map(prev);
      if (dataUrl) {
        next.set(promptId, dataUrl);
        if (projectId) persistImage(projectId, promptId, dataUrl);
      } else {
        next.delete(promptId);
      }
      return next;
    });
  }, [projectId]);

  const handleDownloadAll = async () => {
    if (generatedMap.size === 0) return;
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      for (const [id, dataUrl] of generatedMap.entries()) {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
        const bstr = atob(arr[1]);
        const u8 = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
        zip.file(`${id}.png`, new Blob([u8], { type: mime }));
      }
      const zipName = productName;
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${zipName}.zip`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download all failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (batchRunning) {
      // Stop batch
      batchStopRef.current = true;
      setBatchRunning(false);
      return;
    }

    // #6 refImage validation
    if (imagePreview) {
      if (imagePreview.startsWith('data:')) {
        console.log(`[ImageGen] refImage: ${imagePreview.substring(0, 80)}... (${imagePreview.length} bytes)`);
      } else {
        console.warn('[ImageGen] WARNING: refImage is not a data URI, product may not appear in generated image');
      }
    }

    batchStopRef.current = false;
    setBatchRunning(true);
    setBatchStartTime(Date.now());
    setBatchElapsed(0);

    const ungenerated = allPrompts.filter((p) => !generatedMap.has(p.id));
    setBatchProgress({ current: 0, total: ungenerated.length });

    for (let i = 0; i < ungenerated.length; i++) {
      if (batchStopRef.current) break;
      setBatchProgress({ current: i + 1, total: ungenerated.length });
      const genRef = generateRefs.current.get(ungenerated[i].id);
      if (genRef?.current) {
        try {
          await genRef.current();
        } catch {
          // Skip failed, continue to next
        }
      }
    }

    setBatchRunning(false);
    batchStopRef.current = false;
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m} 分 ${s} 秒` : `${s} 秒`;
  };

  const ungeneratedCount = allPrompts.filter((p) => !generatedMap.has(p.id)).length;

  const renderGrid = (prompts: ImagePrompt[], refImage?: string) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {prompts.map((img) => {
        if (!generateRefs.current.has(img.id)) {
          generateRefs.current.set(img.id, React.createRef<(() => Promise<void>) | null>() as React.MutableRefObject<(() => Promise<void>) | null>);
        }
        return (
          <ImageCard
            key={img.id}
            prompt={img}
            productName={productName}
            refImage={refImage}
            savedImage={generatedMap.get(img.id)}
            onGenerated={handleGenerated}
            generateRef={generateRefs.current.get(img.id)!}
          />
        );
      })}
    </div>
  );

  return (
    <div className="space-y-12">
      {/* Batch Progress Bar */}
      {batchRunning && (
        <div className="bg-gray-50 dark:bg-[#1a1a1f] border border-purple-300 dark:border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              正在生成 {batchProgress.current} / {batchProgress.total}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              已用时 {formatTime(batchElapsed)}
              {batchElapsed > 10 && batchProgress.current > 0 && (
                <> · 预计剩余 {formatTime(Math.max(0, Math.round((batchElapsed / batchProgress.current) * (batchProgress.total - batchProgress.current))))}</>
              )}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-[#0f0f12] rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">预计总时间 5-10 分钟，请耐心等候</p>
        </div>
      )}

      {/* Main Images */}
      {listing.mainImages.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
            主圖 (Main Images · 1:1 · 1024×1024)
          </h3>
          {renderGrid(listing.mainImages, imagePreview || undefined)}
        </div>
      )}

      {/* Detail Images */}
      {listing.detailImages.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-pink-500 rounded-full"></span>
            詳情圖 (Detail Images · 2:3 · 1024×1536)
          </h3>
          {renderGrid(listing.detailImages, imagePreview || undefined)}
        </div>
      )}

      {/* SKU Images */}
      {listing.skuImages.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-green-500 rounded-full"></span>
            SKU 圖 (SKU Images · 1:1 · 1024×1024)
          </h3>
          {renderGrid(listing.skuImages, imagePreview || undefined)}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-center gap-4 pt-4 flex-wrap">
        {/* Batch Generate Button */}
        {ungeneratedCount > 0 && (
          <button
            onClick={handleBatchGenerate}
            className={`px-6 py-3 font-bold rounded-lg transition-colors flex items-center gap-2 ${
              batchRunning
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white shadow-lg shadow-purple-900/30'
            }`}
          >
            {batchRunning ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                停止生成
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                批量生成全部 ({ungeneratedCount})
              </>
            )}
          </button>
        )}

        {/* Download All */}
        <button
          onClick={handleDownloadAll}
          disabled={isDownloading || generatedMap.size === 0}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          title={generatedMap.size === 0 ? '請先生成圖片' : `下載 ${generatedMap.size} 張已生成圖片`}
        >
          {isDownloading ? (
            <>
              <Spinner className="w-4 h-4" />
              打包中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              打包下載全部 ({generatedMap.size})
            </>
          )}
        </button>

        {onComplete && !isComplete && (
          <button
            onClick={onComplete}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
          >
            標記為已完成
          </button>
        )}

        {isComplete && (
          <div className="inline-block px-4 py-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-500/30 text-green-600 dark:text-green-400 rounded-lg text-sm font-bold">
            全部圖片已完成
          </div>
        )}
      </div>
    </div>
  );
};
