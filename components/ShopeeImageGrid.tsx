import React, { useState, useCallback, useEffect } from 'react';
import JSZip from 'jszip';
import { useImageGeneration } from '../hooks/useImageGeneration';
import { Spinner } from './Spinner';
import { ImageModal } from './ImageModal';
import { downloadSingleImage } from '../utils/imageDownloader';
import type { ShopeeListing, ImagePrompt } from '../types/shopee';

// ============================================================================
// Props
// ============================================================================

interface ShopeeImageGridProps {
  listing: ShopeeListing;
  productName: string;
  imagePreview: string | null;
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
  onGenerated?: (promptId: string, dataUrl: string | null) => void;
}> = ({ prompt, productName, refImage, onGenerated }) => {
  const { image, loading, error, generate, clearImage } = useImageGeneration();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleGenerate = useCallback(async () => {
    await generate(prompt.promptText, prompt.size, refImage, 'shopee');
  }, [prompt.promptText, prompt.size, refImage, generate]);

  const handleDownload = useCallback(() => {
    if (image) {
      downloadSingleImage(image, `${productName}_${prompt.id}.png`);
    }
  }, [image, productName, prompt.id]);

  // Notify parent when image changes
  useEffect(() => {
    onGenerated?.(prompt.id, image);
  }, [image, prompt.id, onGenerated]);

  const isDetail = prompt.size === '1024x1536';
  const containerClass = isDetail ? 'aspect-[2/3]' : 'aspect-square';
  const labelClass = isDetail
    ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
    : 'bg-blue-500/20 text-blue-300 border-blue-500/30';

  return (
    <div className="flex flex-col gap-3">
      <div className={`relative rounded-xl overflow-hidden bg-[#15151a] border border-white/10 shadow-lg ${containerClass}`}>
        {image ? (
          <div className="relative w-full h-full group">
            <img src={image} alt={prompt.title} className="w-full h-full object-cover" />
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
              <Spinner className="w-8 h-8 text-purple-500" />
            ) : (
              <button onClick={handleGenerate} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-purple-600 hover:text-white transition-all text-gray-500 border border-white/10">
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
          <h4 className="text-sm font-bold text-white leading-tight">{prompt.title}</h4>
          <span className="text-[10px] text-gray-500">{prompt.id}</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{prompt.purpose}</p>
        {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
      </div>

      <ImageModal isOpen={isModalOpen} imageUrl={image} onClose={() => setIsModalOpen(false)} title={prompt.title} />
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ShopeeImageGrid: React.FC<ShopeeImageGridProps> = ({
  listing,
  productName,
  imagePreview,
  onComplete,
  isComplete,
}) => {
  const [generatedMap, setGeneratedMap] = useState<Map<string, string>>(new Map());
  const [isDownloading, setIsDownloading] = useState(false);

  const allPrompts = [
    ...listing.mainImages,
    ...listing.detailImages,
    ...listing.skuImages,
  ];

  const handleGenerated = useCallback((promptId: string, dataUrl: string | null) => {
    setGeneratedMap((prev) => {
      const next = new Map(prev);
      if (dataUrl) next.set(promptId, dataUrl);
      else next.delete(promptId);
      return next;
    });
  }, []);

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
      const zipName = `${productName}_Shopee`.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
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

  const renderGrid = (prompts: ImagePrompt[], refImage?: string) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {prompts.map((img) => (
        <ImageCard
          key={img.id}
          prompt={img}
          productName={productName}
          refImage={refImage}
          onGenerated={handleGenerated}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-12">
      {/* Main Images */}
      {listing.mainImages.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
            主圖 (Main Images · 1:1 · 1024×1024)
          </h3>
          {renderGrid(listing.mainImages, imagePreview || undefined)}
        </div>
      )}

      {/* Detail Images */}
      {listing.detailImages.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-pink-500 rounded-full"></span>
            詳情圖 (Detail Images · 2:3 · 1024×1536)
          </h3>
          {renderGrid(listing.detailImages, imagePreview || undefined)}
        </div>
      )}

      {/* SKU Images */}
      {listing.skuImages.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-green-500 rounded-full"></span>
            SKU 圖 (SKU Images · 1:1 · 1024×1024)
          </h3>
          {renderGrid(listing.skuImages, imagePreview || undefined)}
        </div>
      )}

      {/* Footer: Download All + Complete */}
      <div className="flex items-center justify-center gap-4 pt-4 flex-wrap">
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
          <div className="inline-block px-4 py-3 bg-green-900/30 border border-green-500/30 text-green-400 rounded-lg text-sm font-bold">
            全部圖片已完成
          </div>
        )}
      </div>
    </div>
  );
};
