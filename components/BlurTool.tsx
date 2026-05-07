import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { BlurRegion } from '../types/shopee';

// ============================================================================
// Props
// ============================================================================

interface BlurToolProps {
  imageBase64: string;
  initialRegions?: BlurRegion[];
  onProcessed: (processedBase64: string, regions: BlurRegion[]) => void;
  intensity?: 'light' | 'medium' | 'heavy';
}

// ============================================================================
// Constants
// ============================================================================

const BLUR_RADIUS: Record<string, string> = {
  light: 'blur(4px)',
  medium: 'blur(8px)',
  heavy: 'blur(12px)',
};

const REGION_COLORS = [
  'rgba(239,68,68,0.6)',   // red
  'rgba(59,130,246,0.6)',  // blue
  'rgba(16,185,129,0.6)',  // green
  'rgba(245,158,11,0.6)',  // amber
  'rgba(139,92,246,0.6)',  // purple
];

// ============================================================================
// Component
// ============================================================================

export const BlurTool: React.FC<BlurToolProps> = ({
  imageBase64,
  initialRegions = [],
  onProcessed,
  intensity = 'medium',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [regions, setRegions] = useState<BlurRegion[]>(initialRegions);
  const [drawing, setDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 512, height: 512 });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Scale to fit within 512px max dimension
      const maxDim = 512;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > h && w > maxDim) { h = (h / w) * maxDim; w = maxDim; }
      else if (h > maxDim) { w = (w / h) * maxDim; h = maxDim; }
      setCanvasSize({ width: Math.round(w), height: Math.round(h) });
    };
    img.src = imageBase64;
  }, [imageBase64]);

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasSize;

    // Clear and draw base image
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // Apply blur for each region
    for (const region of regions) {
      const rx = region.x * width;
      const ry = region.y * height;
      const rw = region.width * width;
      const rh = region.height * height;

      // Extract region, blur it, and draw back
      if (rw > 0 && rh > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(rx, ry, rw, rh);
        ctx.clip();
        ctx.filter = BLUR_RADIUS[intensity];
        ctx.drawImage(img, 0, 0, width, height);
        ctx.filter = 'none';
        ctx.restore();
      }
    }

    // Draw selection boxes
    for (let i = 0; i < regions.length; i++) {
      const r = regions[i];
      ctx.strokeStyle = REGION_COLORS[i % REGION_COLORS.length];
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(r.x * width, r.y * height, r.width * width, r.height * height);
      ctx.setLineDash([]);
    }

    // Draw current drawing rect
    if (currentRect && currentRect.w > 5 && currentRect.h > 5) {
      ctx.strokeStyle = 'rgba(139,92,246,0.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.w, currentRect.h);
      ctx.setLineDash([]);
    }
  }, [canvasSize, regions, currentRect, intensity]);

  useEffect(() => { draw(); }, [draw]);

  // Export processed image
  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onProcessed(dataUrl, regions);
  }, [regions, onProcessed]);

  // Mouse handlers (normalized to 0-1)
  const toNorm = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = toNorm(e.clientX, e.clientY);
    setDrawing(true);
    setStartPoint({ x, y });
    setCurrentRect(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing || !startPoint) return;
    const { x, y } = toNorm(e.clientX, e.clientY);
    const { width, height } = canvasSize;
    const rectX = Math.min(startPoint.x, x) * width;
    const rectY = Math.min(startPoint.y, y) * height;
    const rectW = Math.abs(x - startPoint.x) * width;
    const rectH = Math.abs(y - startPoint.y) * height;
    setCurrentRect({ x: rectX, y: rectY, w: rectW, h: rectH });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!drawing || !startPoint) return;
    setDrawing(false);
    const { x, y } = toNorm(e.clientX, e.clientY);
    const normW = Math.abs(x - startPoint.x);
    const normH = Math.abs(y - startPoint.y);

    if (normW > 0.02 && normH > 0.02) {
      const newRegion: BlurRegion = {
        x: Math.min(startPoint.x, x),
        y: Math.min(startPoint.y, y),
        width: normW,
        height: normH,
      };
      setRegions((prev) => [...prev, newRegion]);
    }
    setCurrentRect(null);
    setStartPoint(null);
  };

  const removeRegion = (index: number) => {
    setRegions((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllRegions = () => {
    setRegions([]);
  };

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-gray-400">
          {regions.length === 0 ? '拖曳框選需要模糊的區域' : `${regions.length} 個模糊區域`}
        </span>
        <div className="flex gap-1">
          <button
            onClick={clearAllRegions}
            disabled={regions.length === 0}
            className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-white/5"
          >
            清除全部
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="bg-[#0f0f12] border border-white/10 rounded-xl overflow-hidden flex items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setDrawing(false); setCurrentRect(null); }}
          className="cursor-crosshair max-w-full"
          style={{ maxHeight: '512px' }}
        />
      </div>

      {/* Region List */}
      {regions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">模糊區域列表</p>
          <div className="flex flex-wrap gap-2">
            {regions.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border"
                style={{
                  borderColor: REGION_COLORS[i % REGION_COLORS.length],
                  backgroundColor: REGION_COLORS[i % REGION_COLORS.length].replace('0.6', '0.1'),
                }}
              >
                <span className="text-gray-300">
                  區塊 {i + 1} ({Math.round(r.width * 100)}% × {Math.round(r.height * 100)}%)
                </span>
                <button
                  onClick={() => removeRegion(i)}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Button */}
      <button
        onClick={handleExport}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-sm rounded-lg hover:opacity-90 transition-opacity shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        確認模糊處理並匯出底圖
      </button>
    </div>
  );
};
