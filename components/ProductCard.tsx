import React from 'react';
import type { ProductAnalysis } from '../types/shopee';

const STYLE_LABELS: Record<string, string> = {
  'fresh-watery': '清新水感', 'creamy-soft': '奶油柔潤', 'clean-refreshing': '清爽潔淨',
  'botanical-natural': '植萃自然', 'premium-minimal': '高級極簡', 'girly-sweet': '少女甜感',
  'gentle-elegant': '溫柔優雅', 'bold-playful': '大膽活潑', 'calm-serene': '沉靜舒緩',
  'luxury-golden': '奢華金屬', 'lifestyle-home': '生活居家', 'office-professional': '都市職場',
  'dorm-young': '宿舍青春', 'gym-active': '運動活力', 'spa-resort': '溫泉度假',
  'tech-transparent': '科技透明', 'gift-box': '禮盒質感', 'gen-z-impact': 'Z世代衝擊',
  'retro-vintage': '文青復古', 'tropical-island': '熱帶島嶼',
};

interface ProductCardProps {
  analysis: ProductAnalysis;
  imageSrc: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({ analysis, imageSrc }) => {
  return (
    <div className="bg-gray-50 dark:bg-[#1e1e24] border border-gray-200 dark:border-white/10 rounded-xl p-6 mb-8 flex flex-col md:flex-row gap-6 shadow-2xl shadow-black/50">
      <div className="w-full md:w-1/3 shrink-0">
        <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 dark:bg-black/20 relative group">
          <img src={imageSrc} alt={analysis.name} className="w-full h-full object-contain" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
            <span className="text-xs text-white/80">原始圖片</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-center w-full">
        <div className="uppercase tracking-widest text-xs text-purple-600 dark:text-purple-400 font-bold mb-2">Phase 1 — 分析報告</div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white serif mb-1">{analysis.name}</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-2 italic">{analysis.visualDescription}</p>
        <div className="flex gap-3 mb-4">
          {analysis.detectedStyle && (
            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30">
              {STYLE_LABELS[analysis.detectedStyle] || analysis.detectedStyle}
            </span>
          )}
          {analysis.packagingColors && (
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30">
              包裝色：{analysis.packagingColors}
            </span>
          )}
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-white/80 uppercase tracking-wider border-b border-gray-300 dark:border-white/10 pb-1 inline-block">核心特色</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{analysis.keyFeaturesZh}</p>
        </div>
      </div>
    </div>
  );
};